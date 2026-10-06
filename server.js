import http from 'node:http'
import { getRecommendation } from './getRecommendation.js';

const PORT = process.env.PORT ?? 3000

async function readBody(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
  }
  return body
}

function sendJson(res, status, data){
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
    const raw = await readBody(req)
    console.log('received:', raw)

    let draft
    try {
      draft = JSON.parse(raw)
    } catch {
      sendJson(res, 400, { error: 'Body must be valid JSON' })
      return
    }
    // Validation
     if (draft === null || typeof draft !== 'object') {
      sendJson(res, 400, { error: 'Body must be a JSON object' })
      return
    }
     if (typeof draft.specific !== 'string' || draft.specific.trim() === '') {
      sendJson(res, 400, { error: 'specific is required' })
      return
    }
     if (draft.metric === null ||
      typeof draft.metric !== 'object' || 
      !['quantity', 'milestone'].includes(draft.metric.mode)
      ) {
      sendJson(res, 400, { error: 'metric is required' })
      return
    }
     if (typeof draft.achievableNote !== 'string' || draft.achievableNote.trim() === '') {
      sendJson(res, 400, { error: 'achievableNote is required' })
      return
    }
    if (typeof draft.relevant !== 'string' || draft.relevant.trim() === '') {
      sendJson(res, 400, { error: 'relevant is required' })
      return
    }
    if (typeof draft.dueDate !== 'string' || draft.dueDate.trim() === '') {
      sendJson(res, 400, { error: 'dueDate is required' })
      return
    }

    const categories = ['health', 'career', 'finance', 'learning', 'relationships', 'personal'];
    if(!categories.includes(draft.category)){
      sendJson(res, 400, {error: `Category must be one of the six allowed values, ${categories.join(', ')}`})
      return
    }

    // Successful validation
    try{
      const result = await getRecommendation(draft);
      sendJson(res, 200, result)
      return
    }catch(err){
      console.error('wtf', err);
      sendJson(res, 502, {error: 'Could not get a recommendation right now'})
      return
    }
  }
  sendJson(res, 404, { error: 'Not found' })
})



server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`)
})