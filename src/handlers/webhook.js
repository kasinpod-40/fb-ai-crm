import { saveMessage } from "../services/lark";
import { analyzeMessage } from "../services/ai"

export async function handleWebhook(request, env) {
  try {
    const body = await request.json()

    console.log("Webhook body:", JSON.stringify(body))

    if (body.object !== "page") {
      return new Response("NOT_PAGE", { status: 200 })
    }

    for (const entry of body.entry || []) {
      if (!entry.messaging) {
        continue
      }

      for (const messaging of entry.messaging) {
        if (!messaging.message) {
          continue
        }

        const senderId = messaging.sender?.id

        const pageId = messaging.recipient?.id

        const text = messaging.message?.text || ""

        const timestamp = messaging.timestamp

        console.log("MESSAGE:", text)

        try {
          const ai = await analyzeMessage(env, text)

          console.log("AI RESULT:", ai)

          await saveMessage(env, {
            sender_id: senderId,
            message: text,
            page_id: pageId,
            intent: ai.intent,
            interest_level: ai.interest_level,
            customer_stage: ai.customer_stage,
            hot_lead: ai.hot_lead,
            closed_sale: ai.closed_sale,
            ai_summary: ai.summary,
            timestamp: timestamp,
            created_at: new Date().toISOString()
          })
        } catch (err) {
          console.log("AI ERROR:", err)
        }
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 })
  } catch (err) {
    console.log("WEBHOOK ERROR:", err)

    return new Response("ERROR", { status: 500 })
  }
}