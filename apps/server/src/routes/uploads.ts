import { Hono } from "hono";
import { z } from "zod";
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@hivertradercourse/env/server";
import { getSessionUser } from "../utils/auth";

const uploadRouter = new Hono();

// Validate file metadata payload
const presignedUrlSchema = z.object({
	filename: z.string().min(1),
	fileType: z.string().min(1),
	fileSize: z
		.number()
		.int()
		.positive()
		.max(500 * 1024 * 1024, { message: "File size exceeds limit of 500MB" }), // Allowing large video files
});

// Initialize MinIO S3 Client
const s3Client = new S3Client({
	endpoint: env.MINIO_ENDPOINT,
	region: "us-east-1", // MinIO default region
	credentials: {
		accessKeyId: env.MINIO_AWS_ACCESS_KEY_ID,
		secretAccessKey: env.MINIO_AWS_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

// Helper to ensure target bucket exists in MinIO
async function ensureBucketExists(bucketName: string) {
	try {
		await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
	} catch (err: any) {
		// If bucket is not found (404), create it
		if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
			try {
				await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
				console.log(`Created missing MinIO bucket: ${bucketName}`);
			} catch (createErr) {
				console.error(`Failed to auto-create MinIO bucket: ${bucketName}`, createErr);
			}
		} else {
			console.error("MinIO HeadBucket checking error:", err);
		}
	}
}

uploadRouter.post("/presigned-url", async (c) => {
	const user = await getSessionUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	const parsed = presignedUrlSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.format() }, 400);
	}

	const { filename, fileType } = parsed.data;

	// Structure the key (e.g. courses/uploads/uuid-filename)
	const uniqueId = globalThis.crypto.randomUUID();
	const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
	const fileKey = `courses/uploads/${uniqueId}-${sanitizedFilename}`;

	try {
		// Ensure MinIO bucket exists before generating pre-signed upload URL
		await ensureBucketExists(env.MINIO_BUCKET_NAME);

		const command = new PutObjectCommand({
			Bucket: env.MINIO_BUCKET_NAME,
			Key: fileKey,
			ContentType: fileType,
		});

		// Generate the presigned URL
		const uploadUrl = await getSignedUrl(s3Client, command, {
			expiresIn: 3600, // Valid for 1 hour
		});

		return c.json({
			uploadUrl,
			fileKey,
		});
	} catch (e: any) {
		console.error("Presigned URL generation error:", e);
		return c.json({ error: e.message || "Failed to generate presigned URL" }, 500);
	}
});

export default uploadRouter;
