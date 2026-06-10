import { createOrder, updateOrder } from "../repositories/order.repository"

import { updateActiveOrder } from "../repositories/contact.repository"

import {
  generateInvoiceNumber,
  generateQuotationNumber
} from "../utils/invoice"

import { getNowIso, getNowText } from "../utils/date"

function generateOrderNumber() {
  const now = new Date()

  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")

  const random = Math.floor(Math.random() * 9000) + 1000

  return `ORD-${yy}${mm}${dd}-${random}`
}

function getInvoiceUrl(env, orderRecordId) {
  if (!env.PUBLIC_BASE_URL) {
    return ""
  }

  return `${env.PUBLIC_BASE_URL}/invoice/${orderRecordId}`
}

function getQuotationUrl(env, orderRecordId) {
  if (!env.PUBLIC_BASE_URL) {
    return ""
  }

  return `${env.PUBLIC_BASE_URL}/quotation/${orderRecordId}`
}

function buildOrderFields(contact, nowIso, nowText) {
  return {
    order_id: crypto.randomUUID(),

    order_number: generateOrderNumber(),

    sender_id: contact.fields.sender_id,

    page_id: contact.fields.page_id || "",

    page_name: contact.fields.page_name || "",

    sales_team: contact.fields.sales_team || "",

    deal_record_id: contact.fields.active_deal_id || "",

    customer_name: contact.fields.delivery_name || "",

    phone: contact.fields.delivery_phone || "",

    address: contact.fields.delivery_address || "",

    product_name: contact.fields.product_name || "",

    order_status: "New",

    payment_status: "Pending",

    payment_verified: false,

    total_amount: 0,

    invoice_number: generateInvoiceNumber(),

    quotation_number: generateQuotationNumber(),

    tracking_number: "",

    created_at: nowIso,

    created_at_text: nowText,

    updated_at: nowIso,

    updated_at_text: nowText,

    paid_at: null,

    paid_at_text: "",

    invoice_url: "",

    quotation_url: "",

    invoice_pdf_url: "",

    quotation_pdf_url: "",

    sales_owner: contact.fields.sales_owner || "Unassigned",

    product_qty: toNumber(contact.fields.product_qty),

    product_unit: contact.fields.product_unit || "",

    is_overdue: false,

    overdue_alert_sent: false,

    tax_form_url: getTaxFormUrl(env, orderRecordId)
  }
}

async function saveDocumentUrls(env, orderRecordId, nowIso, nowText) {
  const invoiceUrl = getInvoiceUrl(env, orderRecordId)
  const quotationUrl = getQuotationUrl(env, orderRecordId)

  const fields = {
    updated_at: nowIso,
    updated_at_text: nowText
  }

  if (invoiceUrl) {
    fields.invoice_url = invoiceUrl
  }

  if (quotationUrl) {
    fields.quotation_url = quotationUrl
  }

  if (!invoiceUrl && !quotationUrl) {
    console.log("PUBLIC_BASE_URL NOT SET, SKIP DOCUMENT URL")
    return
  }

  await updateOrder(env, orderRecordId, fields)

  console.log("INVOICE URL SAVED:", invoiceUrl)
  console.log("QUOTATION URL SAVED:", quotationUrl)
}

export async function createOrderFromContact(env, contact) {
  console.log("CREATE ORDER FROM CONTACT START")

  const activeOrderId = contact.fields.active_order_id

  console.log("ACTIVE ORDER:", activeOrderId)

  if (activeOrderId) {
    console.log("ACTIVE ORDER EXISTS")
    return activeOrderId
  }

  const nowIso = getNowIso()
  const nowText = getNowText()

  const result = await createOrder(
    env,
    buildOrderFields(contact, nowIso, nowText)
  )

  const orderRecordId = result.record.record_id

  console.log("ORDER RECORD ID:", orderRecordId)

  await updateActiveOrder(env, contact.record_id, orderRecordId)

  console.log("ACTIVE ORDER SAVED TO CONTACT")

  await saveDocumentUrls(env, orderRecordId, nowIso, nowText)

  console.log("ORDER CREATED")

  return orderRecordId
}

export async function markOrderPaid(env, orderRecordId) {
  console.log("MARK ORDER PAID:", orderRecordId)

  const nowIso = getNowIso()
  const nowText = getNowText()

  await updateOrder(env, orderRecordId, {
    payment_status: "Paid",
    payment_verified: false,
    order_status: "Completed",
    paid_at: nowIso,
    paid_at_text: nowText,
    updated_at: nowIso,
    updated_at_text: nowText
  })

  console.log("ORDER PAID")

  return true
}

export async function markActiveOrderPaid(env, contact) {
  const orderId = contact.fields.active_order_id

  console.log("ACTIVE ORDER TO PAY:", orderId)

  if (!orderId) {
    console.log("NO ACTIVE ORDER TO MARK PAID")
    return false
  }

  await markOrderPaid(env, orderId)

  return true
}

export async function cancelActiveOrder(env, contact) {
  const orderId = contact.fields.active_order_id

  if (!orderId) {
    console.log("NO ACTIVE ORDER TO CANCEL")
    return false
  }

  const nowIso = getNowIso()
  const nowText = getNowText()

  await updateOrder(env, orderId, {
    order_status: "Cancelled",
    updated_at: nowIso,
    updated_at_text: nowText
  })

  console.log("ORDER CANCELLED")

  return true
}

export async function updateProductFromImage(env, contact, productName) {
  const nowIso = getNowIso()
  const nowText = getNowText()

  if (!productName) {
    return false
  }

  const orderId = contact.fields.active_order_id

  if (!orderId) {
    console.log("NO ACTIVE ORDER FOR PRODUCT")
    return false
  }

  await updateOrder(env, orderId, {
    product_name: productName,
    updated_at: nowIso,
    updated_at_text: nowText
  })

  console.log("ORDER PRODUCT UPDATED:", productName)

  return true
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "")

  const parsed = Number(cleaned)

  return Number.isFinite(parsed) ? parsed : 0
}
