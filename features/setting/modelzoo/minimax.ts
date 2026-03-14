/**
 * MiniMax 模型列表
 *
 * MiniMax 是国产大模型服务商，提供 MoE (Mixture of Experts) 模型
 * 文档: https://platform.minimaxi.com/
 */

export interface MiniMaxModel {
	/** 模型 ID */
	id: string
	/** 显示名称 */
	name: string
	/** 描述 */
	description: string
	/** 归一化类别 */
	category: 'reasoning' | 'chat' | 'code' | 'vision'
	/** 是否为推理模型 */
	isReasoningModel: boolean
	/** 是否支持思考模式切换 */
	supportsThinkingToggle: boolean
	/** 最大 tokens */
	maxTokens?: number
}

/**
 * MiniMax 模型列表
 *
 * 常见模型：
 * - abab6.5s-chat: 通用对话模型
 * - abab6.5g-chat: 增强版对话模型
 * - abab6.5-chat: 标准版对话模型
 * - abab4-chat: 早期版本
 */
export const MINIMAX_MODELS: MiniMaxModel[] = [
	// MoE 模型
	{
		id: 'abab6.5s-chat',
		name: 'abab6.5s-chat',
		description: 'MiniMax MoE 轻量高效版，适合快速响应场景',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
		maxTokens: 245760,
	},
	{
		id: 'abab6.5g-chat',
		name: 'abab6.5g-chat',
		description: 'MiniMax MoE 增强版，性能更强',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
		maxTokens: 245760,
	},
	{
		id: 'abab6.5-chat',
		name: 'abab6.5-chat',
		description: 'MiniMax MoE 标准版',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
		maxTokens: 245760,
	},
	{
		id: 'abab4-chat',
		name: 'abab4-chat',
		description: 'MiniMax 早期对话模型版本',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
		maxTokens: 8192,
	},
	{
		id: 'abab4-gamedev',
		name: 'abab4-gamedev',
		description: '游戏开发专用模型',
		category: 'code',
		isReasoningModel: false,
		supportsThinkingToggle: false,
		maxTokens: 8192,
	},
	{
		id: 'abab4-text',
		name: 'abab4-text',
		description: '文本处理专用模型',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
		maxTokens: 8192,
	},
	// 海螺模型
	{
		id: 'hailuo-api',
		name: 'Hailuo-API',
		description: 'MiniMax 海螺对话模型',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
		maxTokens: 8192,
	},
	{
		id: 'hailuo-mini-api',
		name: 'Hailuo-Mini-API',
		description: 'MiniMax 海螺轻量版',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
		maxTokens: 4096,
	},
]

export function getMiniMaxById(id: string): MiniMaxModel | undefined {
	return MINIMAX_MODELS.find(m => m.id === id)
}
