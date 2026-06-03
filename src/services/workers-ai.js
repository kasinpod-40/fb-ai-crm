import { buildAnalyzePrompt } from "../prompts/analyze.prompt"

import { parseAIResponse } from "./ai-parser"

export async function analyzeWithWorkersAI(env, message) {
  console.log("WORKERS AI START")

  const prompt = buildAnalyzePrompt(message)

  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt
  })

  const raw = response.response || response.result || ""

  console.log("WORKERS RAW:", raw)

  const ai = parseAIResponse(raw)

  console.log("WORKERS PARSED:", JSON.stringify(ai))

  return ai
}
