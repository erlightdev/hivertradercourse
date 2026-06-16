import { PUBLIC_SERVER_URL } from "astro:env/client";
import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
	baseURL: PUBLIC_SERVER_URL,
	plugins: [emailOTPClient()],
});

export type AccountStatus = {
	exists: boolean;
	emailVerified: boolean;
	hasPassword: boolean;
	hasGoogle: boolean;
};

/**
 * Looks up whether an email is already registered and which sign-in methods it
 * has, so the auth forms can guide the user before they hit a failed attempt.
 * Backed by the server's /api/account-status endpoint.
 */
export async function getAccountStatus(email: string): Promise<AccountStatus> {
	const res = await fetch(`${PUBLIC_SERVER_URL}/api/account-status`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email }),
		credentials: "include",
	});
	if (!res.ok) {
		throw new Error("Could not check this email. Please try again.");
	}
	return res.json() as Promise<AccountStatus>;
}

/**
 * Removes an abandoned, never-verified signup so the email can be reused.
 * The server only deletes accounts whose email was never verified.
 */
export async function discardUnverifiedAccount(email: string): Promise<void> {
	await fetch(`${PUBLIC_SERVER_URL}/api/discard-unverified`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email }),
		credentials: "include",
	});
}

/**
 * Sets a FIRST password for the currently signed-in user (one who signed up
 * via Google or OTP and has none). Requires an active session — call only
 * after a successful sign-in OTP. Throws with a user-facing message on failure.
 */
export async function setInitialPassword(password: string): Promise<void> {
	const res = await fetch(`${PUBLIC_SERVER_URL}/api/set-initial-password`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password }),
		credentials: "include",
	});
	if (!res.ok) {
		const data = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(
			data?.error || "Could not set your password. Please try again.",
		);
	}
}
