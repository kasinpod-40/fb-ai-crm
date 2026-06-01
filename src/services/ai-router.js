import { analyzeMessage } from "./ai"

export async function analyze(env, message) {
  try {
    return await analyzeMessage(env, message)
  } catch (err) {
    console.log("GEMINI FAILED:", err.message)

    return {
      intent: "unknown",
      interest_level: "low",
      customer_stage: "new_lead",
      hot_lead: false,
      closed_sale: false,
      summary: message
    }
  }
}