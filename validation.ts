import type { GoalDraft } from './types.ts'

export type ValidationResult =
  | { ok: true; draft: GoalDraft }
  | { ok: false; error: string }

export function validateDraft(input: unknown): ValidationResult {
 
  // We've proved it's an object; this lets us read its properties, each typed as unknown.
  const draftGoal = input as Record<string, unknown>

  // Validation
     if (draftGoal === null || typeof draftGoal !== 'object') {
      return { ok: false, error: 'Body must be a JSON object' }
    }
     if (typeof draftGoal.specific !== 'string' || draftGoal.specific.trim() === '') {
      return { ok: false, error: 'specific is required' }
    }
     if (draftGoal.metric === null ||
      typeof draftGoal.metric !== 'object' 
      ) {
      return { ok: false, error: 'metric is required' }
    }
     const metric = draftGoal.metric as Record<string, unknown>
      if (typeof metric.mode !== 'string' || !['quantity', 'milestone'].includes(metric.mode)) {
      return { ok: false, error: 'metric.mode must be "quantity" or "milestone"' }
    }
     if (typeof draftGoal.achievableNote !== 'string' || draftGoal.achievableNote.trim() === '') {
      return { ok: false, error: 'achievableNote is required' }
    }
    if (typeof draftGoal.relevant !== 'string' || draftGoal.relevant.trim() === '') {
      return { ok: false, error: 'relevant is required' }
    }
    if (typeof draftGoal.dueDate !== 'string' || draftGoal.dueDate.trim() === '') {
      return { ok: false, error: 'dueDate is required' }
    }

    // make sure input lenghts are not higher than 300 characters.
    const inputLengths = [draftGoal.specific.length, draftGoal.achievableNote.length, draftGoal.relevant.length, draftGoal.dueDate.length ]
    if(inputLengths.filter(val => val >= 300).length > 0) {
      return {ok: false, error: 'Input too long, please shorten to under 300 characters.'}
    }

    const categories = ['health', 'career', 'finance', 'learning', 'relationships', 'personal'];
    if(typeof draftGoal.category !== 'string' || !categories.includes(draftGoal.category)){
      return { ok: false, error:  `Category must be one of the six allowed values, ${categories.join(', ')}` }
    }

  return { ok: true, draft: input as GoalDraft }
}