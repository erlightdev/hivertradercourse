import { Hono } from "hono";
import prisma from "@hivertradercourse/db";
import { z } from "zod";
import * as crypto from "node:crypto";
import { env } from "@hivertradercourse/env/server";
import { getSessionUser } from "../utils/auth";

const paymentRouter = new Hono();

const checkoutSchema = z.object({
	courseId: z.string().min(1),
});

// Checkout Initiation
paymentRouter.post("/checkout", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const parsed = checkoutSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.format() }, 400);
	}

	const { courseId } = parsed.data;

	try {
		const course = await prisma.course.findUnique({
			where: { id: courseId },
		});

		if (!course) {
			return c.json({ error: "Course not found" }, 404);
		}

		// Check if user is already enrolled
		const existingEnrollment = await prisma.enrollment.findUnique({
			where: {
				userId_courseId: {
					userId: user.id,
					courseId,
				},
			},
		});

		if (existingEnrollment) {
			return c.json({ error: "Already enrolled in this course" }, 409);
		}

		// Fallback for placeholder api key
		if (env.DODO_PAYMENTS_API_KEY === "placeholder_api_key") {
			return c.json({
				checkoutUrl: `https://test.dodopayments.com/checkout/mock-${courseId}-${user.id}`,
				sessionId: `mock-sess-${globalThis.crypto.randomUUID()}`,
				mock: true,
			});
		}

		// Call actual Dodo Payments API
		// Reference: https://docs.dodopayments.com/api-reference/checkout/create-session
		const response = await fetch("https://api.dodopayments.com/v1/checkout/sessions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.DODO_PAYMENTS_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				customer: {
					email: user.email,
					name: user.name,
				},
				billing_address: {
					country: "US", // Default or user-provided
				},
				payment_methods: ["card"],
				metadata: {
					userId: user.id,
					courseId: course.id,
				},
				product_cart: [
					{
						product_id: course.id, // Dodo Payments product ID, assuming mapping exists
						quantity: 1,
					},
				],
				// Alternatively, custom price/amount if supported by the Dodo API configuration
				return_url: `${env.CORS_ORIGIN}/courses/${course.slug}?payment=success`,
			}),
		});

		if (!response.ok) {
			const errorData = await response.text();
			console.error("Dodo Payments error response:", errorData);
			throw new Error(`Dodo Payments API error: ${response.statusText}`);
		}

		const data = (await response.json()) as any;
		return c.json({
			checkoutUrl: data.checkout_url || data.url,
			sessionId: data.id,
		});
	} catch (e: any) {
		console.error("Checkout initiation error:", e);
		return c.json({ error: e.message || "Failed to initiate checkout" }, 500);
	}
});

// Dodo Payments Webhook Handler
paymentRouter.post("/webhook", async (c) => {
	const signature = c.req.header("x-dodo-signature");
	const rawBody = await c.req.text();

	// Verify webhook signature (if not using placeholder webhook key)
	if (env.DODO_PAYMENTS_WEBHOOK_KEY !== "placeholder_webhook_key") {
		if (!signature) {
			return c.json({ error: "Missing webhook signature" }, 401);
		}

		const expectedSignature = crypto
			.createHmac("sha256", env.DODO_PAYMENTS_WEBHOOK_KEY)
			.update(rawBody)
			.digest("hex");

		if (signature !== expectedSignature) {
			return c.json({ error: "Invalid webhook signature" }, 401);
		}
	} else {
		console.log("Skipping Dodo Payments webhook signature verification for development.");
	}

	let payload: any;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return c.json({ error: "Invalid JSON payload" }, 400);
	}

	// Process the event
	// Expected event: "payment.succeeded" or similar depending on Dodo's specific webhook shape
	const isPaymentSucceeded =
		payload.event === "payment.succeeded" ||
		payload.type === "payment.succeeded" ||
		payload.event === "order.paid"; // support fallback types

	if (isPaymentSucceeded) {
		const data = payload.data || payload;
		const metadata = data.metadata;

		if (!metadata || !metadata.userId || !metadata.courseId) {
			console.error("Missing userId or courseId in payment metadata", metadata);
			return c.json({ error: "Missing enrollment metadata" }, 400);
		}

		const { userId, courseId } = metadata;

		try {
			// Atomic upsert of enrollment to grant course access
			const enrollment = await prisma.enrollment.upsert({
				where: {
					userId_courseId: {
						userId,
						courseId,
					},
				},
				update: {}, // Keep existing if already enrolled
				create: {
					userId,
					courseId,
				},
			});

			console.log(`Successfully enrolled user ${userId} in course ${courseId}`);
			return c.json({ enrolled: true, enrollmentId: enrollment.id });
		} catch (e: any) {
			console.error("Webhook enrollment error:", e);
			return c.json({ error: "Failed to create enrollment record" }, 500);
		}
	}

	return c.json({ received: true });
});

export default paymentRouter;
