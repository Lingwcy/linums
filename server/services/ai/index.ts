/**
 * AI 服务模块 - 统一导出
 *
 * 本模块提供对多种 AI 提供商的统一访问：
 * - SiliconFlow: 聚合多家模型的 API 服务
 * - BigModel (智谱): 国产大模型服务
 * - OpenRouter: 聚合 OpenAI 等模型的代理服务
 * - MiniMax: MoE 大模型服务
 *
 * 使用方式：
 * import { createChatCompletionReader, inferProviderIdFromModelId } from '@/server/services/ai'
 */

export { createChatCompletionReader, inferProviderIdFromModelId } from './gateway'
export type { ProviderId } from './gateway'

// SiliconFlow 提供商导出
export { createChatCompletion } from './provider/siliconflow'
export type { ChatMessage, ChatCompletionOptions, SiliconFlowResponse } from './provider/siliconflow'

// 智谱 AI 提供商导出
export { CallZhipuAPI } from './provider/bigmodel'
export type { ChatCompletionOptions as BigModelOptions, ZAIResponse } from './provider/bigmodel'

// OpenRouter 提供商导出
export { createChatCompletion as createOpenRouterChatCompletion } from './provider/openrouter'
export type { ChatCompletionOptions as OpenRouterOptions, OpenRouterResponse } from './provider/openrouter'

// MiniMax 提供商导出
export { createChatCompletion as createMiniMaxChatCompletion } from './provider/minimax'
export type { ChatCompletionOptions as MiniMaxOptions, MiniMaxResponse } from './provider/minimax'
