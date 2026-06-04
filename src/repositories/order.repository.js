import { ENDPOINTS } from "../config/endpoints"
import { getTenantAccessToken } from "../services/lark"

export async function createOrder(env, fields) {
  const token = await getTenantAccessToken(env)

  const res = await fetch(
    ENDPOINTS.LARK_RECORD(env.LARK_APP_TOKEN, env.CRM_ORDERS_TABLE_ID),
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

  console.log("ORDER CREATE RESPONSE:", JSON.stringify(data))

  if (data.code !== 0) {
    throw new Error(`LARK ORDER ERROR: ${data.msg}`)
  }

  return data.data
}

export async function findOrderByDealRecordId(env, dealRecordId) {
  const token = await getTenantAccessToken(env)

  const filter = encodeURIComponent(
    `CurrentValue.[deal_record_id]="${dealRecordId}"`
  )

  const url = `${ENDPOINTS.LARK_RECORD(
    env.LARK_APP_TOKEN,
    env.CRM_ORDERS_TABLE_ID
  )}?filter=${filter}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await res.json()

  return data?.data?.items?.[0] || null
}

export async function updateOrder(env, recordId, fields) {
  const token = await getTenantAccessToken(env)

  const url = `${ENDPOINTS.LARK_RECORD(
    env.LARK_APP_TOKEN,
    env.CRM_ORDERS_TABLE_ID
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

  console.log("ORDER UPDATE RESPONSE:", JSON.stringify(data))

  if (data.code !== 0) {
    throw new Error(`LARK ORDER UPDATE ERROR: ${data.msg}`)
  }

  return data.data
}

export async function findOrderByRecordId(env, recordId) {
  const token = await getTenantAccessToken(env)

  const url = `${ENDPOINTS.LARK_RECORD(
    env.LARK_APP_TOKEN,
    env.CRM_ORDERS_TABLE_ID
  )}/${recordId}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await res.json()

  return data?.data?.record
}
