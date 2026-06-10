import { updateContact } from "../repositories/contact.repository"

import { updateDeal } from "../repositories/deal.repository"

import { updateOrder } from "../repositories/order.repository"

import {
  notifyPaymentReceived,
  notifyPaymentSlipNoActiveOrder
} from "./notification.service"

import { getNowIso, getNowText } from "../utils/date"

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

function buildPendingSlipFields(imageAI) {
  return {
    pending_payment: true,
    pending_slip_amount: toNumber(imageAI.slip_amount),
    pending_slip_bank: imageAI.slip_bank || "",
    pending_slip_time: imageAI.slip_time || "",
    pending_slip_image_url: imageAI.image_url || ""
  }
}

function buildPaymentFieldsFromImageAI(imageAI, nowIso, nowText) {
  return {
    total_amount: toNumber(imageAI.slip_amount),
    slip_amount: toNumber(imageAI.slip_amount),
    slip_bank: imageAI.slip_bank || "",
    slip_time: imageAI.slip_time || "",
    slip_image_url: imageAI.image_url || "",

    payment_status: "Paid",
    payment_verified: false,
    order_status: "Payment Review",

    updated_at: nowIso,
    updated_at_text: nowText
  }
}

function buildPaymentFieldsFromPending(contact, nowIso, nowText) {
  return {
    total_amount: toNumber(contact.fields.pending_slip_amount),
    slip_amount: toNumber(contact.fields.pending_slip_amount),
    slip_bank: contact.fields.pending_slip_bank || "",
    slip_time: contact.fields.pending_slip_time || "",
    slip_image_url: contact.fields.pending_slip_image_url || "",

    payment_status: "Paid",
    payment_verified: false,
    order_status: "Payment Review",

    updated_at: nowIso,
    updated_at_text: nowText
  }
}

function buildPendingImageAI(contact) {
  return {
    slip_amount: toNumber(contact.fields.pending_slip_amount),
    slip_bank: contact.fields.pending_slip_bank || "",
    slip_time: contact.fields.pending_slip_time || "",
    image_url: contact.fields.pending_slip_image_url || "",
    summary: "ระบบแนบสลิปเข้ากับ Order แล้ว รอ Sales ตรวจสอบยอด"
  }
}

async function clearPendingPayment(env, contact) {
  await updateContact(env, contact.record_id, {
    pending_payment: false,
    pending_slip_amount: 0,
    pending_slip_bank: "",
    pending_slip_time: "",
    pending_slip_image_url: ""
  })

  contact.fields.pending_payment = false
  contact.fields.pending_slip_amount = 0
  contact.fields.pending_slip_bank = ""
  contact.fields.pending_slip_time = ""
  contact.fields.pending_slip_image_url = ""

  console.log("PENDING PAYMENT CLEARED")
}

export async function savePendingPayment(env, contact, imageAI) {
  await updateContact(env, contact.record_id, buildPendingSlipFields(imageAI))

  contact.fields.pending_payment = true
  contact.fields.pending_slip_amount = toNumber(imageAI.slip_amount)
  contact.fields.pending_slip_bank = imageAI.slip_bank || ""
  contact.fields.pending_slip_time = imageAI.slip_time || ""
  contact.fields.pending_slip_image_url = imageAI.image_url || ""

  await notifyPaymentSlipNoActiveOrder(env, contact, imageAI)

  console.log("PENDING PAYMENT SAVED")
}

export async function applySlipToActiveOrder(env, contact, imageAI) {
  const orderId = contact.fields.active_order_id

  if (!orderId) {
    console.log("NO ACTIVE ORDER FOR SLIP")
    return false
  }

  const nowIso = getNowIso()
  const nowText = getNowText()

  await updateOrder(env, orderId, buildPaymentFieldsFromImageAI(imageAI, nowIso, nowText))

  await notifyPaymentReceived(env, contact, {
    ...imageAI,
    summary: "ได้รับสลิปแล้ว รอ Sales ตรวจสอบยอด"
  })

  console.log("SLIP ATTACHED TO ACTIVE ORDER - WAITING FOR VERIFICATION")

  return true
}

export async function applyPendingPaymentToOrder(env, contact, orderRecordId) {
  if (!contact.fields.pending_payment) {
    console.log("NO PENDING PAYMENT")
    return false
  }

  if (!orderRecordId) {
    console.log("NO ORDER RECORD ID FOR PENDING PAYMENT")
    return false
  }

  const nowIso = getNowIso()
  const nowText = getNowText()

  await updateOrder(
    env,
    orderRecordId,
    buildPaymentFieldsFromPending(contact, nowIso, nowText)
  )

  const imageAI = buildPendingImageAI(contact)

  await notifyPaymentReceived(env, contact, imageAI)

  await clearPendingPayment(env, contact)

  console.log("PENDING PAYMENT ATTACHED TO ORDER - WAITING FOR VERIFICATION")

  return true
}

export async function closeDealAfterPayment(env, contact, dealRecordId) {
  if (!dealRecordId) {
    console.log("NO DEAL TO CLOSE AFTER PAYMENT")
    return
  }

  const nowIso = getNowIso()
  const nowText = getNowText()

  await updateDeal(env, dealRecordId, {
    status: "Won",
    stage: "Won",
    closed_at: nowIso,
    closed_at_text: nowText,
    updated_at: nowIso,
    updated_at_text: nowText
  })

  await updateContact(env, contact.record_id, {
    active_deal_id: "",
    active_order_id: "",
    current_stage: "Won",
    hot_lead: true,
    ai_summary: "Sales ยืนยันการชำระเงินแล้ว ระบบปิดการขายสำเร็จ"
  })

  console.log("DEAL CLOSED AFTER PAYMENT VERIFIED")
}
