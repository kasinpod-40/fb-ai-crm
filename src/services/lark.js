export async function getLarkTenantToken(env) {
  const res = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: env.LARK_APP_ID,
        app_secret: env.LARK_APP_SECRET
      })
    }
  )

  const data = await res.json()

  return data.tenant_access_token
}

export async function saveMessage(env, fields) {
  const token = await getLarkTenantToken(env)

  const url = `https://open.larksuite.com/open-apis/bitable/v1/apps/${env.LARK_APP_TOKEN}/tables/${env.LARK_TABLE_ID}/records`;

  const body = JSON.stringify({
    fields
  })

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body
  })

}
