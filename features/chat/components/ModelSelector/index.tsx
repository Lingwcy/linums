'use client'

/**
 * 模型选择器组件
 * 
 * 提供 AI 模型选择功能，支持：
 * - 推理模型（支持思考模式）
 * - 对话模型（快速响应）
 * - 代码模型（代码生成）
 */

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useModelStore } from '@/features/setting/store/model.store'
import type { ProviderId } from '@/server/services/ai/gateway'
import type { SelectedModelInfo } from '@/features/chat/store/chat.store'

interface ModelSelectorProps {
  /** 当前选中的模型 ID */
  value: string
  /** 模型变化回调 */
  onChange: (modelId: string, providerId?: ProviderId, modelInfo?: SelectedModelInfo) => void
  /** 额外的 CSS 类名 */
  className?: string
}

/**
 * 模型选择器组件
 * 
 * @example
 * ```tsx
 * const [model, setModel] = useState('Qwen/Qwen2.5-7B-Instruct')
 * 
 * <ModelSelector value={model} onChange={setModel} />
 * ```
 */
export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const addedModel = useModelStore((s) => s.addedModel)

  const localSelected = addedModel.find((m) => m.id === value)
  const currentLabel = localSelected?.name
    ?? (value
      ? value
      : (addedModel.length > 0 ? '请选择模型' : '请先在设置中添加模型'))


  const providerLabel: Record<ProviderId, string> = {
    bigmodel: '智谱',
    siliconflow: '硅基流动',
    openrouter: 'OpenRouter',
    openai: 'OpenAI',
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            className
          )}
        >
          <span>{currentLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-48 max-h-[30vh] overflow-y-auto bg-white dark:bg-gray-900 scrollbar-hide"
        align="start"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* 已添加模型 */}
        {addedModel.length > 0 ? (
          <>
            <DropdownMenuGroup>
              {addedModel.map((model) => (
                <DropdownMenuItem
                  key={`${model.providerId}:${model.id}`}
                  onClick={() =>
                    onChange(model.id, model.providerId, {
                      isReasoningModel: model.isReasoningModel,
                      supportsThinkingToggle: model.supportsThinkingToggle,
                    })
                  }
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    model.id === value && 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {model.name}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {providerLabel[model.providerId]}
                    </span>
                  </div>
                  {model.id === value && <Check className="h-4 w-4 text-green-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">未添加模型</DropdownMenuLabel>
            <DropdownMenuItem disabled className="text-xs text-gray-500 dark:text-gray-400">
              请先到设置页添加模型
            </DropdownMenuItem>
          </>
        )}

      </DropdownMenuContent>
    </DropdownMenu>
  )
}

