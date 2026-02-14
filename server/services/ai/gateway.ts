import { CallZhipuAPI, type ChatCompletionOptions as BigModelOptions } from '@/server/services/ai/provider/bigmodel'
import { createChatCompletion as siliconflowCreateChatCompletion, type ChatCompletionOptions as SiliconFlowOptions } from '@/server/services/ai/provider/siliconflow'
import { createChatCompletion as openrouterCreateChatCompletion, type ChatCompletionOptions as OpenRouterOptions } from '@/server/services/ai/provider/openrouter'

export type ProviderId = 'bigmodel' | 'siliconflow' | 'openrouter' | 'openai'

export function inferProviderIdFromModelId(modelId: string): ProviderId {
    // 很多 SiliconFlow 模型是 vendor/name 的形式
    if (modelId.includes('/')) return 'siliconflow'
    // glm-* 更像智谱的模型命名
    if (modelId.startsWith('glm-')) return 'bigmodel'
    return 'siliconflow'
}

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
    if (providerId === 'bigmodel') {
        return CallZhipuAPI(apiKey, options as BigModelOptions)
    }

    if (providerId === 'openrouter') {
        return openrouterCreateChatCompletion(apiKey, options as OpenRouterOptions)
    }

    // 默认走 SiliconFlow
    return siliconflowCreateChatCompletion(apiKey, options as SiliconFlowOptions)
}
