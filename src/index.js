import { handleWebhook } from "./routes/webhook"
import { renderInvoicePage } from "./services/invoice.service"

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // INVOICE PAGE
    // ต้องอยู่ก่อน VERIFY WEBHOOK
    if (request.method === "GET" && url.pathname.startsWith("/invoice/")) {
      const orderId = url.pathname.split("/invoice/")[1]

      if (!orderId) {
        return new Response("Missing order id", {
          status: 400
        })
      }

      return renderInvoicePage(request, env, orderId)
    }

    // VERIFY FACEBOOK WEBHOOK
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode")
      const token = url.searchParams.get("hub.verify_token")
      const challenge = url.searchParams.get("hub.challenge")

      if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
        return new Response(challenge, {
          status: 200
        })
      }

      return new Response("Verification failed", {
        status: 403
      })
    }

    // RECEIVE FACEBOOK MESSAGE
    if (request.method === "POST") {
      return handleWebhook(request, env)
    }

    return new Response("Not Found", {
      status: 404
    })
  }
}
