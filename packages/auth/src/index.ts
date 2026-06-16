import { createPrismaClient } from "@hivertradercourse/db";
import { env } from "@hivertradercourse/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { emailOTP } from "better-auth/plugins/email-otp";
import nodemailer from "nodemailer";

export function createAuth() {
	const prisma = createPrismaClient();
	const isProduction = env.NODE_ENV === "production";

	return betterAuth({
		database: prismaAdapter(prisma, {
			provider: "postgresql",
		}),

		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				// In production (HTTPS, cross-site) we need SameSite=None + Secure.
				// In local dev over http://localhost, Secure cookies are dropped by
				// the browser, so the session never persists. Use lax + insecure.
				sameSite: isProduction ? "none" : "lax",
				secure: isProduction,
				httpOnly: true,
			},
		},
		plugins: [
			emailOTP({
				async sendVerificationOTP({ email, otp }) {
					console.log(`[Better Auth OTP] Attempting to send OTP to: ${email}`);
					try {
						const transporter = nodemailer.createTransport({
							host: env.SMTP_HOST,
							port: env.SMTP_PORT,
							secure: env.SMTP_SECURE,
							auth: {
								user: env.SMTP_USER,
								pass: env.SMTP_PASS,
							},
						});

						const info = await transporter.sendMail({
							from: env.EMAIL_FROM,
							to: email,
							subject: `Your verification code: ${otp}`,
							text: `Your OTP is ${otp}. It will expire soon.`,
							html: `<p>Your OTP is <b>${otp}</b>. It will expire soon.</p>`,
						});
						console.log(
							`[Better Auth OTP] Email sent successfully! Message ID: ${info.messageId}`,
						);
					} catch (error) {
						console.error(
							`[Better Auth OTP] ERROR sending email to ${email}:`,
							error,
						);
						throw error; // Propagate to Better Auth
					}
				},
			}),
		],
	});
}

export const auth = createAuth();
