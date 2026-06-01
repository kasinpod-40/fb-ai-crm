import { ENDPOINTS } from "../config/endpoints"
import { getTenantAccessToken } from "../services/lark"

export async function createDeal(env, fields) {
  const token = await getTenantAccessToken(env)

  const res = await fetch(
    ENDPOINTS.LARK_RECORD(env.LARK_APP_TOKEN, env.CRM_DEALS_TABLE_ID),
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

  console.log("DEAL CREATE RESPONSE:", JSON.stringify(data))

  if (data.code !== 0) {
    throw new Error(`LARK DEAL ERROR: ${data.msg}`)
  }

  return data.data
}

export async function updateDeal(env, recordId, fields) {
  const token = await getTenantAccessToken(env)

  const url =
    ENDPOINTS.LARK_RECORD(env.LARK_APP_TOKEN, env.CRM_DEALS_TABLE_ID) +
    `/${recordId}`

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

  console.log("DEAL UPDATE RESPONSE:", JSON.stringify(data))

  if (data.code !== 0) {
    throw new Error(`LARK DEAL UPDATE ERROR: ${data.msg}`)
  }

  return data.data
}
