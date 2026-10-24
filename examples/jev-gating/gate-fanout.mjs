// Route a fan-out answer set by confidence: the toolkit's core job, with no
// key and no network call. Run from a project that has the toolkit installed:
//   node examples/jev-gating/gate-fanout.mjs
import { partition, verdict, certainty } from "jev-toolkit/gating"

// Answers from a systemOne fan-out, exactly as the API returns them.
// A noul carries no confidence field; a box may report confidence: null.
// Reading answer.confidence directly scores both as "no certainty" and
// escalates confident answers; verdict() routes on the real distribution.
const answers = {
	urgent: { type: "noul", noul: 0.97 },
	topic: { type: "choice", choice: "billing", confidence: 0.72 },
	unclear: { type: "noul", noul: 0.5 },
	region: {
		type: "box",
		box: { top: 0.1, bottom: 0.9, left: 0.1, right: 0.9 },
		confidence: null,
	},
}

console.log(JSON.stringify(partition(answers)))
console.log(`verdict(noul 0.44): ${verdict({ type: "noul", noul: 0.44 })}`)
console.log(`verdict(box, no confidence): ${verdict(answers.region)}`)
console.log(`certainty(coin-flip noul): ${certainty({ type: "noul", noul: 0.5 })}`)