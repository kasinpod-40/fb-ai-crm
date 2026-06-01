import { analyze } from "./ai-router"

import {
  saveMessageRecord,
  findMessageById
} from "../repositories/message.repository"

import { syncContact } from "./contact.service"

export async function processLead(
  env,
  senderId,
  pageId,
  text,
  timestamp,
  messageId
) {
  console.log("LEAD SERVICE START")

  const exists = await findMessageById(env, messageId)

  if (exists) {
    console.log("DUPLICATE MESSAGE SKIPPED:", messageId)

    return
  }

  const ai = await analyze(env, text)

  console.log("AI RESULT:", JSON.stringify(ai))

  await saveMessageRecord(env, {
    message_id: messageId,
    sender_id: senderId,
    page_id: pageId,
    message: text,

    intent: ai.intent,

    interest_level: ai.interest_level,

    customer_stage: ai.customer_stage,

    hot_lead: ai.hot_lead,

    closed_sale: ai.closed_sale,

    ai_summary: ai.summary,

    timestamp,

    created_at: new Date().toISOString()
  })

  console.log("MESSAGE SAVED")

  await syncContact(env, senderId, pageId, text, ai)

  console.log("CONTACT SYNCED")
}
