'use client'

import { useState, useEffect } from 'react'
import { Button } from 'haiku-react-ui'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Key, Trash2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ProviderStatus {
  providerId: string
  configured: boolean
}

interface ApiKeyConfigProps {
  onSuccess?: () => void
}

// 供应商信息
const PROVIDERS = [
  { id: 'bigmodel', label: '智谱', description: '智谱 AI' },
  { id: 'siliconflow', label: '硅基流动', description: 'SiliconFlow' },
  { id: 'openrouter', label: 'OpenRouter', description: 'OpenRouter ' },
  { id: 'openai', label: 'OpenAI', description: 'OpenAI' },
]

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
