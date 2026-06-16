import { createDeal, updateDeal } from "../repositories/deal.repository"

import {
  updateActiveDeal,
  updateActiveOrder,
  updateContact
} from "../repositories/contact.repository"

import { updateOrder } from "../repositories/order.repository"

import { mapStage, calculateLeadScore } from "../models/lead.model"

import { parseContactInfo } from "./contact-parser"

import {
  cancelActiveOrder,
  createOrderFromContact,
  updateProductFromImage
} from "./order.service"

import { applySlipToActiveOrder, savePendingPayment } from "./payment.service"

import { notifyAiReviewRequired } from "./notification.service"

import { getNowIso, getNowText } from "../utils/date"

function getProductName(contact, ai) {
  return ai.image_ai?.product_name || ai.product_name || ""
}

function isPaymentSlip(ai) {
  return ai.image_ai?.image_type === "payment_slip"
}

function isProductImage(ai) {
  return ai.image_ai?.image_type === "product_image"
}

function isLost(ai) {
  return ai?.customer_stage === "lost" || ai?.intent === "lost"
}

function shouldCreateDeal(ai) {
  if (!ai) return false

  const blockedIntents = [
    "greeting",
    "general_inquiry",
    "unknown",
    "support",
    "image_received",
    "small_talk",
    "ask_price",
    "delivery_question"
  ]

  if (blockedIntents.includes(ai.intent)) return false
  if (ai.image_ai?.image_type === "other") return false
  if (isPaymentSlip(ai)) return true
  if (ai.intent === "payment_request") return true
  if (ai.intent === "delivery_address") return true
  if (ai.intent === "closed_sale") return true
  if (ai.intent === "ask_discount") return true

  if (ai.intent === "product_info") {
    const hasProductImage = isProductImage(ai)
    const hasProductQty = Number(ai.product_qty || 0) > 0
    const hasProductUnit = Boolean(ai.product_unit)
    const isStrongBuyingSignal =
      ai.hot_lead === true || ai.interest_level === "high"

    if (hasProductImage) return true
    if (hasProductQty && hasProductUnit) return true
    if (isStrongBuyingSignal) return true

    return false
  }

  return ["negotiating", "closing"].includes(ai.customer_stage)
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  const parsed = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "")
  )

  return Number.isFinite(parsed) ? parsed : 0
}

function buildDealUpdateFields(contact, ai, nowIso, nowText) {
  const productName = getProductName(contact, ai)

  const fields = {
    page_id: contact.fields.page_id || "",
    page_name: contact.fields.page_name || "",
    sales_team: contact.fields.sales_team || "",

    stage: mapStage(ai),
    lead_score: calculateLeadScore(ai),
    ai_summary: ai.summary,
    updated_at: nowIso,
    updated_at_text: nowText
  }

  if (productName) fields.product_name = productName
  if (ai.product_qty) fields.product_qty = toNumber(ai.product_qty)
  if (ai.product_unit) fields.product_unit = ai.product_unit

  if (ai.intent === "delivery_address") {
    const contactInfo = parseContactInfo(contact.fields.last_message)

    fields.delivery_name = contactInfo.delivery_name
    fields.delivery_phone = contactInfo.delivery_phone
    fields.delivery_address = contactInfo.delivery_address
  }

  return fields
}

async function cleanupContactAfterLost(env, contact, nowIso, nowText) {
  const requiredFields = {
    current_stage: "Lost",
    lead_score: 0,
    hot_lead: false,

    product_name: "",
    product_qty: 0,
    product_unit: "",

    delivery_name: "",
    delivery_phone: "",
    delivery_address: "",

    pending_payment: false,
    pending_slip_amount: 0,
    pending_slip_bank: "",
    pending_slip_time: "",
    pending_slip_image_url: "",

    active_deal_id: "",
    active_order_id: "",

    ai_summary: "ลูกค้ายกเลิกการซื้อ รอเริ่มการขายใหม่",
    updated_at: nowIso,
    updated_at_text: nowText
  }

  await updateContact(env, contact.record_id, requiredFields)

  const optionalFields = {
    product_source: ""
  }

  for (const [fieldName, value] of Object.entries(optionalFields)) {
    try {
      await updateContact(env, contact.record_id, {
        [fieldName]: value
      })
    } catch (err) {
      console.log(`OPTIONAL LOST CLEANUP SKIPPED: ${fieldName}`, err)
    }
  }

  contact.fields.current_stage = "Lost"
  contact.fields.lead_score = 0
  contact.fields.hot_lead = false

  contact.fields.product_name = ""
  contact.fields.product_qty = 0
  contact.fields.product_unit = ""
  contact.fields.product_source = ""

  contact.fields.delivery_name = ""
  contact.fields.delivery_phone = ""
  contact.fields.delivery_address = ""

  contact.fields.pending_payment = false
  contact.fields.pending_slip_amount = 0
  contact.fields.pending_slip_bank = ""
  contact.fields.pending_slip_time = ""
  contact.fields.pending_slip_image_url = ""

  contact.fields.active_deal_id = ""
  contact.fields.active_order_id = ""

  contact.fields.ai_summary = "ลูกค้ายกเลิกการซื้อ รอเริ่มการขายใหม่"

  console.log("CONTACT LOST CLEANUP COMPLETED")
}

async function closeDealAsLost(env, contact, fields, nowIso, nowText) {
  fields.status = "Lost"
  fields.stage = "Lost"
  fields.closed_at = nowIso
  fields.closed_at_text = nowText

  await cancelActiveOrder(env, contact)

  await updateActiveDeal(env, contact.record_id, "")
  await updateActiveOrder(env, contact.record_id, "")

  await cleanupContactAfterLost(env, contact, nowIso, nowText)

  console.log("DEAL CLOSED AS LOST")
}

async function handleProductImage(env, contact, ai) {
  if (isProductImage(ai) && ai.image_ai.product_name) {
    await updateProductFromImage(env, contact, ai.image_ai.product_name)

    console.log("PRODUCT DETECTED:", ai.image_ai.product_name)
  }
}

async function ensureActiveOrderForSlip(env, contact) {
  if (contact.fields.active_order_id) {
    return contact.fields.active_order_id
  }

  const orderRecordId = await createOrderFromContact(env, contact)

  if (orderRecordId) {
    contact.fields.active_order_id = orderRecordId
  }

  return orderRecordId
}

async function linkActiveOrderToDeal(
  env,
  contact,
  dealRecordId,
  nowIso,
  nowText
) {
  if (!contact.fields.active_order_id || !dealRecordId) {
    return
  }

  await updateOrder(env, contact.fields.active_order_id, {
    deal_record_id: dealRecordId,
    updated_at: nowIso,
    updated_at_text: nowText
  })

  console.log("ACTIVE ORDER LINKED TO DEAL:", dealRecordId)
}

async function handlePaymentSlip(env, contact, ai) {
  if (!isPaymentSlip(ai)) {
    return false
  }

  const orderRecordId = await ensureActiveOrderForSlip(env, contact)

  if (!orderRecordId) {
    await savePendingPayment(env, contact, ai.image_ai)

    console.log("PAYMENT SLIP SAVED AS PENDING")

    return true
  }

  const paymentAttached = await applySlipToActiveOrder(
    env,
    contact,
    ai.image_ai
  )

  if (paymentAttached) {
    console.log("PAYMENT SLIP ATTACHED - WAITING FOR VERIFICATION")
    return true
  }

  await savePendingPayment(env, contact, ai.image_ai)

  console.log("PAYMENT SLIP SAVED AS PENDING")

  return true
}

async function handleClaimedPaymentByText(env, contact, ai, fields) {
  if (isPaymentSlip(ai)) {
    return false
  }

  if (ai.customer_stage !== "won" && ai.closed_sale !== true) {
    return false
  }

  fields.status = "Open"
  fields.stage = "Closing"
  fields.ai_summary =
    "ลูกค้าแจ้งว่าโอนแล้ว แต่ยังไม่ได้ส่งสลิป รอตรวจสอบหลักฐานการชำระเงิน"

  await notifyAiReviewRequired(
    env,
    contact,
    ai,
    "Customer claimed payment by text but no slip image was provided"
  )

  console.log("CUSTOMER CLAIMED PAYMENT BY TEXT - WAITING FOR SLIP")

  return true
}

function buildNewDealFields(contact, ai, nowIso, nowText) {
  const productName = getProductName(contact, ai)

  const isLost = ai.customer_stage === "lost"

  const fields = {
    deal_id: crypto.randomUUID(),

    sender_id: contact.fields.sender_id,

    page_id: contact.fields.page_id || "",

    page_name: contact.fields.page_name || "",

    sales_team: contact.fields.sales_team || "",

    deal_name: `Deal ${contact.fields.sender_id}`,

    stage: isPaymentSlip(ai) ? "Closing" : mapStage(ai),

    lead_score: calculateLeadScore(ai),

    status: isLost ? "Lost" : "Open",

    ai_summary: ai.summary,

    product_name: productName,

    sales_owner: contact.fields.sales_owner || "Unassigned",

    created_at: nowIso,

    created_at_text: nowText,

    updated_at: nowIso,

    updated_at_text: nowText,

    closed_at: isLost ? nowIso : null,

    closed_at_text: isLost ? nowText : "",

    ...(ai.intent === "delivery_address"
      ? parseContactInfo(contact.fields.last_message)
      : {})
  }

  if (ai.product_qty) fields.product_qty = toNumber(ai.product_qty)
  if (ai.product_unit) fields.product_unit = ai.product_unit

  return fields
}

export async function syncDeal(env, contact, ai) {
  const nowIso = getNowIso()
  const nowText = getNowText()

  const activeDealId = contact?.fields?.active_deal_id

  console.log("ACTIVE DEAL:", activeDealId)

  if (isLost(ai)) {
    if (activeDealId) {
      const fields = buildDealUpdateFields(contact, ai, nowIso, nowText)

      await closeDealAsLost(env, contact, fields, nowIso, nowText)
      await updateDeal(env, activeDealId, fields)
    } else {
      await cancelActiveOrder(env, contact)
      await cleanupContactAfterLost(env, contact, nowIso, nowText)
    }

    console.log("LOST FLOW COMPLETED")

    return
  }

  if (activeDealId) {
    const fields = buildDealUpdateFields(contact, ai, nowIso, nowText)

    await handleProductImage(env, contact, ai)

    const paymentHandled = await handlePaymentSlip(env, contact, ai)

    if (paymentHandled) {
      fields.stage = "Closing"
      fields.status = "Open"

      if (contact.fields.active_order_id) {
        fields.ai_summary =
          "ลูกค้าส่งสลิปแล้ว ระบบแนบสลิปเข้า Order แล้ว รอ Sales ตรวจสอบยอดชำระเงิน"
      } else {
        fields.ai_summary =
          "ลูกค้าส่งสลิปแล้ว แต่ยังไม่มี Order ระบบเก็บสลิปไว้ รอลูกค้าส่งที่อยู่"
      }

      await updateDeal(env, activeDealId, fields)

      await linkActiveOrderToDeal(env, contact, activeDealId, nowIso, nowText)

      console.log("DEAL UPDATED AFTER PAYMENT SLIP")

      return
    }

    const claimedPaymentHandled = await handleClaimedPaymentByText(
      env,
      contact,
      ai,
      fields
    )

    await updateDeal(env, activeDealId, fields)

    await linkActiveOrderToDeal(env, contact, activeDealId, nowIso, nowText)

    if (claimedPaymentHandled) {
      console.log("DEAL KEPT OPEN AFTER TEXT PAYMENT CLAIM")
    }

    console.log("DEAL UPDATED")

    return
  }

  if (!shouldCreateDeal(ai)) {
    console.log(
      "SKIP CREATE DEAL FOR NON-SALES MESSAGE:",
      ai?.intent,
      ai?.customer_stage,
      ai?.image_ai?.image_type || ""
    )

    return
  }

  const result = await createDeal(
    env,
    buildNewDealFields(contact, ai, nowIso, nowText)
  )

  const recordId = result.record.record_id

  await updateDeal(env, recordId, {
    record_id: recordId
  })

  await updateActiveDeal(env, contact.record_id, recordId)

  contact.fields.active_deal_id = recordId

  await linkActiveOrderToDeal(env, contact, recordId, nowIso, nowText)

  console.log("DEAL CREATED")

  if (isPaymentSlip(ai)) {
    const paymentHandled = await handlePaymentSlip(env, contact, ai)

    if (paymentHandled) {
      await updateDeal(env, recordId, {
        stage: "Closing",
        status: "Open",
        ai_summary:
          "ลูกค้าส่งสลิปแล้ว ระบบสร้าง Deal และ Order ให้แล้ว รอ Sales ตรวจสอบยอดชำระเงิน",
        updated_at: nowIso,
        updated_at_text: nowText
      })

      await linkActiveOrderToDeal(env, contact, recordId, nowIso, nowText)

      console.log("DEAL CREATED FROM PAYMENT SLIP")
    }
  }
}
