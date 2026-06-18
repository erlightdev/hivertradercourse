import { Hono } from "hono";
import prisma from "@hivertradercourse/db";
import { z } from "zod";
import { getSessionUser } from "../utils/auth";

const reorderRouter = new Hono();

// Reorder chapters validation
const chapterReorderSchema = z.object({
	chapters: z
		.array(
			z.object({
				id: z.string().min(1),
				position: z.number().int().nonnegative(),
			}),
		)
		.min(1),
});

// Reorder lessons validation
const lessonReorderSchema = z.object({
	lessons: z
		.array(
			z.object({
				id: z.string().min(1),
				position: z.number().int().nonnegative(),
				chapterId: z.string().min(1).optional(), // optional if moving between chapters
			}),
		)
		.min(1),
});

// Atomic reordering of chapters
reorderRouter.post("/chapters", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const parsed = chapterReorderSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.format() }, 400);
	}

	const { chapters } = parsed.data;

	try {
		// Execute atomic updates using Prisma transactions
		await prisma.$transaction(
			chapters.map((ch) =>
				prisma.chapter.update({
					where: { id: ch.id },
					data: { position: ch.position },
				}),
			),
		);

		return c.json({ success: true, message: "Chapters reordered successfully" });
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to reorder chapters" }, 500);
	}
});

// Atomic reordering of lessons (and potentially shifting them between chapters)
reorderRouter.post("/lessons", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const parsed = lessonReorderSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.format() }, 400);
	}

	const { lessons } = parsed.data;

	try {
		// Execute atomic updates using Prisma transactions
		await prisma.$transaction(
			lessons.map((ls) =>
				prisma.lesson.update({
					where: { id: ls.id },
					data: {
						position: ls.position,
						...(ls.chapterId ? { chapterId: ls.chapterId } : {}),
					},
				}),
			),
		);

		return c.json({ success: true, message: "Lessons reordered successfully" });
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to reorder lessons" }, 500);
	}
});

export default reorderRouter;
