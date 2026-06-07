import { createDeal, updateDeal } from "../repositories/deal.repository"

import {
  updateActiveDeal,
  updateActiveOrder
} from "../repositories/contact.repository"

import { mapStage, calculateLeadScore, isClosed } from "../models/lead.model"

import { parseContactInfo } from "./contact-parser"

import {
  cancelActiveOrder,
  markActiveOrderPaid,
  updateProductFromImage
} from "./order.service"

import {
  applySlipToActiveOrder,
  savePendingPayment,
  closeDealAfterPayment
} from "./payment.service"

import { notifyAiReviewRequired } from "./notification.service"

function getProductName(contact, ai) {
  return ai.image_ai?.product_name || contact.fields.product_name || ""
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

  if (ai.intent === "delivery_address") {
    const contactInfo = parseContactInfo(contact.fields.last_message)

    fields.delivery_name = contactInfo.delivery_name
    fields.delivery_phone = contactInfo.delivery_phone
    fields.delivery_address = contactInfo.delivery_address
  }

  return fields
}

async function closeDealAsWon(env, contact, fields, now) {
  fields.status = "Won"
  fields.stage = "Won"
  fields.closed_at = now

  const orderPaid = await markActiveOrderPaid(env, contact)

  await updateActiveDeal(env, contact.record_id, "")
  await updateActiveOrder(env, contact.record_id, "")

  console.log("DEAL CLOSED AS WON")
  console.log("ORDER PAID:", orderPaid)
  console.log("ACTIVE DEAL CLEARED")
  console.log("ACTIVE ORDER CLEARED")
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

async function handlePaymentSlip(env, contact, ai, activeDealId) {
  if (ai.image_ai?.image_type !== "payment_slip") {
    return false
  }

  const paymentApplied = await applySlipToActiveOrder(env, contact, ai.image_ai)

  if (paymentApplied) {
    await closeDealAfterPayment(env, contact, activeDealId)

    console.log("PAYMENT SLIP HANDLED WITH ACTIVE ORDER")

    return true
  }

  await savePendingPayment(env, contact, ai.image_ai)

  console.log("PAYMENT SLIP SAVED AS PENDING")

  return true
}

function buildNewDealFields(contact, ai, now) {
  const productName = getProductName(contact, ai)

  return {
    deal_id: crypto.randomUUID(),

    sender_id: contact.fields.sender_id,

    deal_name: `Deal ${contact.fields.sender_id}`,

    stage: mapStage(ai),

    lead_score: calculateLeadScore(ai),

    status:
      ai.customer_stage === "won"
        ? "Won"
        : ai.customer_stage === "lost"
          ? "Lost"
          : "Open",

    ai_summary: ai.summary,

    product_name: productName,

    sales_owner: contact.fields.sales_owner || "Unassigned",

    created_at: now,

    updated_at: now,

    closed_at: isClosed(ai) ? now : "",

    ...(ai.intent === "delivery_address"
      ? parseContactInfo(contact.fields.last_message)
      : {})
  }
}

export async function syncDeal(env, contact, ai) {
  const now = new Date().toISOString()

  const activeDealId = contact?.fields?.active_deal_id

  console.log("ACTIVE DEAL:", activeDealId)

  if (activeDealId) {
    const fields = buildDealUpdateFields(contact, ai, now)

    await handleProductImage(env, contact, ai)

    const paymentHandled = await handlePaymentSlip(
      env,
      contact,
      ai,
      activeDealId
    )

    if (paymentHandled) {
      return
    }

    if (ai.customer_stage === "won") {
      console.log("CUSTOMER CLAIMED PAYMENT BY TEXT - WAITING FOR SLIP")

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
    }

    if (ai.customer_stage === "lost") {
      await closeDealAsLost(env, contact, fields, now)
    }

    await updateDeal(env, activeDealId, fields)

    console.log("DEAL UPDATED")

    return
  }

  const result = await createDeal(env, buildNewDealFields(contact, ai, now))

  const recordId = result.record.record_id

  await updateActiveDeal(env, contact.record_id, recordId)

  console.log("DEAL CREATED")
}
