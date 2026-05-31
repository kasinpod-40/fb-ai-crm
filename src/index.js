import { handleWebhook } from "./routes/webhook"

export default {
  async fetch(request, env) {
    // VERIFY WEBHOOK
    if (request.method === "GET") {
      const url = new URL(request.url)

      const mode = url.searchParams.get("hub.mode")

      const token = url.searchParams.get("hub.verify_token")

      const challenge = url.searchParams.get("hub.challenge")

      if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 })
      }

      return new Response("Verification failed", { status: 403 })
    }

    // RECEIVE MESSAGE
    if (request.method === "POST") {
      return handleWebhook(request, env)
    }

    return new Response("Not Found", { status: 404 })
  }
}
