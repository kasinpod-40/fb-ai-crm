function shouldSkipNotification(env) {
  return !env.LARK_BOT_WEBHOOK_URL
}

async function sendLarkNotification(env, title, lines = []) {
  if (shouldSkipNotification(env)) {
    console.log("LARK BOT WEBHOOK URL NOT SET")
    return
  }

  const text = [title, ...lines.filter(Boolean)].join("\n")

  try {
    const res = await fetch(env.LARK_BOT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        msg_type: "text",
        content: {
          text
        }
      })
    })

    const data = await res.json().catch(() => ({}))

    console.log("LARK NOTIFICATION RESPONSE:", JSON.stringify(data))

    if (!res.ok) {
      console.log("LARK NOTIFICATION HTTP ERROR:", res.status)
    }
  } catch (err) {
    console.log("LARK NOTIFICATION FAILED:", err)
  }
}

function formatContact(contact) {
  const fields = contact?.fields || {}

  return [
    `👤 Customer: ${fields.sender_id || "-"}`,
    `📄 Page: ${fields.page_id || "-"}`,
    `🧭 Stage: ${fields.current_stage || "-"}`,
    `🎯 Lead Score: ${fields.lead_score || 0}`,
    `💬 Messages: ${fields.message_count || 0}`,
    `📝 Summary: ${fields.ai_summary || "-"}`
  ]
}

export async function notifyNewLead(env, contact) {
  await sendLarkNotification(env, "🆕 New Lead", formatContact(contact))
}

export async function notifyHotLead(env, contact) {
  await sendLarkNotification(env, "🔥 Hot Lead", formatContact(contact))
}

export async function notifyPaymentReceived(env, contact, imageAI = {}) {
  const fields = contact?.fields || {}

  await sendLarkNotification(env, "💰 Payment Received", [
    `👤 Customer: ${fields.sender_id || "-"}`,
    `📄 Page: ${fields.page_id || "-"}`,
    `💵 Amount: ${imageAI.slip_amount || 0}`,
    `🏦 Bank: ${imageAI.slip_bank || "-"}`,
    `🕒 Time: ${imageAI.slip_time || "-"}`,
    `🧾 Status: Payment Review`,
    `➡️ Action: รอ Sales ตรวจสอบยอดชำระเงินและติ๊ก payment_verified`,
    `📝 Summary: ${imageAI.summary || fields.ai_summary || "-"}`
  ])
}

export async function notifyPaymentSlipNoActiveOrder(
  env,
  contact,
  imageAI = {}
) {
  const fields = contact?.fields || {}

  await sendLarkNotification(env, "💰 Payment Slip Received", [
    `👤 Customer: ${fields.sender_id || "-"}`,
    `📄 Page: ${fields.page_id || "-"}`,
    `💵 Amount: ${imageAI.slip_amount || 0}`,
    `🏦 Bank: ${imageAI.slip_bank || "-"}`,
    `🕒 Time: ${imageAI.slip_time || "-"}`,
    `🧾 Status: ลูกค้าส่งสลิปแล้ว`,
    `➡️ Action: ระบบจะสร้าง Deal และ Order อัตโนมัติ พร้อมรอ Sales ตรวจสอบการชำระเงิน`
  ])
}

export async function notifyAiReviewRequired(env, contact, ai, reason) {
  const fields = contact?.fields || {}

  await sendLarkNotification(env, "⚠️ AI Review Required", [
    `❗ Reason: ${reason}`,
    `👤 Customer: ${fields.sender_id || "-"}`,
    `📄 Page: ${fields.page_id || "-"}`,
    `🧠 Intent: ${ai?.intent || "-"}`,
    `🧭 Stage: ${ai?.customer_stage || "-"}`,
    `📝 Summary: ${ai?.summary || "-"}`
  ])
}

export function getAiReviewReason(ai) {
  if (!ai) {
    return "AI result is empty"
  }

  if (ai.intent === "unknown") {
    return "Intent is unknown"
  }

  if (
    ai.image_ai?.confidence !== undefined &&
    Number(ai.image_ai.confidence) < 0.6
  ) {
    return "Image confidence is below 0.6"
  }

  if (ai.image_ai?.image_type === "other") {
    return "Image type is other"
  }

  return ""
}
