export function mapStage(ai) {
  switch (ai.intent) {
    case "payment_request":
      return "Closing"

    case "ask_discount":
      return "Negotiating"

    case "closed_sale":
      return "Won"

    case "lost":
      return "Lost"

    case "delivery_address":
      return "Closing"

    default:
      break
  }

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

  switch (ai.intent) {
    case "ask_price":
      score = 30
      break

    case "product_info":
      score = 40
      break

    case "delivery_question":
      score = 50
      break

    case "ask_discount":
      score = 70
      break

    case "payment_request":
      score = 90
      break

    case "delivery_address":
      score = 90
      break

    case "closed_sale":
      score = 100
      break

    case "lost":
      score = 0
      break

    default:
      score = 10
  }

  if (ai.hot_lead) {
    score += 10
  }

  return Math.min(score, 100)
}

export function isClosed(ai) {
  return (
    ai.customer_stage === "won" ||
    ai.customer_stage === "lost" ||
    ai.closed_sale === true
  )
}
