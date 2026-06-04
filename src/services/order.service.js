import {
  createOrder,
  findOrderByDealRecordId,
  updateOrder
} from "../repositories/order.repository"

import { updateActiveOrder } from "../repositories/contact.repository"

import { generateInvoiceNumber } from "../utils/invoice"

export async function createOrderFromContact(env, contact) {
  console.log("CREATE ORDER FROM CONTACT START")

  const activeOrderId = contact.fields.active_order_id

  console.log("ACTIVE ORDER:", activeOrderId)

  if (activeOrderId) {
    console.log("ACTIVE ORDER EXISTS")

    return
  }

  const now = new Date().toISOString()

  const result = await createOrder(env, {
    order_id: crypto.randomUUID(),

    sender_id: contact.fields.sender_id,

    deal_record_id: contact.fields.active_deal_id || "",

    customer_name: contact.fields.delivery_name || "",

    phone: contact.fields.delivery_phone || "",

    address: contact.fields.delivery_address || "",

    order_status: "New",

    payment_status: "Pending",

    total_amount: 0,

    invoice_number: generateInvoiceNumber(),

    tracking_number: "",

    created_at: now,

    updated_at: now,

    paid_at: "",

    invoice_pdf_url: ""
  })

  const orderRecordId = result.record.record_id

  console.log("ORDER RECORD ID:", orderRecordId)

  await updateActiveOrder(env, contact.record_id, orderRecordId)

  console.log("ACTIVE ORDER SAVED TO CONTACT")

  const invoiceUrl = `${env.PUBLIC_BASE_URL}/invoice/${orderRecordId}`

  await updateOrder(env, orderRecordId, {
    invoice_pdf_url: invoiceUrl,

    updated_at: now
  })

  console.log("INVOICE URL SAVED:", invoiceUrl)

  console.log("ORDER CREATED")
}

export async function markOrderPaid(env, orderRecordId) {
  console.log("MARK ORDER PAID:", orderRecordId)

  const now = new Date().toISOString()

  await updateOrder(env, orderRecordId, {
    payment_status: "Paid",

    order_status: "Completed",

    paid_at: now,

    updated_at: now
  })

  console.log("ORDER PAID")
}

export async function markActiveOrderPaid(env, contact) {
  const orderId = contact.fields.active_order_id

  console.log("ACTIVE ORDER TO PAY:", orderId)

  if (!orderId) {
    console.log("NO ACTIVE ORDER TO MARK PAID")

    return
  }

  await markOrderPaid(env, orderId)
}

export async function cancelActiveOrder(env, contact) {
  const orderId = contact.fields.active_order_id

  if (!orderId) {
    return
  }

  const now = new Date().toISOString()

  await updateOrder(env, orderId, {
    order_status: "Cancelled",
    updated_at: now
  })

  console.log("ORDER CANCELLED")
}
