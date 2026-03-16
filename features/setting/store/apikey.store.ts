/**
 * API Key 状态管理 Store
 *
 * 管理用户配置的 API Key 状态：
 * - 从服务端获取各 Provider 的 API Key 配置状态
 * - 缓存状态以减少重复请求
 * - 提供判断 Provider 是否已配置的方法
 *
 * 职责：
 * - 状态存储：providers、isLoading、lastFetched
 * - 异步获取：从 /api/user/api-key 获取配置状态
 * - 缓存管理：1分钟缓存避免频繁请求
 *
 * @module features/setting/store/apikey.store
 */

import { create } from 'zustand'

/**
 * Provider API Key 状态
 */
interface ProviderApiKeyStatus {
  /** Provider 标识符 */
  providerId: string
  /** 是否已配置 API Key */
  configured: boolean
}

/**
 * API Key Store 状态
 */
interface ApiKeyState {
  /** 各 Provider 的 API Key 配置状态列表 */
  providers: ProviderApiKeyStatus[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 最后获取时间戳（用于缓存判断） */
  lastFetched: number | null
}

/**
 * API Key Store 方法
 */
interface ApiKeyActions {
  /** 从服务端获取 API Key 配置状态 */
  fetchStatus: () => Promise<void>
  /** 获取已配置的 Provider 列表 */
  getConfiguredProviders: () => string[]
  /** 判断指定 Provider 是否已配置 */
  isProviderConfigured: (providerId: string) => boolean
}

/** 缓存有效期：1分钟 */
const CACHE_DURATION = 60 * 1000

/**
 * API Key 状态管理 Store
 *
 * 使用 Zustand 管理 API Key 配置状态：
 * - 从服务端获取各 Provider 的配置状态
 * - 1分钟缓存，避免频繁请求
 * - 提供便捷方法判断 Provider 是否可用
 *
 * @example
 * ```tsx
 * const { fetchStatus, isProviderConfigured } = useApiKeyStore()
 *
 * // 检查某 Provider 是否已配置
 * if (isProviderConfigured('siliconflow')) {
 *   // 可以使用该 Provider
 * }
 * ```
 */
export const useApiKeyStore = create<ApiKeyState & ApiKeyActions>((set, get) => ({
  /** 初始状态 */
  providers: [],
  isLoading: false,
  lastFetched: null,

  /**
   * fetchStatus - 获取 API Key 配置状态
   *
   * 从服务端获取各 Provider 的 API Key 配置状态。
   * 使用缓存机制：1分钟内不重复请求。
   */
  fetchStatus: async () => {
    const state = get()

    // 如果正在加载，跳过
    if (state.isLoading) return

    // 如果有缓存且未过期，跳过
    if (state.lastFetched && Date.now() - state.lastFetched < CACHE_DURATION) {
      return
    }

    set({ isLoading: true })

    try {
      const res = await fetch('/api/user/api-key')
      const data = await res.json()

      if (res.ok) {
        set({
          providers: data.providers || [],
          lastFetched: Date.now(),
        })
      }
    } catch (err) {
      console.error('Failed to fetch API key status:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * getConfiguredProviders - 获取已配置的 Provider 列表
   *
   * @returns 已配置 API Key 的 Provider ID 数组
   */
  getConfiguredProviders: () => {
    const state = get()
    return state.providers.filter(p => p.configured).map(p => p.providerId)
  },

  /**
   * isProviderConfigured - 判断 Provider 是否已配置
   *
   * @param providerId - Provider 标识符
   * @returns 是否已配置 API Key
   */
  isProviderConfigured: (providerId: string) => {
    const state = get()
    return state.providers.some(p => p.providerId === providerId && p.configured)
  },
}))
