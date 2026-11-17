import { BOARD_SIZE,} from './types.ts'
import type { BingoCard, GoalDraft } from './types.ts'

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

export type BingoCardValidationResult =
  | { ok: true; card: BingoCard }
  | { ok: false; error: string }

export function validateBingoCard(input: unknown): BingoCardValidationResult {
  const card = input as Record<string, unknown>

  if (card === null || typeof card !== 'object') {
    return { ok: false, error: 'Body must be a JSON object' }
  }
  if (typeof card.id !== 'string' || card.id.trim() === '') {
    return { ok: false, error: 'id is required' }
  }
  if (typeof card.hasFreeSpace !== 'boolean') {
    return { ok: false, error: 'hasFreeSpace must be a boolean' }
  }
  if (typeof card.createdAt !== 'string' || card.createdAt.trim() === '') {
    return { ok: false, error: 'createdAt is required' }
  }
  if (!Array.isArray(card.squares) || card.squares.length !== BOARD_SIZE) {
    return { ok: false, error: `squares must be an array of ${BOARD_SIZE} items` }
  }

  for (const square of card.squares) {
    const sq = square as Record<string, unknown>
    if (sq === null || typeof sq !== 'object') {
      return { ok: false, error: 'Each square must be an object' }
    }
    if (typeof sq.position !== 'number' || !Number.isInteger(sq.position) || sq.position < 0 || sq.position >= BOARD_SIZE) {
      return { ok: false, error: `square.position must be an integer between 0 and ${BOARD_SIZE - 1}` }
    }
    if (typeof sq.label !== 'string' || sq.label.length > 280) {
      return { ok: false, error: 'square.label must be a string of 280 characters or fewer' }
    }
    if (typeof sq.completed !== 'boolean') {
      return { ok: false, error: 'square.completed must be a boolean' }
    }
  }

  return { ok: true, card: input as BingoCard }
}