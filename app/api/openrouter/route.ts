import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'edge'
export const preferredRegion = ['cle1', 'iad1', 'pdx1', 'sfo1', 'sin1', 'syd1', 'hnd1', 'kix1']

const openRouterApiKey = process.env.OPENROUTER_API_KEY as string

export async function POST(req: NextRequest) {
  if (!openRouterApiKey) {
    return NextResponse.json({ code: 50001, message: 'OpenRouter API key not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': req.headers.get('origin') || 'https://dirgax-app.vercel.app',
        'X-Title': 'DirgaX Chat',
      },
      body: JSON.stringify(body),
    })

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }
  }
}
