/**
 * 审计日志中间件
 *
 * 提供审计日志记录的便捷函数
 * 用于追踪用户操作行为
 */

import { AuditLogRepository, type AuditAction } from '@/server/repositories/audit-log.repository'
import type { Prisma } from '@prisma/client'

/**
 * 审计日志参数
 */
interface AuditParams {
  /** 用户 ID */
  userId: string
  /** 操作类型 */
  action: AuditAction
  /** 资源 ID（如会话 ID） */
  resourceId?: string
  /** 额外元数据 */
  metadata?: Prisma.InputJsonValue
  /** HTTP 请求（用于提取 IP 和 User-Agent） */
  request?: Request
}

/**
 * 记录审计日志
 *
 * 自动从请求头中提取客户端 IP 和 User-Agent
 *
 * @param params - 审计参数
 */
export async function audit(params: AuditParams) {
  const { userId, action, resourceId, metadata, request } = params

  let ipAddress: string | undefined
  let userAgent: string | undefined

  // 从请求头提取客户端信息
  if (request) {
    // 优先从 X-Forwarded-For 获取真实 IP（反向代理环境）
    ipAddress = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                undefined
    userAgent = request.headers.get('user-agent') || undefined
  }

  // 写入审计日志
  await AuditLogRepository.create({
    userId,
    action,
    resourceId,
    metadata,
    ipAddress,
    userAgent,
  })
}

/**
 * 创建审计中间件工厂函数
 *
 * 创建一个预配置了特定操作类型的审计函数
 *
 * @param action - 审计操作类型
 * @returns 审计中间件函数
 *
 * @example
 * const auditView = createAuditMiddleware('conversation.view')
 * await auditView(userId, conversationId, request)
 */
export function createAuditMiddleware(action: AuditAction) {
  return async (userId: string, resourceId?: string, request?: Request) => {
    await audit({
      userId,
      action,
      resourceId,
      request,
    })
  }
}

