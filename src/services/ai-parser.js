export function parseAIResponse(raw) {
  try {
    const clean = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    const start = clean.indexOf("{")
    const end = clean.lastIndexOf("}")

    const json = clean.slice(start, end + 1)

    return JSON.parse(json)
  } catch (err) {
    console.log("PARSE FAILED:", raw)

    throw err
  }
}
