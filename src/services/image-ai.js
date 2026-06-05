import { GoogleGenerativeAI } from "@google/generative-ai"

export async function analyzeImage(env, imageUrl) {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite"
  })

  const imageRes = await fetch(imageUrl)

  const imageBuffer = await imageRes.arrayBuffer()

  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

  const prompt = `
วิเคราะห์รูปภาพจาก Facebook Messenger

ให้ตอบ JSON เท่านั้น ห้ามใส่ markdown

ระบุว่ารูปนี้คือ:
- product_image = รูปสินค้า
- payment_slip = สลิปโอนเงิน
- other = อื่นๆ

ถ้าเป็นสินค้า ให้ระบุชื่อสินค้าโดยประมาณ
ถ้าเป็นสลิป ให้ดึงยอดเงิน ธนาคาร และเวลาที่โอน ถ้าอ่านได้

{
  "image_type": "",
  "product_name": "",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0,
  "summary": ""
}
`

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg"
      }
    }
  ])

  const raw = result.response.text()

  const clean = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()

  return JSON.parse(clean)
}
