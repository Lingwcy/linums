/**
 * JWT Token 管理模块
 *
 * 使用 jose 库实现 JWT 的签发和验证
 * 用于传统的 token-based 认证（向后的兼容方案）
 *
 * 注意：新的认证优先使用 NextAuth.js
 */

import * as jose from 'jose'

// JWT 密钥，从环境变量读取
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

/**
 * JWT Payload 结构
 */
export interface JWTPayload {
  /** 用户 ID */
  userId: string
}

/**
 * 签发 JWT Token
 *
 * Token 有效期：7 天
 * 算法：HS256
 *
 * @param payload - 包含 userId 的 payload
 * @returns 签发后的 token 字符串
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new jose.SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

/**
 * 验证 JWT Token
 *
 * @param token - 待验证的 token 字符串
 * @returns 解析后的 payload
 * @throws Error 如果 token 无效或已过期
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, secret)
    return { userId: payload.userId as string }
  } catch {
    throw new Error('Invalid token')
  }
}

