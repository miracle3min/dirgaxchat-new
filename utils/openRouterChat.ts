import { DefaultOpenRouterModel } from '@/constant/model'

export type OpenRouterRequestProps = {
  model?: string
  systemInstruction?: string
  messages: Message[]
  apiKey: string
  generationConfig: {
    topP: number
    topK: number
    temperature: number
    maxOutputTokens: number
  }
}

function convertMessages(messages: Message[], systemInstruction?: string) {
  const openAIMessages: Array<{ role: string; content: string }> = []

  if (systemInstruction) {
    openAIMessages.push({ role: 'system', content: systemInstruction })
  }

  for (const msg of messages) {
    const role = msg.role === 'model' ? 'assistant' : 'user'
    const textParts = msg.parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('\n')
    if (textParts) {
      openAIMessages.push({ role, content: textParts })
    }
  }

  return openAIMessages
}

export default async function openRouterChat({
  messages = [],
  systemInstruction,
  model = DefaultOpenRouterModel,
  apiKey,
  generationConfig,
}: OpenRouterRequestProps) {
  const openAIMessages = convertMessages(messages, systemInstruction)

  const body = {
    model,
    messages: openAIMessages,
    stream: true,
    top_p: generationConfig.topP,
    temperature: generationConfig.temperature,
    max_tokens: generationConfig.maxOutputTokens,
  }

  const baseUrl = apiKey ? 'https://openrouter.ai' : '/api/openrouter'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(`${baseUrl}/api/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error.error?.message || `OpenRouter error: ${response.status}`)
  }

  return response.body!
}
