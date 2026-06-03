import { createDeal, updateDeal } from "../repositories/deal.repository"

import { updateActiveDeal } from "../repositories/contact.repository"

import { mapStage, calculateLeadScore, isClosed } from "../models/lead.model"

import { parseContactInfo } from "./contact-parser"

import { createOrderFromDeal } from "./order.service"

import { findDealByRecordId } from "../repositories/deal.repository"

export async function syncDeal(env, contact, ai) {
  const now = new Date().toISOString()

  const activeDealId = contact?.fields?.active_deal_id

  console.log("ACTIVE DEAL:", activeDealId)

  if (activeDealId) {
    const fields = {
      stage: mapStage(ai),

      lead_score: calculateLeadScore(ai),

      ai_summary: ai.summary,

      updated_at: now
    }

    if (ai.customer_stage === "won") {
      fields.status = "Won"
      fields.closed_at = now
    }

    if (ai.customer_stage === "lost") {
      fields.status = "Lost"
      fields.closed_at = now
    }

    if (ai.intent === "delivery_address") {
      const contactInfo = parseContactInfo(contact.fields.last_message)

      fields.delivery_name = contactInfo.delivery_name
      fields.delivery_phone = contactInfo.delivery_phone
      fields.delivery_address = contactInfo.delivery_address
    }

    await updateDeal(env, activeDealId, fields)

    console.log("DEAL UPDATED")

    if (ai.customer_stage === "won") {
      const deal = await findDealByRecordId(env, activeDealId)

      await createOrderFromDeal(env, deal, contact)

      console.log("ORDER SYNCED")
    }

    if (isClosed(ai)) {
      await updateActiveDeal(env, contact.record_id, "")

      console.log("ACTIVE DEAL CLEARED")
    }

    return
  }

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
