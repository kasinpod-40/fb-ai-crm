export function parseContactInfo(text) {
  const message = text || ""

  const phoneMatch = message.match(/0[689](?:\s*\d){8}/)

  const rawPhone = phoneMatch ? phoneMatch[0] : ""
  const phone = rawPhone.replace(/\s/g, "")

  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  let name = ""

  if (lines.length > 0) {
    const firstLine = lines[0]
    const phoneIndex = rawPhone ? firstLine.indexOf(rawPhone) : -1

    name =
      phoneIndex > 0 ? firstLine.slice(0, phoneIndex).trim() : firstLine.trim()
  }

  let address = message

  if (name) {
    address = address.replace(name, "")
  }

  if (rawPhone) {
    address = address.replace(rawPhone, "")
  }

  address = address.replace(/\s+/g, " ").trim()

  return {
    delivery_name: name,
    delivery_phone: phone,
    delivery_address: address
  }
}
