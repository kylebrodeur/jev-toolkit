// Verify a project's Jev wiring end to end. Run once after setup:
//   node scripts/jev-smoke.mjs
//
// Prints the verdict, never the key.
import { TypeSafeClient, noul } from "@typesafe-ai/sdk"
import { verdict } from "jev-toolkit/gating"
import { loadKey } from "jev-toolkit/key"

// Replace with this project's reference, or drop the ref to use the environment.
const source = loadKey({ ref: "op://<vault>/Typesafe AI Key/<field>" })
console.log(`key source: ${source}`)

const client = new TypeSafeClient()
const response = await client.systemOne({
	state: "Help! My payouts have been failing for 3 days.",
	questions: {
		is_urgent: noul("Does this message convey urgency?"),
	},
})

const answer = response.answers.is_urgent
console.log(`model: ${response.model}`)
console.log(`noul: ${answer.noul.toFixed(3)} -> ${verdict(answer)}`)
