import { analyzeMessage } from "./ai"

export async function analyze(env, message) {
  try {
    return await analyzeMessage(env, message)
  } catch (err) {
    console.log("GEMINI FAILED:", err)
    throw err
  }
}
