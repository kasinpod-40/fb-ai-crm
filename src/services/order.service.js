import {
  createOrder,
  findOrderByDealRecordId
} from "../repositories/order.repository"

export async function createOrderFromDeal(env, deal, contact) {
  const existing = await findOrderByDealRecordId(env, deal.record_id)

  if (existing) {
    console.log("ORDER ALREADY EXISTS")

    return existing
  }

  const now = new Date().toISOString()

  return createOrder(env, {
    order_id: crypto.randomUUID(),

    sender_id: contact.fields.sender_id,

    deal_record_id: deal.record_id,

    customer_name: deal.fields.delivery_name || "",

    phone: deal.fields.delivery_phone || "",

    address: deal.fields.delivery_address || "",

    order_status: "New",

    payment_status: "Pending",

    total_amount: 0,

    invoice_number: "",

    tracking_number: "",

    created_at: now,

    updated_at: now,

    paid_at: ""
  })
}
