/**
 * 工具系统类型定义
 *
 * 本文件定义了工具系统的核心类型，用于：
 * - 工具注册和执行
 * - AI Function Calling 格式转换
 * - SSE 事件类型定义
 */

/**
 * 工具参数 Schema (JSON Schema 格式)
 */
export interface ToolParameterSchema {
  type: 'object'
  properties: Record<string, {
    type: string
    description: string
    enum?: string[]
  }>
  required: string[]
}

/**
 * 工具定义
 *
 * 包含工具的名称、描述、参数定义和执行函数
 */
export interface Tool {
  /** 工具唯一标识名称 */
  name: string
  /** 工具功能描述（供 AI 理解何时调用） */
  description: string
  /** 参数 JSON Schema 定义 */
  parameters: ToolParameterSchema
  /** 工具执行函数 */
  execute: (args: Record<string, unknown>) => Promise<string>
}

/**
 * OpenAI Function Calling 格式的工具定义
 * 用于发送给 AI 的 tools 参数
 */
export interface OpenAIToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: ToolParameterSchema
  }
}

/**
 * AI 返回的工具调用
 * 表示 AI 决定调用某个工具及参数
 */
export interface ToolCall {
  /** 工具调用 ID */
  id: string
  /** 调用类型（函数调用） */
  type: 'function'
  function: {
    /** 工具名称 */
    name: string
    /** 工具参数（JSON 字符串） */
    arguments: string
  }
}

/**
 * 解析后的工具调用
 * arguments 已从 JSON 字符串解析为对象
 */
export interface ParsedToolCall {
  /** 工具调用 ID */
  id: string
  /** 工具名称 */
  name: string
  /** 解析后的参数对象 */
  arguments: Record<string, unknown>
}

/**
 * 工具执行结果
 */
export interface ToolCallResult {
  /** 对应的工具调用 ID */
  toolCallId: string
  /** 工具名称 */
  name: string
  /** 执行结果内容（JSON 字符串） */
  content: string
  /** 是否执行成功 */
  success: boolean
}

/**
 * 工具消息（发送给 AI 的格式）
 * 用于在多轮对话中将工具执行结果返回给 AI
 */
export interface ToolMessage {
  role: 'tool'
  /** 对应的工具调用 ID */
  tool_call_id: string
  /** 工具执行结果内容 */
  content: string
}

/**
 * 工具注册表接口
 * 定义工具的注册、查询、执行等操作
 */
export interface IToolRegistry {
  /** 注册工具 */
  register(tool: Tool): void
  /** 按名称获取工具 */
  get(name: string): Tool | undefined
  /** 获取所有工具定义（OpenAI 格式） */
  getToolDefinitions(): OpenAIToolDefinition[]
  /** 按名称执行工具 */
  executeByName(name: string, args: Record<string, unknown>): Promise<string>
  /** 检查工具是否存在 */
  has(name: string): boolean
  /** 获取所有已注册的工具 */
  getAll(): Tool[]
}

/**
 * SSE 工具调用事件
 * 前端监听此事件以显示工具调用进度
 */
export interface ToolCallEvent {
  type: 'tool_call'
  /** 工具名称 */
  name: string
  /** web_search 工具的搜索查询 */
  query?: string
  /** generate_image 工具的图片描述 */
  prompt?: string
  /** 会话 ID */
  sessionId: string
}

/**
 * SSE 工具结果事件
 * 前端监听此事件以显示工具执行结果
 */
export interface ToolResultEvent {
  type: 'tool_result'
  /** 工具名称 */
  name: string
  /** web_search 工具的结果数量 */
  resultCount?: number
  /** generate_image 工具的图片 URL */
  imageUrl?: string
  /** 是否成功 */
  success: boolean
  /** 会话 ID */
  sessionId: string
}
