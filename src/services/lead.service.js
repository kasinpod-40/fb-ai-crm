import { analyze } from "./ai-router"
import { analyzeImage } from "./image-ai"

import {
  saveMessageRecord,
  findMessageById
} from "../repositories/message.repository"

import { syncContact } from "./contact.service"
import { syncDeal } from "./deal.service"

import {
  getAiReviewReason,
  notifyAiReviewRequired
} from "./notification.service"

import { getPageConfig } from "./page.service"

import { getNowIso, getNowText } from "../utils/date"

function buildImageAIResult(imageAI, imageUrl) {
  const isPaymentSlip = imageAI.image_type === "payment_slip"

  return {
    intent: isPaymentSlip ? "closed_sale" : "product_info",
    interest_level: isPaymentSlip ? "high" : "medium",
    customer_stage: isPaymentSlip ? "closing" : "interested",
    hot_lead: isPaymentSlip,
    closed_sale: false,
    summary: imageAI.summary || "ลูกค้าส่งรูปภาพ",
    image_ai: {
      ...imageAI,
      image_url: imageUrl
    }
  }
}

function buildImageFallbackResult(imageUrl) {
  return {
    intent: "image_received",
    interest_level: "medium",
    customer_stage: "interested",
    hot_lead: false,
    closed_sale: false,
    summary: "ลูกค้าส่งรูปภาพ แต่ระบบยังวิเคราะห์รูปไม่ได้",
    image_ai: {
      image_type: "unknown",
      product_name: "",
      slip_amount: 0,
      slip_bank: "",
      slip_time: "",
      confidence: 0,
      summary: "วิเคราะห์รูปไม่สำเร็จ",
      image_url: imageUrl
    }
  }
}

function buildSavedMessageText(messageType, text) {
  return messageType === "image" ? "รูปภาพ" : text
}

export async function processLead(
  env,
  senderId,
  pageId,
  pageNameFromWebhook,
  text,
  timestamp,
  messageId,
  metadata = {}
) {
  console.log("LEAD SERVICE START")

  const exists = await findMessageById(env, messageId)

  if (exists) {
    console.log("DUPLICATE MESSAGE SKIPPED:", messageId)
    return
  }

  const pageConfig = await getPageConfig(env, pageId)

  const pageName =
    pageConfig.page_name || pageNameFromWebhook || pageId

  const messageType = metadata.messageType || "text"
  const imageUrl = metadata.imageUrl || ""
  const attachmentId = metadata.attachmentId || ""

  let ai

  if (messageType === "image") {
    try {
      const imageAI = await analyzeImage(env, imageUrl)

      console.log("IMAGE AI:", JSON.stringify(imageAI))

      ai = buildImageAIResult(imageAI, imageUrl)
    } catch (err) {
      console.log("IMAGE AI FAILED:", err)

      ai = buildImageFallbackResult(imageUrl)
    }
  } else {
    ai = await analyze(env, text)
  }

  console.log("AI RESULT:", JSON.stringify(ai))

  await saveMessageRecord(env, {
    message_id: messageId,
    sender_id: senderId,
    page_id: pageId,
    page_name: pageName,
    sales_team: pageConfig.sales_team,

    message: buildSavedMessageText(messageType, text),
    message_type: messageType,
    image_url: imageUrl,
    attachment_id: attachmentId,

    intent: ai.intent,
    interest_level: ai.interest_level,
    customer_stage: ai.customer_stage,
    hot_lead: ai.hot_lead,
    closed_sale: ai.closed_sale,
    ai_summary: ai.summary,

    image_type: ai.image_ai?.image_type || "",
    product_name: ai.product_name || ai.image_ai?.product_name || "",
    slip_amount: ai.image_ai?.slip_amount || 0,
    slip_bank: ai.image_ai?.slip_bank || "",
    slip_time: ai.image_ai?.slip_time || "",
    image_confidence: ai.image_ai?.confidence || 0,

    timestamp,
    created_at: getNowIso(),
    created_at_text: getNowText()
  })

  console.log("MESSAGE SAVED")

  const contact = await syncContact(
    env,
    senderId,
    pageId,
    pageName,
    pageConfig.sales_team,
    text,
    ai
  )

  console.log("CONTACT RETURN:", JSON.stringify(contact))

  const reviewReason = getAiReviewReason(ai)

  if (reviewReason) {
    await notifyAiReviewRequired(env, contact, ai, reviewReason)
  }

  if (contact.fields.payment_completed_from_pending) {
    console.log("SKIP SYNC DEAL: PAYMENT COMPLETED FROM PENDING")
    return
  }

  await syncDeal(env, contact, ai)

  console.log("CONTACT SYNCED")
}