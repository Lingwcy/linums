'use client'

/**
 * CodeBlock - 代码块组件
 *
 * 负责渲染 Markdown 代码块
 *
 * 两种渲染模式：
 * 1. 行内代码（inline）：简单样式，融入段落
 * 2. 代码块：完整样式，包含：
 *    - 语言标识
 *    - 复制按钮（hover 显示）
 *    - 语法高亮（通过 rehype-highlight）
 */

import { CopyButton } from './CopyButton'

/**
 * CodeBlock 组件属性
 */
interface CodeBlockProps {
  /** 是否为行内代码 */
  inline?: boolean
  /** 代码块语言标识 className */
  className?: string
  /** 代码内容 */
  children: React.ReactNode
}

/**
 * CodeBlock 组件
 *
 * 布局结构：
 * ```
 * ┌─────────────────────────────┐
 * │ language    [复制]           │  ← 头部（语言标识 + 复制按钮）
 * ├─────────────────────────────┤
 * │                               │
 * │   代码内容...                 │  ← 代码区域（语法高亮）
 * │                               │
 * └─────────────────────────────┘
 * ```
 */
export function CodeBlock({ inline, className, children }: CodeBlockProps) {
  // 提取语言标识（如 python, javascript 等）
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')

  // 行内代码：简单样式，融入段落
  if (inline) {
    return (
      <code className="rounded px-1.5 py-0.5 text-sm font-mono bg-white dark:bg-gray-800">
        {children}
      </code>
    )
  }

  // 代码块：完整样式
  return (
    <div className="group relative my-4 rounded-lg bg-white dark:bg-gray-800">
      {/* 头部：语言标识 + 复制按钮 */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 rounded-t-lg">
        {/* 语言标识 */}
        <span className="text-xs font-medium text-muted-foreground">
          {language || 'text'}
        </span>
        {/* 复制按钮：默认 60% 透明度，hover 时完全显示 */}
        <div className="opacity-60 group-hover:opacity-100 transition-opacity">
          <CopyButton text={code} />
        </div>
      </div>

      {/* 代码区域：支持横向滚动 */}
      <pre className="!mt-0 overflow-x-auto bg-white dark:bg-gray-800 px-4 pb-4 pt-3">
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

