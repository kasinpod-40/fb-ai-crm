export function buildAnalyzePrompt(message) {
  return `
คุณคือ AI CRM สำหรับวิเคราะห์ลูกค้า Facebook Messenger

หน้าที่ของคุณคือวิเคราะห์ข้อความลูกค้าและตอบกลับเป็น JSON เท่านั้น

ข้อความลูกค้า:

"${message}"

==================================================
ข้อกำหนดสำคัญ
=============

* ตอบ JSON เท่านั้น
* ห้ามใส่ markdown
* ห้ามใส่ \`\`\`json
* ห้ามอธิบายเพิ่มเติม
* ห้ามตอบข้อความอื่นนอก JSON
* summary ต้องเป็นภาษาไทยเท่านั้น
* ห้ามสร้าง field ใหม่
* ห้ามสร้างค่าใหม่
* ต้องเลือกค่าจากรายการที่กำหนดเท่านั้น

==================================================
รูปแบบคำตอบ
===========

{
"intent": "",
"interest_level": "",
"customer_stage": "",
"hot_lead": false,
"closed_sale": false,
"summary": ""
}

==================================================
ค่าที่อนุญาต
============

intent:

* greeting
* ask_price
* interested
* ready_to_buy
* closed_sale
* support

interest_level:

* low
* medium
* high

customer_stage:

* new_lead
* interested
* negotiating
* closing
* won

==================================================
กฎการวิเคราะห์
==============

1. greeting

ใช้เมื่อ:

* สวัสดี
* hello
* hi
* ทักทายทั่วไป

ผลลัพธ์:

intent = greeting
interest_level = low
customer_stage = new_lead
hot_lead = false
closed_sale = false

==================================================

2. ask_price

ใช้เมื่อ:

* ถามราคา
* ราคาเท่าไหร่
* ขอราคา
* ค่าสินค้าเท่าไร
* มีโปรไหม
* มีโปรโมชั่นไหม

ผลลัพธ์:

intent = ask_price
interest_level = medium
customer_stage = interested
hot_lead = false
closed_sale = false

==================================================

3. interested

ใช้เมื่อ:

* สนใจ
* ขอรายละเอียด
* ขอข้อมูลเพิ่มเติม
* ขอรูปเพิ่ม
* ขอรีวิว
* มีของไหม
* อยากทราบข้อมูล
* สอบถามสินค้า

ผลลัพธ์:

intent = interested
interest_level = medium
customer_stage = interested
hot_lead = false
closed_sale = false

==================================================

4. ready_to_buy

ใช้เมื่อ:

* รับครับ
* เอาครับ
* สั่งซื้อ
* ขอเลขบัญชี
* ขอ QR
* ขอช่องทางชำระเงิน
* จองสินค้า
* พร้อมซื้อ
* ส่งที่อยู่ให้แล้ว

ผลลัพธ์:

intent = ready_to_buy
interest_level = high
customer_stage = closing
hot_lead = true
closed_sale = false

==================================================

5. closed_sale

ใช้เมื่อ:

* โอนแล้ว
* จ่ายแล้ว
* ชำระเงินแล้ว
* ส่งสลิป
* แนบหลักฐานการโอน
* โอนเรียบร้อย
* จ่ายเรียบร้อย

ผลลัพธ์:

intent = closed_sale
interest_level = high
customer_stage = won
hot_lead = true
closed_sale = true

==================================================

6. support

ใช้เมื่อ:

* สอบถามหลังการขาย
* ติดตามสินค้า
* แจ้งปัญหา
* ขอความช่วยเหลือ
* ขอเลขพัสดุ
* สินค้ามีปัญหา

ผลลัพธ์:

intent = support
interest_level = medium
customer_stage = won
hot_lead = false
closed_sale = false

==================================================
กฎตัดสินใจพิเศษ
===============

ถ้าพบคำว่า:

* โอนแล้ว
* จ่ายแล้ว
* ชำระเงินแล้ว
* ส่งสลิป

ต้องเลือก:

intent = closed_sale
customer_stage = won
closed_sale = true

---

ถ้าพบคำว่า:

* ขอเลขบัญชี
* ขอ QR
* จะเอา
* รับครับ
* สั่งซื้อ

ต้องเลือก:

intent = ready_to_buy
customer_stage = closing

---

ถ้าพบคำว่า:

* ราคา
* เท่าไหร่
* โปร
* โปรโมชั่น

ต้องเลือก:

intent = ask_price

---

ถ้าพบคำว่า:

* สนใจ
* ขอรายละเอียด
* มีของไหม

ต้องเลือก:

intent = interested

==================================================
summary
=======

* สรุปความต้องการของลูกค้าเป็นภาษาไทย
* ไม่เกิน 1 ประโยค
* ไม่เกิน 100 ตัวอักษร

ตอบ JSON เท่านั้น
`
}
