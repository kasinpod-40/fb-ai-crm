import {
  findOrderByRecordId,
  updateOrder
} from "../repositories/order.repository"

function formatMoney(value) {
  const amount = Number(value || 0)

  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function getPaymentBadge(paymentStatus, paymentVerified) {
  if (paymentStatus === "Paid" && paymentVerified) {
    return `<span class="badge paid">Paid & Verified</span>`
  }

  if (paymentStatus === "Paid" && !paymentVerified) {
    return `<span class="badge review">Paid / Waiting Review</span>`
  }

  return `<span class="badge pending">Pending</span>`
}

async function notifyTaxFormSubmitted(
  env,
  order,
  taxName,
  taxId,
  taxInvoiceUrl
) {
  if (!env.LARK_BOT_WEBHOOK_URL) {
    console.log("LARK BOT WEBHOOK URL NOT SET")
    return
  }

  const fields = order?.fields || {}

  const text = [
    "🧾 ลูกค้ากรอกข้อมูลใบกำกับภาษีแล้ว",
    "",
    `🛒 Order: ${fields.order_number || fields.order_id || "-"}`,
    `👤 Customer: ${fields.customer_name || "-"}`,
    `🏢 Tax Name: ${taxName || "-"}`,
    `🆔 Tax ID: ${taxId || "-"}`,
    "",
    `🔗 Tax Invoice: ${taxInvoiceUrl || "-"}`
  ].join("\n")

  try {
    const res = await fetch(env.LARK_BOT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        msg_type: "text",
        content: {
          text
        }
      })
    })

    const data = await res.json().catch(() => ({}))

    console.log("TAX FORM NOTIFICATION RESPONSE:", JSON.stringify(data))

    if (!res.ok) {
      console.log("TAX FORM NOTIFICATION HTTP ERROR:", res.status)
    }
  } catch (err) {
    console.log("TAX FORM NOTIFICATION FAILED:", err)
  }
}

function renderDocumentHtml({
  type,
  sellerName,
  number,
  orderNumber,
  customerName,
  phone,
  address,
  productName,
  productQty,
  productUnit,
  totalAmount,
  paymentStatus,
  paymentVerified,
  orderStatus,
  createdAt,
  paidAt,
  slipAmount,
  slipBank,
  slipTime
}) {
  const isInvoice = type === "INVOICE"

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${number}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px;
      background: #f3f4f6;
      color: #111827;
      font-family: Arial, "Tahoma", sans-serif;
    }

    .toolbar {
      max-width: 920px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .print-button {
      border: none;
      background: #111827;
      color: white;
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }

    .page {
      max-width: 920px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    .header {
      padding: 36px 42px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e5e7eb;
    }

    .brand h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 1px;
    }

    .brand .sub {
      margin-top: 8px;
      color: #6b7280;
      font-size: 14px;
    }

    .meta {
      text-align: right;
      font-size: 14px;
      color: #374151;
    }

    .doc-no {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .section {
      padding: 28px 42px;
      border-bottom: 1px solid #e5e7eb;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .value {
      font-size: 15px;
      line-height: 1.6;
      color: #111827;
      white-space: pre-line;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    th {
      text-align: left;
      background: #f9fafb;
      color: #374151;
      font-size: 13px;
      padding: 14px;
      border-bottom: 1px solid #e5e7eb;
    }

    td {
      padding: 14px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      vertical-align: top;
    }

    .right {
      text-align: right;
    }

    .summary {
      display: flex;
      justify-content: flex-end;
      padding: 28px 42px;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-box {
      width: 360px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 15px;
    }

    .summary-row.total {
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      margin-top: 16px;
      font-size: 24px;
      font-weight: 800;
    }

    .badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }

    .badge.paid {
      background: #dcfce7;
      color: #166534;
    }

    .badge.review {
      background: #fef3c7;
      color: #92400e;
    }

    .badge.pending {
      background: #fee2e2;
      color: #991b1b;
    }

    .footer {
      padding: 24px 42px 36px 42px;
      color: #6b7280;
      font-size: 13px;
      line-height: 1.6;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .toolbar {
        display: none;
      }

      .page {
        max-width: none;
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>

<body>
  <div class="toolbar">
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <main class="page">
    <header class="header">
      <div class="brand">
        <h1>${type}</h1>
        <div class="sub">${sellerName}</div>
      </div>

      <div class="meta">
        <div class="doc-no">${number}</div>
        <div>Order No: ${orderNumber}</div>
        <div>Date: ${createdAt}</div>
      </div>
    </header>

    <section class="section grid">
      <div>
        <div class="label">${isInvoice ? "Bill To" : "Customer"}</div>
        <div class="value">
          ${customerName}<br/>
          Tel: ${phone}<br/>
          ${address}
        </div>
      </div>

      <div>
        <div class="label">${isInvoice ? "Payment Status" : "Quotation Terms"}</div>
        <div class="value">
          ${
            isInvoice
              ? `${getPaymentBadge(paymentStatus, paymentVerified)}<br/><br/>Order Status: ${orderStatus}<br/>Paid At: ${paidAt}`
              : `Valid for 7 days<br/>Payment before shipment<br/>Please confirm stock before payment`
          }
        </div>
      </div>
    </section>

    <section class="section">
      <div class="label">Items</div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th class="right">Qty</th>
            <th class="right">Amount</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>${productName}</td>
            <td class="right">${productQty || "-"} ${productUnit || ""}</td>
            <td class="right">${totalAmount} THB</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="summary">
      <div class="summary-box">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${totalAmount} THB</span>
        </div>

        <div class="summary-row">
          <span>Tax</span>
          <span>0.00 THB</span>
        </div>

        <div class="summary-row total">
          <span>Total</span>
          <span>${totalAmount} THB</span>
        </div>
      </div>
    </section>

    ${
      isInvoice
        ? `
    <section class="section grid">
      <div>
        <div class="label">Payment Detail</div>
        <div class="value">
          Slip Amount: ${slipAmount} THB<br/>
          Bank: ${slipBank}<br/>
          Slip Time: ${slipTime}
        </div>
      </div>

      <div>
        <div class="label">Verification</div>
        <div class="value">
          Payment Verified: ${paymentVerified ? "Yes" : "No / Waiting Review"}
        </div>
      </div>
    </section>
        `
        : ""
    }

    <footer class="footer">
      ${
        isInvoice
          ? `This invoice was generated automatically by ${sellerName}. Please verify payment before shipment.`
          : `This quotation was generated automatically by ${sellerName}. Please confirm stock and payment before shipment.`
      }
    </footer>
  </main>
</body>
</html>
`
}

function buildDocumentData(env, order, orderId, type) {
  const f = order.fields || {}

  const isInvoice = type === "INVOICE"

  return {
    type,
    sellerName: escapeHtml(env.SELLER_NAME || "Messenger AI CRM"),
    number: escapeHtml(
      isInvoice
        ? f.invoice_number || "-"
        : f.quotation_number || `QT-${f.invoice_number || orderId}`
    ),
    orderNumber: escapeHtml(f.order_number || f.order_id || orderId),
    customerName: escapeHtml(f.customer_name || "-"),
    phone: escapeHtml(f.phone || "-"),
    address: escapeHtml(f.address || "-"),
    productName: escapeHtml(f.product_name || "-"),
    productQty: Number(f.product_qty || 0),
    productUnit: escapeHtml(f.product_unit || ""),
    totalAmount: formatMoney(f.total_amount),
    paymentStatus: escapeHtml(f.payment_status || "Pending"),
    paymentVerified: f.payment_verified === true,
    orderStatus: escapeHtml(f.order_status || "-"),
    createdAt: formatDate(f.created_at),
    paidAt: formatDate(f.paid_at),
    slipAmount: formatMoney(f.slip_amount),
    slipBank: escapeHtml(f.slip_bank || "-"),
    slipTime: escapeHtml(f.slip_time || "-")
  }
}

export async function renderInvoicePage(request, env, orderId) {
  const order = await findOrderByRecordId(env, orderId)

  if (!order) {
    return new Response("Invoice not found", {
      status: 404
    })
  }

  const html = renderDocumentHtml(
    buildDocumentData(env, order, orderId, "INVOICE")
  )

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  })
}

export async function renderQuotationPage(request, env, orderId) {
  const order = await findOrderByRecordId(env, orderId)

  if (!order) {
    return new Response("Quotation not found", {
      status: 404
    })
  }

  const html = renderDocumentHtml(
    buildDocumentData(env, order, orderId, "QUOTATION")
  )

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  })
}

function generateTaxInvoiceNumber() {
  const now = new Date()

  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")

  const random = crypto.randomUUID().slice(0, 4).toUpperCase()

  return `TAX-${yyyy}${mm}${dd}-${random}`
}

function getPublicBaseUrl(request, env) {
  if (env.PUBLIC_BASE_URL) {
    return env.PUBLIC_BASE_URL
  }

  const url = new URL(request.url)

  return `${url.protocol}//${url.host}`
}

export async function renderTaxFormPage(request, env, orderId) {
  const order = await findOrderByRecordId(env, orderId)

  if (!order) {
    return new Response("Order not found", {
      status: 404
    })
  }

  const f = order.fields || {}

  const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Tax Invoice Form</title>

  <style>
    body {
      margin: 0;
      padding: 32px;
      background: #f3f4f6;
      font-family: Arial, "Tahoma", sans-serif;
      color: #111827;
    }

    .card {
      max-width: 720px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
    }

    .sub {
      color: #6b7280;
      margin-bottom: 24px;
      line-height: 1.6;
    }

    .order-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 24px;
      line-height: 1.7;
      font-size: 14px;
    }

    label {
      display: block;
      font-weight: 700;
      margin-bottom: 8px;
      margin-top: 18px;
    }

    input, textarea {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font-size: 15px;
      font-family: inherit;
    }

    textarea {
      min-height: 110px;
      resize: vertical;
    }

    button {
      width: 100%;
      margin-top: 28px;
      border: none;
      background: #111827;
      color: white;
      padding: 14px 18px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
    }

    .note {
      margin-top: 16px;
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
    }
  </style>
</head>

<body>
  <main class="card">
    <h1>ขอข้อมูลใบกำกับภาษี</h1>

    <div class="sub">
      กรุณากรอกข้อมูลสำหรับออกใบกำกับภาษีให้ครบถ้วน
    </div>

    <div class="order-box">
      <strong>Order:</strong> ${escapeHtml(f.order_number || f.order_id || orderId)}<br/>
      <strong>Customer:</strong> ${escapeHtml(f.customer_name || "-")}<br/>
      <strong>Amount:</strong> ${formatMoney(f.total_amount)} THB
    </div>

    <form method="POST" action="/api/tax-form/${orderId}">
      <label>ชื่อบริษัท / ชื่อผู้เสียภาษี</label>
      <input
        name="tax_name"
        required
        value="${escapeHtml(f.tax_name || "")}"
        placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
      />

      <label>เลขประจำตัวผู้เสียภาษี</label>
      <input
        name="tax_id"
        required
        value="${escapeHtml(f.tax_id || "")}"
        placeholder="เช่น 0123456789012"
      />

      <label>ที่อยู่สำหรับออกใบกำกับภาษี</label>
      <textarea
        name="tax_address"
        required
        placeholder="กรอกที่อยู่สำหรับใบกำกับภาษี"
      >${escapeHtml(f.tax_address || "")}</textarea>

      <button type="submit">ส่งข้อมูลใบกำกับภาษี</button>
    </form>

    <div class="note">
      หลังจากส่งข้อมูลแล้ว ทีมงานจะตรวจสอบและออกใบกำกับภาษีให้ตามข้อมูลที่กรอก
    </div>
  </main>
</body>
</html>
`

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  })
}

export async function handleTaxFormSubmit(request, env, orderId) {
  const formData = await request.formData()

  const taxName = String(formData.get("tax_name") || "").trim()
  const taxId = String(formData.get("tax_id") || "").trim()
  const taxAddress = String(formData.get("tax_address") || "").trim()

  if (!taxName || !taxId || !taxAddress) {
    return new Response("Missing tax information", {
      status: 400
    })
  }

  const order = await findOrderByRecordId(env, orderId)

  if (!order) {
    return new Response("Order not found", {
      status: 404
    })
  }

  const baseUrl = getPublicBaseUrl(request, env)

  const taxInvoiceNumber =
    order.fields?.tax_invoice_number || generateTaxInvoiceNumber()

  const taxInvoiceUrl = `${baseUrl}/tax-invoice/${orderId}`

  await updateOrder(env, orderId, {
    need_tax_invoice: true,
    tax_name: taxName,
    tax_id: taxId,
    tax_address: taxAddress,
    tax_invoice_number: taxInvoiceNumber,
    tax_invoice_url: taxInvoiceUrl,
    tax_invoice_status: "Requested"
  })

  await notifyTaxFormSubmitted(env, order, taxName, taxId, taxInvoiceUrl)

  const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>Tax Information Submitted</title>
  <style>
    body {
      margin: 0;
      padding: 32px;
      background: #f3f4f6;
      font-family: Arial, "Tahoma", sans-serif;
      color: #111827;
    }

    .card {
      max-width: 640px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    h1 {
      margin: 0 0 12px 0;
      color: #166534;
    }

    p {
      color: #374151;
      line-height: 1.7;
    }

    a {
      display: inline-block;
      margin-top: 18px;
      background: #111827;
      color: white;
      padding: 12px 18px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 700;
    }
  </style>
</head>

<body>
  <main class="card">
    <h1>ส่งข้อมูลสำเร็จ</h1>
    <p>
      ระบบได้รับข้อมูลสำหรับออกใบกำกับภาษีแล้ว<br/>
      เลขที่เอกสาร: <strong>${escapeHtml(taxInvoiceNumber)}</strong>
    </p>
    <a href="${taxInvoiceUrl}">ดูใบกำกับภาษี</a>
  </main>
</body>
</html>
`

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  })
}

export async function renderTaxInvoicePage(request, env, orderId) {
  const order = await findOrderByRecordId(env, orderId)

  if (!order) {
    return new Response("Tax invoice not found", {
      status: 404
    })
  }

  const f = order.fields || {}

  const subtotal = Number(f.total_amount || 0)
  const vat = subtotal * 0.07
  const grandTotal = subtotal + vat

  const number = f.tax_invoice_number || `TAX-${f.invoice_number || orderId}`

  const sellerName = escapeHtml(env.SELLER_NAME || "Messenger AI CRM")
  const sellerTaxId = escapeHtml(env.SELLER_TAX_ID || "-")
  const sellerAddress = escapeHtml(env.SELLER_ADDRESS || "-")
  const sellerPhone = escapeHtml(env.SELLER_PHONE || "-")

  const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${escapeHtml(number)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px;
      background: #f3f4f6;
      color: #111827;
      font-family: Arial, "Tahoma", sans-serif;
    }

    .toolbar {
      max-width: 920px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .print-button {
      border: none;
      background: #111827;
      color: white;
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }

    .page {
      max-width: 920px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    .header {
      padding: 36px 42px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e5e7eb;
    }

    .brand h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 1px;
    }

    .brand .sub {
      margin-top: 8px;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.6;
    }

    .meta {
      text-align: right;
      font-size: 14px;
      color: #374151;
    }

    .doc-no {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .section {
      padding: 28px 42px;
      border-bottom: 1px solid #e5e7eb;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .value {
      font-size: 15px;
      line-height: 1.6;
      color: #111827;
      white-space: pre-line;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    th {
      text-align: left;
      background: #f9fafb;
      color: #374151;
      font-size: 13px;
      padding: 14px;
      border-bottom: 1px solid #e5e7eb;
    }

    td {
      padding: 14px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      vertical-align: top;
    }

    .right {
      text-align: right;
    }

    .summary {
      display: flex;
      justify-content: flex-end;
      padding: 28px 42px;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-box {
      width: 360px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 15px;
    }

    .summary-row.total {
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      margin-top: 16px;
      font-size: 24px;
      font-weight: 800;
    }

    .footer {
      padding: 24px 42px 36px 42px;
      color: #6b7280;
      font-size: 13px;
      line-height: 1.6;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .toolbar {
        display: none;
      }

      .page {
        max-width: none;
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>

<body>
  <div class="toolbar">
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <main class="page">
    <header class="header">
      <div class="brand">
        <h1>TAX INVOICE</h1>
        <div class="sub">
          ${sellerName}<br/>
          Tax ID: ${sellerTaxId}<br/>
          ${sellerAddress}<br/>
          Tel: ${sellerPhone}
        </div>
      </div>

      <div class="meta">
        <div class="doc-no">${escapeHtml(number)}</div>
        <div>Order No: ${escapeHtml(f.order_number || f.order_id || orderId)}</div>
        <div>Date: ${formatDate(f.created_at)}</div>
      </div>
    </header>

    <section class="section grid">
      <div>
        <div class="label">Tax Customer</div>
        <div class="value">
          ${escapeHtml(f.tax_name || "-")}<br/>
          Tax ID: ${escapeHtml(f.tax_id || "-")}<br/>
          ${escapeHtml(f.tax_address || "-")}
        </div>
      </div>

      <div>
        <div class="label">Order Customer</div>
        <div class="value">
          ${escapeHtml(f.customer_name || "-")}<br/>
          Tel: ${escapeHtml(f.phone || "-")}<br/>
          ${escapeHtml(f.address || "-")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="label">Items</div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th class="right">Qty</th>
            <th class="right">Amount</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>${escapeHtml(f.product_name || "-")}</td>
            <td class="right">${Number(f.product_qty || 0) || "-"} ${escapeHtml(f.product_unit || "")}</td>
            <td class="right">${formatMoney(subtotal)} THB</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="summary">
      <div class="summary-box">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${formatMoney(subtotal)} THB</span>
        </div>

        <div class="summary-row">
          <span>VAT 7%</span>
          <span>${formatMoney(vat)} THB</span>
        </div>

        <div class="summary-row total">
          <span>Grand Total</span>
          <span>${formatMoney(grandTotal)} THB</span>
        </div>
      </div>
    </section>

    <footer class="footer">
      This tax invoice was generated automatically by ${sellerName}. Please verify tax information before official use.
    </footer>
  </main>
</body>
</html>
`

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  })
}
