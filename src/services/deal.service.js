import { createDeal, updateDeal } from "../repositories/deal.repository"

import { updateActiveDeal } from "../repositories/contact.repository"

import { mapStage, calculateLeadScore, isWon } from "../models/lead.model"

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

    if (isWon(ai)) {
      fields.status = "Won"
      fields.closed_at = now
    }

    await updateDeal(env, activeDealId, fields)

    console.log("DEAL UPDATED")

    if (isWon(ai)) {
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

    status: isWon(ai) ? "Won" : "Open",

    ai_summary: ai.summary,

    created_at: now,

    updated_at: now,

    closed_at: isWon(ai) ? now : ""
  })

  const recordId = result.record.record_id

  await updateActiveDeal(env, contact.record_id, recordId)

  console.log("DEAL CREATED")
}
