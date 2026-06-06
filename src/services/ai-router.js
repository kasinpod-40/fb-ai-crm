import { analyzeByRule } from "./rule-engine"

import { analyzeWithWorkersAI } from "./workers-ai"

import { analyzeWithGemini } from "./gemini"

function normalizeAIResult(ai) {
  return {
    intent: ai?.intent || "unknown",
    interest_level: ai?.interest_level || "low",
    customer_stage: ai?.customer_stage || "new_lead",
    hot_lead: ai?.hot_lead === true,
    closed_sale: ai?.closed_sale === true,
    summary: ai?.summary || "ไม่สามารถวิเคราะห์ข้อความได้"
  }
}

export async function analyze(env, text) {
  const ruleResult = analyzeByRule(text)

  if (ruleResult) {
    console.log("USING RULE ENGINE")

    return normalizeAIResult(ruleResult)
  }

  try {
    const workersAIResult = await analyzeWithWorkersAI(env, text)

    console.log("USING WORKERS AI")

    return normalizeAIResult(workersAIResult)
  } catch (err) {
    console.log("WORKERS AI FAILED:", err)
  }

  try {
    const geminiResult = await analyzeWithGemini(env, text)

    console.log("USING GEMINI")

    return normalizeAIResult(geminiResult)
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
