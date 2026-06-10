import { handleWebhook } from "./routes/webhook"

import {
  renderInvoicePage,
  renderQuotationPage,
  renderTaxInvoicePage,
  renderTaxFormPage,
  handleTaxFormSubmit
} from "./services/invoice.service"

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // TAX FORM PAGE
    if (request.method === "GET" && url.pathname.startsWith("/tax-form/")) {
      const orderId = url.pathname.split("/tax-form/")[1]

      if (!orderId) {
        return new Response("Missing order id", { status: 400 })
      }

      return renderTaxFormPage(request, env, orderId)
    }

    // TAX FORM SUBMIT
    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/tax-form/")
    ) {
      const orderId = url.pathname.split("/api/tax-form/")[1]

      if (!orderId) {
        return new Response("Missing order id", { status: 400 })
      }

      return handleTaxFormSubmit(request, env, orderId)
    }

    // TAX INVOICE PAGE
    if (request.method === "GET" && url.pathname.startsWith("/tax-invoice/")) {
      const orderId = url.pathname.split("/tax-invoice/")[1]

      if (!orderId) {
        return new Response("Missing order id", { status: 400 })
      }

      return renderTaxInvoicePage(request, env, orderId)
    }

    // QUOTATION PAGE
    if (request.method === "GET" && url.pathname.startsWith("/quotation/")) {
      const orderId = url.pathname.split("/quotation/")[1]

      if (!orderId) {
        return new Response("Missing order id", { status: 400 })
      }

      return renderQuotationPage(request, env, orderId)
    }

    // INVOICE PAGE
    if (request.method === "GET" && url.pathname.startsWith("/invoice/")) {
      const orderId = url.pathname.split("/invoice/")[1]

      if (!orderId) {
        return new Response("Missing order id", { status: 400 })
      }

      return renderInvoicePage(request, env, orderId)
    }

    // VERIFY FACEBOOK WEBHOOK
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode")
      const token = url.searchParams.get("hub.verify_token")
      const challenge = url.searchParams.get("hub.challenge")

      if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 })
      }

      return new Response("Verification failed", { status: 403 })
    }

    // RECEIVE FACEBOOK MESSAGE
    if (request.method === "POST") {
      return handleWebhook(request, env)
    }

    return new Response("Not Found", { status: 404 })
  }
}
