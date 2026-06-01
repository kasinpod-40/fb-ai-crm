export function mapStage(ai) {
  switch (ai.customer_stage) {
    case "interested":
      return "Interested"

    case "negotiating":
      return "Negotiating"

    case "closing":
      return "Closing"

    case "won":
      return "Won"

    case "lost":
      return "Lost"

    default:
      return "New Lead"
  }
}

export function calculateLeadScore(ai) {
  if (ai.closed_sale) {
    return 100
  }

  let score = 0

  switch (ai.customer_stage) {
    case "new_lead":
      score = 10
      break

    case "interested":
      score = 40
      break

    case "negotiating":
      score = 70
      break

    case "closing":
      score = 90
      break

    case "won":
      score = 100
      break

    case "lost":
      score = 0
      break

    default:
      score = 10
  }

  if (ai.hot_lead && score < 100) {
    score += 10
  }

  return Math.min(score, 100)
}

export function isWon(ai) {
  return ai.customer_stage === "won" || ai.closed_sale === true
}
