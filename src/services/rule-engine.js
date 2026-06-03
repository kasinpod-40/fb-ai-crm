function result(
  intent,
  interestLevel,
  customerStage,
  hotLead,
  closedSale,
  summary
) {
  return {
    intent,
    interest_level: interestLevel,
    customer_stage: customerStage,
    hot_lead: hotLead,
    closed_sale: closedSale,
    summary
  }
}

export function analyzeByRule(text) {
  const msg = (text || "").trim().toLowerCase()

  // WON

  if (
    msg.includes("โอนแล้ว") ||
    msg.includes("จ่ายแล้ว") ||
    msg.includes("ชำระแล้ว") ||
    msg.includes("ส่งสลิปแล้ว")
  ) {
    return result(
      "closed_sale",
      "high",
      "won",
      true,
      true,
      "ลูกค้าชำระเงินแล้ว"
    )
  }

  // LOST

  if (
    msg.includes("ไม่เอาแล้ว") ||
    msg.includes("ไม่เป็นไร") ||
    msg.includes("ขอผ่าน") ||
    msg.includes("ไว้ก่อน") ||
    msg.includes("ไม่สะดวก") ||
    msg.includes("ไม่สนใจแล้ว")
  ) {
    return result(
      "unknown",
      "low",
      "lost",
      false,
      false,
      "ลูกค้ายุติการตัดสินใจซื้อ"
    )
  }

  // CLOSING

  if (
    msg.includes("ขอเลขบัญชี") ||
    msg.includes("ส่งเลขบัญชี") ||
    msg.includes("ช่องทางชำระเงิน") ||
    msg.includes("ส่งที่อยู่")
  ) {
    return result(
      "ready_to_buy",
      "high",
      "closing",
      true,
      false,
      "ลูกค้าพร้อมสั่งซื้อ"
    )
  }

  // GREETING

  if (
    msg === "สวัสดี" ||
    msg === "สวัสดีครับ" ||
    msg === "สวัสดีค่ะ" ||
    msg === "hello" ||
    msg === "hi"
  ) {
    return result("greeting", "low", "new_lead", false, false, "ลูกค้าทักทาย")
  }

  return null
}
