import { spawn } from "node:child_process";
import { platform } from "node:os";

const dockerCmd = platform() === "win32" ? "docker.exe" : "docker";
const args = process.argv.slice(2);

try {
	const child = spawn(dockerCmd, args, {
		stdio: [
			process.stdin && process.stdin.isTTY ? "inherit" : "ignore",
			"inherit",
			"inherit",
		],
		shell: true,
	});

	child.on("error", (err) => {
		console.error("Failed to start docker process:", err);
		process.exit(1);
	});

	child.on("exit", (code) => {
		process.exit(code ?? 0);
	});
} catch (e) {
	console.error("Docker execution error:", e);
	process.exit(1);
}
