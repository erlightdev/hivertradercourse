import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "PUBLIC_",
	client: {
		PUBLIC_SERVER_URL: z.url(),
		PUBLIC_ABLY_KEY: z.string().min(1),
	},
	runtimeEnv: (
		import.meta as unknown as { env: Record<string, string | undefined> }
	).env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
