export function generateInvoiceNumber() {
  const now = new Date()

  const yyyy = now.getFullYear()

  const mm = String(now.getMonth() + 1).padStart(2, "0")

  const dd = String(now.getDate()).padStart(2, "0")

  const random = crypto.randomUUID().slice(0, 4).toUpperCase()

  return `INV-${yyyy}${mm}${dd}-${random}`
}
