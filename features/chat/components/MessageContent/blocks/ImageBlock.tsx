'use client'

/**
 * ImageBlock - 图片块组件
 *
 * 负责渲染消息中的图片
 *
 * 功能：
 * - 显示图片（支持本地和远程 URL）
 * - 下载图片到本地
 * - 复制图片链接
 * - 放大预览（Lightbox）
 * - 加载状态和错误处理
 * - 图片缓存避免重复加载
 *
 * 布局结构：
 * ```
 * ┌─────────────────────────────┐
 * │ [图片]                       │
 * │                             │
 * │                             │
 * ├─────────────────────────────┤
 * │ 🪄 alt 描述文字...           │  ← 可选的描述
 * ├─────────────────────────────┤
 * │ [下载] [复制] [放大]        │  ← 操作按钮
 * └─────────────────────────────┘
 * ```
 *
 * 放大预览（Lightbox）：
 * ```
 * ┌─────────────────────────────┐
 * │                        [×]  │  ← 关闭按钮
 * │                             │
 * │      [图片预览]             │  ← 全屏显示
 * │                             │
 * └─────────────────────────────┘
 * ```
 */

import { useMemo, useState, memo } from 'react'
import Image from 'next/image'
import { Download, Copy, ZoomIn, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogPortal, DialogOverlay, DialogClose } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/lib/hooks/use-toast'
import type { MediaBlockProps } from './registry'

/**
 * 图片数据结构
 */
interface ImageData {
  /** 图片 URL */
  url?: string
  /** 图片描述 */
  alt?: string
  /** 图片宽度 */
  width?: number
  /** 图片高度 */
  height?: number
}

// 缓存已加载的图片 URL（避免重复加载）
const loadedImages = new Set<string>()

/**
 * ImageBlockInner - 图片块内部组件
 */
function ImageBlockInner({ data, isStreaming }: MediaBlockProps) {
  const { toast } = useToast()

  /**
   * 解析图片数据
   * 支持两种格式：
   * 1. JSON 格式：{ url, alt, width, height }
   * 2. 纯 URL：直接传入 URL 字符串
   */
  const imageData = useMemo(() => {
    const trimmed = data.trim()
    // JSON 格式
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as ImageData
      } catch {
        return null
      }
    }
    // 纯 URL 格式
    if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
      return { url: trimmed } as ImageData
    }
    return null
  }, [data])

  // 图片加载状态
  // 如果图片已经加载过，初始状态就是 false
  const [isLoading, setIsLoading] = useState(() => {
    if (imageData?.url && loadedImages.has(imageData.url)) {
      return false
    }
    return true
  })
  // 加载错误状态
  const [hasError, setHasError] = useState(false)
  // 放大预览状态
  const [isZoomed, setIsZoomed] = useState(false)

  /**
   * handleDownload - 下载图片
   *
   * 流程：
   * 1. 获取图片 blob
   * 2. 创建临时 Object URL
   * 3. 触发下载
   * 4. 清理临时 URL
   */
  const handleDownload = async () => {
    if (!imageData?.url) return
    try {
      const response = await fetch(imageData.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `image-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: '下载成功' })
    } catch {
      toast({ title: '下载失败', variant: 'destructive' })
    }
  }

  /**
   * handleCopy - 复制图片链接
   *
   * 相对路径自动补全为完整 URL
   */
  const handleCopy = async () => {
    if (!imageData?.url) return
    const fullUrl = imageData.url.startsWith('/')
      ? `${window.location.origin}${imageData.url}`
      : imageData.url
    await navigator.clipboard.writeText(fullUrl)
    toast({ title: '链接已复制' })
  }

  // ========== 错误状态处理 ==========

  // 流式传输中或解析失败 - 显示骨架屏或错误信息
  if (!imageData) {
    if (isStreaming) {
      return <span className="block my-4 aspect-square animate-pulse bg-muted rounded-lg" />
    }
    return (
      <span className="block my-4 bg-destructive/10 p-4 text-sm text-destructive rounded-lg">
        无法解析图片数据
      </span>
    )
  }

  // 没有 URL
  if (!imageData.url) {
    return (
      <span className="block my-4 bg-destructive/5 p-4 text-sm text-destructive rounded-lg">
        图片加载失败
      </span>
    )
  }

  // 加载失败
  if (hasError) {
    return (
      <span className="block my-4 bg-destructive/5 p-4 text-sm text-destructive rounded-lg">
        图片加载失败
      </span>
    )
  }

  // ========== 正常渲染 ==========

  // 计算宽高比，用于占位防抖
  const width = imageData.width || 512
  const height = imageData.height || 512
  const aspectRatio = width / height

  return (
    <>
      <span className="block my-4">
        {/* 图片区域 */}
        <span
          className="relative block overflow-hidden rounded-lg"
          style={{ aspectRatio, maxWidth: width }}
        >
          {/* 加载中骨架屏 */}
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </span>
          )}
          {/* 图片 */}
          <Image
            src={imageData.url}
            alt={imageData.alt || '生成的图片'}
            width={width}
            height={height}
            className={`w-full h-auto rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onLoad={() => {
              setIsLoading(false)
              if (imageData.url) {
                loadedImages.add(imageData.url)
              }
            }}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
            unoptimized
          />
        </span>

        {/* 描述文字 - 带 Tooltip */}
        {imageData.alt && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="mt-2 text-sm text-muted-foreground flex items-start gap-1.5 cursor-default">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="truncate">{imageData.alt}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <p>{imageData.alt}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 操作按钮 */}
        <span className="mt-2 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            className="h-7 px-2 text-xs text-foreground/70 hover:text-foreground"
          >
            <Download className="mr-1 h-3 w-3" />
            下载
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 px-2 text-xs text-foreground/70 hover:text-foreground"
          >
            <Copy className="mr-1 h-3 w-3" />
            复制
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsZoomed(true)}
            className="h-7 px-2 text-xs text-foreground/70 hover:text-foreground"
          >
            <ZoomIn className="mr-1 h-3 w-3" />
            放大
          </Button>
        </span>
      </span>

      {/* Lightbox 放大预览 */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogPortal>
          {/* 半透明黑色遮罩 */}
          <DialogOverlay className="bg-black/90" />
          {/* 全屏居中内容 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 关闭按钮 */}
            <DialogClose className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <ZoomIn className="h-5 w-5 rotate-45" />
              <span className="sr-only">关闭</span>
            </DialogClose>
            {/* 预览图片 */}
            <Image
              src={imageData.url}
              alt={imageData.alt || '生成的图片'}
              width={width}
              height={height}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              unoptimized
            />
          </div>
        </DialogPortal>
      </Dialog>
    </>
  )
}

/**
 * ImageBlock - 使用 memo 包裹的图片块组件
 *
 * 优化：只有 data 变化时才重新渲染
 * 避免父组件状态变化导致图片重复渲染
 */
export const ImageBlock = memo(ImageBlockInner, (prevProps, nextProps) => {
  return prevProps.data === nextProps.data
})
