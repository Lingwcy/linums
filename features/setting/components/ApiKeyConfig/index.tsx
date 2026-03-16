'use client'

/**
 * API Key 配置组件
 *
 * 功能：
 * - 显示各 AI Provider 的 API Key 配置状态
 * - 保存新的 API Key 到服务端
 * - 删除已配置的 API Key
 * - 显示/隐藏 API Key（脱敏处理）
 *
 * 布局结构：
 * - 头部：标题 + 错误/成功提示
 * - 内容：可滚动的 Provider 卡片列表
 * - 每个卡片：Provider 名称、描述、输入框、保存/删除按钮
 *
 * @module features/setting/components/ApiKeyConfig
 */

import { useState, useEffect } from 'react'
import { Button } from 'haiku-react-ui'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Key, Trash2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Provider 配置状态
 */
interface ProviderStatus {
  /** Provider 标识符 */
  providerId: string
  /** 是否已配置 API Key */
  configured: boolean
}

/**
 * ApiKeyConfig 组件属性
 */
interface ApiKeyConfigProps {
  /** 保存成功后的回调 */
  onSuccess?: () => void
}

/**
 * 支持的 AI Provider 列表
 *
 * 每个 Provider 包含：
 * - id: 唯一标识符
 * - label: 显示名称
 * - description: 描述信息
 */
const PROVIDERS = [
  { id: 'bigmodel', label: '智谱', description: '智谱 AI' },
  { id: 'siliconflow', label: '硅基流动', description: 'SiliconFlow' },
  { id: 'openrouter', label: 'OpenRouter', description: 'OpenRouter' },
  { id: 'minimax', label: 'MiniMax', description: 'MiniMax MoE 大模型' },
  { id: 'openai', label: 'OpenAI', description: 'OpenAI' },
]

/**
 * ApiKeyConfig - API Key 配置组件
 *
 * 用户管理各 Provider 的 API Key：
 * - 加载时获取各 Provider 的配置状态
 * - 输入框输入新的 API Key
 * - 保存按钮提交到服务端
 * - 已配置的 Key 可选择删除
 * - 已配置的 Key 可切换显示/隐藏
 */
export function ApiKeyConfig({ onSuccess }: ApiKeyConfigProps) {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 输入状态
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  // 获取供应商配置状态
  useEffect(() => {
    fetchProviderStatus()
  }, [])

  const fetchProviderStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/user/api-key')
      const data = await res.json()
      if (res.ok) {
        setProviderStatus(data.providers || [])
      }
    } catch (err) {
      console.error('Failed to fetch provider status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (providerId: string) => {
    const apiKey = apiKeys[providerId]?.trim()
    if (!apiKey) {
      setError('请输入 API Key')
      return
    }

    try {
      setSaving(providerId)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/user/api-key', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, apiKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '保存失败')
        return
      }

      setSuccess(`${PROVIDERS.find(p => p.id === providerId)?.label} API Key 保存成功`)
      setApiKeys(prev => ({ ...prev, [providerId]: '' }))

      // 刷新状态
      await fetchProviderStatus()
      onSuccess?.()
    } catch (err) {
      setError('保存失败，请重试')
      console.error('Failed to save API key:', err)
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (providerId: string) => {
    try {
      setSaving(providerId)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/user/api-key?providerId=${providerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '删除失败')
        return
      }

      setSuccess(`${PROVIDERS.find(p => p.id === providerId)?.label} API Key 已删除`)

      // 刷新状态
      await fetchProviderStatus()
      onSuccess?.()
    } catch (err) {
      setError('删除失败，请重试')
      console.error('Failed to delete API key:', err)
    } finally {
      setSaving(null)
    }
  }

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  const isConfigured = (providerId: string) => {
    return providerStatus.some(p => p.providerId === providerId && p.configured)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部信息 */}
        <div>
          <h3 className="pl-7 text-lg font-semibold">API Key 配置</h3>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-600 text-sm flex items-center gap-2">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

      {/* 卡片列表 - 可滚动 */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="grid gap-4 max-w-3xl">
          {PROVIDERS.map(provider => (
            <Card key={provider.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{provider.label}</CardTitle>
                    {isConfigured(provider.id) && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        已配置
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      placeholder={isConfigured(provider.id) ? '已配置 Key' : `请输入 ${provider.label} API Key`}
                      value={apiKeys[provider.id] || ''}
                      onChange={e => setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                      disabled={saving !== null}
                      className="pl-9 pr-10"
                    />
                    {isConfigured(provider.id) && (
                      <button
                        type="button"
                        onClick={() => toggleShowKey(provider.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave(provider.id)}
                    disabled={saving !== null || !apiKeys[provider.id]?.trim()}
                  >
                    {saving === provider.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      '保存'
                    )}
                  </Button>

                  {isConfigured(provider.id) && (
                    <Button
                      variant="dashed"
                      size="sm"
                      onClick={() => handleDelete(provider.id)}
                      disabled={saving !== null}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
