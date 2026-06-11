function htmlPage(title, body) {
  return new Response(
    `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="font-family: Arial; padding: 40px; max-width: 800px; margin: auto; line-height: 1.6;">
  <h1>${title}</h1>
  ${body}
</body>
</html>
`,
    {
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      }
    }
  )
}

export async function handleLegalRoutes(request, url) {
  if (request.method !== "GET") return null

  if (url.pathname === "/privacy") {
    return htmlPage(
      "Privacy Policy",
      `
      <p>This application is used to receive customer messages from Facebook Messenger and store customer communication data for CRM and sales management purposes.</p>
      <p>We do not sell, share, or distribute personal information to third parties.</p>
      <p>If you have any questions, please contact the business owner.</p>
      `
    )
  }

  if (url.pathname === "/terms") {
    return htmlPage(
      "Terms of Service",
      `
      <p>This system is provided for customer communication, CRM management, quotation generation, invoice generation, and sales operations.</p>
      <p>By using this service, users agree that submitted information may be processed for business and customer support purposes.</p>
      `
    )
  }

  if (url.pathname === "/data-deletion") {
    return htmlPage(
      "Data Deletion Instructions",
      `
      <p>If you would like your personal data removed from our systems, please contact the business owner directly.</p>
      <p>After verification, the requested data will be removed within a reasonable timeframe.</p>
      `
    )
  }

  return null
}
