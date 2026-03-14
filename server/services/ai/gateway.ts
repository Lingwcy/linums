/**
 * AI 服务网关 (Gateway)
 *
 * 统一入口，负责根据不同的 AI 提供商调用相应的 API
 * 支持：智谱 (BigModel)、SiliconFlow、OpenRouter、MiniMax
 */

import { CallZhipuAPI, type ChatCompletionOptions as BigModelOptions } from '@/server/services/ai/provider/bigmodel'
import { createChatCompletion as siliconflowCreateChatCompletion, type ChatCompletionOptions as SiliconFlowOptions } from '@/server/services/ai/provider/siliconflow'
import { createChatCompletion as openrouterCreateChatCompletion, type ChatCompletionOptions as OpenRouterOptions } from '@/server/services/ai/provider/openrouter'
import { createChatCompletion as minimaxCreateChatCompletion, type ChatCompletionOptions as MiniMaxOptions } from '@/server/services/ai/provider/minimax'

/**
 * AI 提供商 ID 类型
 * - bigmodel: 智谱 AI (glm 系列模型)
 * - siliconflow: SiliconFlow (聚合多家模型)
 * - openrouter: OpenRouter (聚合 OpenAI 等模型)
 * - minimax: MiniMax (MoE 模型)
 * - openai: OpenAI (暂未实现)
 */
export type ProviderId = 'bigmodel' | 'siliconflow' | 'openrouter' | 'minimax' | 'openai'

/**
 * 根据模型 ID 推断所属的 AI 提供商
 *
 * 推断逻辑：
 * - 模型名包含 "/" → SiliconFlow (vendor/name 格式)
 * - 模型名以 "glm-" 开头 → 智谱 AI
 * - 模型名以 "abab" 开头 → MiniMax
 * - 其他默认 → SiliconFlow
 */
export function inferProviderIdFromModelId(modelId: string): ProviderId {
    // 很多 SiliconFlow 模型是 vendor/name 的形式
    if (modelId.includes('/')) return 'siliconflow'
    // glm-* 更像智谱的模型命名
    if (modelId.startsWith('glm-')) return 'bigmodel'
    // abab-* 是 MiniMax 的模型命名
    if (modelId.startsWith('abab')) return 'minimax'
    return 'siliconflow'
}

/**
 * 创建聊天补全请求（流式）
 *
 * 根据 providerId 将请求路由到对应的 AI 提供商
 *
 * @param providerId - AI 提供商 ID
 * @param apiKey - API 密钥
 * @param options - 聊天补全选项
 * @returns 包含流式响应 reader 的对象
 */
export async function createChatCompletionReader(
    providerId: ProviderId,
    apiKey: string,
    options: {
        model: string
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
        modelInfo?: { isReasoningModel?: boolean; supportsThinkingToggle?: boolean }
        enableThinking?: boolean
        thinkingBudget?: number
        tools?: unknown[]
        toolChoice?: 'auto' | 'required' | { type: 'function'; function: { name: string } }
    }
): Promise<{ reader: ReadableStreamDefaultReader<Uint8Array> }> {
    // 根据提供商选择对应的 API 调用函数
    if (providerId === 'bigmodel') {
        return CallZhipuAPI(apiKey, options as BigModelOptions)
    }

    if (providerId === 'openrouter') {
        return openrouterCreateChatCompletion(apiKey, options as OpenRouterOptions)
    }

    if (providerId === 'minimax') {
        // MiniMax 需要 Group ID
        const groupId = process.env.MINIMAX_GROUP_ID
        if (!groupId) {
            throw new Error('MINIMAX_GROUP_ID 环境变量未配置')
        }
        return minimaxCreateChatCompletion(apiKey, groupId, options as MiniMaxOptions)
    }

    // 默认走 SiliconFlow
    return siliconflowCreateChatCompletion(apiKey, options as SiliconFlowOptions)
}
