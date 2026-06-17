import node from "@astrojs/node";
// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	env: {
		schema: {
			PUBLIC_SERVER_URL: envField.string({
				access: "public",
				context: "client",
				default: "http://localhost:3000",
			}),
			PUBLIC_ABLY_KEY: envField.string({
				access: "public",
				context: "client",
				default: "FSYahw.vYdeVA:-l719D4Gw6iZHNqoWbZsoECWcqA--7ycUirkjkBr06Y",
			}),
		},
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
