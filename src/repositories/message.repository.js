import { ENDPOINTS } from "../config/endpoints"
import { getTenantAccessToken } from "../services/lark"

export async function saveMessageRecord(env, fields) {
  const token = await getTenantAccessToken(env)

  const res = await fetch(
    ENDPOINTS.LARK_RECORD(
      env.LARK_APP_TOKEN,
      env.LARK_TABLE_ID
    ),
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

  console.log(
    "MESSAGE CREATE RESPONSE:",
    JSON.stringify(data)
  )

  if (data.code !== 0) {
    throw new Error(
      `LARK MESSAGE ERROR: ${data.msg}`
    )
  }

  return data
}

export async function findMessageById(env, messageId) {
  const token = await getTenantAccessToken(env)

  const filter = encodeURIComponent(`CurrentValue.[message_id]="${messageId}"`)

  const url = `${ENDPOINTS.LARK_RECORD(
    env.LARK_APP_TOKEN,
    env.LARK_TABLE_ID
  )}?filter=${filter}`

  console.log("SEARCH URL:", url)

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await res.json()

  return data?.data?.items?.length > 0
}
