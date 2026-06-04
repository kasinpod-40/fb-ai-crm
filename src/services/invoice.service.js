import { findOrderByRecordId } from "../repositories/order.repository"

export async function renderInvoicePage(request, env, orderId) {
  const order = await findOrderByRecordId(env, orderId)

  if (!order) {
    return new Response("Invoice not found", {
      status: 404
    })
  }

  const f = order.fields

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${f.invoice_number}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #222;
    }
    .box {
      max-width: 800px;
      margin: auto;
      border: 1px solid #ddd;
      padding: 32px;
    }
    h1 {
      margin-bottom: 4px;
    }
    .muted {
      color: #666;
    }
    .row {
      margin: 12px 0;
    }
    .total {
      font-size: 22px;
      font-weight: bold;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>INVOICE</h1>
    <div class="muted">${f.invoice_number || ""}</div>

    <hr />

    <div class="row"><b>Customer:</b> ${f.customer_name || "-"}</div>
    <div class="row"><b>Phone:</b> ${f.phone || "-"}</div>
    <div class="row"><b>Address:</b><br/>${f.address || "-"}</div>

    <hr />

    <div class="row"><b>Order Status:</b> ${f.order_status || "-"}</div>
    <div class="row"><b>Payment Status:</b> ${f.payment_status || "-"}</div>

    <div class="total">
      Total: ${f.total_amount || 0} THB
    </div>

    <hr />

    <div class="muted">
      Created at: ${f.created_at || ""}
    </div>
  </div>
</body>
</html>
`

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  })
}
