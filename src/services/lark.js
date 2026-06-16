import { ENDPOINTS } from "../config/endpoints"

export async function getTenantAccessToken(env) {
  const res = await fetch(ENDPOINTS.LARK_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      app_id: env.LARK_APP_ID,
      app_secret: env.LARK_APP_SECRET
    })
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok || data.code !== 0 || !data.tenant_access_token) {
    throw new Error(
      `LARK TOKEN ERROR: ${data.msg || data.message || res.status}`
    )
  }

  return data.tenant_access_token
}
