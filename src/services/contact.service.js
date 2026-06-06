import {
  createContact,
  findContactBySenderId,
  updateContact
} from "../repositories/contact.repository"

import { mapStage, calculateLeadScore } from "../models/lead.model"

import { parseContactInfo } from "./contact-parser"

import { createOrderFromContact } from "./order.service"

import { notifyNewLead, notifyHotLead } from "./notification.service"

function isHotLead(ai, fields) {
  return ai.hot_lead === true || Number(fields.lead_score || 0) >= 80
}

function wasAlreadyHot(contact) {
  return contact?.fields?.hot_lead === true
}

function buildContactFields(
  senderId,
  pageId,
  message,
  ai,
  currentMessageCount
) {
  const now = new Date().toISOString()

  const fields = {
    sender_id: senderId,
    page_id: pageId,
    current_stage: mapStage(ai),
    lead_score: calculateLeadScore(ai),
    hot_lead: ai.hot_lead,
    last_message: message,
    last_contact_at: now,
    ai_summary: ai.summary,
    message_count: currentMessageCount + 1,
    updated_at: now
  }

  if (ai.intent === "delivery_address") {
    const contactInfo = parseContactInfo(message)

    fields.delivery_name = contactInfo.delivery_name
    fields.delivery_phone = contactInfo.delivery_phone
    fields.delivery_address = contactInfo.delivery_address
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

export async function syncContact(env, senderId, pageId, message, ai) {
  const now = new Date().toISOString()

  const contact = await findContactBySenderId(env, senderId)

  const currentMessageCount = Number(contact?.fields?.message_count || 0)

  const fields = buildContactFields(
    senderId,
    pageId,
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

    if (ai.intent === "delivery_address") {
      await createOrderFromContact(env, updatedContact)
    }

    return updatedContact
  }

  const result = await createContact(env, {
    ...fields,
    first_contact_at: now,
    created_at: now
  })

  console.log("CONTACT CREATED")

  const createdContact = result.data.record

  await notifyNewLead(env, createdContact)

  if (isHotLead(ai, fields)) {
    await notifyHotLead(env, createdContact)
  }

  if (ai.intent === "delivery_address") {
    await createOrderFromContact(env, createdContact)
  }

  return createdContact
}
