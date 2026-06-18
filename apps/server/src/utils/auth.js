import { auth } from "@hivertradercourse/auth";
export const getSessionUser = async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        return session?.user || null;
    }
    catch (e) {
        console.error("Session fetch error:", e);
        return null;
    }
};
