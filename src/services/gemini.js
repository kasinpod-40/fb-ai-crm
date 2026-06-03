import { GoogleGenerativeAI } from "@google/generative-ai"

import { buildAnalyzePrompt } from "../prompts/analyze.prompt"

import { parseAIResponse } from "./ai-parser"

export async function analyzeWithGemini(env, message) {
  console.log("AI START")

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  })

  const prompt = buildAnalyzePrompt(message)

  const result = await model.generateContent(prompt)

  const raw = result.response.text()

  console.log("AI RAW:", raw)

  const ai = parseAIResponse(raw)

  console.log("AI PARSED:", JSON.stringify(ai))

  return ai
}
