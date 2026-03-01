'use client'

/**
 * Chat Conversation Page - 会话详情页面
 * 
 * 动态路由页面，每个会话有独立的URL
 * URL 中的 conversationId 是单一数据源
 * 
 * @module app/chat/[conversationId]/page
 */

import { memo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChatService } from '@/features/chat/services/chat.service'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { MessageList } from '@/features/chat/components/MessageList'
import { ChatInput } from '@/features/chat/components/ChatInput'
import { ChatStoreDebugPanel } from '@/features/chat/components/ChatStoreDebugPanel'
import { ConversationList } from '@/features/conversation/components/ConversationList'
import { NewChatButton } from '@/features/conversation/components/NewChatButton'
import { ConversationSearch } from '@/features/conversation/components/ConversationSearch'
import { MainLayout } from '@/components/MainLayout'
import { AuthGuard } from '@/features/auth/components/AuthGuard'

const ChatSidebar = memo(() => (
  <Sidebar>
    <div className="space-y-2">
      <NewChatButton />
      <ConversationSearch />
      <ConversationList />
    </div>
  </Sidebar>
))

ChatSidebar.displayName = 'ChatSidebar'

/**
 * 会话内容组件
 * 
 * URL 中的 conversationId 是单一数据源
 * 组件负责调用 loadMessages 加载消息
 */
function ConversationContent() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string

  // 当 conversationId 变化时，加载消息
  useEffect(() => {
    if (!conversationId) {
      router.push('/')
      return
    }

    ChatService.loadMessages(conversationId)
  }, [conversationId, router])

  return (
    <>
      <MainLayout sidebar={<ChatSidebar />} header={<Header />}>
        <MessageList key={conversationId} />
        <ChatInput conversationId={conversationId} />
      </MainLayout>
      <ChatStoreDebugPanel conversationId={conversationId} />
    </>
  )
}

export default function ConversationPage() {
  return (
    <AuthGuard redirectTo="/">
      <ConversationContent />
    </AuthGuard>
  )
}

// {"type":"tool_call","toolCallId":"019bfe1ddd36c0c49253f4c41295d463","name":"generate_image","sessionId":"1769494935041","prompt":"Modern minimalist logo design, clean and professional, abstract geometric shape, symmetrical design, simple yet elegant, suitable for business or technology company, white background, vector style, flat design, high contrast, sharp edges"}

// {"type":"tool_progress","toolCallId":"019bfe1ddd36c0c49253f4c41295d463","progress":100,"sessionId":"1769494935041"}

// {"type":"tool_result","toolCallId":"019bfe1ddd36c0c49253f4c41295d463","name":"generate_image","success":true,"sessionId":"1769494935041","imageUrl":"/generated/1769494948633-3ff98562.png","width":1024,"height":1024}
