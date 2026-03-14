/**
 * 用户 API Key 管理
 * GET /api/user/api-key - 获取用户已配置的 API Key 信息
 * PATCH /api/user/api-key - 更新用户的 API Key
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { prisma } from '@/server/db/client'
import { z } from 'zod'
import type { ProviderId } from '@/server/services/ai/gateway'

// 支持的供应商列表
const SUPPORTED_PROVIDERS: ProviderId[] = ['bigmodel', 'siliconflow', 'openrouter', 'minimax', 'openai']

const updateApiKeySchema = z.object({
  providerId: z.enum(SUPPORTED_PROVIDERS),
  apiKey: z.string().min(1, 'API Key is required'),
})

// GET - 获取用户已配置的 API Key 信息
export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const providerApiKeys = await prisma.userProviderApiKey.findMany({
      where: { userId },
      select: {
        providerId: true,
        createdAt: true,
        updatedAt: true,
        // 不返回实际的 apiKey，只返回配置状态
      },
    })

    // 构建已配置的供应商列表
    const configuredProviders = providerApiKeys.map(k => k.providerId)

    // 返回每个供应商的配置状态
    const providers = SUPPORTED_PROVIDERS.map(providerId => ({
      providerId,
      configured: configuredProviders.includes(providerId),
    }))

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Get API Key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - 更新用户的 API Key
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { providerId, apiKey } = updateApiKeySchema.parse(body)

    // 使用 upsert 来更新或创建
    await prisma.userProviderApiKey.upsert({
      where: {
        userId_providerId: {
          userId,
          providerId,
        },
      },
      update: { apiKey },
      create: {
        userId,
        providerId,
        apiKey,
      },
    })

    return NextResponse.json({ success: true, providerId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Update API Key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - 删除用户的 API Key
export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const providerId = searchParams.get('providerId')

    if (!providerId || !SUPPORTED_PROVIDERS.includes(providerId as ProviderId)) {
      return NextResponse.json(
        { error: 'Invalid providerId' },
        { status: 400 }
      )
    }

    await prisma.userProviderApiKey.delete({
      where: {
        userId_providerId: {
          userId,
          providerId: providerId as ProviderId,
        },
      },
    })

    return NextResponse.json({ success: true, providerId })
  } catch (error) {
    console.error('Delete API Key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
