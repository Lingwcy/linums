'use client'

/**
 * CopyButton - 复制按钮组件
 *
 * 用于复制代码块内容到剪贴板
 *
 * 功能：
 * - 点击复制文本到剪贴板
 * - 显示复制状态（复制中 → 已复制）
 * - 2 秒后自动恢复初始状态
 * - 降级处理：Clipboard API 失败时使用备选方案
 */

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * CopyButton 组件属性
 */
interface CopyButtonProps {
  /** 要复制的文本内容 */
  text: string
}

/**
 * CopyButton 组件
 */
export function CopyButton({ text }: CopyButtonProps) {
  // 复制状态：false = 初始状态，true = 已复制
  const [copied, setCopied] = useState(false)

  /**
   * 处理复制操作
   *
   * 尝试使用 Clipboard API，如果失败则使用备选方案：
   * 1. 创建隐藏的 textarea 元素
   * 2. 设置值并选中
   * 3. 使用 document.execCommand('copy') 复制
   */
  const handleCopy = async () => {
    try {
      // 优先使用 Clipboard API
      await navigator.clipboard.writeText(text)
      setCopied(true)
      // 2 秒后恢复初始状态
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API 失败，使用备选方案
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // 复制失败，静默处理
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2.5 text-xs hover:bg-background/60"
    >
      {copied ? (
        /* 已复制状态 */
        <>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          <span>已复制</span>
        </>
      ) : (
        /* 初始状态 */
        <>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          <span>复制</span>
        </>
      )}
    </Button>
  )
}

