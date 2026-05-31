export function mapStage(ai) {
  switch (ai.customer_stage) {
    case "interested":
      return "Interested"

    case "negotiating":
      return "Negotiating"

    case "closing":
      return "Closing"

    case "customer":
      return "Won"

    default:
      return "New Lead"
  }
}
