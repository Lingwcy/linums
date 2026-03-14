import { create } from "zustand"

import { BIGMODEL_MODELS, type BigModelModel } from "../modelzoo/bigmodel"
import { MINIMAX_MODELS, type MiniMaxModel } from "../modelzoo/minimax"
import type { OpenRouterProviderItem } from "../modelzoo/openrouter"

export type ProviderId = "bigmodel" | "siliconflow" | "openrouter" | "minimax" | "openai"

export interface ModelProviderItem {
	id: string
	name: string
	description?: string
	category?: string
	isReasoningModel?: boolean
	supportsThinkingToggle?: boolean
	maxTokens?: number
	providerId: ProviderId
}

export interface ProviderDef {
	id: ProviderId
	label: string
}

export function bigModelToProviderItem(m: BigModelModel): ModelProviderItem {
	return {
		id: m.id,
		name: m.name,
		description: m.description,
		category: m.category,
		isReasoningModel: m.isReasoningModel,
		supportsThinkingToggle: m.supportsThinkingToggle,
		maxTokens: m.maxTokens,
		providerId: "bigmodel",
	}
}

export function minimaxToProviderItem(m: MiniMaxModel): ModelProviderItem {
	return {
		id: m.id,
		name: m.name,
		description: m.description,
		category: m.category,
		isReasoningModel: m.isReasoningModel,
		supportsThinkingToggle: m.supportsThinkingToggle,
		maxTokens: m.maxTokens,
		providerId: "minimax",
	}
}

export const MODEL_ZOO_PROVIDERS: ProviderDef[] = [
	{ id: "bigmodel", label: "智谱" },
	{ id: "siliconflow", label: "硅基流动" },
	{ id: "openrouter", label: "OpenRouter" },
	{ id: "minimax", label: "MiniMax" },
	{ id: "openai", label: "OpenAI" },
]

type LoadStatus = "idle" | "loading" | "success" | "error"

type ProviderModelsState = Record<ProviderId, ModelProviderItem[]>
type ProviderStatusState = Record<ProviderId, LoadStatus>
type ProviderErrorState = Partial<Record<ProviderId, string>>

interface ModelZooUiState {
	providerId: ProviderId
	keyword: string
	currentPage: number
	providerModels: ProviderModelsState
	providerStatus: ProviderStatusState
	providerError: ProviderErrorState
}

interface ModelZooUiAction {
	setProviderId: (id: ProviderId) => void
	setKeyword: (keyword: string) => void
	setCurrentPage: (page: number) => void
	resetQuery: () => void
	loadProviderModels: (providerId: ProviderId, opts?: { force?: boolean }) => Promise<void>
}

const initialState: ModelZooUiState = {
	providerId: "bigmodel",
	keyword: "",
	currentPage: 1,
	providerModels: {
		bigmodel: BIGMODEL_MODELS.map(bigModelToProviderItem),
		siliconflow: [],
		openrouter: [],
		minimax: MINIMAX_MODELS.map(minimaxToProviderItem),
		openai: [],
	},
	providerStatus: {
		bigmodel: "success",
		siliconflow: "idle",
		openrouter: "idle",
		minimax: "success",
		openai: "idle",
	},
	providerError: {},
}


export const useModelZooStore = create<ModelZooUiState & ModelZooUiAction>()((set, get) => ({
	...initialState,
	setProviderId: providerId => set({ providerId }),
	setKeyword: keyword => set({ keyword }),
	setCurrentPage: currentPage => set({ currentPage }),
	resetQuery: () => set({ keyword: "", currentPage: 1 }),
	loadProviderModels: async (providerId, opts) => {
		const force = Boolean(opts?.force)
		const state = get()
		const currentStatus = state.providerStatus[providerId]

		if (!force) {
			if (providerId === "bigmodel") return
			if (currentStatus === "loading") return
			if (currentStatus === "success" && state.providerModels[providerId].length > 0) return
		}

		set(s => ({
			providerStatus: { ...s.providerStatus, [providerId]: "loading" },
			providerError: { ...s.providerError, [providerId]: undefined },
		}))

		try {
			let models: ModelProviderItem[] = []
			if (providerId === "openrouter") {
				const res = await fetch("/api/modelzoo/openrouter", {
					method: "GET",
					headers: { accept: "application/json" },
				})
				if (!res.ok) {
					throw new Error(`OpenRouter models request failed: ${res.status}`)
				}
				const json = (await res.json()) as unknown
				models = (Array.isArray(json) ? (json as OpenRouterProviderItem[]) : []) as ModelProviderItem[]
			} else if (providerId === "bigmodel") {
				models = BIGMODEL_MODELS.map(bigModelToProviderItem)
			} else if (providerId === "minimax") {
				models = MINIMAX_MODELS.map(minimaxToProviderItem)
			} else {
				// 其它 provider 目前未接入数据源，保持空数组
				models = []
			}

			set(s => ({
				providerModels: { ...s.providerModels, [providerId]: models },
				providerStatus: { ...s.providerStatus, [providerId]: "success" },
			}))
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error"
			set(s => ({
				providerModels: { ...s.providerModels, [providerId]: [] },
				providerStatus: { ...s.providerStatus, [providerId]: "error" },
				providerError: { ...s.providerError, [providerId]: message },
			}))
		}
	},
}))
