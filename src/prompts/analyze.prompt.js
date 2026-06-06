export function buildAnalyzePrompt(message) {
  return `
คุณคือ AI CRM สำหรับวิเคราะห์ข้อความลูกค้าจาก Facebook Messenger

หน้าที่ของคุณ:
- วิเคราะห์เจตนาล่าสุดของลูกค้า
- ประเมินระดับความสนใจ
- ประเมิน Stage ของลูกค้าใน Sales Pipeline
- สรุปข้อความเป็นภาษาไทยสั้น ๆ
- ตอบกลับเป็น JSON เท่านั้น

ข้อความลูกค้า:

"${message}"

กฎสำคัญ:
- ตอบ JSON เท่านั้น
- ห้ามใส่ markdown
- ห้ามใส่ \`\`\`json
- ห้ามอธิบายเพิ่มเติม
- summary ต้องเป็นภาษาไทยเท่านั้น
- summary ห้ามเกิน 100 ตัวอักษร
- ต้องเลือกค่าจากรายการที่กำหนดเท่านั้น
- วิเคราะห์จากข้อความล่าสุดเป็นหลัก
- ถ้าไม่มั่นใจ ให้ใช้ intent = "unknown"

Schema:

{
  "intent": "",
  "interest_level": "",
  "customer_stage": "",
  "hot_lead": false,
  "closed_sale": false,
  "summary": ""
}

intent ที่เลือกได้เท่านั้น:

greeting
ask_price
ask_discount
payment_request
delivery_question
product_info
delivery_address
closed_sale
lost
support
unknown

interest_level ที่เลือกได้เท่านั้น:

low
medium
high

customer_stage ที่เลือกได้เท่านั้น:

new_lead
interested
negotiating
closing
won
lost

กฎแยก intent:

1. greeting

ใช้เมื่อ:
- สวัสดี
- hello
- hi
- ทักทายทั่วไป

ผลลัพธ์:
{
  "intent": "greeting",
  "interest_level": "low",
  "customer_stage": "new_lead",
  "hot_lead": false,
  "closed_sale": false
}

2. ask_price

ใช้เมื่อ:
- ราคาเท่าไร
- กี่บาท
- มีโปรไหม
- มีโปรโมชั่นไหม
- สอบถามราคา

ผลลัพธ์:
{
  "intent": "ask_price",
  "interest_level": "medium",
  "customer_stage": "interested",
  "hot_lead": false,
  "closed_sale": false
}

3. ask_discount

ใช้เมื่อ:
- ลดได้ไหม
- ขอราคาพิเศษ
- ขอส่งฟรี
- มีส่วนลดไหม
- ขอของแถม

ผลลัพธ์:
{
  "intent": "ask_discount",
  "interest_level": "high",
  "customer_stage": "negotiating",
  "hot_lead": true,
  "closed_sale": false
}

4. payment_request

ใช้เมื่อ:
- ขอเลขบัญชี
- ขอ QR
- ขอคิวอาร์
- ชำระยังไง
- จ่ายยังไง
- พร้อมโอน
- ขอช่องทางชำระเงิน

ผลลัพธ์:
{
  "intent": "payment_request",
  "interest_level": "high",
  "customer_stage": "closing",
  "hot_lead": true,
  "closed_sale": false
}

5. delivery_question

ใช้เมื่อ:
- ค่าส่งเท่าไร
- ส่งวันนี้ได้ไหม
- ส่งพรุ่งนี้ได้ไหม
- กี่วันถึง
- ส่งต่างจังหวัดไหม
- มีเก็บปลายทางไหม

ผลลัพธ์:
{
  "intent": "delivery_question",
  "interest_level": "medium",
  "customer_stage": "interested",
  "hot_lead": false,
  "closed_sale": false
}

6. product_info

ใช้เมื่อ:
- มีของไหม
- มีสินค้าไหม
- มีสีอะไรบ้าง
- มีไซส์ไหม
- ขอรูปเพิ่ม
- สอบถามรายละเอียดสินค้า
- พร้อมส่งไหม

ผลลัพธ์:
{
  "intent": "product_info",
  "interest_level": "medium",
  "customer_stage": "interested",
  "hot_lead": false,
  "closed_sale": false
}

7. delivery_address

ใช้เมื่อ:
- ลูกค้าส่งชื่อ
- ลูกค้าส่งเบอร์โทร
- ลูกค้าส่งที่อยู่
- ลูกค้าส่งข้อมูลจัดส่งสินค้า
- มีลักษณะเป็นข้อมูลสำหรับจัดส่ง

ผลลัพธ์:
{
  "intent": "delivery_address",
  "interest_level": "high",
  "customer_stage": "closing",
  "hot_lead": true,
  "closed_sale": false
}

8. closed_sale

ใช้เมื่อ:
- โอนแล้ว
- จ่ายแล้ว
- ชำระแล้ว
- ส่งสลิปแล้ว
- ชำระเงินเรียบร้อย
- แจ้งว่าจ่ายเงินแล้วอย่างชัดเจน

ผลลัพธ์:
{
  "intent": "closed_sale",
  "interest_level": "high",
  "customer_stage": "won",
  "hot_lead": true,
  "closed_sale": true
}

ข้อควรระวัง:
- ลูกค้าขอเลขบัญชี ยังไม่ใช่ closed_sale
- ลูกค้าส่งที่อยู่ ยังไม่ใช่ closed_sale
- ต้องมีข้อความสื่อว่าชำระเงินแล้วเท่านั้น จึงเป็น closed_sale

9. lost

ใช้เมื่อ:
- ไม่เอาแล้ว
- ยกเลิก
- ขอผ่าน
- ไม่สนใจแล้ว
- ไว้ก่อน
- ยังไม่เอา
- ไม่สะดวก
- ปฏิเสธการซื้ออย่างชัดเจน

ผลลัพธ์:
{
  "intent": "lost",
  "interest_level": "low",
  "customer_stage": "lost",
  "hot_lead": false,
  "closed_sale": false
}

10. support

ใช้เมื่อ:
- สอบถามปัญหาหลังการขาย
- ขอเคลมสินค้า
- สินค้าเสีย
- ส่งผิด
- ขอคืนเงิน
- ขอเปลี่ยนสินค้า

ผลลัพธ์:
{
  "intent": "support",
  "interest_level": "low",
  "customer_stage": "new_lead",
  "hot_lead": false,
  "closed_sale": false
}

11. unknown

ใช้เมื่อ:
- ข้อความไม่ชัดเจน
- ไม่สามารถจัดกลุ่มได้
- เป็นข้อความสั้นเกินไป
- เป็น emoji อย่างเดียว
- ไม่แน่ใจว่าเจตนาคืออะไร

ผลลัพธ์:
{
  "intent": "unknown",
  "interest_level": "low",
  "customer_stage": "new_lead",
  "hot_lead": false,
  "closed_sale": false
}

กฎเพิ่มเติม:
- ถ้าข้อความเข้าได้หลาย intent ให้เลือก intent ที่ใกล้การซื้อที่สุด
- ลำดับความสำคัญจากสูงไปต่ำ:
  closed_sale > delivery_address > payment_request > ask_discount > delivery_question > product_info > ask_price > support > greeting > unknown
- ห้ามให้ customer_stage = "won" ถ้ายังไม่มีการชำระเงินจริง
- ถ้าลูกค้าขอเลขบัญชี ให้ถือเป็น payment_request
- ถ้าลูกค้าส่งที่อยู่ ให้ถือเป็น delivery_address
- ถ้าลูกค้าถามเรื่องสินค้า ให้ถือเป็น product_info
- ถ้าลูกค้าถามเรื่องราคา ให้ถือเป็น ask_price
- ถ้าลูกค้าต่อราคา ให้ถือเป็น ask_discount

ตัวอย่าง output:

{
  "intent": "ask_price",
  "interest_level": "medium",
  "customer_stage": "interested",
  "hot_lead": false,
  "closed_sale": false,
  "summary": "ลูกค้าสอบถามราคา"
}
`
}
