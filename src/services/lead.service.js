import { analyze } from "./ai-router"
import { analyzeImage } from "./image-ai"

import {
  saveMessageRecord,
  findMessageById,
  updateMessageRecord
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
  if (imageAI.image_type === "payment_slip") {
    return {
      intent: "closed_sale",
      interest_level: "high",
      customer_stage: "closing",
      hot_lead: true,
      closed_sale: false,
      product_name: "",
      product_qty: 0,
      product_unit: "",
      summary: imageAI.summary || "ลูกค้าส่งสลิป",
      image_ai: {
        ...imageAI,
        image_url: imageUrl
      }
    }
  }

  if (imageAI.image_type === "product_image") {
    return {
      intent: "product_info",
      interest_level: "medium",
      customer_stage: "interested",
      hot_lead: false,
      closed_sale: false,
      product_name: imageAI.product_name || "",
      product_qty: 0,
      product_unit: "",
      summary: imageAI.summary || "ลูกค้าส่งรูปสินค้า",
      image_ai: {
        ...imageAI,
        image_url: imageUrl
      }
    }
  }

  return {
    intent: "image_received",
    interest_level: "low",
    customer_stage: "new_lead",
    hot_lead: false,
    closed_sale: false,
    product_name: "",
    product_qty: 0,
    product_unit: "",
    summary: "ลูกค้าส่งรูปภาพทั่วไป",
    image_ai: {
      ...imageAI,
      image_type: imageAI.image_type || "other",
      product_name: "",
      image_url: imageUrl
    }
  }
}

function buildImageFallbackResult(imageUrl) {
  return {
    intent: "image_received",
    interest_level: "low",
    customer_stage: "new_lead",
    hot_lead: false,
    closed_sale: false,
    product_name: "",
    product_qty: 0,
    product_unit: "",
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

function getErrorMessage(err) {
  return (err?.message || String(err || "Unknown sync error")).slice(0, 1000)
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

  const pageName = pageConfig.page_name || pageNameFromWebhook || pageId

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

  const messageResult = await saveMessageRecord(env, {
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
    product_name:
      ai.intent === "product_info"
        ? ai.product_name || ai.image_ai?.product_name || ""
        : "",
    slip_amount: ai.image_ai?.slip_amount || 0,
    slip_bank: ai.image_ai?.slip_bank || "",
    slip_time: ai.image_ai?.slip_time || "",
    image_confidence: ai.image_ai?.confidence || 0,

    timestamp,
    created_at: getNowIso(),
    created_at_text: getNowText(),
    process_status: "processing",
    error_message: ""
  })

  console.log("MESSAGE SAVED")

  const messageRecordId = messageResult.data?.record?.record_id

  try {
    const contact = await syncContact(
      env,
      senderId,
      pageId,
      pageName,
      pageConfig.sales_team,
      pageConfig.default_sales_owner,
      buildSavedMessageText(messageType, text),
      ai
    )

    console.log("CONTACT RETURN:", JSON.stringify(contact))

    const reviewReason = getAiReviewReason(ai)

    if (reviewReason) {
      await notifyAiReviewRequired(env, contact, ai, reviewReason)
    }

    await syncDeal(env, contact, ai)

    if (messageRecordId) {
      await updateMessageRecord(env, messageRecordId, {
        process_status: "synced",
        error_message: ""
      })
    }

    console.log("CONTACT SYNCED")
  } catch (err) {
    console.log("SYNC FAILED:", err)

    if (messageRecordId) {
      await updateMessageRecord(env, messageRecordId, {
        process_status: "sync_failed",
        error_message: getErrorMessage(err)
      })
    }
  }
}
