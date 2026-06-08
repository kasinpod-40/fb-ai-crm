import { analyzeByRule } from "./rule-engine"

import { analyzeWithWorkersAI } from "./workers-ai"

import { analyzeWithGemini } from "./gemini"

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "")

  const parsed = Number(cleaned)

  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeAIResult(ai) {
  return {
    intent: ai?.intent || "unknown",
    interest_level: ai?.interest_level || "low",
    customer_stage: ai?.customer_stage || "new_lead",
    hot_lead: ai?.hot_lead === true,
    closed_sale: ai?.closed_sale === true,

    product_name: ai?.product_name || "",
    product_qty: toNumber(ai?.product_qty),
    product_unit: ai?.product_unit || "",

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
    product_name: "",
    product_qty: 0,
    product_unit: "",
    summary: "ไม่สามารถวิเคราะห์ข้อความได้"
  }
}
