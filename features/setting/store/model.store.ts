/**
 * 用户添加模型 Store
 *
 * 管理用户自定义添加的 AI 模型：
 * - 从 localStorage 加载已保存的模型列表
 * - 添加新模型到列表
 * - 从列表中移除模型
 * - 持久化到 localStorage
 *
 * 职责：
 * - 状态存储：addedModel 数组
 * - 持久化：使用 StorageManager 读写 localStorage
 * - 唯一性检查：避免重复添加相同模型
 *
 * @module features/setting/store/model.store
 */

import { create } from 'zustand'
import type { ProviderId } from './modelzoo.store'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'

/**
 * 用户添加的模型项
 */
export type AddedModelItem = {
  /** 模型 ID */
  id: string
  /** 显示名称 */
  name: string
  /** Provider 标识符 */
  providerId: ProviderId
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
}

/** 模型列表类型 */
type AddedModelType = AddedModelItem[]

/**
 * Store 状态接口
 */
interface State {
  /** 用户添加的模型列表 */
  addedModel: AddedModelType
}

/**
 * Store 方法接口
 */
interface Action {
  /** 添加模型到列表 */
  addModel: (model: AddedModelItem) => void
  /** 从列表移除模型 */
  removeModel: (id: string, providerId?: ProviderId) => void
}

/**
 * 初始状态
 *
 * 从 localStorage 加载已保存的模型列表。
 * 必须在浏览器环境执行，SSR 时返回空数组。
 */
const initialState: State = {
  addedModel: (() => {
    // SSR 环境下返回空数组
    if (typeof window === 'undefined') return []
    try {
      const saved = StorageManager.get<AddedModelType>(STORAGE_KEYS.USER.ADDED_MODELS)
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })(),
}

/**
 * 用户添加模型 Store
 *
 * 使用 Zustand 管理用户自定义添加的 AI 模型：
 * - 持久化到 localStorage，页面刷新后保留
 * - 添加时检查唯一性，避免重复
 * - 移除时支持按 ID 或 ID+ProviderId 精确匹配
 *
 * @example
 * ```tsx
 * const { addedModel, addModel, removeModel } = useModelStore()
 *
 * // 添加新模型
 * addModel({
 *   id: 'custom-model-1',
 *   name: '我的自定义模型',
 *   providerId: 'openrouter'
 * })
 *
 * // 移除模型
 * removeModel('custom-model-1', 'openrouter')
 * ```
 */
export const useModelStore = create<State & Action>()((set) => ({
  ...initialState,

  /**
   * addModel - 添加模型
   *
   * 将新模型添加到列表，同时持久化到 localStorage。
   * 如果模型已存在（相同 ID 和 ProviderId），则忽略。
   *
   * @param model - 要添加的模型对象
   */
  addModel: (model) => set((s) => {
    // 检查是否已存在
    if (s.addedModel.some((m) => m.id === model.id && m.providerId === model.providerId)) {
      return s
    }
    const next = [...s.addedModel, model]
    try {
      StorageManager.set(STORAGE_KEYS.USER.ADDED_MODELS, next)
    } catch {}
    return { addedModel: next }
  }),

  /**
   * removeModel - 移除模型
   *
   * 从列表中移除指定模型，同时更新 localStorage。
   * 支持两种匹配模式：
   * - 仅 ID：移除所有匹配 ID 的模型
   * - ID + ProviderId：精确匹配移除
   *
   * @param id - 模型 ID
   * @param providerId - 可选的 Provider 标识符
   */
  removeModel: (id, providerId) => set((s) => {
    const next = s.addedModel.filter((m) => {
      if (!providerId) return m.id !== id
      return !(m.id === id && m.providerId === providerId)
    })
    try {
      StorageManager.set(STORAGE_KEYS.USER.ADDED_MODELS, next)
    } catch {}
    return { addedModel: next }
  }),
}))
