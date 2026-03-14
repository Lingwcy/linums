/**
 * OpenRouter API 封装 (OpenAI 兼容)
 *
 * OpenRouter 是一个聚合多家 AI 模型的服务平台
 * 文档: https://openrouter.ai/docs
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * 聊天消息结构
 */
export interface ChatMessage {
    /** 消息角色 */
    role: 'system' | 'user' | 'assistant'
    /** 消息内容 */
    content: string
}

/**
 * 聊天补全请求选项
 */
export interface ChatCompletionOptions {
    /** 模型名称 */
    model: string
    /** 消息列表 */
    messages: ChatMessage[]
    /** 模型信息 */
    modelInfo?: { isReasoningModel?: boolean; supportsThinkingToggle?: boolean }
    /** 是否启用思考模式 */
    enableThinking?: boolean
    /** 思考预算 token 数 */
    thinkingBudget?: number
    /** 工具定义列表 */
    tools?: unknown[]
    /** 工具选择策略 */
    toolChoice?: 'auto' | 'required' | { type: 'function'; function: { name: string } }
}

/**
 * OpenRouter API 响应
 */
export interface OpenRouterResponse {
    /** 流式响应的读取器 */
    reader: ReadableStreamDefaultReader<Uint8Array>
}

/**
 * 调用 OpenRouter Chat Completion API（流式）
 *
 * @param apiKey - OpenRouter API 密钥
 * @param options - 聊天补全选项
 * @returns 包含流式响应 reader 的对象
 */
export async function createChatCompletion(
    apiKey: string,
    options: ChatCompletionOptions
): Promise<OpenRouterResponse> {
    const { model, messages, enableThinking = false, thinkingBudget = 4096, tools, toolChoice } = options
    const modelInfo = options.modelInfo

    // 构建请求体
    const requestBody: Record<string, unknown> = {
        model,
        messages,
        stream: true,  // 启用流式响应
        temperature: 0.7,  // 温度参数
        max_tokens: enableThinking || modelInfo?.isReasoningModel ? 4096 : 1024,
    }

    // OpenRouter 支持 include_reasoning / reasoning 等参数，但不同模型差异很大；
    // 这里保持与现有网关一致的最小行为：只透传 tools + max_tokens。
    // （thinkingBudget 暂不透传到 OpenRouter，避免参数不兼容导致 400）
    void thinkingBudget

    // 如果提供了 tools，添加到请求中
    if (tools && Array.isArray(tools) && tools.length > 0) {
        requestBody.tools = tools
        requestBody.tool_choice = toolChoice || 'auto'
    }

    // OpenRouter 需要 Referer 和 Title 头信息用于统计
    const referer = process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const title = process.env.OPENROUTER_X_TITLE || 'linums'

    // 发送 POST 请求到 OpenRouter API
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

    // 检查响应状态
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
    }

    // 获取流式响应的 reader
    const reader = response.body?.getReader()
    if (!reader) {
        throw new Error('No stream available')
    }

    return { reader }
}
