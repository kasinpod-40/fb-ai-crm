function match(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

const RULES = {
  greeting: [
    "hi",
    "hello",
    "สวัสดี",
    "สวัสดีครับ",
    "สวัสดีค่ะ",
    "หวัดดี",
    "หวัดดีครับ",
    "หวัดดีค่ะ"
  ],

  general_inquiry: [
    "สอบถามครับ",
    "สอบถามค่ะ",
    "สอบถามคะ",
    "สอบถามหน่อยครับ",
    "สอบถามหน่อยค่ะ",
    "ขอสอบถาม",
    "สอบถาม"
  ],

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
    "พร้อมส่งไหม",
    "ขอรูปเพิ่ม",
    "รายละเอียดสินค้า"
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
  ],

  payment_amount: ["ยอด", "รวม", "ราคา", "โอน", "ชำระ"]
}

function buildResult(intent) {
  const map = {
    greeting: {
      interest_level: "low",
      customer_stage: "new_lead",
      hot_lead: false,
      closed_sale: false,
      product_name: "",
      product_qty: 0,
      product_unit: "",
      summary: "ลูกค้าทักเข้ามา"
    },

    general_inquiry: {
      interest_level: "low",
      customer_stage: "new_lead",
      hot_lead: false,
      closed_sale: false,
      product_name: "",
      product_qty: 0,
      product_unit: "",
      summary: "ลูกค้าสอบถามข้อมูลเพิ่มเติม"
    },

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
      customer_stage: "closing",
      hot_lead: true,
      closed_sale: false,
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
      product_name: "",
      product_qty: 0,
      product_unit: "",
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

function normalizeText(message) {
  return String(message || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function isOnlyGreetingOrInquiry(text) {
  return RULES.greeting.includes(text) || RULES.general_inquiry.includes(text)
}

export function analyzeByRule(message) {
  const text = normalizeText(message)

  if (!text) {
    return {
      intent: "unknown",
      interest_level: "low",
      customer_stage: "new_lead",
      hot_lead: false,
      closed_sale: false,
      product_name: "",
      product_qty: 0,
      product_unit: "",
      summary: "ข้อความไม่ชัดเจน"
    }
  }

  // สำคัญมาก:
  // ข้อความทักทาย / สอบถามทั่วไป ต้องจับก่อนสินค้า
  // เพื่อไม่ให้ AI หรือ context เก่าเดาสินค้าเอง
  if (isOnlyGreetingOrInquiry(text)) {
    if (RULES.greeting.includes(text)) {
      return buildResult("greeting")
    }

    return buildResult("general_inquiry")
  }

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

  const productInfo = extractProductInfo(text)

  if (productInfo) {
    return {
      intent: "product_info",
      interest_level: "high",
      customer_stage: "interested",
      hot_lead: true,
      closed_sale: false,
      ...productInfo,
      summary: `ลูกค้าต้องการ${productInfo.product_name} ${productInfo.product_qty} ${productInfo.product_unit}`
    }
  }

  for (const [intent, keywords] of Object.entries(RULES)) {
    if (match(text, keywords)) {
      return buildResult(intent)
    }
  }

  return null
}

function extractProductInfo(text) {
  const units = [
    "ลัง",
    "ถุง",
    "กล่อง",
    "แพ็ค",
    "ชิ้น",
    "กิโล",
    "กิโลกรัม",
    "กรัม",
    "ขวด",
    "กระสอบ"
  ]

  const unitPattern = units.join("|")

  const pattern = new RegExp(
    `(?:เอา|ขอ|รับ|สั่ง)?\\s*(.+?)\\s*(\\d+)\\s*(${unitPattern})`,
    "i"
  )

  const matchResult = text.match(pattern)

  if (!matchResult) {
    return null
  }

  const rawName = matchResult[1].replace(/ครับ|ค่ะ|คะ|จ้า|หน่อย/g, "").trim()

  const qty = Number(matchResult[2] || 0)
  const unit = matchResult[3] || ""

  if (!rawName || !qty || !unit) {
    return null
  }

  // กันเคส "เอา 1 ลัง" ที่ไม่มีชื่อสินค้า
  if (["เอา", "ขอ", "รับ", "สั่ง"].includes(rawName)) {
    return null
  }

  return {
    product_name: rawName,
    product_qty: qty,
    product_unit: unit
  }
}
