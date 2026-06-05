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
  updateProductFromImage,
  updateOrderFromSlip
} from "./order.service"

export async function syncDeal(env, contact, ai) {
  const now = new Date().toISOString()

  const activeDealId = contact?.fields?.active_deal_id

  console.log("ACTIVE DEAL:", activeDealId)

  if (activeDealId) {
    const productName =
      ai.image_ai?.product_name || contact.fields.product_name || ""

    const fields = {
      stage: mapStage(ai),
      lead_score: calculateLeadScore(ai),
      ai_summary: ai.summary,
      updated_at: now
    }

    if (productName) {
      fields.product_name = productName
    }

    if (ai.customer_stage === "won") {
      fields.status = "Won"
      fields.closed_at = now

      await markActiveOrderPaid(env, contact)

      await updateActiveDeal(env, contact.record_id, "")
      await updateActiveOrder(env, contact.record_id, "")

      console.log("ORDER PAID")
      console.log("ACTIVE DEAL CLEARED")
      console.log("ACTIVE ORDER CLEARED")
    }

    if (ai.customer_stage === "lost") {
      fields.status = "Lost"
      fields.closed_at = now

      await cancelActiveOrder(env, contact)

      await updateActiveDeal(env, contact.record_id, "")
      await updateActiveOrder(env, contact.record_id, "")

      console.log("ACTIVE DEAL CLEARED")
      console.log("ACTIVE ORDER CLEARED")
    }

    if (ai.intent === "delivery_address") {
      const contactInfo = parseContactInfo(contact.fields.last_message)

      fields.delivery_name = contactInfo.delivery_name
      fields.delivery_phone = contactInfo.delivery_phone
      fields.delivery_address = contactInfo.delivery_address
    }

    if (
      ai.image_ai?.image_type === "product_image" &&
      ai.image_ai.product_name
    ) {
      await updateProductFromImage(env, contact, ai.image_ai.product_name)

      console.log("PRODUCT DETECTED:", ai.image_ai.product_name)
    }

    if (ai.image_ai?.image_type === "payment_slip") {
      await updateOrderFromSlip(env, contact, ai.image_ai)

      fields.status = "Won"
      fields.closed_at = now

      await updateActiveDeal(env, contact.record_id, "")
      await updateActiveOrder(env, contact.record_id, "")

      console.log("SLIP DETECTED")
      console.log("ACTIVE DEAL CLEARED")
      console.log("ACTIVE ORDER CLEARED")
    }

    await updateDeal(env, activeDealId, fields)

    console.log("DEAL UPDATED")

    return
  }

  const productName =
    ai.image_ai?.product_name || contact.fields.product_name || ""

  const result = await createDeal(env, {
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

    created_at: now,

    updated_at: now,

    closed_at: isClosed(ai) ? now : "",

    ...(ai.intent === "delivery_address"
      ? parseContactInfo(contact.fields.last_message)
      : {})
  })

  const recordId = result.record.record_id

  await updateActiveDeal(env, contact.record_id, recordId)

  console.log("DEAL CREATED")
}
