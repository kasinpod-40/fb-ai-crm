import { GoogleGenerativeAI } from "@google/generative-ai"

export async function analyzeMessage(env, message) {
  console.log("AI START")

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  })

  const prompt = `
คุณคือ AI CRM วิเคราะห์ลูกค้า Facebook Messenger

วิเคราะห์ข้อความ:

"${message}"

ตอบ JSON เท่านั้น

ห้ามใส่ markdown
ห้ามใส่ \`\`\`json
ห้ามอธิบายเพิ่มเติม

{
  "intent": "",
  "interest_level": "",
  "customer_stage": "",
  "hot_lead": false,
  "closed_sale": false,
  "summary": ""
}
`
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

/*export async function analyzeMessage(
  env,
  text
) {

  console.log(
    "AI START"
  )

  const response =
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
`วิเคราะห์ข้อความลูกค้า:

"${text}"

ตอบ JSON เท่านั้น:

{
  "intent": "",
  "interest_level": "",
  "summary": "",
  "is_customer_ready": false
}`
                }
              ]
            }
          ]
        })
      }
    )

  console.log(
    "AI RESPONSE STATUS:",
    response.status
  )

  const raw =
    await response.text()

  console.log(
    "AI RAW:",
    raw
  )

  const data = JSON.parse(raw)

  const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

  const cleanText = aiText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()

  console.log("AI CLEAN:", cleanText)

  return JSON.parse(cleanText)
}*/
