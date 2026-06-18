import { auth } from "@hivertradercourse/auth";
import prisma from "@hivertradercourse/db";
import { env } from "@hivertradercourse/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as Ably from "ably";
import courseRouter from "./routes/courses";
import reorderRouter from "./routes/reorder";
import uploadRouter from "./routes/uploads";
import paymentRouter from "./routes/payments";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Mount course, reordering, upload, and payment routers
app.route("/api/courses", courseRouter);
app.route("/api/reorder", reorderRouter);
app.route("/api/uploads", uploadRouter);
app.route("/api/payments", paymentRouter);

// Initialize S3 Client for serving files from MinIO
const s3Client = new S3Client({
	endpoint: env.MINIO_ENDPOINT,
	region: "us-east-1",
	credentials: {
		accessKeyId: env.MINIO_AWS_ACCESS_KEY_ID,
		secretAccessKey: env.MINIO_AWS_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

// Proxy route to stream course assets from MinIO
app.get("/courses/uploads/*", async (c) => {
	const key = decodeURIComponent(c.req.path.replace(/^\/courses\/uploads\//, ""));
	try {
		const command = new GetObjectCommand({
			Bucket: env.MINIO_BUCKET_NAME,
			Key: key,
		});
		const response = await s3Client.send(command);
		if (!response.Body) {
			return c.text("Not Found", 404);
		}
		const contentType = response.ContentType || "application/octet-stream";
		c.header("Content-Type", contentType);
		c.header("Cache-Control", "public, max-age=31536000");
		return c.body(response.Body as any);
	} catch (err: any) {
		console.error(`Error serving file ${key}:`, err);
		return c.text("Not Found", 404);
	}
});

// ---------------------------------------------------------------------------
// Account discovery
//
// Better Auth has no built-in "does this email exist / which providers does it
// use" endpoint, so we expose a small, deliberately-scoped lookup. The auth
// forms use it to give accurate guidance up front ("already registered",
// "use Google to sign in", "no account found") instead of leaking a generic
// "invalid credentials" only after a failed attempt.
//
// This intentionally reveals whether an email is registered — a product choice
// for clear onboarding UX. It is rate-limited per IP to blunt enumeration
// scraping. (Behind multiple instances, swap the in-memory store for Redis.)
// ---------------------------------------------------------------------------

const rateBuckets = new Map<string, number[]>();

function isRateLimited(ip: string, max = 20, windowMs = 60_000) {
	const now = Date.now();
	const hits = (rateBuckets.get(ip) ?? []).filter((t) => now - t < windowMs);
	hits.push(now);
	rateBuckets.set(ip, hits);
	return hits.length > max;
}

function clientIp(c: { req: { header: (k: string) => string | undefined } }) {
	const fwd = c.req.header("x-forwarded-for");
	return fwd?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
}

function normalizeEmail(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const email = value.trim().toLowerCase();
	// Basic shape check — full validation happens in Better Auth itself.
	if (email.length < 3 || email.length > 320 || !email.includes("@")) {
		return null;
	}
	return email;
}

app.post("/api/account-status", async (c) => {
	if (isRateLimited(clientIp(c))) {
		return c.json({ error: "Too many requests. Please slow down." }, 429);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body." }, 400);
	}

	const email = normalizeEmail((body as { email?: unknown })?.email);
	if (!email) {
		return c.json({ error: "A valid email is required." }, 400);
	}

	const user = await prisma.user.findUnique({
		where: { email },
		select: {
			emailVerified: true,
			passwordSet: true,
			accounts: {
				select: {
					providerId: true,
					password: true,
				},
			},
		},
	});

	if (!user) {
		return c.json({
			exists: false,
			emailVerified: false,
			hasPassword: false,
			hasGoogle: false,
		});
	}

	const hasPassword = user.passwordSet;
	const hasGoogle = user.accounts.some((a) => a.providerId === "google");

	return c.json({
		exists: true,
		emailVerified: user.emailVerified,
		hasPassword,
		hasGoogle,
	});
});

// Discards an abandoned, never-verified signup so the email can be reused.
// Safe by construction: only deletes when emailVerified is false. Verified
// accounts and Google sign-ins (which arrive verified) are never touched.
app.post("/api/discard-unverified", async (c) => {
	if (isRateLimited(clientIp(c))) {
		return c.json({ error: "Too many requests. Please slow down." }, 429);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body." }, 400);
	}

	const email = normalizeEmail((body as { email?: unknown })?.email);
	if (!email) {
		return c.json({ error: "A valid email is required." }, 400);
	}

	const result = await prisma.user.deleteMany({
		where: { email, emailVerified: false },
	});

	return c.json({ discarded: result.count > 0 });
});

// Sets a FIRST password for the currently signed-in user who has none yet
// (Google-only or OTP-only accounts). Ownership is proven by the active
// session — the client reaches here only after a successful sign-in OTP.
//
// Better Auth's forgetPassword / emailOtp.resetPassword require an existing
// credential account, so they can't bootstrap a password for these users.
// We create the credential row ourselves, hashing with Better Auth's own
// hasher so future email/password sign-ins verify correctly.
app.post("/api/set-initial-password", async (c) => {
	if (isRateLimited(clientIp(c))) {
		return c.json({ error: "Too many requests. Please slow down." }, 429);
	}

	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) {
		return c.json({ error: "Please verify your identity first." }, 401);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body." }, 400);
	}

	const password = (body as { password?: unknown })?.password;
	if (
		typeof password !== "string" ||
		password.length < 8 ||
		password.length > 128
	) {
		return c.json(
			{ error: "Password must be between 8 and 128 characters." },
			400,
		);
	}

	const userId = session.user.id;
	const dbUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { passwordSet: true },
	});

	// If the user has already chosen and configured their password, they must use changePassword/reset
	if (dbUser?.passwordSet) {
		return c.json(
			{
				error:
					"This account already has a password. Use reset password instead.",
			},
			409,
		);
	}

	const existing = await prisma.account.findFirst({
		where: { userId, providerId: "credential" },
	});

	const ctx = await auth.$context;
	const hash = await ctx.password.hash(password);

	if (existing) {
		await prisma.account.update({
			where: { id: existing.id },
			data: { password: hash },
		});
	} else {
		await prisma.account.create({
			data: {
				id: globalThis.crypto.randomUUID(),
				accountId: userId,
				providerId: "credential",
				userId,
				password: hash,
			},
		});
	}

	await prisma.user.update({
		where: { id: userId },
		data: { passwordSet: true },
	});

	return c.json({ success: true });
});

app.post("/api/mark-password-set", async (c) => {
	if (isRateLimited(clientIp(c))) {
		return c.json({ error: "Too many requests. Please slow down." }, 429);
	}

	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await prisma.user.update({
		where: { id: session.user.id },
		data: { passwordSet: true },
	});

	return c.json({ success: true });
});

// Helper to get session user
const getSessionUser = async (c: any) => {
	try {
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		return session?.user || null;
	} catch (e) {
		console.error("Session fetch error:", e);
		return null;
	}
};

// ===========================================================================
// Blog Posts CRUD
// ===========================================================================

app.get("/api/posts", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	try {
		const posts = await prisma.post.findMany({
			include: {
				author: { select: { id: true, name: true, email: true } },
				categories: true,
				tags: true,
			},
			orderBy: { createdAt: "desc" },
		});
		return c.json(posts);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to fetch posts" }, 500);
	}
});

app.get("/api/posts/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");
	try {
		const post = await prisma.post.findUnique({
			where: { id },
			include: {
				author: { select: { id: true, name: true, email: true } },
				categories: true,
				tags: true,
			},
		});
		if (!post) return c.json({ error: "Post not found" }, 404);
		return c.json(post);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to fetch post" }, 500);
	}
});

// List users (for author selection in the editor)
app.get("/api/users", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	try {
		const users = await prisma.user.findMany({
			select: { id: true, name: true, email: true },
			orderBy: { name: "asc" },
		});
		return c.json(users);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to fetch users" }, 500);
	}
});

app.post("/api/posts", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { title, slug, content, published, categoryIds, tagIds, authorId, metaTitle, metaDescription, ogImage, canonicalUrl, focusKeyword, robotsMeta } = body;
	if (!title || !slug) {
		return c.json({ error: "Title and slug are required" }, 400);
	}

	try {
		const post = await prisma.post.create({
			data: {
				title,
				slug,
				content: content || "",
				published: !!published,
				trashed: false,
				authorId: authorId || user.id,
				metaTitle: metaTitle || null,
				metaDescription: metaDescription || null,
				ogImage: ogImage || null,
				canonicalUrl: canonicalUrl || null,
				focusKeyword: focusKeyword || null,
				robotsMeta: robotsMeta || "index, follow",
				categories:
					categoryIds && categoryIds.length > 0
						? {
								connect: categoryIds.map((id: string) => ({ id })),
							}
						: undefined,
				tags:
					tagIds && tagIds.length > 0
						? {
								connect: tagIds.map((id: string) => ({ id })),
							}
						: undefined,
			},
			include: {
				categories: true,
				tags: true,
			},
		});
		return c.json(post, 201);
	} catch (e: any) {
		if (e.code === "P2002") {
			return c.json({ error: "A post with this slug already exists" }, 409);
		}
		return c.json({ error: e.message || "Could not create post" }, 500);
	}
});

app.put("/api/posts/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");
	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { title, slug, content, published, trashed, categoryIds, tagIds, authorId, metaTitle, metaDescription, ogImage, canonicalUrl, focusKeyword, robotsMeta } = body;
	if ((title !== undefined && !title) || (slug !== undefined && !slug)) {
		return c.json({ error: "Title and slug cannot be empty" }, 400);
	}

	try {
		const existing = await prisma.post.findUnique({
			where: { id },
		});
		if (!existing) return c.json({ error: "Post not found" }, 404);

		const post = await prisma.post.update({
			where: { id },
			data: {
				title: title !== undefined ? title : existing.title,
				slug: slug !== undefined ? slug : existing.slug,
				content: content !== undefined ? content : existing.content,
				published: published !== undefined ? !!published : existing.published,
				trashed: trashed !== undefined ? !!trashed : existing.trashed,
				metaTitle: metaTitle !== undefined ? (metaTitle || null) : existing.metaTitle,
				metaDescription: metaDescription !== undefined ? (metaDescription || null) : existing.metaDescription,
				ogImage: ogImage !== undefined ? (ogImage || null) : existing.ogImage,
				canonicalUrl: canonicalUrl !== undefined ? (canonicalUrl || null) : existing.canonicalUrl,
				focusKeyword: focusKeyword !== undefined ? (focusKeyword || null) : existing.focusKeyword,
				robotsMeta: robotsMeta !== undefined ? (robotsMeta || "index, follow") : existing.robotsMeta,
				authorId: authorId !== undefined && authorId ? authorId : existing.authorId,
				categories: categoryIds
					? {
							set: categoryIds.map((id: string) => ({ id })),
						}
					: undefined,
				tags: tagIds
					? {
							set: tagIds.map((id: string) => ({ id })),
						}
					: undefined,
			},
			include: {
				author: { select: { id: true, name: true, email: true } },
				categories: true,
				tags: true,
			},
		});
		return c.json(post);
	} catch (e: any) {
		if (e.code === "P2002") {
			return c.json({ error: "A post with this slug already exists" }, 409);
		}
		return c.json({ error: e.message || "Could not update post" }, 500);
	}
});

app.delete("/api/posts/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");
	try {
		await prisma.post.delete({ where: { id } });
		return c.json({ success: true });
	} catch (e: any) {
		return c.json({ error: e.message || "Could not delete post" }, 500);
	}
});

// ===========================================================================
// Categories CRUD
// ===========================================================================

app.get("/api/categories", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	try {
		const categories = await prisma.category.findMany({
			include: {
				_count: { select: { posts: true } },
			},
			orderBy: { name: "asc" },
		});
		return c.json(categories);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to fetch categories" }, 500);
	}
});

app.post("/api/categories", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { name, slug } = body;
	if (!name || !slug) {
		return c.json({ error: "Name and slug are required" }, 400);
	}

	try {
		const category = await prisma.category.create({
			data: { name, slug },
		});
		return c.json(category, 201);
	} catch (e: any) {
		if (e.code === "P2002") {
			return c.json(
				{ error: "A category with this name or slug already exists" },
				409,
			);
		}
		return c.json({ error: e.message || "Could not create category" }, 500);
	}
});

app.put("/api/categories/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");
	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { name, slug } = body;
	if (!name || !slug) {
		return c.json({ error: "Name and slug are required" }, 400);
	}

	try {
		const category = await prisma.category.update({
			where: { id },
			data: { name, slug },
		});
		return c.json(category);
	} catch (e: any) {
		if (e.code === "P2002") {
			return c.json(
				{ error: "A category with this name or slug already exists" },
				409,
			);
		}
		return c.json({ error: e.message || "Could not update category" }, 500);
	}
});

app.delete("/api/categories/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");
	try {
		await prisma.category.delete({ where: { id } });
		return c.json({ success: true });
	} catch (e: any) {
		return c.json({ error: e.message || "Could not delete category" }, 500);
	}
});

// ===========================================================================
// Tags CRUD
// ===========================================================================

app.get("/api/tags", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	try {
		const tags = await prisma.tag.findMany({
			include: {
				_count: { select: { posts: true } },
			},
			orderBy: { name: "asc" },
		});
		return c.json(tags);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to fetch tags" }, 500);
	}
});

app.post("/api/tags", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { name, slug } = body;
	if (!name || !slug) {
		return c.json({ error: "Name and slug are required" }, 400);
	}

	try {
		const tag = await prisma.tag.create({
			data: { name, slug },
		});
		return c.json(tag, 201);
	} catch (e: any) {
		if (e.code === "P2002") {
			return c.json(
				{ error: "A tag with this name or slug already exists" },
				409,
			);
		}
		return c.json({ error: e.message || "Could not create tag" }, 500);
	}
});

app.put("/api/tags/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");
	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { name, slug } = body;
	if (!name || !slug) {
		return c.json({ error: "Name and slug are required" }, 400);
	}

	try {
		const tag = await prisma.tag.update({
			where: { id },
			data: { name, slug },
		});
		return c.json(tag);
	} catch (e: any) {
		if (e.code === "P2002") {
			return c.json(
				{ error: "A tag with this name or slug already exists" },
				409,
			);
		}
		return c.json({ error: e.message || "Could not update tag" }, 500);
	}
});

app.delete("/api/tags/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");
	try {
		await prisma.tag.delete({ where: { id } });
		return c.json({ success: true });
	} catch (e: any) {
		return c.json({ error: e.message || "Could not delete tag" }, 500);
	}
});

let ablyRestClient: Ably.Rest | null = null;
const getAblyClient = () => {
	if (!ablyRestClient) {
		ablyRestClient = new Ably.Rest({ key: env.ABLY_API_KEY });
	}
	return ablyRestClient;
};

app.get("/api/chat/auth", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const clientId = user.email || user.id || "anonymous-user";
	try {
		const client = getAblyClient();
		const tokenRequest = await client.auth.createTokenRequest({ clientId });
		return c.json(tokenRequest);
	} catch (e: any) {
		console.error("Failed to generate Ably token:", e);
		return c.json({ error: e.message || "Failed to generate token" }, 500);
	}
});

app.post("/api/chat/auth", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const clientId = user.email || user.id || "anonymous-user";
	try {
		const client = getAblyClient();
		const tokenRequest = await client.auth.createTokenRequest({ clientId });
		return c.json(tokenRequest);
	} catch (e: any) {
		console.error("Failed to generate Ably token:", e);
		return c.json({ error: e.message || "Failed to generate token" }, 500);
	}
});

app.get("/", (c) => {
	return c.text("OK");
});

import { serve } from "@hono/node-server";

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
