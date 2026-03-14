'use client'

/**
 * Chat Message Module - 消息模块
 *
 * Container Component（容器组件）
 * 连接 Store，使用消息状态机
 *
 * 职责：
 * - 从 Store 获取消息数据
 * - 判断消息状态（最后一条？等待响应？）
 * - 处理用户操作（重试、编辑、取消工具）
 * - 将数据和回调传递给 UI 组件
 *
 * @module modules/chat-message
 */

import { useParams } from 'next/navigation'
import { useChatStore } from '@/features/chat/store/chat.store'
import { selectMessagePhase, selectIsProcessing } from '@/features/chat/store/selectors'
import { ChatService } from '@/features/chat/services/chat.service'
import { ChatMessageUI } from './ChatMessageUI'

/**
 * 消息组件属性
 */
interface ChatMessageProps {
  /** 消息 ID */
  messageId: string
}

/**
 * ChatMessage 容器组件
 *
 * 作为连接层：
 * - 上层：ChatStore（全局状态）
 * - 下层：ChatMessageUI（展示组件）
 *
 * 从 Store 获取消息数据，并根据状态分发不同的操作
 */
export function ChatMessage({ messageId }: ChatMessageProps) {
  const params = useParams()
  const conversationId = params.conversationId as string

  // ========== Store 数据获取 ==========

  // 从消息列表中查找当前消息
  const message = useChatStore((s) => s.messages.find((m) => m.id === messageId))
  const messages = useChatStore((s) => s.messages)
  // 是否正在发送消息（任意消息）
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)

  // ========== 状态机数据 ==========

  // 消息阶段（waiting / thinking / answering / error）
  const phase = useChatStore(selectMessagePhase(messageId))
  // 是否正在处理（流式输出中）
  const isProcessing = useChatStore(selectIsProcessing(messageId))

  // 消息不存在则不渲染
  if (!message) return null

  // ========== 位置判断 ==========

  // 是否为最后一条消息（用于判断是否显示"等待响应"状态）
  const isLastMessage = messages[messages.length - 1]?.id === messageId
  // 是否为 AI 消息
  const isAIMessage = message.role === 'assistant'
  // 是否正在等待 AI 响应（最后一条 + AI消息 + 正在发送）
  const isWaitingForResponse = isSendingMessage && isLastMessage && isAIMessage

  // ========== 操作回调 ==========

  // 重试：AI 消息可重试
  const handleRetry = isAIMessage
    ? () => ChatService.retryMessage(conversationId, messageId)
    : undefined

  // 编辑：用户消息可编辑
  const handleEdit = message.role === 'user'
    ? (newContent: string) => ChatService.editAndResend(conversationId, messageId, newContent)
    : undefined

  // 取消工具：AI 消息可取消工具执行
  const handleCancelTool = isAIMessage
    ? (toolCallId: string) => ChatService.requestCancelTool(messageId, toolCallId)
    : undefined

  // ========== 渲染 UI 组件 ==========

  return (
    <ChatMessageUI
      message={message}
      messageId={messageId}
      phase={phase}
      isProcessing={isProcessing}
      isWaitingForResponse={isWaitingForResponse}
      onRetry={handleRetry}
      onEdit={handleEdit}
      onCancelTool={handleCancelTool}
    />
  )
}

