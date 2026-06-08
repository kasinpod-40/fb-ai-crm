export function getNow() {
  return formatThaiDateTime(new Date())
}

export function formatThaiDateTime(date) {
  const bangkokTime = new Date(date.getTime() + 7 * 60 * 60 * 1000)

  const yyyy = bangkokTime.getUTCFullYear()
  const mm = String(bangkokTime.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(bangkokTime.getUTCDate()).padStart(2, "0")
  const hh = String(bangkokTime.getUTCHours()).padStart(2, "0")
  const mi = String(bangkokTime.getUTCMinutes()).padStart(2, "0")

  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`
}
