import { GoogleGenerativeAI } from "@google/generative-ai"
import { buildAnalyzePrompt } from "../prompts/analyze.prompt"

export async function analyzeMessage(env, message) {
  console.log("AI START")

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  })

  const prompt = buildAnalyzePrompt(message)
  
  const result = await model.generateContent(prompt)

  const raw = result.response.text()

  console.log("AI RAW:", raw)

  const clean = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()

  const ai = JSON.parse(clean)

  console.log("AI PARSED:", JSON.stringify(ai))

  return ai
}
