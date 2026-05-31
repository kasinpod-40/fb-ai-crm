export function buildAnalyzePrompt(message) {
  return `
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

intent:
- greeting
- ask_price
- interested
- ready_to_buy
- payment
- closed_sale
- support

interest_level:
- low
- medium
- high

customer_stage:
- new_lead
- interested
- negotiating
- closing
- customer
`
}
