export const ENDPOINTS = {
  LARK_TOKEN:
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",

  LARK_RECORD: (appToken, tableId) =>
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,

  FACEBOOK_GRAPH: "https://graph.facebook.com"
}
