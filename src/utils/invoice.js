import { getNow } from "../utils/date"

function buildDatePart() {
  const now = getNow()

  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")

  return `${yyyy}${mm}${dd}`
}

function buildRandomPart() {
  return crypto.randomUUID().slice(0, 4).toUpperCase()
}

export function generateInvoiceNumber() {
  return `INV-${buildDatePart()}-${buildRandomPart()}`
}

export function generateQuotationNumber() {
  return `QT-${buildDatePart()}-${buildRandomPart()}`
}