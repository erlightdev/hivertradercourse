import { Hono } from "hono";
import prisma from "@hivertradercourse/db";
import { z } from "zod";
import { getSessionUser } from "../utils/auth";

const courseRouter = new Hono();

// Zod schema for Course Level and Status enums
const CourseLevelEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const CourseStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

// Course creation schema
export const createCourseSchema = z.object({
	title: z.string().min(3).max(100),
	slug: z
		.string()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
			message: "Slug must be URL-friendly (lowercase letters, numbers, and hyphens)",
		}),
	smallDescription: z.string().max(200),
	description: z
		.string()
		.min(3)
		.refine(
			(val) => {
				try {
					JSON.parse(val);
					return true;
				} catch {
					return false;
				}
			},
			{ message: "Description must be a valid stringified JSON" },
		),
	fileKey: z.string().min(1, { message: "File Key is required" }),
	price: z.number().int().min(1, { message: "Price must be at least 1 cent" }),
	duration: z
		.number()
		.int()
		.min(1)
		.max(500, { message: "Duration must be between 1 and 500 hours" }),
	level: CourseLevelEnum.default("BEGINNER"),
	category: z.string().min(1),
	status: CourseStatusEnum.default("DRAFT"),
});

// Partial schema for updates
export const updateCourseSchema = createCourseSchema.partial();

// Get list of all courses
courseRouter.get("/", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	try {
		const courses = await prisma.course.findMany({
			orderBy: { createdAt: "desc" },
		});
		return c.json(courses);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to fetch courses" }, 500);
	}
});

// Get detailed course with chapters and lessons (ordered by position)
courseRouter.get("/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");

	try {
		const course = await prisma.course.findUnique({
			where: { id },
			include: {
				chapters: {
					orderBy: { position: "asc" },
					include: {
						lessons: {
							orderBy: { position: "asc" },
						},
					},
				},
			},
		});

		if (!course) {
			return c.json({ error: "Course not found" }, 404);
		}

		return c.json(course);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to fetch course details" }, 500);
	}
});

// Create a new course
courseRouter.post("/", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const parsed = createCourseSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.format() }, 400);
	}

	const { slug } = parsed.data;

	try {
		// Check for slug uniqueness
		const existing = await prisma.course.findUnique({
			where: { slug },
		});
		if (existing) {
			return c.json({ error: "A course with this slug already exists" }, 409);
		}

		const course = await prisma.course.create({
			data: parsed.data,
		});

		return c.json(course, 201);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to create course" }, 500);
	}
});

// Update a course
courseRouter.patch("/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const parsed = updateCourseSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.format() }, 400);
	}

	try {
		const existingCourse = await prisma.course.findUnique({
			where: { id },
		});
		if (!existingCourse) {
			return c.json({ error: "Course not found" }, 404);
		}

		// If slug is changing, verify it is unique
		if (parsed.data.slug && parsed.data.slug !== existingCourse.slug) {
			const slugDuplicate = await prisma.course.findUnique({
				where: { slug: parsed.data.slug },
			});
			if (slugDuplicate) {
				return c.json({ error: "A course with this slug already exists" }, 409);
			}
		}

		const updated = await prisma.course.update({
			where: { id },
			data: parsed.data,
		});

		return c.json(updated);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to update course" }, 500);
	}
});

// Delete a course
courseRouter.delete("/:id", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const id = c.req.param("id");

	try {
		const existingCourse = await prisma.course.findUnique({
			where: { id },
		});
		if (!existingCourse) {
			return c.json({ error: "Course not found" }, 404);
		}

		await prisma.course.delete({
			where: { id },
		});

		return c.json({ success: true, message: "Course deleted successfully" });
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to delete course" }, 500);
	}
});

// ===========================================================================
// Chapter CRUD
// ===========================================================================

// Add a chapter
courseRouter.post("/:courseId/chapters", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const courseId = c.req.param("courseId");
	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { title } = body;
	if (!title) return c.json({ error: "Title is required" }, 400);

	try {
		const count = await prisma.chapter.count({
			where: { courseId },
		});

		const chapter = await prisma.chapter.create({
			data: {
				title,
				courseId,
				position: count,
			},
		});

		return c.json(chapter, 201);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to create chapter" }, 500);
	}
});

// Update a chapter
courseRouter.patch("/:courseId/chapters/:chapterId", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const chapterId = c.req.param("chapterId");
	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { title } = body;
	if (!title) return c.json({ error: "Title is required" }, 400);

	try {
		const chapter = await prisma.chapter.update({
			where: { id: chapterId },
			data: { title },
		});

		return c.json(chapter);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to update chapter" }, 500);
	}
});

// Delete a chapter
courseRouter.delete("/:courseId/chapters/:chapterId", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const chapterId = c.req.param("chapterId");

	try {
		await prisma.chapter.delete({
			where: { id: chapterId },
		});

		return c.json({ success: true, message: "Chapter deleted successfully" });
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to delete chapter" }, 500);
	}
});

// ===========================================================================
// Lesson CRUD
// ===========================================================================

// Add a lesson
courseRouter.post("/:courseId/chapters/:chapterId/lessons", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const chapterId = c.req.param("chapterId");
	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { title } = body;
	if (!title) return c.json({ error: "Title is required" }, 400);

	try {
		const count = await prisma.lesson.count({
			where: { chapterId },
		});

		const lesson = await prisma.lesson.create({
			data: {
				title,
				chapterId,
				position: count,
			},
		});

		return c.json(lesson, 201);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to create lesson" }, 500);
	}
});

// Update a lesson
courseRouter.patch("/:courseId/chapters/:chapterId/lessons/:lessonId", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const lessonId = c.req.param("lessonId");
	let body: any;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const { title, description, thumbnailKey, videoKey } = body;

	try {
		const lesson = await prisma.lesson.update({
			where: { id: lessonId },
			data: {
				title: title !== undefined ? title : undefined,
				description: description !== undefined ? description : undefined,
				thumbnailKey: thumbnailKey !== undefined ? thumbnailKey : undefined,
				videoKey: videoKey !== undefined ? videoKey : undefined,
			},
		});

		return c.json(lesson);
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to update lesson" }, 500);
	}
});

// Delete a lesson
courseRouter.delete("/:courseId/chapters/:chapterId/lessons/:lessonId", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const lessonId = c.req.param("lessonId");

	try {
		await prisma.lesson.delete({
			where: { id: lessonId },
		});

		return c.json({ success: true, message: "Lesson deleted successfully" });
	} catch (e: any) {
		return c.json({ error: e.message || "Failed to delete lesson" }, 500);
	}
});

export default courseRouter;
