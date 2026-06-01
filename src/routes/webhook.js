import { processLead } from "../services/lead.service"

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

        const messageId = messaging.message?.mid

        console.log("MESSAGE:", text)

        await processLead(env, senderId, pageId, text, timestamp, messageId)
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 })
  } catch (err) {
    console.log("WEBHOOK ERROR:", err)
    return new Response("EVENT_RECEIVED", { status: 200 })
  }
}
