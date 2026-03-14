/**
 * NextAuth.js 认证配置
 *
 * 统一的认证配置文件，支持多种登录方式：
 * - Google OAuth
 * - GitHub OAuth
 * - 邮箱密码登录 (Credentials)
 *
 * 特性：
 * - JWT session 策略（7天有效期）
 * - 账号自动关联（同邮箱 OAuth 自动绑定）
 * - Prisma 数据库适配器
 */

import type { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db/client'

/**
 * NextAuth 配置选项
 */
export const authOptions: NextAuthOptions = {
  // 使用 Prisma 作为数据库适配器
  adapter: PrismaAdapter(prisma),

  // 认证提供者配置
  providers: [
    // Google OAuth 登录
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',      // 每次提示选择账号
          access_type: 'offline',       // 获取 refresh_token
          response_type: 'code',        // 使用授权码模式
        },
      },
    }),

    // GitHub OAuth 登录
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',           // 每次请求用户授权
        },
      },
    }),

    // 邮箱密码登录
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // 查找用户
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          return null
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // 返回用户信息
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],

  // 自定义页面
  pages: {
    signIn: '/auth/signin',    // 登录页面
    error: '/auth/error',      // 错误页面
  },

  // Session 配置
  session: {
    strategy: 'jwt',                  // 使用 JWT 策略
    maxAge: 7 * 24 * 60 * 60,         // 7 天有效期
  },

  // 回调函数
  callbacks: {
    /**
     * 登录回调
     * 处理 OAuth 账号自动关联逻辑
     */
    async signIn({ user, account }) {
      if (!user.email) return true

      // 查找已存在的用户
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { accounts: true },
      })

      if (!existingUser) return true

      // 检查该 provider 是否已关联
      const accountAlreadyLinked = existingUser.accounts.some(
        (acc) => acc.provider === account?.provider
      )
      if (accountAlreadyLinked) return true

      // Credentials 登录：直接返回
      if (account?.provider === 'credentials') {
        user.id = existingUser.id
        return true
      }

      // OAuth 自动关联条件：
      // 1. 用户邮箱已验证，或
      // 2. 使用 Google/GitHub 登录
      const canAutoLink =
        existingUser.emailVerified ||
        account?.provider === 'google' ||
        account?.provider === 'github'

      // 执行账号关联
      if (canAutoLink && account) {
        try {
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
          })

          user.id = existingUser.id

          // OAuth 登录时自动验证邮箱
          if (!existingUser.emailVerified) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: new Date() },
            })
          }

          return true
        } catch (error) {
          console.error('[Auth] Failed to link account:', error)
          return false
        }
      }

      return false
    },

    /**
     * JWT 回调
     * 将用户 ID 存入 token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },

    /**
     * Session 回调
     * 将 token 中的用户 ID 传给 session
     */
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },

  // 开发环境开启调试
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)
