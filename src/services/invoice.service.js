import { findOrderByRecordId } from "../repositories/order.repository"

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

function renderDocumentHtml({
  type,
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
        <div class="sub">Messenger AI CRM (ชื่อบริษัท)</div>
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
          ? "This invoice was generated automatically by Messenger AI CRM (ชื่อบริษัท). Please verify payment before shipment."
          : "This quotation was generated automatically by Messenger AI CRM (ชื่อบริษัท). Please confirm stock and payment before shipment."
      }
    </footer>
  </main>
</body>
</html>
`
}

function buildDocumentData(order, orderId, type) {
  const f = order.fields || {}

  const isInvoice = type === "INVOICE"

  return {
    type,
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

  const html = renderDocumentHtml(buildDocumentData(order, orderId, "INVOICE"))

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
    buildDocumentData(order, orderId, "QUOTATION")
  )

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  })
}
