/**
 * 密码加密和验证模块
 *
 * 使用 bcryptjs 进行密码哈希：
 * - hashPassword: 将明文密码加密为哈希值
 * - verifyPassword: 验证明文密码与哈希值是否匹配
 *
 * 原理：
 * - 使用 bcrypt 算法，salt rounds = 10
 * - 每次加密生成不同的盐值，即使相同密码哈希值也不同
 * - 验证时自动提取盐值进行比对
 *
 * @module server/auth/password
 */

import bcrypt from 'bcryptjs'

/**
 * hashPassword - 加密密码
 *
 * 使用 bcryptjs 对明文密码进行哈希加密。
 * 盐值自动生成，强度因子为 10。
 *
 * @param password - 明文密码
 * @returns 加密后的哈希字符串
 *
 * @example
 * ```ts
 * const hashed = await hashPassword('myPassword123')
 * // 输出类似: $2a$10$xYz...（60字符）
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * verifyPassword - 验证密码
 *
 * 验证明文密码是否与存储的哈希值匹配。
 * 自动处理盐值提取和比对。
 *
 * @param password - 明文密码（用户输入）
 * @param hash - 存储的哈希值（数据库中的）
 * @returns 密码是否匹配
 *
 * @example
 * ```ts
 * const isValid = await verifyPassword('myPassword123', storedHash)
 * if (isValid) {
 *   // 登录成功
 * }
 * ```
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
