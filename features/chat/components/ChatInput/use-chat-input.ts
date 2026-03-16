/**
 * useChatInput - 聊天输入 Hook
 *
 * 处理聊天输入的各种逻辑：
 * - 文本输入和提交
 * - 文件上传
 * - 语音录制和转文字
 * - 图片生成
 *
 * 职责分离：
 * - useChatInput：处理输入逻辑
 * - ChatInputUI：处理 UI 渲染
 * - ChatService：处理业务逻辑
 *
 * @module features/chat/components/ChatInput/use-chat-input
 */

import { useCallback, useState, useEffect } from 'react'
import { useChatStore } from '@/features/chat/store/chat.store'
import { ChatService } from '@/features/chat/services/chat.service'
import { useAudioRecorder } from '@/features/voice/hooks/use-audio-recorder'
import { VoiceAPI } from '@/features/voice/services/voice-api'
import { useToast } from '@/lib/hooks/use-toast'
import type { FileAttachment } from '@/features/chat/types/chat'
import type { ImageConfig } from '../ImageGenerationModal'

/**
 * useChatInput Hook 配置选项
 */
interface UseChatInputOptions {
  /** 会话 ID */
  conversationId: string
}

/**
 * useChatInput - 聊天输入 Hook
 *
 * @param conversationId - 会话 ID
 * @returns 各种输入处理函数和状态
 */
export function useChatInput({ conversationId }: UseChatInputOptions) {
  // ========== 状态 ==========

  /** 输入框文本 */
  const [input, setInput] = useState('')
  /** 已上传的文件列表 */
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([])
  /** 是否正在转写语音 */
  const [isTranscribing, setIsTranscribing] = useState(false)
  const { toast } = useToast()

  // 从 Store 获取状态
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const stopStreaming = useChatStore((s) => s.stopStreaming)

  // 语音录制 Hook
  const {
    isRecording,
    audioBlob,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    cancelRecording,
    clearAudio,
  } = useAudioRecorder()

  // ========== 回调函数 ==========

  /**
   * handleSubmit - 提交消息
   *
   * 流程：
   * 1. 阻止表单默认提交
   * 2. 验证输入非空且不在发送中
   * 3. 清空输入框和文件列表
   * 4. 调用 ChatService 发送消息
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!input.trim() || isSendingMessage) return

      const content = input.trim()
      const attachments = uploadedFiles.length > 0 ? [...uploadedFiles] : undefined

      // 清空输入
      setInput('')
      setUploadedFiles([])

      // 发送消息
      await ChatService.sendMessage(conversationId, content, { createUserMessage: true, attachments })
    },
    [input, isSendingMessage, uploadedFiles, conversationId]
  )

  /**
   * handleStop - 停止生成
   *
   * 用户点击"停止生成"按钮时调用
   */
  const handleStop = useCallback(() => {
    ChatService.abortStream()
    stopStreaming('user_stop')
  }, [stopStreaming])

  /**
   * handleInputChange - 输入框变化
   */
  const handleInputChange = useCallback((value: string) => {
    setInput(value)
  }, [])

  /**
   * handleFileUpload - 文件上传
   *
   * 流程：
   * 1. 获取上传的文件
   * 2. 构建 FormData
   * 3. 调用上传 API
   * 4. 添加到文件列表
   */
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 清空 input，让同一文件可以再次上传
    e.target.value = ''

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const fileData = await response.json()
      setUploadedFiles(prev => [...prev, fileData])

      toast({
        title: '文件已添加',
        description: `${fileData.name} (${(fileData.size / 1024).toFixed(1)} KB)`,
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '无法上传文件',
        variant: 'destructive',
      })
    }
  }, [toast])

  /**
   * handleRemoveFile - 移除文件
   */
  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * handleStartRecording - 开始录音
   */
  const handleStartRecording = useCallback(async () => {
    try {
      await startAudioRecording()
    } catch {
      toast({
        title: '无法访问麦克风',
        description: '请检查麦克风权限设置',
        variant: 'destructive',
      })
    }
  }, [startAudioRecording, toast])

  /**
   * handleStopRecording - 停止录音
   */
  const handleStopRecording = useCallback(() => {
    stopAudioRecording()
  }, [stopAudioRecording])

  /**
   * handleCancelRecording - 取消录音
   */
  const handleCancelRecording = useCallback(() => {
    cancelRecording()
  }, [cancelRecording])

  // ========== 语音转文字 ==========

  /**
   * 监听 audioBlob 变化，自动转写
   *
   * 当用户停止录音后，audioBlob 会更新
   * 自动调用语音识别 API 转写为文字
   */
  useEffect(() => {
    if (!audioBlob) return

    const transcribe = async () => {
      setIsTranscribing(true)
      try {
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
        const result = await VoiceAPI.speechToText(audioFile)

        if (result.text) {
          setInput(result.text)
        }

        clearAudio()
      } catch {
        toast({
          title: '语音识别失败',
          description: '请重试或手动输入',
          variant: 'destructive',
        })
      } finally {
        setIsTranscribing(false)
      }
    }

    transcribe()
  }, [audioBlob, clearAudio, toast])

  // ========== 图片生成 ==========

  /**
   * handleImageGenerate - 图片生成
   *
   * 通过 Modal 配置后触发
   * 构建提示词并发送消息
   */
  const handleImageGenerate = useCallback(
    async (config: ImageConfig) => {
      if (isSendingMessage) return

      // 构建带配置的生图请求消息
      // 把配置信息附加到消息中，让 AI 知道用户的具体需求
      let content = `请生成图片：${config.prompt}`
      if (config.negative_prompt) {
        content += `\n排除内容：${config.negative_prompt}`
      }
      if (config.image_size && config.image_size !== '1024x1024') {
        content += `\n图片尺寸：${config.image_size}`
      }

      await ChatService.sendMessage(conversationId, content, {
        createUserMessage: true,
      })
    },
    [isSendingMessage, conversationId]
  )

  // ========== 返回值 ==========

  return {
    input,
    setInput: handleInputChange,
    handleSubmit,
    handleStop,
    isSendingMessage,
    uploadedFiles,
    handleFileUpload,
    handleRemoveFile,
    isRecording,
    isTranscribing,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
    cancelRecording: handleCancelRecording,
    handleImageGenerate,
  }
}
