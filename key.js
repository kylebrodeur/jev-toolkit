/**
 * Resolve the TypeSafe API key from 1Password into a local `.env` file, and
 * load env files into `process.env`.
 *
 * The SDK reads `TYPESAFE_API_KEY` from `process.env` itself. This module
 * fills that variable by pulling from an `op://` reference once and caching
 * the result in `.env` (gitignored), so subsequent runs just load the file
 * instead of re-invoking `op read`.
 *
 * On macOS, `op read` needs `OP_BIOMETRIC_UNLOCK_ENABLED=true` in the
 * environment to unlock without an interactive session. Without it the CLI
 * blocks until a 60 second authorization timeout.
 *
 * @see https://docs.typesafe.ai/sdk/javascript
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/** Environment variable the TypeSafe SDK reads. */
export const ENV_VAR = "TYPESAFE_API_KEY"

/** Default `.env` file location: this package's directory. */
const DEFAULT_ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), ".env")

/**
 * Load `KEY=value` pairs from an env file into `process.env`, without
 * overwriting variables already set. Ignores blank lines and `#` comments.
 *
 * @param {string} [path] defaults to `.env` next to this file
 */
export function loadEnv(path = DEFAULT_ENV_PATH) {
	if (!path || !existsSync(path)) return
	const text = readFileSync(path, "utf8")
	for (const line of text.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith("#")) continue
		const eq = trimmed.indexOf("=")
		if (eq === -1) continue
		const key = trimmed.slice(0, eq).trim()
		const value = trimmed.slice(eq + 1).trim()
		if (!(key in process.env)) process.env[key] = value
	}
}

/**
 * Append `KEY=value` to an env file, creating it if needed.
 *
 * @param {string} key
 * @param {string} value
 * @param {string} [path] defaults to `.env` next to this file
 */
function writeEnvVar(key, value, path = DEFAULT_ENV_PATH) {
	const line = `${key}=${value}\n`
	if (!existsSync(path)) {
		writeFileSync(path, line, { mode: 0o600 })
		return
	}
	appendFileSync(path, line)
}

/**
 * Ensure `TYPESAFE_API_KEY` is set: first from `process.env`, then from a
 * cached `.env` file, then from 1Password (which also writes it to `.env`
 * for next time).
 *
 * Call once at process start, before constructing a client. A key already in
 * the environment always wins, so CI can inject one without 1Password being
 * present at all.
 *
 * @param {{ ref?: string, env?: string, envPath?: string }} [options]
 *   `ref` is an `op://<vault>/<item>/<field>` reference; `env` overrides the
 *   variable name for a non-default setup; `envPath` overrides the `.env`
 *   file location.
 * @returns {"environment" | "env-file" | "1password"} where the key came from
 * @throws {Error} when no source yields a key, naming the reference that
 *   failed so the fix is obvious
 */
export function loadKey(options = {}) {
	const { ref, env = ENV_VAR, envPath = DEFAULT_ENV_PATH } = options
	if (process.env[env]) return "environment"

	loadEnv(envPath)
	if (process.env[env] !== undefined) return "env-file"

	if (!ref) {
		throw new Error(
			`${env} is not set (checked process.env and ${envPath}) and no op:// reference was given. Either export ${env}, add it to ${envPath}, or pass { ref: "op://<vault>/<item>/<field>" }.`,
		)
	}

	let value
	try {
		// Capture stderr rather than inheriting it, so op's own diagnostics do
		// not leak into a caller's logs on failure.
		value = execFileSync("op", ["read", ref], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim()
	} catch (cause) {
		// The op CLI puts diagnostics on stderr; the key is never in them, but
		// do not forward the raw output in case a reference embeds a secret.
		throw new Error(
			`Could not read ${ref} from 1Password. Check that the op CLI is installed, that you are signed in, and that the item and field names are exact.`,
			{ cause },
		)
	}

	if (!value) {
		throw new Error(`${ref} resolved to an empty value. Check the field name on that item.`)
	}

	process.env[env] = value
	writeEnvVar(env, value, envPath)
	return "1password"
}
