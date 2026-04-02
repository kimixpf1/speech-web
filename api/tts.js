const MAX_TEXT_LENGTH = 220

function normalizeText(input) {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_TEXT_LENGTH)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const text = normalizeText(req.query?.text)
  const speedValue = Number(req.query?.speed)
  const speed = Number.isFinite(speedValue) ? Math.min(Math.max(Math.round(speedValue), 1), 9) : 5

  if (!text) {
    res.status(400).json({ error: 'Missing text' })
    return
  }

  const upstreamUrl = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(text)}&spd=${speed}&source=web`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://fanyi.baidu.com/',
        'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
      },
    })

    if (!upstreamResponse.ok) {
      res.status(502).json({ error: `Upstream TTS failed: ${upstreamResponse.status}` })
      return
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Content-Length', buffer.length.toString())
    res.status(200).send(buffer)
  } catch (error) {
    res.status(502).json({
      error: 'TTS proxy request failed',
      message: error instanceof Error ? error.message : 'unknown error',
    })
  }
}
