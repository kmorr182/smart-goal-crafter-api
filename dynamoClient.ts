import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: process.env.AWS_REGION })

// Wraps the low-level client so we can pass/receive plain JS objects instead of
// DynamoDB's native attribute format (e.g. { S: "hello" } for a string).
export const docClient = DynamoDBDocumentClient.from(client)

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? 'GoalGameCards'