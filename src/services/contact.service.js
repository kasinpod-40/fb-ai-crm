import {
  createContact,
  findContactBySenderId,
  updateContact
} from "../repositories/contact.repository"

import { mapStage, calculateLeadScore } from "../models/lead.model"

import { parseContactInfo } from "./contact-parser"

import { createOrderFromContact } from "./order.service"

import { applyPendingPaymentToOrder } from "./payment.service"

import { notifyNewLead, notifyHotLead } from "./notification.service"

import { getNowIso, getNowText } from "../utils/date"

function isHotLead(ai, fields) {
  return ai.hot_lead === true || Number(fields.lead_score || 0) >= 80
}

function wasAlreadyHot(contact) {
  return contact?.fields?.hot_lead === true
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

function buildContactFields(
  senderId,
  pageId,
  pageName,
  salesTeam,
  salesOwner,
  message,
  ai,
  currentMessageCount
) {
  const nowIso = getNowIso()
  const nowText = getNowText()

  const fields = {
    sender_id: senderId,
    page_id: pageId,
    page_name: pageName,
    sales_team: salesTeam,
    sales_owner: salesOwner || "Unassigned",

    current_stage: mapStage(ai),
    lead_score: calculateLeadScore(ai),
    hot_lead: ai.hot_lead,
    last_message: message,
    ai_summary: ai.summary,
    message_count: currentMessageCount + 1,
    last_contact_at: nowIso,
    last_contact_at_text: nowText,
    updated_at: nowIso,
    updated_at_text: nowText
  }

  if (ai.intent === "delivery_address") {
    const contactInfo = parseContactInfo(message)

    fields.delivery_name = contactInfo.delivery_name
    fields.delivery_phone = contactInfo.delivery_phone
    fields.delivery_address = contactInfo.delivery_address
  }

  if (ai.product_name) {
    fields.product_name = ai.product_name
    fields.product_source = "text"
  }

  if (ai.product_qty) {
    fields.product_qty = toNumber(ai.product_qty)
  }

  if (ai.product_unit) {
    fields.product_unit = ai.product_unit
  }

  if (ai.image_ai?.image_type === "product_image" && ai.image_ai.product_name) {
    fields.product_name = ai.image_ai.product_name
    fields.product_source = "image"
  }

  if (ai.image_ai?.image_url) {
    fields.last_image_url = ai.image_ai.image_url
  }

  return fields
}

async function handleDeliveryAddress(env, contact, ai) {
  if (ai.intent !== "delivery_address") {
    return
  }

  const orderRecordId = await createOrderFromContact(env, contact)

  if (orderRecordId) {
    contact.fields.active_order_id = orderRecordId
  }

  const paymentAttached = await applyPendingPaymentToOrder(
    env,
    contact,
    orderRecordId
  )

  if (paymentAttached) {
    console.log("PENDING PAYMENT ATTACHED TO ORDER - WAITING FOR VERIFICATION")
  }
}

export async function syncContact(
  env,
  senderId,
  pageId,
  pageName,
  salesTeam,
  defaultSalesOwner,
  message,
  ai
) {
  const nowIso = getNowIso()
  const nowText = getNowText()

  const contact = await findContactBySenderId(env, senderId)

  const currentMessageCount = Number(contact?.fields?.message_count || 0)
  const salesOwner =
    contact?.fields?.sales_owner || defaultSalesOwner || "Unassigned"

  const fields = buildContactFields(
    senderId,
    pageId,
    pageName,
    salesTeam,
    salesOwner,
    message,
    ai,
    currentMessageCount
  )

  if (contact) {
    await updateContact(env, contact.record_id, fields)

    console.log("CONTACT UPDATED")

    const updatedContact = {
      record_id: contact.record_id,
      fields: {
        ...contact.fields,
        ...fields
      }
    }

    if (isHotLead(ai, fields) && !wasAlreadyHot(contact)) {
      await notifyHotLead(env, updatedContact)
    }

    await handleDeliveryAddress(env, updatedContact, ai)

    return updatedContact
  }

  const result = await createContact(env, {
    ...fields,
    first_contact_at: nowIso,
    first_contact_at_text: nowText,
    created_at: nowIso,
    created_at_text: nowText
  })

  console.log("CONTACT CREATED")

  const createdContact = result.data.record

  await notifyNewLead(env, createdContact)

  if (isHotLead(ai, fields)) {
    await notifyHotLead(env, createdContact)
  }

  await handleDeliveryAddress(env, createdContact, ai)

  return createdContact
}
