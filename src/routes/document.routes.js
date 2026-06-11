import {
  renderInvoicePage,
  renderQuotationPage,
  renderTaxInvoicePage,
  renderTaxFormPage,
  handleTaxFormSubmit
} from "../services/invoice.service"

function getPathId(pathname, prefix) {
  return pathname.split(prefix)[1]
}

export async function handleDocumentRoutes(request, env, url) {
  if (request.method === "GET" && url.pathname.startsWith("/tax-form/")) {
    const orderId = getPathId(url.pathname, "/tax-form/")
    if (!orderId) return new Response("Missing order id", { status: 400 })
    return renderTaxFormPage(request, env, orderId)
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/tax-form/")) {
    const orderId = getPathId(url.pathname, "/api/tax-form/")
    if (!orderId) return new Response("Missing order id", { status: 400 })
    return handleTaxFormSubmit(request, env, orderId)
  }

  if (request.method === "GET" && url.pathname.startsWith("/tax-invoice/")) {
    const orderId = getPathId(url.pathname, "/tax-invoice/")
    if (!orderId) return new Response("Missing order id", { status: 400 })
    return renderTaxInvoicePage(request, env, orderId)
  }

  if (request.method === "GET" && url.pathname.startsWith("/quotation/")) {
    const orderId = getPathId(url.pathname, "/quotation/")
    if (!orderId) return new Response("Missing order id", { status: 400 })
    return renderQuotationPage(request, env, orderId)
  }

  if (request.method === "GET" && url.pathname.startsWith("/invoice/")) {
    const orderId = getPathId(url.pathname, "/invoice/")
    if (!orderId) return new Response("Missing order id", { status: 400 })
    return renderInvoicePage(request, env, orderId)
  }

  return null
}
