'use client'

import { create } from 'zustand'

interface ProviderApiKeyStatus {
  providerId: string
  configured: boolean
}

interface ApiKeyState {
  providers: ProviderApiKeyStatus[]
  isLoading: boolean
  lastFetched: number | null
}

interface ApiKeyActions {
  fetchStatus: () => Promise<void>
  getConfiguredProviders: () => string[]
  isProviderConfigured: (providerId: string) => boolean
}

const CACHE_DURATION = 60 * 1000 // 1 分钟缓存

export const useApiKeyStore = create<ApiKeyState & ApiKeyActions>((set, get) => ({
  providers: [],
  isLoading: false,
  lastFetched: null,

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

  getConfiguredProviders: () => {
    const state = get()
    return state.providers.filter(p => p.configured).map(p => p.providerId)
  },

  isProviderConfigured: (providerId: string) => {
    const state = get()
    return state.providers.some(p => p.providerId === providerId && p.configured)
  },
}))
