import { defineConfig } from "oxlint";

export default defineConfig({
	ignorePatterns: [
		"node_modules/**",
		// Starters, not live code. They import from the published package name.
		"templates/**",
		// Vendored anti-slop plugin: owned source, linted against its own rules is noise.
		"tools/oxlint/anti-slop/**",
	],
	jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }],
	categories: {
		correctness: "error",
		suspicious: "warn",
	},
	// Path-scoped override, recorded here so it is reviewed rather than silent.
	// gating.js is plain ESM with JSDoc and no build step (a git dependency is
	// installed as-is), so its typeof checks cannot become TypeScript type guards.
	// They narrow untyped SDK answers and throw on any shape they do not recognise.
	// The rule stays at "warn" so the findings remain visible.
	overrides: [
		{
			files: ["gating.js"],
			rules: { "anti-slop/no-runtime-typeof": "warn" },
		},
	],
	rules: {
		"anti-slop/no-chained-type-assertions": "error",
		"anti-slop/no-conditional-empty-object-spread": "error",
		"anti-slop/no-known-value-widening": "error",
		"anti-slop/no-module-mocking": "error",
		"anti-slop/no-object-parameters": "error",
		"anti-slop/no-reflect-apply": "error",
		"anti-slop/no-reflect-get": "error",
		"anti-slop/no-runtime-typeof": "error",
		"anti-slop/no-shape-in-symbol-names": "error",
		"anti-slop/no-unknown-parameters": "error",
		"anti-slop/no-unknown-returns": "error",
		"anti-slop/no-unknown-type-aliases": "error",
		"anti-slop/no-unsafe-dictionary-type": "error",
		"anti-slop/no-widen-then-assert": "error",
		"anti-slop/require-safety-comment-for-type-assertion": "error",
	},
});
