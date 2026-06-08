import { createDeal, updateDeal } from "../repositories/deal.repository"

import {
  updateActiveDeal,
  updateActiveOrder
} from "../repositories/contact.repository"

import { mapStage, calculateLeadScore } from "../models/lead.model"

import { parseContactInfo } from "./contact-parser"

import { cancelActiveOrder, updateProductFromImage } from "./order.service"

import { applySlipToActiveOrder, savePendingPayment } from "./payment.service"

import { notifyAiReviewRequired } from "./notification.service"

import { getNow } from "../utils/date"

function getProductName(contact, ai) {
  return (
    ai.image_ai?.product_name ||
    ai.product_name ||
    contact.fields.product_name ||
    ""
  )
}

function isPaymentSlip(ai) {
  return ai.image_ai?.image_type === "payment_slip"
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

function buildDealUpdateFields(contact, ai, now) {
  const productName = getProductName(contact, ai)

  const fields = {
    stage: mapStage(ai),
    lead_score: calculateLeadScore(ai),
    ai_summary: ai.summary,
    updated_at: now
  }

  if (productName) {
    fields.product_name = productName
  }

  if (ai.product_qty) {
    fields.product_qty = toNumber(ai.product_qty)
  }

  if (ai.product_unit) {
    fields.product_unit = ai.product_unit
  }

  if (ai.intent === "delivery_address") {
    const contactInfo = parseContactInfo(contact.fields.last_message)

    fields.delivery_name = contactInfo.delivery_name
    fields.delivery_phone = contactInfo.delivery_phone
    fields.delivery_address = contactInfo.delivery_address
  }

  return fields
}

async function closeDealAsLost(env, contact, fields, now) {
  fields.status = "Lost"
  fields.stage = "Lost"
  fields.closed_at = now

  await cancelActiveOrder(env, contact)

  await updateActiveDeal(env, contact.record_id, "")
  await updateActiveOrder(env, contact.record_id, "")

  console.log("DEAL CLOSED AS LOST")
  console.log("ACTIVE DEAL CLEARED")
  console.log("ACTIVE ORDER CLEARED")
}

async function handleProductImage(env, contact, ai) {
  if (ai.image_ai?.image_type === "product_image" && ai.image_ai.product_name) {
    await updateProductFromImage(env, contact, ai.image_ai.product_name)

    console.log("PRODUCT DETECTED:", ai.image_ai.product_name)
  }
}

async function handlePaymentSlip(env, contact, ai) {
  if (!isPaymentSlip(ai)) {
    return false
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

function buildNewDealFields(contact, ai, now) {
  const productName = getProductName(contact, ai)

  const isLost = ai.customer_stage === "lost"

  const fields = {
    deal_id: crypto.randomUUID(),

    sender_id: contact.fields.sender_id,

    deal_name: `Deal ${contact.fields.sender_id}`,

    stage: isPaymentSlip(ai) ? "Closing" : mapStage(ai),

    lead_score: calculateLeadScore(ai),

    status: isLost ? "Lost" : "Open",

    ai_summary: ai.summary,

    product_name: productName,

    sales_owner: contact.fields.sales_owner || "Unassigned",

    created_at: now,

    updated_at: now,

    closed_at: isLost ? now : "",

    ...(ai.intent === "delivery_address"
      ? parseContactInfo(contact.fields.last_message)
      : {})
  }

  if (ai.product_qty) {
    fields.product_qty = toNumber(ai.product_qty)
  }

  if (ai.product_unit) {
    fields.product_unit = ai.product_unit
  }

  return fields
}

export async function syncDeal(env, contact, ai) {
  const now = getNow()

  const activeDealId = contact?.fields?.active_deal_id

  console.log("ACTIVE DEAL:", activeDealId)

  if (activeDealId) {
    const fields = buildDealUpdateFields(contact, ai, now)

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

      console.log("DEAL UPDATED AFTER PAYMENT SLIP")
      return
    }

    const claimedPaymentHandled = await handleClaimedPaymentByText(
      env,
      contact,
      ai,
      fields
    )

    if (ai.customer_stage === "lost") {
      await closeDealAsLost(env, contact, fields, now)
    }

    await updateDeal(env, activeDealId, fields)

    if (claimedPaymentHandled) {
      console.log("DEAL KEPT OPEN AFTER TEXT PAYMENT CLAIM")
    }

    console.log("DEAL UPDATED")

    return
  }

  const result = await createDeal(env, buildNewDealFields(contact, ai, now))

  const recordId = result.record.record_id

  await updateDeal(env, recordId, {
    record_id: recordId
  })

  await updateActiveDeal(env, contact.record_id, recordId)

  console.log("DEAL CREATED")
}
