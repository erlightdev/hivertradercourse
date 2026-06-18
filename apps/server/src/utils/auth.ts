import { auth } from "@hivertradercourse/auth";
import type { Context } from "hono";

export const getSessionUser = async (c: Context) => {
	try {
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		return session?.user || null;
	} catch (e) {
		console.error("Session fetch error:", e);
		return null;
	}
};
