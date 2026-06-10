import { getTenantAccessToken } from "../services/lark"

async function requestPageTable(env, path) {
  const token = await getTenantAccessToken(env)

  const res = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${env.LARK_APP_TOKEN}/tables/${env.FB_PAGES_TABLE_ID}${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  )

  const data = await res.json()

  if (!res.ok || data.code !== 0) {
    throw new Error(`LARK FB_PAGES ERROR: ${data.msg || JSON.stringify(data)}`)
  }

  return data.data
}

export async function findPageById(env, pageId) {
  const filter = encodeURIComponent(`CurrentValue.[page_id]="${pageId}"`)

  const data = await requestPageTable(
    env,
    `/records?filter=${filter}&page_size=1`
  )

  return data.items?.[0] || null
}
