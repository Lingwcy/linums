/**
 * OpenRouter Chat Completions（OpenAI 兼容）
 *
 * Docs: https://openrouter.ai/docs
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface ChatCompletionOptions {
    model: string
    messages: ChatMessage[]
    modelInfo?: { isReasoningModel?: boolean; supportsThinkingToggle?: boolean }
    enableThinking?: boolean
    thinkingBudget?: number
    tools?: unknown[]
    toolChoice?: 'auto' | 'required' | { type: 'function'; function: { name: string } }
}

export interface OpenRouterResponse {
    reader: ReadableStreamDefaultReader<Uint8Array>
}

export async function createChatCompletion(
    apiKey: string,
    options: ChatCompletionOptions
): Promise<OpenRouterResponse> {
    const { model, messages, enableThinking = false, thinkingBudget = 4096, tools, toolChoice } = options
    const modelInfo = options.modelInfo

    const requestBody: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: enableThinking || modelInfo?.isReasoningModel ? 4096 : 1024,
    }

    // OpenRouter 支持 include_reasoning / reasoning 等参数，但不同模型差异很大；
    // 这里保持与现有网关一致的最小行为：只透传 tools + max_tokens。
    // （thinkingBudget 暂不透传到 OpenRouter，避免参数不兼容导致 400）
    void thinkingBudget

    if (tools && Array.isArray(tools) && tools.length > 0) {
        requestBody.tools = tools
        requestBody.tool_choice = toolChoice || 'auto'
    }

    const referer = process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const title = process.env.OPENROUTER_X_TITLE || 'linums'

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': referer,
            'X-Title': title,
        },
        body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
        throw new Error('No stream available')
    }

    return { reader }
}
