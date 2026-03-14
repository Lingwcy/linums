/**
 * Chat API Route
 *
 * 路由层：只负责请求校验和响应格式
 * 业务逻辑委托给 ChatService
 */

import { getCurrentUserId } from '@/server/auth/utils'
import { UserRepository } from '@/server/repositories/user.repository'
import { handleChatRequest, NotFoundError } from '@/server/services/chat'
import type { ProviderId } from '@/server/services/ai/gateway'

// 供应商对应的环境变量 key
const PROVIDER_ENV_KEYS: Record<ProviderId, string | undefined> = {
  openrouter: process.env.OPENROUTER_API_KEY,
  bigmodel: process.env.BIGMODEL_API_KEY || process.env.ZHIPU_API_KEY,
  siliconflow: process.env.SILICONFLOW_API_KEY,
  minimax: process.env.MINIMAX_API_KEY,
  openai: process.env.OPENAI_API_KEY,
}

export async function POST(req: Request) {
  // 1. 认证校验
  let userId: string
  try {
    userId = await getCurrentUserId()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. 解析请求体
  const body = await req.json()
  if (!body.content?.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  const providerId = (body.providerId as ProviderId | undefined) ?? 'siliconflow'

  // 3. 获取用户的 API Key（优先从数据库获取用户配置的 key）
  const userApiKey = await UserRepository.getProviderApiKey(userId, providerId)

  // 4. 根据 provider 选择 key
  // 优先使用用户配置的 API Key，如果没有配置则尝试使用环境变量（向后兼容）
  const apiKey = userApiKey || PROVIDER_ENV_KEYS[providerId]

  if (!apiKey) {
    return Response.json(
      {
        error: `您尚未配置 ${providerId} 供应商的 API Key，请先在设置中配置后再使用。`,
        code: 'API_KEY_NOT_CONFIGURED',
        providerId,
      },
      { status: 400 }
    )
  }

  // 5. 调用 ChatService 处理
  try {
    const { stream, sessionId, conversationId, conversationTitle } = await handleChatRequest(
      userId,
      apiKey,
      body
    )

    // 5. 返回 SSE 流响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Session-ID': sessionId,
        'X-Conversation-ID': conversationId,
        'X-Conversation-Title': encodeURIComponent(conversationTitle),
      },
    })
  } catch (error) {
    // 错误处理
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 })
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Chat API error:', errorMessage)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
