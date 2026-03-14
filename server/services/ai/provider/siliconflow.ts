/**
 * SiliconFlow AI API 封装
 *
 * 负责与 SiliconFlow API 的通信
 * SiliconFlow 是一个聚合多家 AI 模型的服务平台
 * 文档: https://docs.siliconflow.cn/
 */

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions'

/**
 * 聊天消息结构
 */
export interface ChatMessage {
  /** 消息角色: system-系统提示, user-用户, assistant-助手 */
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
  /** 是否启用思考模式 (仅部分模型支持) */
  enableThinking?: boolean
  /** 思考预算 token 数 */
  thinkingBudget?: number
  /** 工具定义列表 */
  tools?: unknown[]
  /** 工具选择策略: auto-自动, required-必须使用工具, 函数调用 */
  toolChoice?: 'auto' | 'required' | { type: 'function'; function: { name: string } }
}

/**
 * SiliconFlow API 响应
 */
export interface SiliconFlowResponse {
  /** 流式响应的读取器 */
  reader: ReadableStreamDefaultReader<Uint8Array>
}

/**
 * 调用 SiliconFlow Chat Completion API（流式）
 *
 * @param apiKey - SiliconFlow API 密钥
 * @param options - 聊天补全选项
 * @returns 包含流式响应 reader 的对象
 */
export async function createChatCompletion(
  apiKey: string,
  options: ChatCompletionOptions
): Promise<SiliconFlowResponse> {
  const { model, messages, enableThinking = false, thinkingBudget = 4096, tools, toolChoice } = options
  const modelInfo = options.modelInfo

  // 构建请求体
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    stream: true,  // 启用流式响应
    temperature: 0.7,  // 温度参数，控制生成随机性
    max_tokens: enableThinking || modelInfo?.isReasoningModel ? 4096 : 1024,  // 思考模式需要更多 token
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
    // 默认 auto，有工具时让 AI 自己决定
    requestBody.tool_choice = toolChoice || 'auto'
  }


  console.log('[AIRequest] 请求体:', JSON.stringify(requestBody, null, 2))

  // 发送 POST 请求到 SiliconFlow API
  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody, null, 2),
  })

  // 检查响应状态
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SiliconFlow API error: ${response.status} - ${errorText}`)
  }

  // 获取流式响应的 reader
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No stream available')
  }

  return { reader }
}
