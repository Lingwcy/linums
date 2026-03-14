'use client'

/**
 * Message List Module - 虚拟滚动消息列表
 *
 * 整合 TanStack Virtual + 消息渲染 + 无限滚动
 * 简单直接，无过度封装
 *
 * 核心功能：
 * - 虚拟滚动：只渲染可见区域的 DOM 节点，大幅提升性能
 * - 自动滚动：新消息自动滚动到底部
 * - 用户脱敏：用户主动上滑时暂停自动滚动
 * - 流式响应：AI 流式输出时跟随滚动
 * - 虚拟列表：支持大量历史消息
 *
 * @module modules/message-list
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useChatStore } from '@/features/chat/store/chat.store'
import { ChatMessage } from '@/features/chat/components/ChatMessage'
import { ChatService } from '@/features/chat/services/chat.service'

/**
 * 消息列表组件
 *
 * 使用虚拟滚动技术高效渲染大量消息
 *
 * CSS 样式说明：
 * - overflow-y-auto: 允许垂直滚动
 * - custom-scrollbar-auto: 自定义滚动条（仅悬停时显示）
 * - overflowAnchor: CSS 属性，控制滚动锚点行为
 */
export function MessageList() {
  const params = useParams()
  const searchParams = useSearchParams()
  const conversationId = params.conversationId as string

  // 从 Store 获取数据
  const messages = useChatStore((s) => s.messages)
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)

  /**
   * 获取流式消息的内容长度，用于触发滚动
   * 当 AI 正在流式输出时，内容长度会不断变化
   */
  const streamingContentLength = useChatStore((s) => {
    if (!s.streamingMessageId) return 0
    const msg = s.messages.find(m => m.id === s.streamingMessageId)
    if (!msg) return 0
    // 包含思考内容 + 回答内容
    return (msg.content?.length || 0) + (msg.thinking?.length || 0)
  })

  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 用户是否主动上滑（脱敏模式）
  // 当用户主动向上滚动超过 100px 时，视为用户想查看历史消息
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const previousMessagesLength = useRef(0)
  const previousConversationId = useRef<string | null>(null)

  // 检查消息数组是否有重复 ID（调试用）
  useEffect(() => {
    const ids = messages.map(m => m.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      console.warn('[MessageList] Duplicate message IDs detected!', ids)
    }
  }, [messages])

  /**
   * TanStack Virtual 配置
   *
   * estimateSize: 估算每条消息的高度
   * - 有思考内容: 250px（有额外的思考区域）
   * - 有代码块: 300px（代码块通常较高）
   * - 用户消息: 80px（通常较短）
   * - 其他: 150px（默认估算）
   *
   * overscan: 3
   * - 在可见区域外额外渲染 3 条消息
   * - 避免快速滚动时出现空白
   */
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      const msg = messages[index]
      if (!msg) return 100
      if (msg.thinking) return 250
      if (msg.content.includes('```')) return 300
      if (msg.role === 'user') return 80
      return 150
    },
    overscan: 3,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // ========== 滚动到底部 ==========
  /**
   * 滚动到容器底部
   *
   * 使用 requestAnimationFrame 确保 DOM 完全渲染后再滚动
   * 双重滚动确保处理异步内容加载的情况
   */
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.scrollTop = container.scrollHeight

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }, [])

  // ========== 监听用户滚动 ==========
  /**
   * 监听用户滚动行为
   *
   * 当用户滚动到距离底部超过 100px 时，进入"脱敏模式"
   * 脱敏模式下，新消息不会自动滚动到底部
   * 这让用户可以安心查看历史消息而不被新消息顶走
   */
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setUserScrolledUp(distanceFromBottom > 100)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // 是否需要在加载完成后滚动
  const shouldScrollAfterLoad = useRef(false)
  // pending message 是否已发送
  const pendingMessageSentRef = useRef(false)

  // ========== 切换会话时重置状态 ==========
  /**
   * 切换会话时重置滚动状态
   *
   * 每个会话都是全新的聊天，应该：
   * - 重置用户滚动状态
   * - 设置加载后滚动标志
   * - 重置消息历史
   */
  useEffect(() => {
    if (!conversationId) return

    if (previousConversationId.current !== conversationId) {
      previousConversationId.current = conversationId
      previousMessagesLength.current = 0
      setUserScrolledUp(false)
      shouldScrollAfterLoad.current = true
      pendingMessageSentRef.current = false
    }
  }, [conversationId])

  // ========== 处理 URL 中的 pending message ==========
  /**
   * 处理从 URL 传入的待发送消息
   *
   * 场景：用户从分享链接进入时，URL 中可能包含 msg 参数
   * 需要自动发送这条消息
   */
  useEffect(() => {
    console.log('[MessageList] pending check:', {
      isLoadingMessages,
      conversationId,
      pendingMessageSent: pendingMessageSentRef.current,
      msg: searchParams.get('msg')
    })

    // 等待加载完成
    if (isLoadingMessages) return
    if (pendingMessageSentRef.current) return
    if (!conversationId) return

    const pendingMessage = searchParams.get('msg')
    if (!pendingMessage) return

    console.log('[MessageList] Sending pending message:', pendingMessage)
    pendingMessageSentRef.current = true

    // 清理 URL 参数
    const url = new URL(window.location.href)
    url.searchParams.delete('msg')
    window.history.replaceState({}, '', url.pathname)

    // 发送消息
    ChatService.sendMessage(conversationId, pendingMessage, { createUserMessage: true })
  }, [isLoadingMessages, conversationId, searchParams])

  // ========== 消息加载完成后滚动到底部 ==========
  /**
   * 首次加载消息后滚动到底部
   *
   * 延迟 50ms 等待虚拟列表渲染完成
   */
  useEffect(() => {
    if (shouldScrollAfterLoad.current && !isLoadingMessages && messages.length > 0) {
      shouldScrollAfterLoad.current = false
      // 延迟一下等虚拟列表渲染完
      setTimeout(() => {
        scrollToBottom()
      }, 50)
    }
  }, [isLoadingMessages, messages.length, scrollToBottom])

  // ========== 新消息时滚动 ==========
  /**
   * 新消息时自动滚动
   *
   * 触发条件：
   * - 正在发送消息（isSendingMessage）
   * - 用户没有主动上滑（!userScrolledUp）
   *
   * 如果用户在脱敏模式，消息不会自动滚动
   */
  useEffect(() => {
    if (messages.length === 0) return

    const isNewMessage = messages.length > previousMessagesLength.current
    previousMessagesLength.current = messages.length

    if (!isNewMessage) return

    if (isSendingMessage || !userScrolledUp) {
      if (isSendingMessage) {
        // 发送新消息时，重置脱敏状态
        setUserScrolledUp(false)
      }
      scrollToBottom()
    }
  }, [messages.length, isSendingMessage, userScrolledUp, scrollToBottom])

  // ========== 流式更新时滚动 ==========
  /**
   * AI 流式输出时跟随滚动
   *
   * 当 AI 正在逐字输出回答时，实时滚动到底部
   * 但如果用户在脱敏模式，则不自动滚动
   */
  useEffect(() => {
    if (!streamingMessageId || userScrolledUp) return
    scrollToBottom()
  }, [streamingContentLength, streamingMessageId, userScrolledUp, scrollToBottom])

  // 空状态
  if (messages.length === 0 && !isSendingMessage && !isLoadingMessages) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-[32px] font-normal text-[hsl(var(--text-primary))] mb-8">
            我能帮你什么？
          </h1>
        </div>
      </div>
    )
  }

  /**
   * 渲染说明：
   *
   * 外层容器样式：
   * - flex-1: 占满剩余空间
   * - overflow-y-auto: 允许垂直滚动
   * - custom-scrollbar-auto: 自定义滚动条样式
   *   - 默认隐藏滚动条（background: transparent）
   *   - 悬停时显示滚动条（background: hsl(var(--border))）
   *   - 这是为了保持界面简洁，只有在需要滚动时才显示滚动条
   * - overflowAnchor: 'auto'
   *   - CSS Scroll Anchoring 属性
   *   - 'auto' 启用滚动锚点：当内容动态增加时，保持用户当前的视口位置不变
   *   - 这避免了新内容插入时页面跳动的问题
   *   - 注意：这是 inline style，因为 Tailwind 默认不支持这个属性
   *
   * 内层容器：
   * - height: 虚拟列表总高度
   * - position: relative: 用于绝对定位子元素
   * - mx-auto max-w-3xl: 限制最大宽度，居中显示
   * - px-6 py-6: 内边距
   *
   * 消息项：
   * - position: absolute: 绝对定位
   * - transform: translateY: 根据虚拟列表计算的位置
   * - ref={virtualizer.measureElement}: 让虚拟列表可以测量实际高度
   */
  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto custom-scrollbar-auto"
      style={{ overflowAnchor: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
        className="mx-auto max-w-3xl px-6 py-6"
      >
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index]

          if (!message) {
            console.warn('[MessageList] Missing message at index:', virtualItem.index)
            return null
          }

          return (
            <div
              key={`${virtualItem.index}-${message.id}`}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ChatMessage messageId={message.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
