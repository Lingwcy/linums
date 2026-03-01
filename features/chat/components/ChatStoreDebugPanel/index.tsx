'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { nanoid } from 'nanoid'
import { Bug, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

import { useChatStore } from '@/features/chat/store/chat.store'
import { selectMessagePhase } from '@/features/chat/store/selectors'
import { createInitialState } from '@/features/chat/utils/message-state-machine'
import type {
  AbortReason,
  Message,
  MessageDisplayState,
  SearchSource,
  StreamingPhase,
  ToolInvocation,
  ToolResult,
} from '@/features/chat/types/chat'
import type { MessagePhase } from '@/features/chat/types/message-state'

const LS_OPEN_KEY = 'skychat:debug:chat-store-panel:open'

const DISPLAY_STATES: MessageDisplayState[] = ['idle', 'streaming', 'waiting', 'error', 'regenerating']
const STREAMING_PHASES: StreamingPhase[] = [null, 'thinking', 'answer']
const ABORT_REASONS: Array<AbortReason | null> = [null, 'user_stop', 'user_retry', 'tab_hidden', 'network_error']
const MESSAGE_PHASES: MessagePhase[] = ['idle', 'thinking', 'tool_calling', 'answering', 'error']

function toMessageLabel(m: Message): string {
  const snippet = (m.content || m.thinking || '').replace(/\s+/g, ' ').slice(0, 24)
  return `${m.role} | ${m.id.slice(0, 8)}${snippet ? ` | ${snippet}` : ''}`
}

export function ChatStoreDebugPanel({ conversationId }: { conversationId: string }) {
  if (process.env.NODE_ENV === 'production') return null
  return <ChatStoreDebugPanelImpl conversationId={conversationId} />
}

function ChatStoreDebugPanelImpl({ conversationId }: { conversationId: string }) {

  const searchParams = useSearchParams()

  const messages = useChatStore((s) => s.messages)
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  const streamingPhase = useChatStore((s) => s.streamingPhase)
  const abortReason = useChatStore((s) => s.abortReason)
  const enableThinking = useChatStore((s) => s.enableThinking)
  const enableWebSearch = useChatStore((s) => s.enableWebSearch)

  const [open, setOpen] = useState(false)
  const [selectedMessageId, setSelectedMessageId] = useState<string>('')
  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedMessageId),
    [messages, selectedMessageId]
  )
  const selectedPhase = useChatStore(selectMessagePhase(selectedMessageId || '__none__'))

  const [streamTargetId, setStreamTargetId] = useState<string>('')
  const [streamTargetPhase, setStreamTargetPhase] = useState<StreamingPhase>(null)
  const [stopReason, setStopReason] = useState<AbortReason | null>(null)
  const [syncDisplayState, setSyncDisplayState] = useState(true)

  const [thinkingDraft, setThinkingDraft] = useState('')
  const [contentDraft, setContentDraft] = useState('')
  const [appendThinkingText, setAppendThinkingText] = useState('thinking chunk...')
  const [appendAnswerText, setAppendAnswerText] = useState('answer chunk...')

  // ===== Tool call simulation =====
  const [toolCallId, setToolCallId] = useState(() => nanoid())
  const [toolName, setToolName] = useState<'web_search' | 'generate_image'>('web_search')
  const [toolQuery, setToolQuery] = useState('debug query')
  const [toolPrompt, setToolPrompt] = useState('debug prompt')
  const [toolProgress, setToolProgress] = useState('30')
  const [toolEstimatedTime, setToolEstimatedTime] = useState('3')
  const [toolResultCount, setToolResultCount] = useState('3')
  const [toolResultPreferView, setToolResultPreferView] = useState(true)

  useEffect(() => {
    const forcedOpen = searchParams.get('debugChatStore') === '1'
    const fromLs = (() => {
      try {
        return localStorage.getItem(LS_OPEN_KEY) === '1'
      } catch {
        return false
      }
    })()
    setOpen(forcedOpen || fromLs)
  }, [searchParams])

  useEffect(() => {
    try {
      localStorage.setItem(LS_OPEN_KEY, open ? '1' : '0')
    } catch {}
  }, [open])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return
      if (e.key.toLowerCase() !== 'd') return
      e.preventDefault()
      setOpen((v) => !v)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (messages.length === 0) {
      setSelectedMessageId('')
      setStreamTargetId('')
      return
    }

    const ids = new Set(messages.map((m) => m.id))
    const nextSelected =
      (selectedMessageId && ids.has(selectedMessageId) && selectedMessageId) ||
      (streamingMessageId && ids.has(streamingMessageId) && streamingMessageId) ||
      messages[messages.length - 1]!.id
    setSelectedMessageId(nextSelected)

    const nextStreamTarget =
      (streamTargetId && ids.has(streamTargetId) && streamTargetId) ||
      (streamingMessageId && ids.has(streamingMessageId) && streamingMessageId) ||
      messages[messages.length - 1]!.id
    setStreamTargetId(nextStreamTarget)
  }, [messages, selectedMessageId, streamTargetId, streamingMessageId])

  useEffect(() => {
    setStreamTargetPhase(streamingPhase)
  }, [streamingPhase])

  useEffect(() => {
    setThinkingDraft(selectedMessage?.thinking ?? '')
    setContentDraft(selectedMessage?.content ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMessageId])

  const updateSelectedMessage = (updates: Partial<Message>) => {
    if (!selectedMessageId) return
    useChatStore.getState().updateMessage(selectedMessageId, updates)
  }

  const ensureRuntimeState = (messageId: string) => {
    const store = useChatStore.getState()
    if (!store.messageStates.has(messageId)) {
      store.initMessageState(messageId)
    }
  }

  const upsertToolInvocation = (invocation: ToolInvocation & { progress?: number; estimatedTime?: number }) => {
    if (!selectedMessageId) return
    const store = useChatStore.getState()
    const msg = store.messages.find((m) => m.id === selectedMessageId)
    if (!msg) return

    const existing = msg.toolInvocations ?? []
    const next = existing.some((t) => t.toolCallId === invocation.toolCallId)
      ? existing.map((t) => (t.toolCallId === invocation.toolCallId ? invocation : t))
      : [...existing, invocation]
    store.updateMessage(selectedMessageId, { toolInvocations: next })
  }

  const patchToolInvocation = (toolCallIdToPatch: string, patch: Partial<ToolInvocation> & { progress?: number; estimatedTime?: number }) => {
    if (!selectedMessageId) return
    const store = useChatStore.getState()
    const msg = store.messages.find((m) => m.id === selectedMessageId)
    if (!msg) return

    const existing = msg.toolInvocations ?? []
    const next = existing.map((t) => (t.toolCallId === toolCallIdToPatch ? ({ ...t, ...patch } as any) : t))
    store.updateMessage(selectedMessageId, { toolInvocations: next })
  }

  const clearToolInvocations = () => {
    if (!selectedMessageId) return
    updateSelectedMessage({ toolInvocations: [] })
  }

  const removeToolInvocation = (toolCallIdToRemove: string) => {
    if (!selectedMessageId) return
    const store = useChatStore.getState()
    const msg = store.messages.find((m) => m.id === selectedMessageId)
    if (!msg?.toolInvocations?.length) return
    store.updateMessage(selectedMessageId, {
      toolInvocations: msg.toolInvocations.filter((t) => t.toolCallId !== toolCallIdToRemove),
    })
  }

  const upsertToolResult = (result: ToolResult) => {
    if (!selectedMessageId) return
    const store = useChatStore.getState()
    const msg = store.messages.find((m) => m.id === selectedMessageId)
    if (!msg) return

    const existing = msg.toolResults ?? []
    const next = existing.some((t) => t.toolCallId === result.toolCallId)
      ? existing.map((t) => (t.toolCallId === result.toolCallId ? result : t))
      : [...existing, result]
    store.updateMessage(selectedMessageId, { toolResults: next })
  }

  const removeToolResult = (toolCallIdToRemove: string) => {
    if (!selectedMessageId) return
    const store = useChatStore.getState()
    const msg = store.messages.find((m) => m.id === selectedMessageId)
    if (!msg?.toolResults?.length) return
    store.updateMessage(selectedMessageId, {
      toolResults: msg.toolResults.filter((t) => t.toolCallId !== toolCallIdToRemove),
    })
  }

  const clearToolResults = () => {
    if (!selectedMessageId) return
    updateSelectedMessage({ toolResults: [] })
  }

  if (!open) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button variant="secondary" className="shadow-lg" onClick={() => setOpen(true)} title="Ctrl+Shift+D">
          <Bug className="h-4 w-4 mr-2" />
          Store Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[420px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-xl border bg-background shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <div className="font-medium text-sm">Chat Store 调试板</div>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              conversation: <span className="font-mono">{conversationId}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[78vh] overflow-auto p-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <Label className="text-sm">isLoadingMessages</Label>
              <Switch
                checked={isLoadingMessages}
                onCheckedChange={(v) => useChatStore.getState().setLoadingMessages(v, conversationId)}
              />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <Label className="text-sm">isSendingMessage</Label>
              <Switch checked={isSendingMessage} onCheckedChange={(v) => useChatStore.getState().setSendingMessage(v)} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <Label className="text-sm">enableThinking</Label>
              <Switch checked={enableThinking} onCheckedChange={(v) => useChatStore.getState().toggleThinking(v)} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <Label className="text-sm">enableWebSearch</Label>
              <Switch checked={enableWebSearch} onCheckedChange={(v) => useChatStore.getState().toggleWebSearch(v)} />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Streaming</div>
              <div className="text-xs text-muted-foreground">
                current: <span className="font-mono">{streamingMessageId ?? 'null'}</span> /{' '}
                <span className="font-mono">{String(streamingPhase)}</span>
              </div>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">streamingMessageId</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                value={streamTargetId}
                onChange={(e) => setStreamTargetId(e.target.value)}
              >
                <option value="" disabled>
                  (选择一条消息)
                </option>
                {messages.map((m) => (
                  <option key={m.id} value={m.id}>
                    {toMessageLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">streamingPhase</Label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  value={String(streamTargetPhase)}
                  onChange={(e) =>
                    setStreamTargetPhase((e.target.value === 'null' ? null : e.target.value) as StreamingPhase)
                  }
                >
                  {STREAMING_PHASES.map((p) => (
                    <option key={String(p)} value={String(p)}>
                      {String(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">stopReason</Label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  value={String(stopReason)}
                  onChange={(e) =>
                    setStopReason((e.target.value === 'null' ? null : (e.target.value as AbortReason)) as AbortReason | null)
                  }
                >
                  {ABORT_REASONS.map((r) => (
                    <option key={String(r)} value={String(r)}>
                      {String(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <Label className="text-sm">同步 message.displayState</Label>
              <Switch checked={syncDisplayState} onCheckedChange={(v) => setSyncDisplayState(v)} />
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  if (!streamTargetId) return
                  const store = useChatStore.getState()
                  store.startStreaming(streamTargetId, streamTargetPhase)
                  if (syncDisplayState) store.updateMessage(streamTargetId, { displayState: 'streaming' })
                }}
              >
                Start
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  const store = useChatStore.getState()
                  const currentId = store.streamingMessageId
                  store.stopStreaming(stopReason ?? undefined)
                  if (syncDisplayState && currentId) store.updateMessage(currentId, { displayState: 'idle' })
                }}
              >
                Stop
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              abortReason: <span className="font-mono">{String(abortReason)}</span>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Message</div>
              <div className="text-xs text-muted-foreground">
                count: <span className="font-mono">{messages.length}</span>
              </div>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">选择 message</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                value={selectedMessageId}
                onChange={(e) => setSelectedMessageId(e.target.value)}
              >
                <option value="" disabled>
                  (暂无消息)
                </option>
                {messages.map((m) => (
                  <option key={m.id} value={m.id}>
                    {toMessageLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  const store = useChatStore.getState()
                  const id = nanoid()
                  store.addMessage({ id, role: 'user', content: '（调试）用户消息', timestamp: Date.now(), displayState: 'idle' })
                  setSelectedMessageId(id)
                }}
              >
                + user
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const store = useChatStore.getState()
                  const id = nanoid()
                  store.addMessage({ id, role: 'assistant', content: '', timestamp: Date.now(), displayState: 'waiting' })
                  store.initMessageState(id)
                  setSelectedMessageId(id)
                }}
              >
                + assistant
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (messages.length === 0) return
                  useChatStore.getState().removeMessagesFrom(messages.length - 1)
                }}
              >
                - last
              </Button>
            </div>

            {selectedMessage ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    role: <span className="font-mono text-foreground">{selectedMessage.role}</span>
                  </div>
                  <div>
                    phase: <span className="font-mono text-foreground">{selectedPhase}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">displayState</Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                      value={selectedMessage.displayState ?? 'idle'}
                      onChange={(e) => updateSelectedMessage({ displayState: e.target.value as MessageDisplayState })}
                    >
                      {DISPLAY_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
                    <Label className="text-sm">hasError</Label>
                    <Switch
                      checked={Boolean(selectedMessage.hasError)}
                      onCheckedChange={(v) => updateSelectedMessage({ hasError: v })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">messageStates.phase（影响 isProcessing / isStreamingAnswer）</Label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-9 rounded-md border bg-background px-2 text-sm"
                      value={selectedPhase}
                      onChange={(e) => {
                        const phase = e.target.value as MessagePhase
                        useChatStore.setState((s) => {
                          const next = new Map(s.messageStates)
                          const current = next.get(selectedMessageId) ?? createInitialState()
                          next.set(selectedMessageId, { ...current, phase })
                          return { messageStates: next }
                        })
                      }}
                    >
                      {MESSAGE_PHASES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={() => useChatStore.getState().initMessageState(selectedMessageId)}>
                      init
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">Tool Call（模拟 tool_call / progress / result）</div>
                    <Button variant="secondary" size="sm" onClick={() => setToolCallId(nanoid())}>
                      new id
                    </Button>
                  </div>
                  <Separator />

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">tool name</Label>
                      <select
                        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                        value={toolName}
                        onChange={(e) => setToolName(e.target.value as typeof toolName)}
                      >
                        <option value="web_search">web_search</option>
                        <option value="generate_image">generate_image</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">toolCallId</Label>
                      <Input value={toolCallId} onChange={(e) => setToolCallId(e.target.value)} />
                    </div>
                  </div>

                  {toolName === 'web_search' ? (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">query</Label>
                      <Input value={toolQuery} onChange={(e) => setToolQuery(e.target.value)} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">prompt</Label>
                      <Input value={toolPrompt} onChange={(e) => setToolPrompt(e.target.value)} />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">progress</Label>
                      <Input value={toolProgress} onChange={(e) => setToolProgress(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">eta(s)</Label>
                      <Input value={toolEstimatedTime} onChange={(e) => setToolEstimatedTime(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">resultCount</Label>
                      <Input value={toolResultCount} onChange={(e) => setToolResultCount(e.target.value)} />
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    说明：UI 渲染主要看 <span className="font-mono">message.toolInvocations</span> + <span className="font-mono">messageStates.phase</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
                    <Label className="text-sm">ToolResult 优先展示</Label>
                    <Switch checked={toolResultPreferView} onCheckedChange={(v) => setToolResultPreferView(v)} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={selectedMessage.role !== 'assistant'}
                      onClick={() => {
                        ensureRuntimeState(selectedMessageId)
                        const store = useChatStore.getState()
                        const args = toolName === 'web_search' ? { query: toolQuery } : { prompt: toolPrompt }

                        store.transitionPhase(selectedMessageId, {
                          type: 'START_TOOL_CALL',
                          toolCallId,
                          name: toolName,
                          args,
                        })

                        upsertToolInvocation({
                          toolCallId,
                          name: toolName,
                          state: 'running',
                          args,
                          progress: toolName === 'generate_image' ? 0 : undefined,
                          estimatedTime: toolName === 'generate_image' ? Number(toolEstimatedTime) || undefined : undefined,
                        })

                        if (syncDisplayState) {
                          store.updateMessage(selectedMessageId, { displayState: 'streaming' })
                        }
                      }}
                    >
                      tool_call
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={selectedMessage.role !== 'assistant'}
                      onClick={() => {
                        ensureRuntimeState(selectedMessageId)
                        const store = useChatStore.getState()
                        const p = Math.max(0, Math.min(100, Number(toolProgress)))
                        const eta = Number(toolEstimatedTime)

                        store.transitionPhase(selectedMessageId, {
                          type: 'TOOL_PROGRESS',
                          toolCallId,
                          progress: Number.isFinite(p) ? p : 0,
                          estimatedTime: Number.isFinite(eta) ? eta : undefined,
                        })

                        store.updateToolProgress(
                          selectedMessageId,
                          toolCallId,
                          Number.isFinite(p) ? p : 0,
                          Number.isFinite(eta) ? eta : undefined
                        )

                        patchToolInvocation(toolCallId, {
                          state: 'running',
                          progress: Number.isFinite(p) ? p : undefined,
                          estimatedTime: Number.isFinite(eta) ? eta : undefined,
                        })
                      }}
                    >
                      progress
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={selectedMessage.role !== 'assistant'}
                      onClick={() => {
                        ensureRuntimeState(selectedMessageId)
                        const store = useChatStore.getState()
                        store.transitionPhase(selectedMessageId, { type: 'TOOL_CANCEL', toolCallId })
                        store.cancelTool(selectedMessageId, toolCallId)
                        patchToolInvocation(toolCallId, { state: 'cancelled', result: { success: false, cancelled: true } })
                      }}
                    >
                      cancel
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={selectedMessage.role !== 'assistant'}
                      onClick={() => {
                        ensureRuntimeState(selectedMessageId)
                        const store = useChatStore.getState()
                        const args = toolName === 'web_search' ? { query: toolQuery } : { prompt: toolPrompt }

                        store.transitionPhase(selectedMessageId, { type: 'TOOL_COMPLETE', toolCallId, success: true, result: {} })

                        const sources: SearchSource[] = [
                          { title: 'Example', url: 'https://example.com', snippet: 'debug source' },
                          { title: 'IANA', url: 'https://www.iana.org/domains/reserved', snippet: 'reserved domains' },
                        ]

                        patchToolInvocation(toolCallId, {
                          name: toolName,
                          args,
                          state: 'completed',
                          result:
                            toolName === 'web_search'
                              ? { success: true, resultCount: Number(toolResultCount) || sources.length, sources }
                              : { success: true, imageUrl: '/generated/debug.png' },
                        })
                      }}
                    >
                      result ✓
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={selectedMessage.role !== 'assistant'}
                      onClick={() => {
                        ensureRuntimeState(selectedMessageId)
                        const store = useChatStore.getState()
                        const args = toolName === 'web_search' ? { query: toolQuery } : { prompt: toolPrompt }
                        store.transitionPhase(selectedMessageId, { type: 'TOOL_COMPLETE', toolCallId, success: false, result: {} })
                        patchToolInvocation(toolCallId, {
                          name: toolName,
                          args,
                          state: 'failed',
                          result: { success: false },
                        })
                      }}
                    >
                      result ✗
                    </Button>

                    <Button variant="destructive" onClick={clearToolInvocations}>
                      clear tools
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={selectedMessage.role !== 'assistant'}
                      onClick={() => {
                        const store = useChatStore.getState()
                        const args = toolName === 'web_search' ? { query: toolQuery } : { prompt: toolPrompt }

                        const sourcesPool: SearchSource[] = [
                          { title: 'Example', url: 'https://example.com', snippet: 'debug source' },
                          { title: 'MDN', url: 'https://developer.mozilla.org', snippet: 'docs' },
                          { title: 'IANA', url: 'https://www.iana.org/domains/reserved', snippet: 'reserved domains' },
                          { title: 'WHATWG', url: 'https://whatwg.org', snippet: 'specs' },
                        ]

                        const desired = Math.max(0, Math.min(20, Number(toolResultCount) || 3))
                        const sources: SearchSource[] = Array.from({ length: desired }, (_, i) => sourcesPool[i % sourcesPool.length]!)

                        upsertToolResult({
                          toolCallId,
                          name: toolName,
                          result:
                            toolName === 'web_search'
                              ? { success: true, resultCount: desired, sources }
                              : { success: true, imageUrl: '/generated/debug.png', prompt: toolPrompt },
                        })

                        if (toolResultPreferView) {
                          store.updateMessage(selectedMessageId, { toolInvocations: [] })
                        }
                      }}
                    >
                      toolResult ✓
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={selectedMessage.role !== 'assistant'}
                      onClick={() => {
                        const store = useChatStore.getState()
                        const args = toolName === 'web_search' ? { query: toolQuery } : { prompt: toolPrompt }

                        upsertToolResult({
                          toolCallId,
                          name: toolName,
                          result:
                            toolName === 'web_search'
                              ? { success: false, resultCount: 0, sources: [] }
                              : { success: false, prompt: toolPrompt },
                        })

                        if (toolResultPreferView) {
                          store.updateMessage(selectedMessageId, { toolInvocations: [] })
                        }
                      }}
                    >
                      toolResult ✗
                    </Button>

                    <Button variant="destructive" onClick={clearToolResults}>
                      clear results
                    </Button>
                  </div>

                  {selectedMessage.toolInvocations?.length ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">当前 toolInvocations</div>
                      {selectedMessage.toolInvocations.map((t) => (
                        <div key={t.toolCallId} className="flex items-center gap-2 rounded-md border p-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono truncate">{t.toolCallId}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.name} / {t.state}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeToolInvocation(t.toolCallId)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">（暂无 toolInvocations）</div>
                  )}

                  {selectedMessage.toolResults?.length ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">当前 toolResults</div>
                      {selectedMessage.toolResults.map((t) => (
                        <div key={t.toolCallId} className="flex items-center gap-2 rounded-md border p-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono truncate">{t.toolCallId}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.name} / {t.result.success ? 'success' : 'fail'}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeToolResult(t.toolCallId)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">（暂无 toolResults）</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">thinking</Label>
                  <textarea
                    className="w-full min-h-[72px] rounded-md border bg-background p-2 text-sm"
                    value={thinkingDraft}
                    onChange={(e) => setThinkingDraft(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => updateSelectedMessage({ thinking: thinkingDraft })}>
                      Set thinking
                    </Button>
                    <Button variant="secondary" onClick={() => updateSelectedMessage({ thinking: '' })}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">content</Label>
                  <textarea
                    className="w-full min-h-[92px] rounded-md border bg-background p-2 text-sm"
                    value={contentDraft}
                    onChange={(e) => setContentDraft(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => updateSelectedMessage({ content: contentDraft })}>
                      Set content
                    </Button>
                    <Button variant="secondary" onClick={() => updateSelectedMessage({ content: '' })}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Append（模拟流式）</Label>
                  <div className="flex gap-2">
                    <Input value={appendThinkingText} onChange={(e) => setAppendThinkingText(e.target.value)} />
                    <Button variant="secondary" onClick={() => useChatStore.getState().appendThinking(selectedMessageId, appendThinkingText)}>
                      +thinking
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input value={appendAnswerText} onChange={(e) => setAppendAnswerText(e.target.value)} />
                    <Button variant="secondary" onClick={() => useChatStore.getState().appendContent(selectedMessageId, appendAnswerText)}>
                      +answer
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">暂无选中 message</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
