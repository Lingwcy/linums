/**
 * User Repository
 *
 * 用户数据访问层
 */

import { prisma } from '@/server/db/client'
import type { ProviderId } from '@/server/services/ai/gateway'

export const UserRepository = {
  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    })
  },

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        apiKey: true,
        createdAt: true,
      },
    })
  },

  /**
   * 获取用户的供应商 API Key
   */
  async getProviderApiKey(userId: string, providerId: ProviderId) {
    const result = await prisma.userProviderApiKey.findUnique({
      where: {
        userId_providerId: {
          userId,
          providerId,
        },
      },
      select: {
        apiKey: true,
      },
    })
    return result?.apiKey ?? null
  },

  /**
   * 获取用户所有已配置的供应商 API Key
   */
  async getAllProviderApiKeys(userId: string) {
    const results = await prisma.userProviderApiKey.findMany({
      where: { userId },
      select: {
        providerId: true,
        apiKey: true,
      },
    })
    return results.reduce((acc, r) => {
      acc[r.providerId as ProviderId] = r.apiKey
      return acc
    }, {} as Record<ProviderId, string>)
  },

  /**
   * 创建用户
   */
  async create(data: { username: string; password: string }) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    })
  },
}

