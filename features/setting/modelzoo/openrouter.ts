export interface OpenRouterModelArchitecture {
	modality?: string
	input_modalities?: string[]
	output_modalities?: string[]
	tokenizer?: string
	instruct_type?: string | null
}

export interface OpenRouterTopProvider {
	context_length?: number
	max_completion_tokens?: number
	is_moderated?: boolean
}

export interface OpenRouterModel {
	id: string
	name: string
	description?: string
	context_length?: number
	architecture?: OpenRouterModelArchitecture
	top_provider?: OpenRouterTopProvider
}

export interface OpenRouterModelsResponse {
	data: OpenRouterModel[]
}

// 这里导出一个最小的 “提供商通用模型结构”，避免与 store 互相 import 造成循环依赖。
export type OpenRouterProviderItem = {
	id: string
	name: string
	description?: string
	maxTokens?: number
	providerId: "openrouter"
}

function coerceString(v: unknown): string {
	return typeof v === "string" ? v : ""
}

function coerceNumber(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

export function openRouterToProviderItem(m: OpenRouterModel): OpenRouterProviderItem {
	const maxTokens =
		m.context_length ??
		m.top_provider?.context_length ??
		m.top_provider?.max_completion_tokens

	return {
		id: m.id,
		name: m.name,
		description: m.description,
		maxTokens,
		providerId: "openrouter",
	}
}

export function parseOpenRouterModelsResponse(json: unknown): OpenRouterProviderItem[] {
	const root = json as Partial<OpenRouterModelsResponse> | null
	const data = Array.isArray(root?.data) ? root!.data : []

	const mapped: OpenRouterProviderItem[] = []
	for (const item of data) {
		const raw = item as Partial<OpenRouterModel> | null
		const id = coerceString(raw?.id)
		const name = coerceString(raw?.name)
		if (!id || !name) continue

		mapped.push({
			id,
			name,
			description: typeof raw?.description === "string" ? raw!.description : undefined,
			maxTokens:
				coerceNumber(raw?.context_length) ??
				coerceNumber((raw?.top_provider as OpenRouterTopProvider | undefined)?.context_length) ??
				coerceNumber((raw?.top_provider as OpenRouterTopProvider | undefined)?.max_completion_tokens),
			providerId: "openrouter",
		})
	}

	return mapped
}
