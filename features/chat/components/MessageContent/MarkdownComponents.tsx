/**
 * MarkdownComponents - Markdown 自定义组件映射
 *
 * 将 Markdown 元素映射到自定义 React 组件
 *
 * 支持的元素：
 * - code: 代码块（支持语法高亮、媒体块）
 * - img: 图片（支持下载、复制、放大）
 * - a: 链接（新窗口打开）
 * - ul/ol: 列表
 * - h1/h2/h3: 标题
 * - blockquote: 引用
 * - table: 表格
 *
 * 安全考虑：
 * - 图片：过滤模型生成的假图片 URL
 * - 媒体块：只允许本地生成的图片
 */

import { Suspense } from 'react'
import { CodeBlock } from './CodeBlock'
import { isMediaBlock, mediaRegistry } from './blocks/registry'
import { ImageBlock } from './blocks/ImageBlock'
import type { Components } from 'react-markdown'

/**
 * createMarkdownComponents - 创建 Markdown 组件映射
 *
 * @param isStreaming - 是否正在流式传输（影响媒体块加载状态）
 * @param disableMediaBlocks - 是否禁用媒体块渲染（用于 thinking 面板）
 * @returns react-markdown 所需的 components 对象
 */
export function  createMarkdownComponents(
  isStreaming: boolean = false,
  disableMediaBlocks: boolean = false
): Components {
  return {
    /**
     * code - 代码块渲染
     *
     * 处理两种情况：
     * 1. 媒体块（image/chart/weather）：渲染为交互式组件
     * 2. 普通代码块：使用 CodeBlock 组件（带语法高亮和复制按钮）
     */
    code: ({ className, children }) => {
      // 提取语言标识（如 python, javascript, json 等）
      const match = /language-(\w+)/.exec(className || '')
      const language = match?.[1] || ''
      const content = String(children).replace(/\n$/, '')

      // 检查是否是媒体块（image/chart/weather）
      if (language && isMediaBlock(language)) {
        // 禁用媒体块时，显示为普通代码块
        if (disableMediaBlocks) {
          return (
            <CodeBlock inline={false} className={className}>
              {children}
            </CodeBlock>
          )
        }

        // ========== image 代码块 ==========
        // 安全考虑：只渲染本地生成的图片（/generated/ 路径）
        // 过滤模型编造的外部 URL，防止 XSS 或假图片
        if (language === 'image') {
          try {
            const parsed = JSON.parse(content)
            // 只渲染本地生成的图片
            if (parsed.url && parsed.url.startsWith('/generated/')) {
              const blockKey = `${language}-${content.slice(0, 50)}`
              return (
                <Suspense fallback={<div className="my-4 h-32 animate-pulse rounded-lg bg-muted" />}>
                  <ImageBlock key={blockKey} data={content} isStreaming={isStreaming} />
                </Suspense>
              )
            }
          } catch {
            // JSON 解析失败，忽略
          }
          return null // 过滤非本地图片
        }

        // ========== chart/weather 代码块 ==========
        const MediaComponent = mediaRegistry[language]
        const blockKey = `${language}-${content.slice(0, 50)}`
        return (
          <Suspense fallback={<div className="my-4 h-32 animate-pulse rounded-lg bg-muted" />}>
            <MediaComponent key={blockKey} data={content} isStreaming={isStreaming} />
          </Suspense>
        )
      }

      // ========== 普通代码块 ==========
      // 行内代码（无语言标识）vs 代码块（有语言标识）
      const isInline = !className
      return (
        <CodeBlock inline={isInline} className={className}>
          {children}
        </CodeBlock>
      )
    },

    /**
     * img - 图片渲染
     *
     * 使用 ImageBlock 组件，支持：
     * - 下载、复制、放大
     * - 过滤模型生成的假图片
     */
    img: ({ src, alt }) => {
      if (!src) return null

      // 安全考虑：过滤模型可能编造的假图片域名
      // 这些通常是模型幻觉产生的占位符图片
      const fakeImageDomains = [
        'image.pollinations.ai',
        'placeholder.com',
        'via.placeholder',
        'picsum.photos',
        'loremflickr.com',
        'dummyimage.com',
      ]
      if (typeof src === 'string' && fakeImageDomains.some(domain => src.includes(domain))) {
        return null // 丢弃假图片
      }

      // 包装为 JSON 格式传给 ImageBlock
      const data = JSON.stringify({ url: src, alt: alt || '' })
      const blockKey = `img-${data.slice(0, 50)}`

      return (
        <Suspense fallback={<div className="my-4 aspect-square animate-pulse bg-muted" />}>
          <ImageBlock key={blockKey} data={data} isStreaming={isStreaming} />
        </Suspense>
      )
    },

    /**
     * a - 链接渲染
     *
     * 安全考虑：
     * - 使用 target="_blank" 在新窗口打开
     * - 使用 rel="noopener noreferrer" 防止钓鱼攻击
     */
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80"
      >
        {children}
      </a>
    ),

    // 无序列表
    ul: ({ children }) => <ul className="my-2 list-disc pl-6">{children}</ul>,
    // 有序列表
    ol: ({ children }) => <ol className="my-2 list-decimal pl-6">{children}</ol>,

    // 标题样式
    h1: ({ children }) => (
      <h1 className="mb-4 mt-6 text-2xl font-bold">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-5 text-xl font-bold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>
    ),

    // 引用块样式
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-primary pl-4 italic">
        {children}
      </blockquote>
    ),

    // 表格样式（可滚动）
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="min-w-full border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-4 py-2">{children}</td>
    ),
  }
}
