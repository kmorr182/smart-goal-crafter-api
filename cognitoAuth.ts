import { CognitoJwtVerifier } from 'aws-jwt-verify'
import type { IncomingMessage } from 'node:http'

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
})

export async function getAuthenticatedUserId(req: IncomingMessage): Promise<string | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length)
  try {
    const payload = await verifier.verify(token)
    return payload.sub
  } catch {
    return null
  }
}