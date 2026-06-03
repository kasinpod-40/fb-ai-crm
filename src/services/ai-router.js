import { analyzeByRule } from "./rule-engine"

import { analyzeWithWorkersAI } from "./workers-ai"

import { analyzeWithGemini } from "./gemini"

export async function analyze(env, text) {
  const ruleResult = analyzeByRule(text)

  if (ruleResult) {
    console.log("RULE MATCH")

    return ruleResult
  }

  try {
    return await analyzeWithWorkersAI(env, text)
    console.log("USING WORKERS AI")
  } catch (err) {
    console.log("WORKERS AI FAILED:", err)
  }

  try {
    return await analyzeWithGemini(env, text)
    console.log("USING GEMINI")
  } catch (err) {
    console.log("GEMINI FAILED:", err)
  }

  return {
    intent: "unknown",
    interest_level: "low",
    customer_stage: "new_lead",
    hot_lead: false,
    closed_sale: false,
    summary: "ไม่สามารถวิเคราะห์ข้อความได้"
  }
}
