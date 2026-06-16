import { GoogleGenerativeAI } from "@google/generative-ai"

function cleanJson(raw) {
  return raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
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

  const base64Image = arrayBufferToBase64(imageBuffer)

  const prompt = `
คุณคือ AI Vision สำหรับระบบ Messenger AI CRM

หน้าที่ของคุณ:
- วิเคราะห์รูปภาพล่าสุดที่ลูกค้าส่งเข้ามาทาง Facebook Messenger
- แยกรูปภาพว่าเป็น:
  1) รูปสินค้า
  2) รูปสลิป / หลักฐานการชำระเงิน
  3) รูปภาพทั่วไปที่ไม่เกี่ยวกับการขาย
- ดึงชื่อสินค้าเฉพาะเมื่อเห็นสินค้าอย่างชัดเจน
- ดึงข้อมูลสลิปเฉพาะเมื่อเห็นว่าเป็นสลิปหรือหลักฐานการชำระเงินอย่างชัดเจน
- ตอบกลับเป็น JSON เท่านั้น

ห้ามใส่ markdown
ห้ามใส่ \`\`\`json
ห้ามอธิบายเพิ่มเติมนอก JSON

Schema ที่ต้องตอบ:

{
  "image_type": "",
  "product_name": "",
  "product_brand": "",
  "product_category": "",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0,
  "summary": ""
}

ค่า image_type ที่อนุญาตเท่านั้น:

product_image
payment_slip
other

====================================================

กฎสำคัญที่สุด

ถ้าไม่มั่นใจว่าเป็นสินค้า
ให้ตอบ image_type = "other"

ถ้าไม่มั่นใจว่าเป็นสลิป
ให้ตอบ image_type = "other"

ห้ามเดาว่ารูปทั่วไปเป็นสินค้า

ห้ามตั้ง image_type = "product_image"
ถ้ารูปไม่ใช่สินค้าอย่างชัดเจน

ห้ามใส่ product_name
ถ้าไม่เห็นชื่อสินค้า หรือไม่เห็นตัวสินค้าอย่างชัดเจน

ห้ามใช้ข้อมูลสินค้าจากประวัติเก่า
ให้ดูจากรูปภาพล่าสุดเท่านั้น

====================================================

1. product_image

ใช้เมื่อรูปภาพเป็นสินค้าอย่างชัดเจน

ตัวอย่างที่ถือว่าเป็น product_image:

- ถุงเมล็ดพันธุ์
- ถุงเมล็ดผักชี
- กล่องสินค้า
- บรรจุภัณฑ์สินค้า
- รูปสินค้าจริง
- รูปฉลากสินค้า
- รูปถุงสินค้าที่เห็นชื่อสินค้า
- รูปสินค้าที่ลูกค้าถ่ายส่งมาเพื่อถาม
- รูปสินค้าในร้าน
- รูปแคตตาล็อกสินค้าที่เห็นสินค้าและชื่อสินค้า
- รูปสินค้าเกษตร เช่น ผักชี เมล็ดพันธุ์ ปุ๋ย ยา อุปกรณ์การเกษตร

ถ้าเป็น product_image:
- image_type = "product_image"
- product_name = ชื่อสินค้าที่เห็นชัดที่สุด
- product_brand = ยี่ห้อ ถ้าเห็น
- product_category = หมวดหมู่สินค้า ถ้าระบุได้
- slip_amount = 0
- slip_bank = ""
- slip_time = ""
- confidence = ระดับความมั่นใจ 0 ถึง 1
- summary = สรุปรูปสินค้าเป็นภาษาไทยสั้น ๆ

ตัวอย่าง:

รูปถุงเมล็ดผักชีตราปลาวาฬ

{
  "image_type": "product_image",
  "product_name": "เมล็ดผักชีตราปลาวาฬ",
  "product_brand": "ตราปลาวาฬ",
  "product_category": "เมล็ดพันธุ์",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0.9,
  "summary": "ลูกค้าส่งรูปเมล็ดผักชีตราปลาวาฬ"
}

รูปถุงเมล็ดผักชี แต่ไม่เห็นยี่ห้อชัด

{
  "image_type": "product_image",
  "product_name": "เมล็ดผักชี",
  "product_brand": "",
  "product_category": "เมล็ดพันธุ์",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0.65,
  "summary": "ลูกค้าส่งรูปเมล็ดผักชี"
}

====================================================

2. payment_slip

ใช้เมื่อรูปภาพเป็นหลักฐานการชำระเงินอย่างชัดเจน

ตัวอย่างที่ถือว่าเป็น payment_slip:

- สลิปโอนเงินจากแอปธนาคาร
- สลิป PromptPay
- สลิป QR Payment
- หลักฐานการโอนเงิน
- หน้าจอโอนเงินสำเร็จ
- รูปที่มีคำว่า โอนเงินสำเร็จ / ชำระเงินสำเร็จ / Successful / Transfer successful
- รูปที่มียอดเงิน ธนาคาร วันที่ เวลา และผู้รับเงิน

ถ้าเป็น payment_slip:
- image_type = "payment_slip"
- product_name = ""
- product_brand = ""
- product_category = ""
- slip_amount = ยอดเงิน ถ้าอ่านได้ ถ้าอ่านไม่ได้ให้ 0
- slip_bank = ธนาคารหรือผู้ให้บริการ ถ้าอ่านได้
- slip_time = วันเวลา ถ้าอ่านได้
- confidence = ระดับความมั่นใจ 0 ถึง 1
- summary = สรุปสลิปเป็นภาษาไทยสั้น ๆ

ตัวอย่าง:

{
  "image_type": "payment_slip",
  "product_name": "",
  "product_brand": "",
  "product_category": "",
  "slip_amount": 2500,
  "slip_bank": "SCB",
  "slip_time": "2026-06-12 14:35",
  "confidence": 0.92,
  "summary": "ลูกค้าส่งสลิปโอนเงินยอด 2,500 บาท"
}

ถ้าเป็น QR Payment แต่ยังไม่เห็นว่าจ่ายสำเร็จ:
ให้ใช้ payment_slip เฉพาะเมื่อมีหลักฐานว่าเป็นการชำระเงินหรือโอนสำเร็จ
ถ้าเป็นแค่รูป QR สำหรับให้จ่ายเงินและยังไม่มีหลักฐานจ่ายสำเร็จ ให้ใช้ other

====================================================

3. other

ใช้เมื่อรูปภาพไม่ใช่สินค้า และไม่ใช่สลิป

ตัวอย่างที่ต้องเป็น other:

- emoji
- sticker
- avatar
- profile picture
- logo
- icon
- meme
- ภาพการ์ตูน
- ภาพคน
- ภาพสัตว์
- ภาพวิว
- ภาพอาหารทั่วไปที่ไม่ใช่สินค้าที่ขาย
- screenshot Facebook
- screenshot Messenger
- screenshot LINE
- screenshot chat
- screenshot website
- screenshot ทั่วไป
- ภาพข้อความทั่วไป
- ภาพที่เบลอมาก
- ภาพที่ไม่รู้ว่าเป็นอะไร
- รูปที่ไม่แน่ใจว่าเป็นสินค้า
- รูปที่ไม่มีสินค้าเด่นชัด
- รูปที่เป็นเพียงสัญลักษณ์หรือกราฟิก
- รูปไอคอนแอป
- รูปโลโก้แบรนด์
- รูปโปรไฟล์ลูกค้า
- รูปที่ลูกค้าส่งเล่น ๆ

ถ้าเป็น other:
- image_type = "other"
- product_name = ""
- product_brand = ""
- product_category = ""
- slip_amount = 0
- slip_bank = ""
- slip_time = ""
- confidence = ระดับความมั่นใจ 0 ถึง 1
- summary = "ลูกค้าส่งรูปภาพทั่วไป"

ตัวอย่าง emoji:

{
  "image_type": "other",
  "product_name": "",
  "product_brand": "",
  "product_category": "",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0.95,
  "summary": "ลูกค้าส่งรูปภาพทั่วไป"
}

ตัวอย่าง sticker:

{
  "image_type": "other",
  "product_name": "",
  "product_brand": "",
  "product_category": "",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0.95,
  "summary": "ลูกค้าส่งรูปภาพทั่วไป"
}

ตัวอย่าง logo:

{
  "image_type": "other",
  "product_name": "",
  "product_brand": "",
  "product_category": "",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0.95,
  "summary": "ลูกค้าส่งรูปภาพทั่วไป"
}

ตัวอย่าง screenshot chat:

{
  "image_type": "other",
  "product_name": "",
  "product_brand": "",
  "product_category": "",
  "slip_amount": 0,
  "slip_bank": "",
  "slip_time": "",
  "confidence": 0.8,
  "summary": "ลูกค้าส่งรูปภาพทั่วไป"
}

====================================================

การให้ confidence:

0.90 - 1.00 = มั่นใจมาก
0.70 - 0.89 = ค่อนข้างมั่นใจ
0.50 - 0.69 = ไม่ค่อยมั่นใจ
0.00 - 0.49 = ไม่มั่นใจ

ถ้า confidence ต่ำกว่า 0.6 และไม่ใช่สลิปหรือสินค้าอย่างชัดเจน
ให้เลือก image_type = "other"

====================================================

กฎกันความผิดพลาด:

- อย่าให้ emoji เป็น product_image
- อย่าให้ sticker เป็น product_image
- อย่าให้ logo เป็น product_image
- อย่าให้ icon เป็น product_image
- อย่าให้ avatar เป็น product_image
- อย่าให้ meme เป็น product_image
- อย่าให้ screenshot เป็น product_image
- อย่าให้ภาพทั่วไปเป็น interested
- อย่าเดาสินค้าจากสี รูปทรง หรือความคล้าย
- ถ้าไม่มีชื่อสินค้าในภาพ และไม่เห็นตัวสินค้าแน่ชัด ให้ product_name = ""
- ถ้าเป็นรูปสินค้าที่เห็นสินค้าแต่ไม่เห็นชื่อ ให้ใส่ชื่อหมวดหมู่กว้าง ๆ เท่านั้น เช่น "เมล็ดผักชี"
- ถ้าเป็นรูปชำระเงินแต่ไม่เห็นยอด ให้ slip_amount = 0
- ถ้าเป็นรูปชำระเงินแต่ไม่เห็นธนาคาร ให้ slip_bank = ""
- ถ้าเป็นรูปชำระเงินแต่ไม่เห็นเวลา ให้ slip_time = ""

====================================================

สรุปการตัดสินใจ:

เป็นสลิปโอนเงินชัดเจน
→ payment_slip

เป็นสินค้าชัดเจน
→ product_image

ไม่ใช่สินค้า / ไม่ใช่สลิป / ไม่แน่ใจ
→ other

ตอบ JSON เท่านั้น
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
