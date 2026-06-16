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
  const hh = String(now.getHours()).padStart(2, "0")
  const mi = String(now.getMinutes()).padStart(2, "0")
  const ss = String(now.getSeconds()).padStart(2, "0")

  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()

  return `ORD-${yy}${mm}${dd}-${hh}${mi}${ss}-${suffix}`
}

function getInvoiceUrl(env, orderRecordId) {
  if (!env.PUBLIC_BASE_URL) return ""
  return `${env.PUBLIC_BASE_URL}/invoice/${orderRecordId}`
}

function getQuotationUrl(env, orderRecordId) {
  if (!env.PUBLIC_BASE_URL) return ""
  return `${env.PUBLIC_BASE_URL}/quotation/${orderRecordId}`
}

function getTaxFormUrl(env, orderRecordId) {
  if (!env.PUBLIC_BASE_URL) return ""
  return `${env.PUBLIC_BASE_URL}/tax-form/${orderRecordId}`
}

function getTaxInvoiceUrl(env, orderRecordId) {
  if (!env.PUBLIC_BASE_URL) return ""
  return `${env.PUBLIC_BASE_URL}/tax-invoice/${orderRecordId}`
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
    product_qty: toNumber(contact.fields.product_qty),
    product_unit: contact.fields.product_unit || "",

    order_status: "Waiting Payment",
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

    tax_form_url: "",
    tax_invoice_url: "",
    tax_invoice_number: "",
    tax_invoice_status: "Not Requested",

    need_tax_invoice: false,

    tax_name: "",
    tax_address: "",
    tax_id: "",

    sales_owner: contact.fields.sales_owner || "Unassigned",

    is_overdue: false,
    overdue_alert_sent: false
  }
}

function buildOrderUpdateFieldsFromContact(contact, nowIso, nowText) {
  const fields = {
    updated_at: nowIso,
    updated_at_text: nowText
  }

  if (contact.fields.delivery_name) {
    fields.customer_name = contact.fields.delivery_name
  }

  if (contact.fields.delivery_phone) {
    fields.phone = contact.fields.delivery_phone
  }

  if (contact.fields.delivery_address) {
    fields.address = contact.fields.delivery_address
  }

  if (contact.fields.product_name) {
    fields.product_name = contact.fields.product_name
  }

  if (contact.fields.product_qty) {
    fields.product_qty = toNumber(contact.fields.product_qty)
  }

  if (contact.fields.product_unit) {
    fields.product_unit = contact.fields.product_unit
  }

  if (contact.fields.active_deal_id) {
    fields.deal_record_id = contact.fields.active_deal_id
  }

  if (contact.fields.sales_owner) {
    fields.sales_owner = contact.fields.sales_owner
  }

  if (contact.fields.page_id) {
    fields.page_id = contact.fields.page_id
  }

  if (contact.fields.page_name) {
    fields.page_name = contact.fields.page_name
  }

  if (contact.fields.sales_team) {
    fields.sales_team = contact.fields.sales_team
  }

  return fields
}

async function saveDocumentUrls(env, orderRecordId, nowIso, nowText) {
  const invoiceUrl = getInvoiceUrl(env, orderRecordId)
  const quotationUrl = getQuotationUrl(env, orderRecordId)
  const taxFormUrl = getTaxFormUrl(env, orderRecordId)
  const taxInvoiceUrl = getTaxInvoiceUrl(env, orderRecordId)

  const fields = {
    updated_at: nowIso,
    updated_at_text: nowText
  }

  if (invoiceUrl) fields.invoice_url = invoiceUrl
  if (quotationUrl) fields.quotation_url = quotationUrl
  if (taxFormUrl) fields.tax_form_url = taxFormUrl
  if (taxInvoiceUrl) fields.tax_invoice_url = taxInvoiceUrl

  if (!invoiceUrl && !quotationUrl && !taxFormUrl && !taxInvoiceUrl) {
    console.log("PUBLIC_BASE_URL NOT SET, SKIP DOCUMENT URL")
    return
  }

  await updateOrder(env, orderRecordId, fields)

  console.log("DOCUMENT URLS SAVED")
}

export async function createOrderFromContact(env, contact) {
  console.log("CREATE ORDER FROM CONTACT START")

  const activeOrderId = contact.fields.active_order_id

  if (activeOrderId) {
    console.log("ACTIVE ORDER EXISTS - UPDATE ORDER FROM CONTACT")

    const nowIso = getNowIso()
    const nowText = getNowText()

    await updateOrder(
      env,
      activeOrderId,
      buildOrderUpdateFieldsFromContact(contact, nowIso, nowText)
    )

    console.log("ACTIVE ORDER UPDATED FROM CONTACT")

    return activeOrderId
  }

  const nowIso = getNowIso()
  const nowText = getNowText()

  const result = await createOrder(
    env,
    buildOrderFields(contact, nowIso, nowText)
  )

  const orderRecordId = result.record.record_id

  await updateActiveOrder(env, contact.record_id, orderRecordId)

  contact.fields.active_order_id = orderRecordId

  await saveDocumentUrls(env, orderRecordId, nowIso, nowText)

  console.log("ORDER CREATED:", orderRecordId)

  return orderRecordId
}

export async function markOrderPaid(env, orderRecordId) {
  console.log("MARK ORDER PAID:", orderRecordId)

  const nowIso = getNowIso()
  const nowText = getNowText()

  await updateOrder(env, orderRecordId, {
    payment_status: "Paid",
    payment_verified: false,
    order_status: "Payment Review",

    paid_at: nowIso,
    paid_at_text: nowText,

    updated_at: nowIso,
    updated_at_text: nowText
  })

  console.log("ORDER PAID - WAITING FOR VERIFICATION")

  return true
}

export async function markActiveOrderPaid(env, contact) {
  const orderId = contact.fields.active_order_id

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
  if (!productName) {
    return false
  }

  const orderId = contact.fields.active_order_id

  if (!orderId) {
    console.log("NO ACTIVE ORDER FOR PRODUCT")
    return false
  }

  const nowIso = getNowIso()
  const nowText = getNowText()

  await updateOrder(env, orderId, {
    product_name: productName,

    updated_at: nowIso,
    updated_at_text: nowText
  })

  console.log("ORDER PRODUCT UPDATED:", productName)

  return true
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  const parsed = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "")
  )

  return Number.isFinite(parsed) ? parsed : 0
}
