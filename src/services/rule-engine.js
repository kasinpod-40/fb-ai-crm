function match(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

const RULES = {
  ask_price: ["ราคา", "ราคาเท่าไร", "ราคาเท่าไหร่", "กี่บาท", "เท่าไหร่"],

  ask_discount: ["ลดได้ไหม", "ลดได้มั้ย", "ลดราคา", "มีส่วนลดไหม", "ขอลด"],

  payment_request: [
    "ขอเลขบัญชี",
    "ส่งเลขบัญชี",
    "พร้อมโอน",
    "ขอ qr",
    "ส่ง qr",
    "ขอคิวอาร์",
    "ชำระยังไง",
    "จ่ายยังไง"
  ],

  delivery_question: [
    "ค่าส่ง",
    "ส่งวันนี้",
    "ส่งพรุ่งนี้",
    "ถึงเมื่อไร",
    "กี่วันถึง"
  ],

  product_info: [
    "มีของไหม",
    "มีสินค้าไหม",
    "มีสีอะไร",
    "มีไซส์ไหม",
    "มีไซส์อะไรบ้าง",
    "มีขนาดไหม",
    "พร้อมส่งไหม"
  ],

  closed_sale: [
    "โอนแล้ว",
    "โอนเงินแล้ว",
    "ชำระแล้ว",
    "จ่ายแล้ว",
    "ส่งสลิปแล้ว"
  ],

  lost: [
    "ไม่เอาแล้ว",
    "ไม่เป็นไรครับ",
    "ไม่เป็นไร",
    "ไม่สนใจ",
    "ยกเลิก",
    "ขอบคุณครับไม่รับแล้ว",
    "ไม่รับแล้ว"
  ]
}

function buildResult(intent) {
  const map = {
    ask_price: {
      interest_level: "medium",
      customer_stage: "interested",
      hot_lead: false,
      closed_sale: false,
      summary: "ลูกค้าสอบถามราคา"
    },

    ask_discount: {
      interest_level: "high",
      customer_stage: "negotiating",
      hot_lead: true,
      closed_sale: false,
      summary: "ลูกค้าต่อรองราคา"
    },

    payment_request: {
      interest_level: "high",
      customer_stage: "closing",
      hot_lead: true,
      closed_sale: false,
      summary: "ลูกค้าต้องการชำระเงิน"
    },

    delivery_question: {
      interest_level: "medium",
      customer_stage: "interested",
      hot_lead: false,
      closed_sale: false,
      summary: "ลูกค้าสอบถามการจัดส่ง"
    },

    product_info: {
      interest_level: "medium",
      customer_stage: "interested",
      hot_lead: false,
      closed_sale: false,
      summary: "ลูกค้าสอบถามข้อมูลสินค้า"
    },

    closed_sale: {
      interest_level: "high",
      customer_stage: "won",
      hot_lead: true,
      closed_sale: true,
      summary: "ลูกค้าแจ้งชำระเงินแล้ว"
    },

    lost: {
      interest_level: "low",
      customer_stage: "lost",
      hot_lead: false,
      closed_sale: false,
      summary: "ลูกค้าปฏิเสธการซื้อ"
    },

    short_chat: {
      intent: "small_talk",
      interest_level: "low",
      customer_stage: "new_lead",
      hot_lead: false,
      closed_sale: false,
      summary: "ข้อความทั่วไป"
    }
  }

  return {
    intent,
    ...map[intent]
  }
}

function isThaiAddress(text) {
  const hasPhone = /0[689]\d{8}/.test(text.replace(/\s/g, ""))

  const hasAddressKeyword =
    text.includes("ต.") ||
    text.includes("อ.") ||
    text.includes("จ.") ||
    text.includes("จังหวัด") ||
    text.includes("อำเภอ") ||
    text.includes("ตำบล") ||
    text.includes("หมู่") ||
    text.includes("ม.")

  const hasPostcode = /\b\d{5}\b/.test(text)

  return hasPhone && hasAddressKeyword && hasPostcode
}

export function analyzeByRule(message) {
  const text = (message || "").toLowerCase().trim()

  if (isThaiAddress(text)) {
    return {
      intent: "delivery_address",
      interest_level: "high",
      customer_stage: "closing",
      hot_lead: true,
      closed_sale: false,
      summary: "ลูกค้าส่งข้อมูลจัดส่งแล้ว"
    }
  }

  for (const [intent, keywords] of Object.entries(RULES)) {
    if (match(text, keywords)) {
      return buildResult(intent)
    }
  }

  return null
}
