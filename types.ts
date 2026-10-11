// Mirrors smart-goal-crafter's src/types/goal.ts and recommendation.ts. Keep them in sync.
export type CategoryKey = 'health' | 'career' | 'finance' | 'learning' | 'relationships' | 'personal'

export type GoalMetric =
  | { mode: 'quantity'; target: string; unit: string; start: string }
  | { mode: 'milestone'; criterion: string }

export interface GoalDraft {
  idea: string
  category: CategoryKey
  specific: string
  metric: GoalMetric
  confidence: number
  achievableNote: string
  relevant: string
  dueDate: string
}

export interface SupportingGoalIdea {
  title: string
  reason: string
}

export interface GoalRecommendation {
  polishedSentence: string
  supportingGoals: SupportingGoalIdea[]
}