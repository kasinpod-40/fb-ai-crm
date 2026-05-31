export function calculateLeadScore(ai) {
  let score = 0

  if (ai.interest_level === "high") score += 50

  if (ai.hot_lead) score += 30

  if (ai.customer_stage === "closing") score += 20

  return Math.min(score, 100)
}
