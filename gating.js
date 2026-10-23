/**
 * Confidence gating for TypeSafe Jev answers.
 *
 * The answer types do not report certainty the same way, and that is the
 * whole reason this file exists:
 *
 * - `choice` and `score` carry an explicit `confidence` field, 0 to 1.
 * - `box` (Jev 1.14) also carries `confidence`, but the API may report none
 *   (`confidence: null`) for a located box.
 * - `noul` carries NO confidence field. It reports `noul`, the probability of
 *   yes. A 0.97 yes and a 0.03 no are both highly certain; 0.5 is maximum
 *   uncertainty.
 *
 * Reading `answer.confidence` generically gives `undefined` for every Noul and
 * for a confidence-less Box, which compares false against any threshold and
 * silently routes them to escalation. `certainty()` is the fix: a Box with no
 * reported confidence yields 0 (escalate) rather than throwing mid fan-out.
 *
 * @see https://docs.typesafe.ai/confidence
 */

/** Default routing thresholds. Act above `act`, review above `review`, else escalate. */
export const DEFAULT_THRESHOLDS = { act: 0.85, review: 0.6 }

/**
 * Normalise any answer to a 0-to-1 certainty.
 *
 * @param {{ type?: string, confidence?: number, noul?: number, box?: object }} answer one answer from a systemOne response
 * @returns {number} certainty, 0 (no information) to 1 (fully certain)
 * @throws {TypeError} when the answer is not a recognised shape, rather than
 *   returning a misleading zero
 */
export function certainty(answer) {
	if (answer === null || typeof answer !== "object") {
		throw new TypeError("certainty() expects an answer object")
	}
	if (answer.type === "noul" || typeof answer.noul === "number") {
		// Distance from the coin flip, rescaled to 0..1.
		return Math.abs(answer.noul - 0.5) * 2
	}
	if (typeof answer.confidence === "number") return answer.confidence
	// A box (Jev 1.14) carries confidence like choice and score, but the API
	// may report none. With no certainty to read, yield 0 so the answer routes
	// to escalate instead of throwing and breaking a whole fan-out partition.
	if (answer.type === "box" || (answer.box !== null && typeof answer.box === "object")) {
		return 0
	}
	throw new TypeError(
		`certainty() could not read an answer of type ${JSON.stringify(answer.type)}; expected choice, score, noul or box`,
	)
}

/**
 * Route one answer by how certain it is.
 *
 * @param {object} answer one answer from a systemOne response
 * @param {{ act?: number, review?: number }} [thresholds] override the defaults
 * @returns {"act" | "review" | "escalate"} what the calling code should do
 */
export function verdict(answer, thresholds = {}) {
	const { act, review } = { ...DEFAULT_THRESHOLDS, ...thresholds }
	const value = certainty(answer)
	if (value >= act) return "act"
	if (value >= review) return "review"
	return "escalate"
}

/**
 * Split a whole answers map into act / review / escalate buckets in one pass.
 * Useful after a fan-out, where one request asks many questions at once.
 *
 * @param {Record<string, object>} answers the `answers` map from a systemOne response
 * @param {{ act?: number, review?: number }} [thresholds] override the defaults
 * @returns {{ act: string[], review: string[], escalate: string[] }} question ids per bucket
 * @see https://docs.typesafe.ai/patterns/fan-out
 */
export function partition(answers, thresholds = {}) {
	const buckets = { act: [], review: [], escalate: [] }
	for (const [id, answer] of Object.entries(answers)) {
		buckets[verdict(answer, thresholds)].push(id)
	}
	return buckets
}

/**
 * Does this answer clear the bar to act on without review?
 *
 * @param {object} answer one answer from a systemOne response
 * @param {{ act?: number, review?: number }} [thresholds] override the defaults
 * @returns {boolean} true when the verdict is "act"
 */
export function actionable(answer, thresholds = {}) {
	return verdict(answer, thresholds) === "act"
}
