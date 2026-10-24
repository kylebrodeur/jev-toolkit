import { describe, expect, it } from "vitest"

import { actionable, certainty, DEFAULT_THRESHOLDS, partition, verdict } from "../gating.js"

// Recorded answer shapes, matching @typesafe-ai/sdk 0.7.0 type declarations.
const choiceAnswer = (confidence) => ({
	type: "choice",
	choice: "billing",
	confidence,
	probabilities: { billing: confidence, technical: 1 - confidence },
})
const scoreAnswer = (confidence) => ({
	type: "score",
	score: 2.4,
	confidence,
	legend: {},
	probabilities: {},
})
const noulAnswer = (noul) => ({ type: "noul", noul })
const boxAnswer = (confidence) => ({
	type: "box",
	box: { top: 0.25, bottom: 0.82, left: 0.44, right: 0.84 },
	confidence,
})

describe("certainty", () => {
	it("reads confidence directly for choice and score", () => {
		expect(certainty(choiceAnswer(0.91))).toBe(0.91)
		expect(certainty(scoreAnswer(0.42))).toBe(0.42)
	})

	it("derives certainty for noul, which has no confidence field", () => {
		// A confident yes and a confident no are equally certain.
		expect(certainty(noulAnswer(0.97))).toBeCloseTo(0.94)
		expect(certainty(noulAnswer(0.03))).toBeCloseTo(0.94)
	})

	it("treats a coin-flip noul as zero certainty", () => {
		expect(certainty(noulAnswer(0.5))).toBe(0)
	})

	it("throws rather than returning a misleading zero for an unknown shape", () => {
		expect(() => certainty({ type: "mystery" })).toThrow(TypeError)
		expect(() => certainty(null)).toThrow(TypeError)
	})
})

describe("verdict", () => {
	it("routes by the default thresholds", () => {
		expect(verdict(choiceAnswer(0.9))).toBe("act")
		expect(verdict(choiceAnswer(0.7))).toBe("review")
		expect(verdict(choiceAnswer(0.3))).toBe("escalate")
	})

	it("is inclusive at each boundary", () => {
		expect(verdict(choiceAnswer(DEFAULT_THRESHOLDS.act))).toBe("act")
		expect(verdict(choiceAnswer(DEFAULT_THRESHOLDS.review))).toBe("review")
	})

	it("accepts partial threshold overrides", () => {
		expect(verdict(choiceAnswer(0.7), { act: 0.65 })).toBe("act")
	})

	it("does not send a confident no to escalation", () => {
		// The bug this module exists to prevent: reading answer.confidence
		// generically yields undefined for a noul, which fails every threshold.
		expect(noulAnswer(0.02).confidence).toBeUndefined()
		expect(verdict(noulAnswer(0.02))).toBe("act")
	})
})

describe("partition", () => {
	it("buckets a fan-out response by question id", () => {
		const answers = {
			urgent: noulAnswer(0.98),
			category: choiceAnswer(0.72),
			severity: scoreAnswer(0.2),
		}
		expect(partition(answers)).toEqual({
			act: ["urgent"],
			review: ["category"],
			escalate: ["severity"],
		})
	})

	it("returns empty buckets for an empty response", () => {
		expect(partition({})).toEqual({ act: [], review: [], escalate: [] })
	})
})

describe("actionable", () => {
	it("is true only for the act verdict", () => {
		expect(actionable(choiceAnswer(0.95))).toBe(true)
		expect(actionable(choiceAnswer(0.7))).toBe(false)
	})
})

describe("box answers (Jev 1.14)", () => {
	it("reads confidence directly when the API reports one", () => {
		expect(certainty(boxAnswer(0.92))).toBe(0.92)
		expect(verdict(boxAnswer(0.92))).toBe("act")
	})

	it("treats a box with no reported confidence as zero, not a throw", () => {
		// The SDK returns confidence: null when the model reports none. A box
		// always returns edges, so there is no "not found"; with no certainty
		// to read, escalate rather than act or crash.
		expect(certainty(boxAnswer(null))).toBe(0)
		expect(certainty(boxAnswer())).toBe(0)
		expect(verdict(boxAnswer(null))).toBe("escalate")
	})

	it("never throws inside a mixed fan-out partition", () => {
		const answers = {
			located: boxAnswer(0.9),
			unsure_box: boxAnswer(null),
			present: noulAnswer(0.97),
		}
		expect(partition(answers)).toEqual({
			act: ["located", "present"],
			review: [],
			escalate: ["unsure_box"],
		})
	})
})
