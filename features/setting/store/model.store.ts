import { create } from 'zustand'
import type { ProviderId } from './modelzoo.store'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'

export type AddedModelItem = {
    id: string
    name: string
    providerId: ProviderId
    description?: string
    category?: string
    isReasoningModel?: boolean
    supportsThinkingToggle?: boolean
    maxTokens?: number
}
type AddedModelType = AddedModelItem[]
interface State {
    addedModel: AddedModelType
}

interface Action {
    addModel: (model: AddedModelItem) => void
    removeModel: (id: string, providerId?: ProviderId) => void
}

const initialState: State = {
    addedModel: (() => {
        if (typeof window === 'undefined') return []
        try {
            const saved = StorageManager.get<AddedModelType>(STORAGE_KEYS.USER.ADDED_MODELS)
            return Array.isArray(saved) ? saved : []
        } catch {
            return []
        }
    })()
}
export const useModelStore = create<State & Action>()((set) => ({
    ...initialState,

    addModel: (model) => set((s) => {
        if (s.addedModel.some((m) => m.id === model.id && m.providerId === model.providerId)) return s
        const next = [...s.addedModel, model]
        try {
            StorageManager.set(STORAGE_KEYS.USER.ADDED_MODELS, next)
        } catch {}
        return { addedModel: next }
    }),

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