/**
 * useAuth Hook - 认证状态管理
 *
 * 封装 NextAuth.js 的 session 状态，提供简洁的认证状态接口：
 * - isAuthenticated: 用户是否已登录
 * - user: 当前用户信息
 * - isLoading: 是否正在加载认证状态
 * - showLoginDialog: 是否需要显示登录对话框
 * - logout: 退出登录方法
 *
 * @module features/auth/hooks/use-auth
 */

import { useSession, signOut } from 'next-auth/react'

/**
 * 用户信息接口
 */
interface User {
  /** 用户 ID */
  id: string
  /** 邮箱 */
  email?: string | null
  /** 显示名称 */
  name?: string | null
  /** 头像 URL */
  image?: string | null
}

/**
 * 认证状态接口
 */
interface AuthState {
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 当前用户信息 */
  user: User | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否需要显示登录对话框 */
  showLoginDialog: boolean
  /** 退出登录方法 */
  logout: () => Promise<void>
}

/**
 * useAuth - 认证状态 Hook
 *
 * 使用 NextAuth.js 管理用户认证状态：
 * - 自动同步 session 状态
 * - 提供统一的用户信息格式
 * - 封装退出登录逻辑
 *
 * @example
 * ```tsx
 * function ProtectedComponent() {
 *   const { isAuthenticated, user, isLoading, logout } = useAuth()
 *
 *   if (isLoading) return <Loading />
 *   if (!isAuthenticated) return <LoginPrompt />
 *
 *   return (
 *     <div>
 *       <p>欢迎, {user?.name}</p>
 *       <button onClick={logout}>退出</button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @returns 认证状态和方法
 */
export function useAuth(): AuthState {
  // 使用 NextAuth.js 的 useSession Hook
  const { data: session, status } = useSession()

  // 加载中状态
  const isLoading = status === 'loading'
  // 已认证状态
  const isAuthenticated = status === 'authenticated'
  // 未认证状态（需要显示登录对话框）
  const showLoginDialog = status === 'unauthenticated'

  // 提取用户信息，统一格式
  const user = session?.user ? {
    id: session.user.id || '',
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  } : null

  /**
   * logout - 退出登录
   *
   * 调用 NextAuth.js 的 signOut 方法，
   * 退出后重定向到首页。
   */
  const logout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    showLoginDialog,
    logout,
  }
}
