export function parseContactInfo(text) {
  const message = text || ""

  const phoneMatch = message.replace(/\s/g, "").match(/0[689]\d{8}/)

  const phone = phoneMatch ? phoneMatch[0] : ""

  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const name = lines.length > 0 ? lines[0] : ""

  let address = text

  if (name) {
    address = address.replace(name, "")
  }

  if (phone) {
    address = address.replace(phone, "")
  }

  address = address.replace(/\s+/g, " ").trim()

  return {
    delivery_name: name,
    delivery_phone: phone,
    delivery_address: address
  }
}
