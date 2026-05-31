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
