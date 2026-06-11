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

image_type ที่อนุญาต:

product_image
payment_slip
other

====================================================

กฎสำคัญมาก

1. product_image

ใช้เฉพาะเมื่อเป็น "สินค้า" อย่างชัดเจน

ตัวอย่าง:

- ถุงเมล็ดพันธุ์
- กล่องสินค้า
- สินค้าจริง
- บรรจุภัณฑ์สินค้า
- รูปสินค้าที่ลูกค้าส่งมาถาม

ถ้าระบุสินค้าได้
ให้ใส่ product_name

====================================================

2. payment_slip

ใช้เฉพาะเมื่อเป็นสลิปโอนเงิน

ให้ดึง

- slip_amount
- slip_bank
- slip_time

====================================================

3. other

ใช้เมื่อรูปไม่ใช่สินค้าและไม่ใช่สลิป

ตัวอย่าง:

- emoji
- sticker
- avatar
- profile picture
- logo
- icon
- meme
- screenshot ทั่วไป
- ภาพข้อความ
- ภาพวิว
- ภาพคน
- ภาพสัตว์
- ภาพการ์ตูน
- รูปที่ไม่แน่ใจว่าเป็นสินค้า

====================================================

กฎสำคัญ

ถ้าไม่มั่นใจ

ให้เลือก

image_type = "other"

ห้ามเดาว่าเป็นสินค้า

ห้ามเลือก product_image
ถ้ารูปไม่ใช่สินค้าอย่างชัดเจน

====================================================

ตัวอย่าง

emoji

{
  "image_type":"other",
  "product_name":"",
  "summary":"ลูกค้าส่งรูปภาพทั่วไป"
}

sticker

{
  "image_type":"other",
  "product_name":"",
  "summary":"ลูกค้าส่งรูปภาพทั่วไป"
}

logo

{
  "image_type":"other",
  "product_name":"",
  "summary":"ลูกค้าส่งรูปภาพทั่วไป"
}

ภาพวิว

{
  "image_type":"other",
  "product_name":"",
  "summary":"ลูกค้าส่งรูปภาพทั่วไป"
}

ถุงเมล็ดผักชีตราปลาวาฬ

{
  "image_type":"product_image",
  "product_name":"เมล็ดผักชีตราปลาวาฬ"
}

สลิปโอนเงิน

{
  "image_type":"payment_slip"
}

====================================================

confidence ต้องเป็นเลข 0 ถึง 1

summary ต้องเป็นภาษาไทย
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

    product_name:
      parsed.image_type === "product_image" ? parsed.product_name || "" : "",

    slip_amount: toNumber(parsed.slip_amount),

    slip_bank: parsed.slip_bank || "",

    slip_time: parsed.slip_time || "",

    confidence: Number(parsed.confidence || 0),

    summary:
      parsed.summary ||
      (parsed.image_type === "other"
        ? "ลูกค้าส่งรูปภาพทั่วไป"
        : "ไม่สามารถสรุปรูปภาพได้")
  }
}

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
