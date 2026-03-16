/**
 * 模型动物园 Store
 *
 * 管理 AI 模型选择器的 UI 状态和模型列表：
 * - 当前选中的 Provider
 * - 搜索关键词
 * - 分页状态
 * - 各 Provider 的模型列表（本地 + 远程获取）
 * - 加载状态和错误处理
 *
 * 职责：
 * - UI 状态管理：providerId、keyword、currentPage
 * - 模型数据管理：providerModels、providerStatus
 * - 远程获取：从 API 动态加载模型列表
 * - 数据转换：将不同 Provider 的模型格式转换为统一格式
 *
 * @module features/setting/store/modelzoo.store
 */

import { create } from "zustand"

import { BIGMODEL_MODELS, type BigModelModel } from "../modelzoo/bigmodel"
import { MINIMAX_MODELS, type MiniMaxModel } from "../modelzoo/minimax"
import type { OpenRouterProviderItem } from "../modelzoo/openrouter"

/**
 * Provider 标识符类型
 *
 * 支持的 AI 模型 Provider：
 * - bigmodel: 智谱 AI
 * - siliconflow: 硅基流动
 * - openrouter: OpenRouter
 * - minimax: MiniMax
 * - openai: OpenAI
 */
export type ProviderId = "bigmodel" | "siliconflow" | "openrouter" | "minimax" | "openai"

/**
 * 统一的模型项格式
 *
 * 所有 Provider 的模型都转换为这个格式
 */
export interface ModelProviderItem {
  /** 模型 ID */
  id: string
  /** 显示名称 */
  name: string
  /** 模型描述 */
  description?: string
  /** 分类 */
  category?: string
  /** 是否为推理模型 */
  isReasoningModel?: boolean
  /** 是否支持思考开关 */
  supportsThinkingToggle?: boolean
  /** 最大 token 数 */
  maxTokens?: number
  /** Provider 标识符 */
  providerId: ProviderId
}

/**
 * Provider 定义
 */
export interface ProviderDef {
  /** Provider 标识符 */
  id: ProviderId
  /** 显示标签 */
  label: string
}

/**
 * bigmodel 模型转换为统一格式
 *
 * @param m - 原始 bigmodel 模型
 * @returns 统一格式的模型项
 */
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

/**
 * minimax 模型转换为统一格式
 *
 * @param m - 原始 minimax 模型
 * @returns 统一格式的模型项
 */
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

/**
 * 可用的 Provider 列表
 */
export const MODEL_ZOO_PROVIDERS: ProviderDef[] = [
  { id: "bigmodel", label: "智谱" },
  { id: "siliconflow", label: "硅基流动" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "minimax", label: "MiniMax" },
  { id: "openai", label: "OpenAI" },
]

/**
 * 模型加载状态
 *
 * - idle: 未加载
 * - loading: 加载中
 * - success: 加载成功
 * - error: 加载失败
 */
type LoadStatus = "idle" | "loading" | "success" | "error"

/** 各 Provider 的模型列表 */
type ProviderModelsState = Record<ProviderId, ModelProviderItem[]>
/** 各 Provider 的加载状态 */
type ProviderStatusState = Record<ProviderId, LoadStatus>
/** 各 Provider 的错误信息 */
type ProviderErrorState = Partial<Record<ProviderId, string>>

/**
 * Store 状态接口
 */
interface ModelZooUiState {
  /** 当前选中的 Provider */
  providerId: ProviderId
  /** 搜索关键词 */
  keyword: string
  /** 当前页码 */
  currentPage: number
  /** 各 Provider 的模型列表 */
  providerModels: ProviderModelsState
  /** 各 Provider 的加载状态 */
  providerStatus: ProviderStatusState
  /** 各 Provider 的错误信息 */
  providerError: ProviderErrorState
}

/**
 * Store 方法接口
 */
interface ModelZooUiAction {
  /** 设置当前 Provider */
  setProviderId: (id: ProviderId) => void
  /** 设置搜索关键词 */
  setKeyword: (keyword: string) => void
  /** 设置当前页码 */
  setCurrentPage: (page: number) => void
  /** 重置搜索条件 */
  resetQuery: () => void
  /** 加载指定 Provider 的模型列表 */
  loadProviderModels: (providerId: ProviderId, opts?: { force?: boolean }) => Promise<void>
}

/**
 * 初始状态
 *
 * 预加载 bigmodel 和 minimax 的模型列表（本地数据），
 * 其他 Provider 需要远程获取。
 */
const initialState: ModelZooUiState = {
  providerId: "bigmodel",
  keyword: "",
  currentPage: 1,
  providerModels: {
    // bigmodel 和 minimax 使用本地数据
    bigmodel: BIGMODEL_MODELS.map(bigModelToProviderItem),
    siliconflow: [],
    openrouter: [],
    minimax: MINIMAX_MODELS.map(minimaxToProviderItem),
    openai: [],
  },
  providerStatus: {
    // 本地数据直接标记为成功
    bigmodel: "success",
    siliconflow: "idle",
    openrouter: "idle",
    minimax: "success",
    openai: "idle",
  },
  providerError: {},
}

/**
 * 模型动物园 Store
 *
 * 管理 AI 模型选择器的完整状态：
 * - UI 状态：当前 Provider、搜索关键词、分页
 * - 模型数据：各 Provider 的模型列表
 * - 加载状态：loading/success/error
 * - 远程获取：动态从 API 加载模型列表
 *
 * 模型获取策略：
 * - bigmodel/minimax: 本地预定义，直接可用
 * - openrouter: 远程从 /api/modelzoo/openrouter 获取
 * - siliconflow/openai: 暂未接入数据源
 *
 * @example
 * ```tsx
 * const { providerId, setProviderId, loadProviderModels } = useModelZooStore()
 *
 * // 切换 Provider 时加载模型
 * useEffect(() => {
 *   loadProviderModels(providerId)
 * }, [providerId])
 * ```
 */
export const useModelZooStore = create<ModelZooUiState & ModelZooUiAction>()((set, get) => ({
  ...initialState,

  /**
   * setProviderId - 设置当前 Provider
   *
   * 切换模型选择器的 Provider，同时重置分页。
   *
   * @param id - Provider 标识符
   */
  setProviderId: providerId => set({ providerId }),

  /**
   * setKeyword - 设置搜索关键词
   *
   * @param keyword - 搜索关键词
   */
  setKeyword: keyword => set({ keyword }),

  /**
   * setCurrentPage - 设置当前页码
   *
   * @param page - 页码
   */
  setCurrentPage: currentPage => set({ currentPage }),

  /**
   * resetQuery - 重置搜索条件
   *
   * 清空关键词并重置到第一页。
   */
  resetQuery: () => set({ keyword: "", currentPage: 1 }),

  /**
   * loadProviderModels - 加载 Provider 模型列表
   *
   * 根据 Provider 类型决定获取方式：
   * - bigmodel/minimax: 使用本地数据（无需请求）
   * - openrouter: 从远程 API 获取
   * - 其他: 返回空数组
   *
   * 支持强制刷新（force: true）绕过缓存。
   *
   * @param providerId - Provider 标识符
   * @param opts - 选项
   * @param opts.force - 是否强制刷新
   */
  loadProviderModels: async (providerId, opts) => {
    const force = Boolean(opts?.force)
    const state = get()
    const currentStatus = state.providerStatus[providerId]

    // 跳过条件：
    // 1. 非强制刷新时，bigmodel 不需要加载（本地数据）
    // 2. 非强制刷新时，正在加载中
    // 3. 非强制刷新时，已有数据
    if (!force) {
      if (providerId === "bigmodel") return
      if (currentStatus === "loading") return
      if (currentStatus === "success" && state.providerModels[providerId].length > 0) return
    }

    // 设置加载状态
    set(s => ({
      providerStatus: { ...s.providerStatus, [providerId]: "loading" },
      providerError: { ...s.providerError, [providerId]: undefined },
    }))

    try {
      let models: ModelProviderItem[] = []

      if (providerId === "openrouter") {
        // OpenRouter: 从远程 API 获取
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
        // bigmodel: 使用本地数据
        models = BIGMODEL_MODELS.map(bigModelToProviderItem)
      } else if (providerId === "minimax") {
        // minimax: 使用本地数据
        models = MINIMAX_MODELS.map(minimaxToProviderItem)
      } else {
        // 其它 provider 目前未接入数据源，保持空数组
        models = []
      }

      // 更新模型列表和状态
      set(s => ({
        providerModels: { ...s.providerModels, [providerId]: models },
        providerStatus: { ...s.providerStatus, [providerId]: "success" },
      }))
    } catch (e) {
      // 加载失败，更新状态和错误信息
      const message = e instanceof Error ? e.message : "Unknown error"
      set(s => ({
        providerModels: { ...s.providerModels, [providerId]: [] },
        providerStatus: { ...s.providerStatus, [providerId]: "error" },
        providerError: { ...s.providerError, [providerId]: message },
      }))
    }
  },
}))
