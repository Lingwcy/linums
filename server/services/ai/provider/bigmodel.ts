/**
 * 智谱 AI API 封装
 * 
 * 负责与 BigModel API 的通信
 * 
 * 
 * 使用示例
const messages:ChatMessage[] = [
    { role: 'user', content: '你好，请介绍一下自己' }
];

callZhipuAPI(messages)
    .then(result => {
        console.log(result.choices[0].message.content);
    })
    .catch(error => {
        console.error('错误:', error);
    });
 */

interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

const ZAI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

export interface ChatCompletionOptions {
    model: string
    messages: ChatMessage[]
    modelInfo?: { isReasoningModel?: boolean; supportsThinkingToggle?: boolean }
    enableThinking?: boolean
    thinkingBudget?: number
    tools?: unknown[]
    toolChoice?: 'auto' | 'required' | { type: 'function'; function: { name: string } }
}

export interface ZAIResponse {
    reader: ReadableStreamDefaultReader<Uint8Array>
}

export async function CallZhipuAPI(
    key: string,
    options: ChatCompletionOptions
): Promise<ZAIResponse> {
    const url = ZAI_API_URL
    const { model = 'glm-4.7', messages, enableThinking = false, thinkingBudget = 4096, tools, toolChoice } = options
    const modelInfo = options.modelInfo

    // 构建请求体
    const requestBody: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: enableThinking || modelInfo?.isReasoningModel ? 4096 : 1024,
    }

    // Reasoning 模型：只用 thinking_budget
    if (modelInfo?.isReasoningModel) {
        requestBody.thinking_budget = thinkingBudget
    }
    // 普通模型支持思考开关：用 enable_thinking + thinking_budget
    else if (enableThinking && modelInfo?.supportsThinkingToggle) {
        requestBody.enable_thinking = true
        requestBody.thinking_budget = thinkingBudget
    }

    // 如果提供了 tools，添加到请求中
    if (tools && Array.isArray(tools) && tools.length > 0) {
        requestBody.tools = tools
        requestBody.tool_choice = toolChoice || 'auto'
    }

    console.log('[AIRequest] 请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody, null, 2)
    });


    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ZAI API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
        throw new Error('No stream available')
    }

    return { reader }
}
