/**
 * MiniMax AI API 封装
 *
 * 负责与 MiniMax API 的通信
 * MiniMax 是国产大模型服务商，提供 MoE 模型
 * 文档: https://platform.minimaxi.com/document/Guides/Authentication
 */

const MINIMAX_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2'

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
 * MiniMax API 响应
 */
export interface MiniMaxResponse {
    /** 流式响应的读取器 */
    reader: ReadableStreamDefaultReader<Uint8Array>
}

/**
 * 调用 MiniMax Chat Completion API（流式）
 *
 * MiniMax API 是 OpenAI 兼容的，但有一些差异：
 * - 使用 Group ID 来区分不同的模型组
 * - stream 参数使用 "stream": 1/0 而非 boolean
 *
 * @param apiKey - MiniMax API 密钥 (格式: api_key)
 * @param groupId - MiniMax Group ID
 * @param options - 聊天补全选项
 * @returns 包含流式响应 reader 的对象
 */
export async function createChatCompletion(
    apiKey: string,
    groupId: string,
    options: ChatCompletionOptions
): Promise<MiniMaxResponse> {
    const { model, messages, enableThinking = false, thinkingBudget = 4096, tools, toolChoice } = options
    const modelInfo = options.modelInfo

    // 构建请求体
    const requestBody: Record<string, unknown> = {
        model,
        messages,
        stream: 1,  // MiniMax 使用 1/0 表示流式
        temperature: 0.7,
        max_tokens: enableThinking || modelInfo?.isReasoningModel ? 4096 : 1024,
    }

    // Reasoning 模型：只用 thinking_budget
    if (modelInfo?.isReasoningModel) {
        requestBody.thinking = {
            type: 'enabled',
            budget: thinkingBudget,
        }
    }
    // 普通模型支持思考开关
    else if (enableThinking && modelInfo?.supportsThinkingToggle) {
        requestBody.thinking = {
            type: 'enabled',
            budget: thinkingBudget,
        }
    }

    // 如果提供了 tools，添加到请求中
    if (tools && Array.isArray(tools) && tools.length > 0) {
        requestBody.tools = tools
        requestBody.tool_choice = toolChoice || 'auto'
    }

    console.log('[AIRequest] MiniMax 请求体:', JSON.stringify(requestBody, null, 2))

    // 构建 URL（包含 Group ID）
    const url = `${MINIMAX_API_URL}?GroupId=${groupId}`

    // 发送 POST 请求到 MiniMax API
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    })

    // 检查响应状态
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MiniMax API error: ${response.status} - ${errorText}`)
    }

    // 获取流式响应的 reader
    const reader = response.body?.getReader()
    if (!reader) {
        throw new Error('No stream available')
    }

    return { reader }
}
