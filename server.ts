import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { validateDraft } from './validation.ts';
import { getRecommendation } from './getRecommendation.ts';

const PORT = process.env.PORT ?? 3000

async function readBody(req: IncomingMessage): Promise<string> {
  let body = ''
  for await (const chunk of req) {
    body += chunk
  }
  return body
}

export function sendJson(res: ServerResponse, status: number, data: unknown): void{
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`)

    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, {ok: true});
      return
    }
    if (req.url === '/wait') {
      setTimeout(() => res.end('waited 5s, politely\n'), 5000)
      return
    }

    if (req.url === '/block') {
      const until = Date.now() + 5000
      while (Date.now() < until) {} // busy-loop: hogs the only thread
      res.end('blocked 5s, rudely\n')
      return
    }

    if (req.method === 'POST' && req.url === '/api/recommendations') {
      let parsed: unknown;

      try {
        parsed = JSON.parse(await readBody(req))
      } catch {
        sendJson(res, 400, {error: 'Body must be valid JSON'})
        return
      }

      const result = validateDraft(parsed)
      if(!result.ok){
        sendJson(res, 400, { error: result.error });
        return
      }
      // Call API: 
          try{
            const recommendation = await getRecommendation(result.draft);
            sendJson(res, 200, recommendation)
          }catch(err){
            sendJson(res, 502, { error: 'Could not get a recommendation right now' })
          }
          return;
  }
  sendJson(res, 404, { error: 'Not found' })
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`)
})