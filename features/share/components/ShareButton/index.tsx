'use client'

/**
 * ShareButton - 分享按钮组件
 *
 * 功能：
 * - 生成会话分享链接
 * - 复制分享链接到剪贴板
 * - 取消分享
 * - 在新窗口打开分享页面
 *
 * 布局结构：
 * - Dialog 弹窗
 * - 未分享：显示"生成分享链接"按钮
 * - 已分享：显示分享链接 + 复制按钮 + 取消分享按钮
 *
 * @module features/share/components/ShareButton
 */

import { useState, useEffect } from 'react'
import { Share2, Link2, X, Check, Copy } from 'lucide-react'
import { Button } from 'haiku-react-ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { shareConversation, unshareConversation } from '@/app/actions/conversation'

/**
 * ShareButton 组件属性
 */
interface ShareButtonProps {
  /** 会话 ID */
  conversationId: string
  /** 额外的 CSS 类名 */
  className?: string
}

/**
 * ShareButton - 分享按钮组件
 *
 * 使用 Dialog 组件实现弹窗交互
 */
export function ShareButton({ conversationId, className }: ShareButtonProps) {
  const { toast } = useToast()
  // 弹窗打开状态
  const [isOpen, setIsOpen] = useState(false)
  // 是否已分享
  const [isShared, setIsShared] = useState(false)
  // 分享链接
  const [shareUrl, setShareUrl] = useState('')
  // 加载状态
  const [isLoading, setIsLoading] = useState(false)
  // 复制状态
  const [isCopied, setIsCopied] = useState(false)

  // 检查分享状态
  useEffect(() => {
    // TODO: 检查会话是否已分享
  }, [conversationId])

  /**
   * handleShare - 生成分享链接
   *
   * 调用后端 API 创建分享链接
   */
  const handleShare = async () => {
    setIsLoading(true)

    try {
      const result = await shareConversation(conversationId)

      if (!result.success || !result.data) {
        throw new Error(result.error || '分享失败')
      }

      setShareUrl(result.data.shareUrl)
      setIsShared(true)

      toast({
        title: '分享成功',
        description: '分享链接已生成'
      })
    } catch (error) {
      console.error('Share error:', error)
      toast({
        title: '分享失败',
        description: '无法生成分享链接',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * handleUnshare - 取消分享
   *
   * 调用后端 API 取消分享
   */
  const handleUnshare = async () => {
    setIsLoading(true)

    try {
      const result = await unshareConversation(conversationId)

      if (!result.success) {
        throw new Error(result.error || '取消分享失败')
      }

      setShareUrl('')
      setIsShared(false)

      toast({
        title: '已取消分享',
        description: '分享链接已失效'
      })
    } catch (error) {
      console.error('Unshare error:', error)
      toast({
        title: '操作失败',
        description: '无法取消分享',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * handleCopy - 复制链接到剪贴板
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      toast({
        title: '已复制',
        description: '分享链接已复制到剪贴板'
      })

      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Copy error:', error)
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className={className}>
          <Share2 className="h-4 w-4 mr-2" />
          分享
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享会话</DialogTitle>
          <DialogDescription>
            {isShared
              ? '任何拥有此链接的人都可以查看这个会话'
              : '生成一个公开链接，让其他人可以查看这个会话'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 已分享：显示分享链接输入框 */}
          {isShared && shareUrl && (
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
              <Button
                size="sm"
                variant="link"
                onClick={handleCopy}
                disabled={isCopied}
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* 分享状态提示 */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link2 className="h-4 w-4" />
            <span>
              {isShared
                ? '分享链接已激活'
                : '分享链接未激活'}
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {isShared ? (
            /* 已分享状态 */
            <>
              <Button
                variant="link"
                size="sm"
                onClick={handleUnshare}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                取消分享
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => window.open(shareUrl, '_blank')}
              >
                打开链接
              </Button>
            </>
          ) : (
            /* 未分享状态 */
            <>
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleShare}
                disabled={isLoading}
              >
                <Share2 className="h-4 w-4 mr-2" />
                生成分享链接
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
