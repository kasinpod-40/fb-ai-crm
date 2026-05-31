export function calculateLeadScore(ai) {
  let score = 0
  if (ai.customer_stage === "customer") {
    score == 100
  } else {
    if (ai.interest_level === "high") score += 40
    if (ai.hot_lead) score += 30
    if (ai.customer_stage === "closing") score += 20
  }

  return Math.min(score, 100)
}
