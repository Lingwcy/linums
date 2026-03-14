/**
 * Chat Message UI Component - 消息 UI 组件
 *
 * 纯展示组件，负责渲染单条消息
 * 根据 role 区分用户消息和 AI 消息的渲染方式
 *
 * 消息结构：
 * - user: 用户消息，右对齐，气泡样式
 * - assistant: AI 消息，左对齐，包含：
 *   - 思考过程 (thinking)
 *   - 回答内容 (content)
 *   - 工具调用 (toolInvocations)
 *   - 工具结果 (toolResults)
 *
 * @module modules/chat-message/ChatMessageUI
 */

import { useState } from 'react'
import { ThinkingPanel } from '@/features/chat/components/ThinkingPanel'
import { MessageContent } from '@/features/chat/components/MessageContent'
import { MessageActions } from '@/features/chat/components/MessageActions'
import { MessageEdit } from '@/features/chat/components/MessageEdit'
import { Button } from '@/components/ui/button'
import { Loader2,CircleOff, Edit2, RotateCw, ChevronDown, ChevronRight, Globe, XCircle } from 'lucide-react'
import { MarkdownIcon } from '@/components/icons/MarkdownIcon'
import { TextFileIcon } from '@/components/icons/TextFileIcon'
import { cn } from '@/lib/utils'
import type { Message, ToolInvocation, ToolResult, SearchSource } from '@/features/chat/types/chat'
import type { MessagePhase } from '@/features/chat/types/message-state'

/**
 * WebSearchStatus - 网页搜索状态组件
 *
 * 简洁风格，类似 Perplexity
 * 显示搜索的实时状态和结果来源
 *
 * 状态：
 * - running/pending: 搜索中，显示加载动画
 * - failed: 搜索失败，显示错误图标
 * - completed: 完成，显示来源标签
 */
function WebSearchStatus({ invocation }: { invocation: ToolInvocation }) {
  const [isExpanded, setIsExpanded] = useState(false)
  // 搜索结果来源
  const sources = invocation.result?.sources as SearchSource[] | undefined

  // 搜索中状态
  if (invocation.state === 'running' || invocation.state === 'pending') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>搜索中...</span>
        {invocation.args?.query && (
          <span className="text-xs opacity-70">"{invocation.args.query}"</span>
        )}
      </div>
    )
  }

  // 失败状态
  if (invocation.state === 'failed') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <XCircle className="h-3.5 w-3.5" />
        <span>搜索失败</span>
      </div>
    )
  }

  // 完成状态 - 显示来源标签
  const hasSources = sources && sources.length > 0

  return (
    <div className="space-y-2">
      {/* 来源标签行 */}
      {hasSources && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">来源:</span>
          {sources.slice(0, isExpanded ? sources.length : 3).map((source, index) => (
            <a
              key={index}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-xs transition-colors group"
            >
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground/80 group-hover:text-foreground max-w-[120px] truncate">
                {new URL(source.url).hostname.replace('www.', '')}
              </span>
            </a>
          ))}
          {/* 展开/收起更多来源 */}
          {sources.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {isExpanded ? (
                <>收起 <ChevronDown className="h-3 w-3" /></>
              ) : (
                <>+{sources.length - 3} 更多 <ChevronRight className="h-3 w-3" /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ToolInvocationItem - 工具调用组件
 *
 * 渲染正在运行的工具调用
 * 根据工具类型显示不同 UI：
 * - generate_image: 图片生成，显示进度条和取消按钮
 * - web_search: 网页搜索，显示搜索状态
 *
 * 注意：图片生成完成后会直接插入到 content 流中，这里只显示 loading 状态
 */
function ToolInvocationItem({
  invocation,
  _messageId,
  onCancel
}: {
  invocation: ToolInvocation
  _messageId?: string
  onCancel?: (toolCallId: string) => void
}) {
  // ========== 图片生成工具 ==========
  if (invocation.name === 'generate_image') {
    // 运行中/等待中 - 显示进度
    if (invocation.state === 'running' || invocation.state === 'pending') {
      const progress = (invocation as { progress?: number }).progress ?? 0
      const estimatedTime = (invocation as { estimatedTime?: number }).estimatedTime

      return (
        <div className="space-y-2">
          {/* 进度信息行 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>正在生成图片...</span>
              {progress > 0 && <span className="text-xs">{progress}%</span>}
              {estimatedTime && estimatedTime > 0 && (
                <span className="text-xs opacity-70">约 {estimatedTime}s</span>
              )}
            </div>
            {/* 取消按钮 */}
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(invocation.toolCallId)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                取消
              </Button>
            )}
          </div>
          {/* 进度条 */}
          {progress > 0 && (
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )
    }

    // 失败状态
    if (invocation.state === 'failed') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <XCircle className="h-3.5 w-3.5" />
          <span>图片生成失败</span>
        </div>
      )
    }

    // 取消状态
    if (invocation.state === 'cancelled') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <XCircle className="h-3.5 w-3.5" />
          <span>已取消</span>
        </div>
      )
    }

    // 完成状态不渲染，图片已插入到 content 中
    return null
  }

  // ========== 网页搜索工具 ==========
  if (invocation.name === 'web_search') {
    return <WebSearchStatus invocation={invocation} />
  }

  return null
}

/**
 * ToolResultItem - 工具结果组件
 *
 * 渲染已完成的工具结果（从数据库加载）
 * 目前主要用于显示搜索结果的来源标签
 *
 * 注意：图片生成结果不在这里渲染，会在 content 的 markdown 中显示
 */
function ToolResultItem({ result }: { result: ToolResult }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 图片生成结果不在这里渲染
  if (result.name === 'generate_image') {
    return null
  }

  // 搜索结果 - 显示来源标签
  if (result.name === 'web_search' && result.result.sources && result.result.sources.length > 0) {
    const sources = result.result.sources as SearchSource[]
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">来源:</span>
        {sources.slice(0, isExpanded ? sources.length : 3).map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-xs transition-colors group"
          >
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground/80 group-hover:text-foreground max-w-[120px] truncate">
              {new URL(source.url).hostname.replace('www.', '')}
            </span>
          </a>
        ))}
        {/* 展开/收起更多来源 */}
        {sources.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {isExpanded ? (
              <>收起 <ChevronDown className="h-3 w-3" /></>
            ) : (
              <>+{sources.length - 3} 更多 <ChevronRight className="h-3 w-3" /></>
            )}
          </button>
        )}
      </div>
    )
  }

  return null
}

interface ChatMessageUIProps {
  /** 消息数据 */
  message: Message

  /** 消息 ID */
  messageId: string

  /** 消息阶段（状态机） */
  phase: MessagePhase

  /** 是否正在处理 */
  isProcessing: boolean

  /** 是否正在等待响应 */
  isWaitingForResponse: boolean

  /** 重试回调 */
  onRetry?: () => void

  /** 编辑并重新发送回调 */
  onEdit?: (newContent: string) => void

  /** 取消工具执行回调 */
  onCancelTool?: (toolCallId: string) => void
}

/**
 * ChatMessageUI - 消息 UI 组件
 *
 * 渲染单条消息，根据 role 区分样式
 *
 * 布局结构：
 * - user: 右对齐蓝色气泡
 *   - 文件附件（可选）
 *   - 消息内容 / 编辑框
 * - assistant: 左对齐，包含：
 *   - 等待状态
 *   - 工具调用状态
 *   - 工具结果
 *   - 思考面板 (thinking)
 *   - 回答内容 (content)
 *   - 操作按钮
 */
export function ChatMessageUI({
  message,
  messageId,
  phase,
  isProcessing,
  onRetry,
  onEdit,
  onCancelTool,
}: ChatMessageUIProps) {
  // 是否为用户消息
  const isUser = message.role === 'user'
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false)

  // 根据状态机计算显示状态
  const isStreaming = isProcessing
  const isStreamingAnswer = phase === 'answering'

  // ==================== 用户消息 ====================
  if (isUser) {
    return (
      <div className="w-full py-4 group">
        <div className="flex justify-end items-start gap-2">
          {/* 编辑按钮（hover显示） */}
          {onEdit && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity mt-2"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}

          {/* 消息容器 */}
          <div className="max-w-[70%] flex flex-col items-end gap-2">
            {/* 文件附件标签 */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-end">
                {message.attachments.map((file, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
                      file.type === 'md'
                        ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                        : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    )}
                  >
                    {/* 文件类型图标 */}
                    {file.type === 'md' ? (
                      <MarkdownIcon className="h-3 w-3 text-orange-500" />
                    ) : (
                      <TextFileIcon className="h-3 w-3 text-blue-500" />
                    )}
                    {/* 文件名 */}
                    <span className={cn(
                      "font-medium",
                      file.type === 'md'
                        ? "text-orange-700 dark:text-orange-300"
                        : "text-blue-700 dark:text-blue-300"
                    )}>
                      {file.name}
                    </span>
                    {/* 文件大小 */}
                    <span className={cn(
                      "text-xs",
                      file.type === 'md'
                        ? "text-orange-500 dark:text-orange-400"
                        : "text-blue-500 dark:text-blue-400"
                    )}>
                      {(file.size / 1024).toFixed(1)}KB
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 消息内容：编辑模式 / 展示模式 */}
            {isEditing ? (
              /* 编辑模式：显示编辑组件 */
              <MessageEdit
                originalContent={message.content}
                onCancel={() => setIsEditing(false)}
                onSend={(newContent) => {
                  setIsEditing(false)
                  onEdit?.(newContent)
                }}
              />
            ) : (
              /* 展示模式：显示气泡 */
              <div className="rounded-3xl bg-[hsl(var(--message-user-bg))] px-5 py-3">
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-[hsl(var(--text-primary))]">
                  {message.content}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==================== AI 消息 ====================

  // 判断显示状态
  // 等待中：无处理中 + 无思考 + 无内容 + 显示状态为 waiting
  const showWaitingIndicator = !isProcessing && !message.thinking && !message.content && message.displayState === 'waiting'
  // 错误状态：阶段为 error 或有错误标志 + 无内容
  const showErrorIndicator = (phase === 'error' || message.hasError) && !message.content

  return (
    <div className="w-full py-6">
      <div className="space-y-4">
        {/* 1. 等待响应状态 */}
        {showWaitingIndicator && (
          <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
            {
              showErrorIndicator ?
                /* 错误状态 */
                <div className="flex items-center gap-2 text-red-500">
                  <CircleOff className="h-4 w-4" />
                  <span className="text-sm">生成失败</span>
                </div> :
                /* 等待中 */
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">等待响应...</span>
                </>
            }
          </div>
        )}


        {/* 2. 工具调用状态（运行时） */}
        {/* 渲染正在执行的工具调用，支持多个并行 */}
        {message.toolInvocations?.map((invocation) => (
          <ToolInvocationItem
            key={invocation.toolCallId}
            invocation={invocation}
            _messageId={messageId}
            onCancel={onCancelTool}
          />
        ))}

        {/* 3. 工具执行结果（持久化后，从数据库加载） */}
        { message.toolResults?.map((result) => (
          <ToolResultItem key={result.toolCallId} result={result} />
        ))}

        {/* 4. 思考面板 - AI 的推理过程 */}
        {/* 仅在有思考内容时显示 */}
        {message.thinking && (
          <ThinkingPanel
            messageId={messageId}
            defaultExpanded={true}
          />
        )}

        {/* 5. 回答内容 - AI 的最终回复 */}
        {/* 渲染 Markdown 格式内容 */}
        {message.content && (
          <div className="prose-container">
            <MessageContent
              content={message.content}
              isStreaming={isStreamingAnswer}
            />
          </div>
        )}

        {/* 6. 操作按钮 */}
        {/* 流式输出中：显示重试按钮 */}
        {isStreaming && onRetry ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRetry}
              className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="重试"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        ) : message.content ? (
          /* 有内容时：显示完整操作菜单 */
          <MessageActions
            content={message.content}
            messageId={message.id}
            role={message.role as 'user' | 'assistant'}
            hasError={message.hasError}
            onRetry={onRetry}
          />
        ) : null}
      </div>
    </div>
  )
}

