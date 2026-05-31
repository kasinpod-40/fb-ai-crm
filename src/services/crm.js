import { createLeadRecord } from "../repositories/lead.repository"

import { calculateLeadScore } from "../utils/score"

import { mapStage } from "../models/lead.model"

export async function createLead(env, senderId, message, ai) {
  const fields = {
    sender_id: senderId,
    current_stage: mapStage(ai),
    lead_score: calculateLeadScore(ai),
    hot_lead: ai.hot_lead || false,
    closed_sale: ai.closed_sale || false,
    last_message: message,
    last_contact_at: Date.now(),
    ai_summary: ai.summary || ""
  }

  return createLeadRecord(env, fields)
}
