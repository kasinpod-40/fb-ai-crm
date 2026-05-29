/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env) {

    // VERIFY WEBHOOK
    if (request.method === "GET") {

      const url = new URL(request.url)

      const mode =
        url.searchParams.get("hub.mode")

      const token =
        url.searchParams.get("hub.verify_token")

      const challenge =
        url.searchParams.get("hub.challenge")

      if (
        mode === "subscribe" &&
        token === env.VERIFY_TOKEN
      ) {
        return new Response(challenge, {
          status: 200
        })
      }

      return new Response(
        "Verification failed",
        { status: 403 }
      )
    }

    // RECEIVE MESSAGE
    if (request.method === "POST") {

      try {

        const body =
          await request.json()

        console.log(
          "Webhook body:",
          JSON.stringify(body)
        )

        if (body.object === "page") {

          for (const entry of body.entry) {

            for (
              const messaging
              of entry.messaging
            ) {

              if (messaging.message) {

                const senderId =
                  messaging.sender.id

                const pageId =
                  messaging.recipient.id

                const message =
                  messaging.message.text || ""

                const timestamp =
                  messaging.timestamp

                await saveToLark(
                  env,
                  senderId,
                  message,
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

      } catch (e) {

        console.log(
          "ERROR:",
          e.toString()
        )

        return new Response(
          "ERROR",
          { status: 500 }
        )
      }
    }

    return new Response(
      "Not Found",
      { status: 404 }
    )
  }
}

async function getLarkTenantToken(env) {

  const res = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        app_id: env.LARK_APP_ID,
        app_secret:
          env.LARK_APP_SECRET
      })
    }
  )

  const data = await res.json()

  console.log(
    "Lark token:",
    JSON.stringify(data)
  )

  return data.tenant_access_token
}

async function saveToLark(
  env,
  senderId,
  message,
  pageId,
  timestamp
) {

  const token =
    await getLarkTenantToken(env)

  const url =
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${env.LARK_APP_TOKEN}/tables/${env.LARK_TABLE_ID}/records`

  const body = {
    fields: {
      sender_id: senderId,
      message: message,
      page_id: pageId,
      timestamp: timestamp,
      created_at: new Date()
        .toISOString()
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        `Bearer ${token}`,
      "Content-Type":
        "application/json"
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()

  console.log(
    "Lark response:",
    JSON.stringify(data)
  )
}