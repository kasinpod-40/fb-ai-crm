import {
  createContact,
  findContactBySenderId,
  updateContact
} from "../repositories/contact.repository"

import { mapStage, calculateLeadScore } from "../models/lead.model"

export async function syncContact(env, senderId, pageId, message, ai) {
  const contact = await findContactBySenderId(env, senderId)

  const fields = {
    sender_id: senderId,
    page_id: pageId,

    current_stage: mapStage(ai),

    lead_score: calculateLeadScore(ai),

    hot_lead: ai.hot_lead,

    last_message: message,

    last_contact_at: new Date().toISOString(),

    ai_summary: ai.summary,

    updated_at: new Date().toISOString()
  }

  if (contact) {
    await updateContact(env, contact.record_id, fields)

    return {
      record_id: contact.record_id,
      fields: {
        ...contact.fields,
        ...fields
      }
    }
  }

  const result = await createContact(env, {
    ...fields,
    created_at: new Date().toISOString()
  })

  console.log("CONTACT CREATED")

  return result.data.record
}
