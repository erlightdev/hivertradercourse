import { auth } from "@hivertradercourse/auth";
import prisma from "@hivertradercourse/db";
import { env } from "@hivertradercourse/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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
			accounts: { select: { providerId: true } },
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

	const providers = user.accounts.map((a) => a.providerId);
	return c.json({
		exists: true,
		emailVerified: user.emailVerified,
		hasPassword: providers.includes("credential"),
		hasGoogle: providers.includes("google"),
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
	const existing = await prisma.account.findFirst({
		where: { userId, providerId: "credential" },
	});

	// If a password already exists, this is the wrong endpoint — use reset.
	if (existing?.password) {
		return c.json(
			{
				error:
					"This account already has a password. Use reset password instead.",
			},
			409,
		);
	}

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

	return c.json({ success: true });
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
