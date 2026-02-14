export interface BigModelModel {
	/** 模型 ID（对应 BigModel 的 modelCode） */
	id: string
	/** 显示名称（对应 BigModel 的 modelName） */
	name: string
	/** 描述（对应 BigModel 的 description） */
	description: string
	/** 归一化类别（用于前端展示/筛选） */
	category: 'reasoning' | 'chat' | 'code' | 'vision'
	/** 是否为原生推理模型（只用 thinking_budget） */
	isReasoningModel: boolean
	/** 是否支持 enable_thinking 参数 */
	supportsThinkingToggle: boolean
	/** 是否为默认模型 */
	default?: boolean
	/** 最大 tokens（如果未知可不填） */
	maxTokens?: number
}

/**
 * BigModel 模型中心列表（由模型中心响应 JSON 扁平化得到）
 *
 * 说明：
 * - `id` 使用 BigModel 的 `modelCode`（例如：`glm-4.7-flash`）
 * - `category` 做了简单归一化：
 *   - deep_thinking / flagship / text_generation / other_model / audio_video_model => chat
 *   - vector_model => code
 *   - vision_understanding / image_generation / video_generation => vision
 * - `isReasoningModel` 仅对 deep_thinking 标记为 true（其余默认 false）
 * - 多模态/非对话类模型默认 `supportsThinkingToggle=false`
 */
export const BIGMODEL_MODELS: BigModelModel[] = [
	// video_generation
	{
		id: 'viduq1-image',
		name: 'Viduq1-Image',
		description: '图片生成视频',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'viduq1-text',
		name: 'ViduQ1-text',
		description: '文本生成视频',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'viduq1-start-end',
		name: 'Viduq1-Start-End',
		description: '首尾帧生成视频',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'vidu2-image',
		name: 'Vidu2-Image',
		description: '图像生成视频',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'vidu2-reference',
		name: 'Vidu2-Reference',
		description: '多图参考生成视频',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'vidu2-start-end',
		name: 'Vidu2-Start-End',
		description: '首尾帧生成',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},

	// deep_thinking
	{
		id: 'glm-4.7-flashx',
		name: 'GLM-4.7-FlashX',
		description: '总参数30B，轻量高效，兼顾性能与性价比',
		category: 'reasoning',
		isReasoningModel: true,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4.6',
		name: 'GLM-4.6',
		description: '上下文扩展至 200K，实际编程任务表现佳',
		category: 'reasoning',
		isReasoningModel: true,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4.5',
		name: 'GLM-4.5',
		description: '原生融合推理、编码和 Agent 能力',
		category: 'reasoning',
		isReasoningModel: true,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4.5-air',
		name: 'GLM-4.5-Air',
		description: '轻量版，兼顾性能与性价比',
		category: 'reasoning',
		isReasoningModel: true,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4.7-flash',
		name: 'GLM-4.7-Flash',
		description: '普惠模型，免费调用',
		category: 'reasoning',
		isReasoningModel: true,
		supportsThinkingToggle: false,
	},

	// other_model
	{
		id: 'charglm-4',
		name: 'CharGLM-4',
		description: '角色扮演模型，支持创建千人千面的角色对话',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: true,
	},
	{
		id: 'emohaa',
		name: 'Emohaa',
		description: '心理咨询模型，拥有专业心理咨询师话术能力',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: true,
	},

	// vector_model
	{
		id: 'embedding-3',
		name: 'Embedding-3',
		description: '语义理解能力更强，支持自定义向量维度',
		category: 'code',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'embedding-2',
		name: 'Embedding-2',
		description: '支持多语种文本向量化，计算效率良好',
		category: 'code',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},

	// image_generation
	{
		id: 'glm-image',
		name: 'GLM-Image',
		description: '文字渲染精准，支持多分辨率',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'cogview-4-250304',
		name: 'CogView-4-250304',
		description: '可生成带汉字的图，支持给定范围内自定义分辨率',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'cogview-3',
		name: 'CogView-3',
		description: '图片生成，分辨率：1024x1024',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'cogview-3-flash',
		name: 'CogView-3-Flash',
		description: '普惠模型，免费调用',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},

	// text_generation
	{
		id: 'glm-4-flash-250414',
		name: 'GLM-4-Flash-250414',
		description: '普惠模型，免费调用',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: true,
	},
	{
		id: 'glm-4-flash',
		name: 'GLM-4-Flash',
		description: '普惠模型，免费调用',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: true,
	},

	// flagship
	{
		id: 'glm-4.7',
		name: 'GLM-4.7',
		description: '智谱最强基座模型，编码、智能体与通用对话能力全面提升。复杂任务执行稳，创意写作有文采',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: true,
	},
	{
		id: 'glm-4.6v',
		name: 'GLM-4.6V',
		description: '智谱最强多模态模型，视觉理解精度达同级别SOTA，128K 上下文，原生支持工具调用',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'cogvideox-3',
		name: 'CogVideoX-3',
		description: '智谱最强视频生成模型，支持图生、文生、首尾帧生成，画面稳定清晰，主体运动流畅',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},

	// audio_video_model
	{
		id: 'glm-tts',
		name: 'GLM-TTS',
		description: '语音合成模型，效果自然生动、富有感染力',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-tts-clone',
		name: 'GLM-TTS-Clone',
		description: '语音克隆模型，3 秒语音样本，即可生成专属音色',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-asr-2512',
		name: 'GLM-ASR-2512',
		description: '语音转文本模型，强抗噪，覆盖多种语言和方言',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-realtime-plus-audio',
		name: 'GLM-Realtime-Plus-Audio',
		description: '实时音视频通话模型，通话记忆长达2分钟',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4-voice',
		name: 'GLM-4-Voice',
		description: '端到端语音模型，可调整情感、语调和方言等特性',
		category: 'chat',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},

	// vision_understanding
	{
		id: 'autoglm-phone',
		name: 'AutoGLM-Phone',
		description: 'AI 手机智能助理模型，“所说即所得”',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-ocr',
		name: 'GLM-OCR',
		description: '支持对多种复杂文档的精准解析，轻量高效',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4.6v-flashx',
		name: 'GLM-4.6V-FlashX',
		description: '轻量版，速度快，高性价比',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4.5v',
		name: 'GLM-4.5V',
		description: '全场景通用视觉推理，可灵活开关“思考模式”',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4.1v-thinking-flashx',
		name: 'GLM-4.1V-Thinking-FlashX',
		description: '小尺寸视觉推理模型，兼顾效率与性能',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
	{
		id: 'glm-4.6v-flash',
		name: 'GLM-4.6V-Flash',
		description: '普惠模型，免费调用',
		category: 'vision',
		isReasoningModel: false,
		supportsThinkingToggle: false,
	},
]

export function getBigModelById(id: string): BigModelModel | undefined {
	return BIGMODEL_MODELS.find(m => m.id === id)
}

