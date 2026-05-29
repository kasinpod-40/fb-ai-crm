import { saveMessage } from "../services/lark"

export async function handleWebhook(
  request,
  env
) {

  const body = await request.json()

  console.log(
    "Webhook body:",
    JSON.stringify(body)
  )

  if (body.object === "page") {

    for (const entry of body.entry) {

      for (const messaging of entry.messaging) {

        if (messaging.message) {

          const senderId =
            messaging.sender.id

          const pageId =
            messaging.recipient.id

          const text =
            messaging.message.text || ""

          const timestamp =
            messaging.timestamp

          await saveMessage(
            env,
            senderId,
            text,
            pageId,
            timestamp
          )
        }
      }
    }
  }

  return new Response(
    "EVENT_RECEIVED",
    { status: 200 }
  )
}
