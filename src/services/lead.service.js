import { analyze } from "./ai-router"
import { saveMessageRecord } from "../repositories/message.repository"
import { createLead } from "./crm"

export async function processLead(env, senderId, pageId, text, timestamp) {
  console.log("LEAD SERVICE START")

  const ai = await analyze(env, text)

  console.log("AI RESULT:", JSON.stringify(ai))

  await saveMessageRecord(env, {
    sender_id: senderId,
    message: text,
    page_id: pageId,
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

  await createLead(env, senderId, text, ai)

  console.log("CRM SAVED")
}
