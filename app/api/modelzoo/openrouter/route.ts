/**
 * OpenRouter 模型列表代理
 * - 统一同源请求，避免潜在 CORS 问题
 * - 只返回前端渲染需要的字段，减少 payload
 */

import { NextResponse } from 'next/server'
import { parseOpenRouterModelsResponse } from '@/features/setting/modelzoo/openrouter'

export const revalidate = 3600 // 1 hour

export async function GET(request: Request) {
  try {
    const origin = request.headers.get('origin') ?? request.headers.get('referer') ?? 'http://localhost:3000'
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      // 在路由处理器中显式启用 revalidate
      next: { revalidate },
      headers: {
        accept: 'application/json',

        // OpenRouter 建议携带这些信息（不需要 key 也可请求 models）
        'HTTP-Referer': origin,
        'X-Title': 'linums',
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch OpenRouter models',
          status: res.status,
        },
        { status: 502 }
      )
    }

    const json = (await res.json()) as unknown
    const models = parseOpenRouterModelsResponse(json)

    return NextResponse.json(models)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
