'use client'

/**
 * 模型选择器组件
 *
 * 提供 AI 模型选择功能，支持：
 * - 推理模型（支持思考模式）
 * - 对话模型（快速响应）
 * - 代码模型（代码生成）
 * - API Key 配置检查
 */

import * as React from 'react'
import { useEffect, useState } from 'react'
import { Check, ChevronDown, AlertCircle } from 'lucide-react'
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
import { useApiKeyStore } from '@/features/setting/store/apikey.store'
import type { ProviderId } from '@/server/services/ai/gateway'
import type { SelectedModelInfo } from '@/features/chat/store/chat.store'

interface ModelSelectorProps {
  /** 当前选中的模型 ID */
  value: string
  /** 模型变化回调 */
  onChange: (modelId: string, providerId?: ProviderId, modelInfo?: SelectedModelInfo) => void
  /** 额外的 CSS 类名 */
  className?: string
  /** 是否在选择时显示 API Key 未配置警告 */
  showApiKeyWarning?: boolean
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
export function ModelSelector({ value, onChange, className, showApiKeyWarning = true }: ModelSelectorProps) {
  const addedModel = useModelStore((s) => s.addedModel)
  const { fetchStatus, isProviderConfigured } = useApiKeyStore()
  const [warnedProviders, setWarnedProviders] = useState<Set<string>>(new Set())

  // 获取 API Key 配置状态
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const localSelected = addedModel.find((m) => m.id === value)
  const currentLabel = localSelected?.name
    ?? (value
      ? value
      : (addedModel.length > 0 ? '请选择模型' : '请先在设置中添加模型'))


  const providerLabel: Record<ProviderId, string> = {
    bigmodel: '智谱',
    siliconflow: '硅基流动',
    openrouter: 'OpenRouter',
    minimax: 'MiniMax',
    openai: 'OpenAI',
  }

  const handleSelectModel = (model: typeof addedModel[0]) => {
    const configured = isProviderConfigured(model.providerId)

    // 如果未配置 API Key 且用户选择了这个模型
    if (!configured && showApiKeyWarning) {
      // 显示警告
      alert(`您尚未配置 ${providerLabel[model.providerId as ProviderId]} 的 API Key，请在设置中配置后再使用。`)
      setWarnedProviders(prev => new Set(prev).add(model.providerId))
      return
    }

    onChange(model.id, model.providerId, {
      isReasoningModel: model.isReasoningModel,
      supportsThinkingToggle: model.supportsThinkingToggle,
    })
  }

  // 按供应商分组已添加的模型
  const groupedModels = addedModel.reduce((acc, model) => {
    const pid = model.providerId
    if (!acc[pid]) {
      acc[pid] = []
    }
    acc[pid].push(model)
    return acc
  }, {} as Record<string, typeof addedModel>)

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
        className="w-56 max-h-[40vh] overflow-y-auto bg-white dark:bg-gray-900 scrollbar-hide"
        align="start"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* 已添加模型 */}
        {addedModel.length > 0 ? (
          <>
            {Object.entries(groupedModels).map(([providerId, models]) => {
              const configured = isProviderConfigured(providerId)
              return (
                <DropdownMenuGroup key={providerId}>
                  <DropdownMenuLabel className="text-gray-900 dark:text-gray-100 flex items-center gap-1">
                    {providerLabel[providerId as ProviderId]}
                    {!configured && (
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                    )}
                  </DropdownMenuLabel>
                  {models.map((model) => {
                    const isConfigured = isProviderConfigured(model.providerId)
                    return (
                      <DropdownMenuItem
                        key={`${model.providerId}:${model.id}`}
                        onClick={() => handleSelectModel(model)}
                        disabled={!isConfigured}
                        className={cn(
                          'flex items-center justify-between cursor-pointer',
                          'hover:bg-gray-100 dark:hover:bg-gray-800',
                          model.id === value && 'bg-gray-100 dark:bg-gray-800',
                          !isConfigured && 'opacity-50'
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {model.name}
                          </span>
                          {!isConfigured && (
                            <span className="text-[10px] text-orange-500">
                              未配置 API Key
                            </span>
                          )}
                        </div>
                        {model.id === value && <Check className="h-4 w-4 text-green-600" />}
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                </DropdownMenuGroup>
              )
            })}
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

