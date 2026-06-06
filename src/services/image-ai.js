import { GoogleGenerativeAI } from "@google/generative-ai"

function cleanJson(raw) {
  return raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()
}

export async function analyzeImage(env, imageUrl) {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite"
  })

  const imageRes = await fetch(imageUrl)

  if (!imageRes.ok) {
    throw new Error(`IMAGE FETCH FAILED: ${imageRes.status}`)
  }

  const mimeType = imageRes.headers.get("content-type") || "image/jpeg"

  const imageBuffer = await imageRes.arrayBuffer()

  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

  const prompt = `
วิเคราะห์รูปภาพจาก Facebook Messenger

ตอบ JSON เท่านั้น
ห้ามใส่ markdown
ห้ามใส่ \`\`\`json

Schema:

{
  "image_type": "",
  "product_name": "",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0,
  "summary": ""
}

image_type:

product_image
payment_slip
other

กฎ:

- ถ้าเป็นรูปสินค้า ให้พยายามระบุชื่อสินค้า
- ถ้าเป็นสลิป ให้ดึงยอดเงิน ธนาคาร และเวลา
- confidence ต้องเป็นเลข 0 ถึง 1
- summary เป็นภาษาไทย
`

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType
      }
    }
  ])

  const raw = result.response.text()

  console.log("IMAGE RAW:", raw)

  const clean = cleanJson(raw)

  const parsed = JSON.parse(clean)

  return {
    image_type: parsed.image_type || "other",
    product_name: parsed.product_name || "",
    slip_amount: Number(parsed.slip_amount || 0),
    slip_bank: parsed.slip_bank || "",
    slip_time: parsed.slip_time || "",
    confidence: Number(parsed.confidence || 0),
    summary: parsed.summary || "ไม่สามารถสรุปรูปภาพได้"
  }
}
