import Anthropic from '@anthropic-ai/sdk'
import type { GoalDraft, GoalRecommendation } from './types.ts'

// Reads ANTHROPIC_API_KEY from process.env automatically.
// timeout is in milliseconds: a user is waiting on a button, so give up after 30s.
const client = new Anthropic({ timeout: 30_000 })

const SYSTEM_PROMPT = `You are a goal-setting coach for Smart Goal Crafter.
You receive a draft SMART goal as JSON. Return:
- polishedSentence: one clear, motivating sentence stating the goal, in first person,
  including the measurable target and the due date.
- supportingGoals: 3 smaller goals that would help achieve it, each with a short title
  and a one-sentence reason. Be detailed as possible with measurable action items.`

// JSON Schema describing the exact shape we want back. Matches GoalRecommendation in the
// frontend's src/types/recommendation.ts.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    polishedSentence: { type: 'string' },
    supportingGoals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['title', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['polishedSentence', 'supportingGoals'],
  additionalProperties: false,
}

export async function getRecommendation(draft: GoalDraft): Promise<GoalRecommendation> {
  const response = await client.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(draft, null, 2) }],
    output_config: {
      effort: 'low', // a short, simple task: fast and cheap is right here
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to review this goal')
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock) {
    throw new Error(`No text in Claude's response (stop_reason: ${response.stop_reason})`)
  }

  return JSON.parse(textBlock.text)
}