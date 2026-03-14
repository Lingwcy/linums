/**
 * 审计日志仓储
 *
 * 负责用户操作行为的记录和查询
 * 用于：
 * - 安全审计
 * - 用户行为分析
 * - 问题排查
 */

import { prisma } from '@/server/db/client'
import type { Prisma } from '@prisma/client'

/**
 * 审计操作类型
 * 记录用户对各种资源的操作
 */
export type AuditAction =
  | 'conversation.view'      // 查看会话
  | 'conversation.create'    // 创建会话
  | 'conversation.update'   // 更新会话
  | 'conversation.delete'   // 删除会话
  | 'conversation.share'   // 分享会话
  | 'conversation.unshare'  // 取消分享
  | 'message.view'         // 查看消息
  | 'message.create'       // 创建消息
  | 'message.delete'       // 删除消息
  | 'auth.login'           // 登录
  | 'auth.logout'          // 登出
  | 'auth.link_account'   // 关联第三方账号

/**
 * 创建审计日志参数
 */
interface CreateAuditLogParams {
  /** 用户 ID */
  userId: string
  /** 操作类型 */
  action: AuditAction
  /** 资源 ID（如会话 ID） */
  resourceId?: string
  /** 额外元数据（JSON） */
  metadata?: Prisma.InputJsonValue
  /** 客户端 IP 地址 */
  ipAddress?: string
  /** 客户端 User-Agent */
  userAgent?: string
}

/**
 * 审计日志仓储
 * 提供日志的创建、查询和清理功能
 */
export const AuditLogRepository = {
  /**
   * 创建审计日志
   * 失败时静默返回 null，避免影响主业务流程
   */
  async create(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: params,
      })
    } catch (error) {
      console.error('[AuditLog] Failed to create log:', error)
      return null
    }
  },

  /**
   * 查询用户的审计日志
   * @param userId - 用户 ID
   * @param limit - 返回条数限制，默认 100
   */
  async findByUserId(userId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  /**
   * 按操作类型查询审计日志
   * @param action - 操作类型
   * @param limit - 返回条数限制，默认 100
   */
  async findByAction(action: AuditAction, limit = 100) {
    return prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  /**
   * 查询特定资源的审计日志
   * @param resourceId - 资源 ID
   */
  async findByResourceId(resourceId: string) {
    return prisma.auditLog.findMany({
      where: { resourceId },
      orderBy: { createdAt: 'desc' },
    })
  },

  /**
   * 检测用户可疑行为
   * 分析最近一小时内用户操作，识别异常模式
   *
   * 检测的可疑模式：
   * - excessive_views: 一小时内查看会话超过 50 次
   * - excessive_deletes: 一小时内删除会话超过 10 次
   *
   * @param userId - 用户 ID
   */
  async findSuspiciousActivity(userId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const recentLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'desc' },
    })

    const suspiciousPatterns: Array<{
      type: string
      count: number
      message: string
    }> = []

    // 检测异常频繁的查看操作
    const viewActions = recentLogs.filter((log: { action: string }) => log.action === 'conversation.view')
    if (viewActions.length > 50) {
      suspiciousPatterns.push({
        type: 'excessive_views',
        count: viewActions.length,
        message: '一小时内查看会话次数过多 (50+)',
      })
    }

    // 检测异常频繁的删除操作
    const deleteActions = recentLogs.filter((log: { action: string }) => log.action === 'conversation.delete')
    if (deleteActions.length > 10) {
      suspiciousPatterns.push({
        type: 'excessive_deletes',
        count: deleteActions.length,
        message: '一小时内删除会话次数过多 (10+)',
      })
    }

    return suspiciousPatterns
  },

  /**
   * 清理过期审计日志
   * 默认保留 90 天
   *
   * @param daysToKeep - 保留天数，默认 90
   * @returns 删除的日志数量
   */
  async deleteOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return result.count
  },
}

