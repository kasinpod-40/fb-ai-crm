import { ENDPOINTS } from "../config/endpoints"
import { getTenantAccessToken } from "../services/lark"

export async function createContact(env, fields) {
  const token = await getTenantAccessToken(env)

  const res = await fetch(
    ENDPOINTS.LARK_RECORD(env.LARK_APP_TOKEN, env.CRM_CONTACTS_TABLE_ID),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields
      })
    }
  )

  const data = await res.json()

  console.log("CONTACT CREATE RESPONSE:", JSON.stringify(data))

  if (data.code !== 0) {
    throw new Error(`LARK CONTACT ERROR: ${data.msg}`)
  }

  return data
}

export async function findContactBySenderId(env, senderId) {
  const token = await getTenantAccessToken(env)

  const filter = encodeURIComponent(`CurrentValue.[sender_id]="${senderId}"`)

  const url = `${ENDPOINTS.LARK_RECORD(
    env.LARK_APP_TOKEN,
    env.CRM_CONTACTS_TABLE_ID
  )}?filter=${filter}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await res.json()

  return data?.data?.items?.[0] || null
}

export async function updateContact(env, recordId, fields) {
  const token = await getTenantAccessToken(env)

  const url = `${ENDPOINTS.LARK_RECORD(
    env.LARK_APP_TOKEN,
    env.CRM_CONTACTS_TABLE_ID
  )}/${recordId}`

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields
    })
  })

  const data = await res.json()

  console.log("CONTACT UPDATE RESPONSE:", JSON.stringify(data))

  if (data.code !== 0) {
    throw new Error(`LARK UPDATE ERROR: ${data.msg}`)
  }

  return data
}

export async function updateActiveDeal(env, recordId, activeDealId) {
  return updateContact(env, recordId, {
    active_deal_id: activeDealId
  })
}
