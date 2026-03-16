'use client'

/**
 * MessageContent - 消息内容渲染器
 *
 * 核心功能：
 * - 渲染 Markdown 格式的消息内容
 * - 支持 GFM (GitHub Flavored Markdown)
 * - 代码高亮显示
 * - 流式传输时智能处理未闭合的代码块
 * - 支持媒体块（图片、图表、天气）
 *
 * 技术栈：
 * - react-markdown: Markdown 解析
 * - remark-gfm: GitHub 风格 Markdown 扩展
 * - rehype-highlight: 代码高亮
 * - rehype-raw: 渲染原始 HTML
 *
 * @module components/MessageContent
 */

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { createMarkdownComponents } from './MarkdownComponents'

/**
 * MessageContent 组件属性
 */
interface MessageContentProps {
  /** 消息内容（Markdown 格式） */
  content: string

  /** 是否正在流式传输 */
  isStreaming?: boolean

  /** 是否禁用媒体块渲染（用于 thinking 面板） */
  disableMediaBlocks?: boolean
}

/**
 * preprocessStreamingContent - 预处理流式内容
 *
 * 流式传输时，AI 可能返回不完整的代码块。
 * 这个函数处理以下情况：
 *
 * 1. 检测未闭合的代码块
 * 2. 对于媒体块（image/chart/weather）：
 *    - JSON 不完整 → 隐藏整个代码块
 *    - JSON 完整 → 补上闭合标记让 ReactMarkdown 正常解析
 * 3. 对于普通代码块：补上闭合标记
 *
 * @param content - 原始内容
 * @param isStreaming - 是否正在流式传输
 * @returns 处理后的内容
 */
function preprocessStreamingContent(content: string, isStreaming: boolean): string {
  // 非流式或空内容直接返回
  if (!isStreaming || !content) return content

  // 统计代码块的开始和结束标记数量
  const codeBlockPattern = /```/g
  const matches = content.match(codeBlockPattern)
  const count = matches?.length || 0

  // 没有代码块或代码块数量是偶数（都闭合了），直接返回
  if (count === 0 || count % 2 === 0) {
    return content
  }

  // 有未闭合的代码块，找到最后一个开始标记的位置
  const lastOpenBlock = content.lastIndexOf('```')
  // 获取代码块语言标识后的内容
  const afterBlock = content.slice(lastOpenBlock + 3)

  // 提取语言标识（如 json, image, chart 等）
  const langMatch = afterBlock.match(/^(\w+)/)
  const lang = langMatch?.[1]

  // 如果是媒体块，需要特殊处理
  if (lang && ['image', 'chart', 'weather'].includes(lang)) {
    const blockContent = afterBlock.slice(lang.length).trim()

    // 检查是否有完整的 JSON（查找 { 和 }）
    const jsonStart = blockContent.indexOf('{')
    const jsonEnd = blockContent.lastIndexOf('}')

    // JSON 不完整，隐藏整个代码块
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      return content.slice(0, lastOpenBlock)
    }

    // 尝试解析 JSON
    const jsonStr = blockContent.slice(jsonStart, jsonEnd + 1)
    try {
      JSON.parse(jsonStr)
      // JSON 解析成功，补上闭合标记让 ReactMarkdown 正常渲染
      return content + '\n```'
    } catch {
      // JSON 解析失败，隐藏整个代码块
      return content.slice(0, lastOpenBlock)
    }
  }

  // 普通代码块，补上闭合标记
  return content + '\n```'
}

/**
 * MessageContent - 消息内容组件
 *
 * 渲染 Markdown 内容的主要组件
 *
 * 功能：
 * 1. 使用 react-markdown 解析 Markdown
 * 2. 使用 remark-gfm 支持 GitHub 风格（表格、删除线等）
 * 3. 使用 rehype-highlight 实现代码高亮
 * 4. 使用 rehype-raw 渲染嵌入的 HTML
 * 5. 流式传输时显示光标（通过 createMarkdownComponents）
 *
 * 渲染流程：
 * 1. 预处理内容（处理未闭合的代码块）
 * 2. 创建自定义 Markdown 组件映射
 * 3. 使用 ReactMarkdown 渲染
 */
export function MessageContent({
  content,
  isStreaming = false,
  disableMediaBlocks = false,
}: MessageContentProps) {
  // 根据流式状态创建 markdown 组件
  const markdownComponents = useMemo(
    () => createMarkdownComponents(isStreaming, disableMediaBlocks),
    [isStreaming, disableMediaBlocks]
  )

  // 预处理内容：流式时延迟渲染未闭合的代码块
  const processedContent = useMemo(
    () => preprocessStreamingContent(content, isStreaming),
    [content, isStreaming]
  )

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
