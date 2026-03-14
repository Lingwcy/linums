/**
 * Prisma Client 单例
 *
 * 数据库客户端实例管理
 *
 * 设计考虑：
 * - 开发环境热重载时，避免创建多个 Prisma Client 实例
 * - 生产环境每次导入都使用同一实例
 *
 * 使用方式：
 * ```typescript
 * import { prisma } from '@/server/db/client'
 *
 * // 查询用户
 * const user = await prisma.user.findUnique({ where: { id: 'xxx' } })
 * ```
 */

import { PrismaClient } from '@prisma/client'

// 全局声明，用于开发环境保持单例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma Client 实例
 *
 * 如果全局已存在则复用，否则创建新实例
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// 开发环境：将实例挂载到全局，避免热重载时重建
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

