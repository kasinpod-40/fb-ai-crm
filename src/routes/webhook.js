import { processLead } from "../services/lead.service"

export async function handleWebhook(request, env) {
  try {
    const body = await request.json()

    console.log("Webhook body:", JSON.stringify(body))

    if (body.object !== "page") {
      return new Response("NOT_PAGE", { status: 200 })
    }

    for (const entry of body.entry || []) {
      for (const messaging of entry.messaging || []) {
        if (!messaging.message) {
          continue
        }

        const senderId = messaging.sender?.id
        const pageId = messaging.recipient?.id
        const timestamp = messaging.timestamp
        const messageId = messaging.message?.mid
        const text = messaging.message?.text || ""

        const attachment = messaging.message?.attachments?.[0]

        const messageType = attachment?.type || "text"

        const imageUrl =
          attachment?.type === "image" ? attachment.payload?.url : ""

        const attachmentId = attachment?.payload?.attachment_id || ""

        console.log("MESSAGE TYPE:", messageType)
        console.log("MESSAGE:", text)
        console.log("IMAGE URL:", imageUrl)

        await processLead(env, senderId, pageId, text, timestamp, messageId, {
          messageType,
          imageUrl,
          attachmentId
        })
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 })
  } catch (err) {
    console.log("WEBHOOK ERROR:", err)

    return new Response("EVENT_RECEIVED", { status: 200 })
  }
}
