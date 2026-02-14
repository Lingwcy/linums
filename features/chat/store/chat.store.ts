/**
 * Chat Store - 纯状态管理
 * 
 * 只负责状态存储和简单的 mutations
 * 业务逻辑在 chat.service.ts 中
 */

import { create } from 'zustand'
import type { Message, AbortReason, StreamingPhase } from '@/features/chat/types/chat'
import type { MessageRuntimeState, PhaseEvent, ActiveTool } from '@/features/chat/types/message-state'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'
import { getNextPhase, createInitialState } from '@/features/chat/utils/message-state-machine'
import type { ProviderId } from '@/server/services/ai/gateway'
import type { AddedModelItem } from '@/features/setting/store/model.store'

export type SelectedModelInfo = {
  isReasoningModel?: boolean
  supportsThinkingToggle?: boolean
}

interface ChatState {
  // 消息
  messages: Message[]
  
  // 消息缓存（按 conversationId 索引）
  messageCache: Map<string, Message[]>
  
  // 消息运行时状态（按 messageId 索引）
  messageStates: Map<string, MessageRuntimeState>
  
  // 加载状态
  isLoadingMessages: boolean
  loadingConversationId: string | null
  isSendingMessage: boolean

  // 流式状态
  streamingMessageId: string | null
  streamingPhase: StreamingPhase
  abortReason: AbortReason | null
  
  // 配置
  selectedModel: string
  selectedProviderId: ProviderId
  selectedModelInfo?: SelectedModelInfo
  enableThinking: boolean
  enableWebSearch: boolean
}

interface ChatActions {
  // 消息操作
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  appendThinking: (id: string, chunk: string) => void
  appendContent: (id: string, chunk: string) => void
  clearMessages: () => void
  removeMessagesFrom: (index: number) => Message[]
  
  // 消息状态机
  initMessageState: (messageId: string) => void
  transitionPhase: (messageId: string, event: PhaseEvent) => void
  clearMessageState: (messageId: string) => void
  updateToolProgress: (messageId: string, toolCallId: string, progress: number, estimatedTime?: number) => void
  cancelTool: (messageId: string, toolCallId: string) => void
  
  // 加载状态
  setLoadingMessages: (loading: boolean, conversationId?: string | null) => void
  setSendingMessage: (sending: boolean) => void
  
  // 消息缓存
  cacheMessages: (conversationId: string, messages: Message[]) => void
  getCachedMessages: (conversationId: string) => Message[] | undefined
  
  // 流式状态
  startStreaming: (messageId: string, phase: StreamingPhase) => void
  stopStreaming: (reason?: AbortReason) => void
  
  // 配置
  setModel: (modelId: string, providerId?: ProviderId, modelInfo?: SelectedModelInfo) => void
  toggleThinking: (enabled: boolean) => void
  toggleWebSearch: (enabled: boolean) => void
  
  // 重置
  reset: () => void
}

const getInitialModel = (): string => {
  if (typeof window === 'undefined') return ''
  try {
    // 用户选中的模型缓存
    const saved = StorageManager.get<string>(STORAGE_KEYS.USER.SELECTED_MODEL)
    if (!saved) return ''

    // 用户添加的模型缓存
    const added = StorageManager.get<AddedModelItem[]>(STORAGE_KEYS.USER.ADDED_MODELS) || []
    // 此时选中模型对应的供应商
    const savedProvider = StorageManager.get<ProviderId>(STORAGE_KEYS.USER.SELECTED_PROVIDER_ID)
    const isValid = savedProvider
      ? added.some((m) => m.id === saved && m.providerId === savedProvider)
      : added.some((m) => m.id === saved)

    if (isValid) return saved
  } catch {}
  return ''
}

const inferProviderIdFromModelId = (modelId: string): ProviderId => {
  if (modelId.includes('/')) return 'siliconflow'
  if (modelId.startsWith('glm-')) return 'bigmodel'
  return 'siliconflow'
}

const getInitialProviderId = (modelId: string): ProviderId => {
  if (typeof window === 'undefined') return inferProviderIdFromModelId(modelId)
  try {
    const saved = StorageManager.get<ProviderId>(STORAGE_KEYS.USER.SELECTED_PROVIDER_ID)
    if (saved) return saved
  } catch {}
  return inferProviderIdFromModelId(modelId)
}

const initialState: ChatState = {
  messages: [],
  messageCache: new Map(),
  messageStates: new Map(),
  isLoadingMessages: false,
  loadingConversationId: null,
  isSendingMessage: false,
  streamingMessageId: null,
  streamingPhase: null,
  abortReason: null,
  selectedModel: getInitialModel(),
  selectedProviderId: 'siliconflow',
  selectedModelInfo: undefined,
  enableThinking: false,
  enableWebSearch: false,
}

// 初始化 providerId（依赖 selectedModel）
initialState.selectedProviderId = getInitialProviderId(initialState.selectedModel)

export const useChatStore = create<ChatState & ChatActions>()((set, get) => ({
  ...initialState,
  
  // ===== 消息操作 =====
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((s) => {
    if (s.messages.some(m => m.id === message.id)) return s
    return { messages: [...s.messages, message] }
  }),
  
  updateMessage: (id, updates) => set((s) => ({
    messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m)
  })),
  
  appendThinking: (id, chunk) => set((s) => ({
    messages: s.messages.map(m => 
      m.id === id ? { ...m, thinking: (m.thinking || '') + chunk } : m
    )
  })),
  
  appendContent: (id, chunk) => set((s) => ({
    messages: s.messages.map(m => 
      m.id === id ? { ...m, content: (m.content || '') + chunk } : m
    )
  })),
  
  clearMessages: () => set({ messages: [] }),
  
  removeMessagesFrom: (index) => {
    const state = get()
    const removed = state.messages.slice(index)
    set({ messages: state.messages.slice(0, index) })
    return removed
  },
  
  // ===== 消息状态机 =====
  initMessageState: (messageId) => set((s) => {
    const newStates = new Map(s.messageStates)
    newStates.set(messageId, createInitialState())
    return { messageStates: newStates }
  }),
  
  transitionPhase: (messageId, event) => set((s) => {
    const currentState = s.messageStates.get(messageId)
    if (!currentState) {
      console.warn(`[Store] No state for message: ${messageId}`)
      return s
    }
    
    const nextPhase = getNextPhase(currentState.phase, event)
    if (nextPhase === null) return s
    
    const newStates = new Map(s.messageStates)
    const newActiveTools = new Map(currentState.activeTools)
    
    // 处理工具状态更新
    if (event.type === 'START_TOOL_CALL') {
      const tool: ActiveTool = {
        toolCallId: event.toolCallId,
        name: event.name,
        state: 'running',
        args: event.args,
      }
      newActiveTools.set(event.toolCallId, tool)
    } else if (event.type === 'TOOL_PROGRESS') {
      const tool = newActiveTools.get(event.toolCallId)
      if (tool) {
        newActiveTools.set(event.toolCallId, {
          ...tool,
          progress: event.progress,
          estimatedTime: event.estimatedTime,
        })
      }
    } else if (event.type === 'TOOL_CANCEL') {
      const tool = newActiveTools.get(event.toolCallId)
      if (tool) {
        newActiveTools.set(event.toolCallId, {
          ...tool,
          state: 'cancelled',
          result: { success: false, cancelled: true },
        })
      }
    } else if (event.type === 'TOOL_COMPLETE') {
      const tool = newActiveTools.get(event.toolCallId)
      if (tool) {
        const cancelled = 'cancelled' in event && event.cancelled
        newActiveTools.set(event.toolCallId, {
          ...tool,
          state: cancelled ? 'cancelled' : (event.success ? 'completed' : 'failed'),
          progress: 100,
          result: { success: event.success, data: event.result, cancelled },
        })
      }
    }
    
    newStates.set(messageId, {
      phase: nextPhase,
      activeTools: newActiveTools,
    })
    
    return { messageStates: newStates }
  }),
  
  clearMessageState: (messageId) => set((s) => {
    const newStates = new Map(s.messageStates)
    newStates.delete(messageId)
    return { messageStates: newStates }
  }),
  
  updateToolProgress: (messageId, toolCallId, progress, estimatedTime) => set((s) => {
    const currentState = s.messageStates.get(messageId)
    if (!currentState) return s
    
    const tool = currentState.activeTools.get(toolCallId)
    if (!tool) return s
    
    // 更新 messageStates
    const newStates = new Map(s.messageStates)
    const newActiveTools = new Map(currentState.activeTools)
    newActiveTools.set(toolCallId, { ...tool, progress, estimatedTime })
    newStates.set(messageId, { ...currentState, activeTools: newActiveTools })
    
    // 同时更新 messages 里的 toolInvocations
    const newMessages = s.messages.map((msg) => {
      if (msg.id !== messageId) return msg
      const updatedInvocations = msg.toolInvocations?.map((inv) => {
        if (inv.toolCallId !== toolCallId) return inv
        return { ...inv, progress, estimatedTime }
      })
      return { ...msg, toolInvocations: updatedInvocations }
    })
    
    return { messageStates: newStates, messages: newMessages }
  }),
  
  cancelTool: (messageId, toolCallId) => set((s) => {
    const currentState = s.messageStates.get(messageId)
    if (!currentState) return s
    
    const tool = currentState.activeTools.get(toolCallId)
    if (!tool) return s
    
    // 更新 messageStates
    const newStates = new Map(s.messageStates)
    const newActiveTools = new Map(currentState.activeTools)
    newActiveTools.set(toolCallId, { ...tool, state: 'cancelled', result: { success: false, cancelled: true } })
    newStates.set(messageId, { ...currentState, activeTools: newActiveTools })
    
    // 同时更新 messages 里的 toolInvocations
    const newMessages = s.messages.map((msg) => {
      if (msg.id !== messageId) return msg
      const updatedInvocations = msg.toolInvocations?.map((inv) => {
        if (inv.toolCallId !== toolCallId) return inv
        return { ...inv, state: 'cancelled' as const, result: { success: false, cancelled: true } }
      })
      return { ...msg, toolInvocations: updatedInvocations }
    })
    
    return { messageStates: newStates, messages: newMessages }
  }),
  
  // ===== 加载状态 =====
  setLoadingMessages: (loading, conversationId = null) => set({
    isLoadingMessages: loading,
    loadingConversationId: loading ? conversationId : null,
  }),
  
  setSendingMessage: (sending) => set({ isSendingMessage: sending }),
  
  // ===== 消息缓存 =====
  cacheMessages: (conversationId, messages) => set((s) => {
    const newCache = new Map(s.messageCache)
    newCache.set(conversationId, messages)
    return { messageCache: newCache }
  }),
  
  getCachedMessages: (conversationId) => {
    return get().messageCache.get(conversationId)
  },
  
  // ===== 流式状态 =====
  startStreaming: (messageId, phase) => set({
    streamingMessageId: messageId,
    streamingPhase: phase,
    abortReason: null,
  }),
  
  stopStreaming: (reason) => set({
    streamingMessageId: null,
    streamingPhase: null,
    abortReason: reason || null,
  }),
  
  // ===== 配置 =====
  setModel: (modelId, providerId, modelInfo) => {
    const nextProviderId = providerId ?? inferProviderIdFromModelId(modelId)
    try {
      StorageManager.set(STORAGE_KEYS.USER.SELECTED_MODEL, modelId)
      StorageManager.set(STORAGE_KEYS.USER.SELECTED_PROVIDER_ID, nextProviderId)
    } catch {}
    set({ selectedModel: modelId, selectedProviderId: nextProviderId, selectedModelInfo: modelInfo })
  },
  
  toggleThinking: (enabled) => set({ enableThinking: enabled }),
  
  toggleWebSearch: (enabled) => set({ enableWebSearch: enabled }),
  
  // ===== 重置 =====
  reset: () => set(initialState),
}))

// Selectors
export const selectIsStreaming = (s: ChatState) => s.streamingMessageId !== null
export const selectLastMessage = (s: ChatState) => s.messages[s.messages.length - 1]
