import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, TABLE_NAME } from './dynamoClient.ts'
import type { BingoCard } from './types.ts'

export async function getBingoCard(clientId: string): Promise<BingoCard | null> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { clientId } })
  )
  return (result.Item as BingoCard | undefined) ?? null
}

export async function putBingoCard(clientId: string, card: BingoCard): Promise<void> {
  await docClient.send(
    new PutCommand({ TableName: TABLE_NAME, Item: { clientId, ...card } })
  )
}