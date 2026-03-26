export const Model: Record<string, string> = {
  'gemini-flash-latest': 'Flash Latest',
  'gemini-3-flash-preview': '3 Flash Preview',
  'gemini-3.1-pro-preview': '3.1 Pro Preview',
  'gemini-3.1-flash-lite-preview': '3.1 Flash-Lite Preview',
  'gemini-2.5-flash': '2.5 Flash',
  'gemini-2.5-pro': '2.5 Pro',
}

export const OldVisionModel = ['gemini-pro-vision', 'gemini-1.0-pro-vision-latest']

export const OldTextModel = ['gemini-1.0-pro', 'gemini-1.0-pro-latest', 'gemini-pro']

export const DefaultModel = 'gemini-3.1-flash-lite-preview'

export const OpenRouterModel: Record<string, string> = {
  'openrouter/free': 'Auto (Free)',
  'stepfun/step-3.5-flash:free': 'Step 3.5 Flash',
  'nvidia/nemotron-3-super-120b-a12b:free': 'Nemotron 3 Super 120B',
  'qwen/qwen3-coder-480b-a35b:free': 'Qwen3 Coder 480B',
  'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B',
  'mistralai/mistral-small-3.1-24b-instruct:free': 'Mistral Small 3.1',
  'nvidia/nemotron-3-nano-30b-a3b:free': 'Nemotron 3 Nano 30B',
  'arcee-ai/trinity-large-preview:free': 'Trinity Large Preview',
  'z-ai/glm-4.5-air:free': 'GLM 4.5 Air',
}

export const DefaultOpenRouterModel = 'openrouter/free'
