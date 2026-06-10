import { findPageById } from "../repositories/page.repository"

export async function getPageConfig(env, pageId) {
  const page = await findPageById(env, pageId)

  if (!page || page.fields.is_active !== true) {
    return {
      page_id: pageId,
      page_name: pageId,
      sales_team: "",
      default_sales_owner: "Unassigned"
    }
  }

  return {
    page_id: page.fields.page_id || pageId,
    page_name: page.fields.page_name || pageId,
    sales_team: page.fields.sales_team || "",
    default_sales_owner: page.fields.default_sales_owner || "Unassigned"
  }
}
