import { afterEach, describe, expect, it } from "vitest"

import { ENV_VAR, loadKey } from "../key.js"

const original = process.env[ENV_VAR]

afterEach(() => {
	if (original === undefined) delete process.env[ENV_VAR]
	else process.env[ENV_VAR] = original
})

describe("loadKey", () => {
	// Every call below passes a nonexistent envPath so the suite can never
	// read or write the real `.env` that sits next to key.js (it holds a
	// legitimate TYPESAFE_API_KEY locally and would otherwise leak into
	// process.env via loadEnv, masking the no-source error paths).
	it("prefers a key already in the environment, so CI needs no 1Password", () => {
		process.env[ENV_VAR] = "from-ci"
		expect(loadKey({ ref: "op://never/read/this", envPath: "/nonexistent/.env" })).toBe("environment")
		expect(process.env[ENV_VAR]).toBe("from-ci")
	})

	it("names the variable and the fix when there is nothing to read", () => {
		delete process.env[ENV_VAR]
		expect(() => loadKey({ envPath: "/nonexistent/.env" })).toThrow(/TYPESAFE_API_KEY is not set/)
	})

	// The op-CLI failure path is deliberately not tested here. Exercising it
	// shells out to a real `op read`, which blocks for a 60s authorization
	// timeout when the vault is not unlocked -- slow, and a pass or fail that
	// depends on the developer's 1Password session rather than on this code.
	// The smoke script in templates/ covers it against a real vault instead.

	it("honours a custom variable name", () => {
		process.env.OTHER_KEY = "x"
		expect(loadKey({ env: "OTHER_KEY", envPath: "/nonexistent/.env" })).toBe("environment")
		delete process.env.OTHER_KEY
	})
})
