import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { validateDraft, validateBingoCard } from './validation.ts';
import { getRecommendation } from './getRecommendation.ts';
import { createRateLimiter } from './rateLimit.ts';
import { getBingoCard, putBingoCard } from './bingoCardStore.ts'

// Per person: stops one client from hammering the endpoint.
const perClientLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20 }); // 20 per hour
// Everyone combined: a ceiling on Claude calls per day, whoever is calling.
const globalLimit = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 1000 }); // 1000 per day
const bingoWriteLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 120 }); // 120 per hour per client

// The site allowed to call this API from a browser, e.g. https://smartgoalcrafter.com
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const PORT = process.env.PORT ?? 3000;
const MAX_BODY_BYTES = 10_000; // a real GoalDraft is well under 2 KB
const MAX_BINGO_BODY_BYTES = 20_000;

class PayloadTooLargeError extends Error {}

async function readBody(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<string> {
  let body = '';
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length; // chunk is a Buffer, so .length is bytes
    if (bytes > maxBytes) {
      throw new PayloadTooLargeError();
    }
    body += chunk;
  }
  return body;
}

function getClientIp(req: IncomingMessage): string {
  if (process.env.TRUST_PROXY === 'true') {
    // X-Forwarded-For is "client, proxy1, proxy2, ...". Clients can put fake values at the
    // start, so use the entry your host's proxy added: the last one.
    const header = req.headers['x-forwarded-for'];
    const value = Array.isArray(header) ? header.at(-1) : header;
    const last = value?.split(',').at(-1)?.trim();
    if (last) return last;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function getValidClientId(url: URL): string | null {
  const clientId = url.searchParams.get('clientId')
  return clientId && CLIENT_ID_PATTERN.test(clientId) ? clientId : null
}

function sendJson(res: ServerResponse, status: number, data: unknown): void{
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }


  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    // CORS: tell browsers our own frontend may call this API.
    if (ALLOWED_ORIGIN && req.headers.origin === ALLOWED_ORIGIN) {
      res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
      res.setHeader('Vary', 'Origin')
    }

    // Preflight: the browser asking permission before the real POST.
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400'); // browsers can cache this answer for a day
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');
      res.writeHead(204);
      res.end();
      return
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {ok: true});
      return
    }
    
    if (req.method === 'POST' && url.pathname === '/api/recommendations') {
      const clientLimit = perClientLimit(getClientIp(req))
      if (!clientLimit.allowed) {
        res.setHeader('Retry-After', String(clientLimit.retryAfterSeconds))
        sendJson(res, 429, { error: 'Too many requests. Please try again later.' })
        return
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(await readBody(req))
      } catch(err) {
        if (err instanceof PayloadTooLargeError){
          sendJson(res, 413, {error: 'Request body is too large.'})
        } else { 
          sendJson(res, 400, {error: 'Body must be valid JSON.'})
        }
        return
      }

      const result = validateDraft(parsed)
      if(!result.ok){
        sendJson(res, 400, { error: result.error });
        return
      }

      const dailyLimit = globalLimit('global')
      if (!dailyLimit.allowed) {
        res.setHeader('Retry-After', String(dailyLimit.retryAfterSeconds))
        sendJson(res, 503, { error: 'Recommendations are busy right now. Please try again later.' })
        return
      }

      // Call API: 
      try{
        const recommendation = await getRecommendation(result.draft);
        sendJson(res, 200, recommendation)
      }catch(err){
        console.error('Claude request failed:', err)
        sendJson(res, 502, { error: 'Could not get a recommendation right now' })
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/bingo-card') {
  const clientId = getValidClientId(url)
  if (!clientId) {
    sendJson(res, 400, { error: 'A valid clientId query parameter is required' })
    return
  }

  try {
    const card = await getBingoCard(clientId)
    if (!card) {
      sendJson(res, 404, { error: 'No card found for this client' })
      return
    }
    sendJson(res, 200, card)
  } catch (err) {
    console.error('Failed to read bingo card:', err)
    sendJson(res, 500, { error: 'Could not load the card right now' })
  }
  return
}

if (req.method === 'PUT' && url.pathname === '/api/bingo-card') {
  const clientId = getValidClientId(url)
  if (!clientId) {
    sendJson(res, 400, { error: 'A valid clientId query parameter is required' })
    return
  }

  const writeLimit = bingoWriteLimit(clientId)
  if (!writeLimit.allowed) {
    res.setHeader('Retry-After', String(writeLimit.retryAfterSeconds))
    sendJson(res, 429, { error: 'Too many requests. Please try again later.' })
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(await readBody(req, MAX_BINGO_BODY_BYTES))
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      sendJson(res, 413, { error: 'Request body is too large.' })
    } else {
      sendJson(res, 400, { error: 'Body must be valid JSON.' })
    }
    return
  }

  const result = validateBingoCard(parsed)
  if (!result.ok) {
    sendJson(res, 400, { error: result.error })
    return
  }

  try {
    await putBingoCard(clientId, result.card)
    sendJson(res, 200, result.card)
  } catch (err) {
    console.error('Failed to save bingo card:', err)
    sendJson(res, 500, { error: 'Could not save the card right now' })
  }
  return
}
  sendJson(res, 404, { error: 'Not found' })
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`)
})