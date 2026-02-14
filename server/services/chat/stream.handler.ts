/**
 * SSE stream handlers for chat responses.
 * 
 */

import { parseSSELine, splitSSEBuffer } from '@/lib/utils/sse'
import { createChatCompletionReader, type ProviderId } from '@/server/services/ai/gateway'
import {
  toolRegistry,
  type OpenAIToolDefinition,
  type ToolCall,
} from '@/server/services/tools'
import { formatToolMessages } from '@/server/services/tools/handler'
import { executeImageGeneration } from '@/server/services/tools/image-generation'
import { SSEWriter } from './sse-writer'
import { persistMessage, processImageResults } from './message-persister'

/**
 * 基础流上下文。
 * 用于无工具和有工具两条 SSE 链路的通用持久化参数。
 */
export interface StreamContext {
  messageId: string
  conversationId: string
  userId: string
  sessionId: string
}

/**
 * 发给模型的消息结构（本文件内的最小子集）。
 */
type ChatMessage = {
  role: string
  content: string | null
  tool_calls?: ToolCall[]
}

/**
 * 工具模式下的流上下文。
 * 在基础上下文上增加模型调用参数和工具白名单定义。
 */
export interface StreamContextWithTools extends StreamContext {
  apiKey: string
  model: string
  providerId: ProviderId
  modelInfo?: {
    isReasoningModel?: boolean
    supportsThinkingToggle?: boolean
  }
  contextMessages: ChatMessage[]
  enableThinking: boolean
  thinkingBudget: number
  toolDefinitions: OpenAIToolDefinition[]
}

/**
 * 工具执行结果（运行态）。
 * `content` 保持字符串，便于统一透传和后续 JSON 解析。
 */
type ToolExecutionResult = {
  toolCallId: string
  name: string
  success: boolean
  content: string
}

/**
 * 聚合中的 tool_call 片段。
 * 由上游增量流逐步拼装成完整 tool_call。
 */
type ToolCallChunk = {
  index: number
  id?: string
  function?: {
    name?: string
    arguments?: string
  }
}

/**
 * 单轮上游读取后的汇总结果。
 * 包含文本增量、已识别的工具调用以及工具执行 Promise。
 */
type RoundProcessingResult = {
  thinkingContent: string
  answerContent: string
  toolCalls: ToolCall[]
  toolPromises: Promise<ToolExecutionResult>[]
}

/**
 * 上游增量中的 tool_call 原始片段。
 * 字段均为可选，因为模型会分片/乱序吐出。
 */
type ToolCallDelta = {
  index?: number
  id?: string
  function?: {
    name?: string
    arguments?: string
  }
}

/**
 * 上游 delta 的最小类型。
 * 只声明本链路真正消费到的字段。
 */
type UpstreamDelta = {
  reasoning_content?: string
  content?: string
  tool_calls?: ToolCallDelta[]
}

/**
 * 上游单个 SSE 数据块结构（兼容不同 provider 的 choices[0].delta 形态）。
 */
type UpstreamChunk = {
  choices?: Array<{
    delta?: UpstreamDelta
  }>
}

/**
 * 工具循环最大轮次，防止模型陷入无限 tool loop。
 */
const MAX_TOOL_ROUNDS = 5

/**
 * 流式调试日志开关。
 * 仅在开发环境且显式开启 `DEBUG_CHAT_STREAM=true` 时输出。
 */
const ENABLE_STREAM_DEBUG =
  process.env.NODE_ENV !== 'production' && process.env.DEBUG_CHAT_STREAM === 'true'

/**
 * 条件化调试日志。
 * 用于保留排障能力，同时避免生产环境日志噪音。
 */
function debugLog(...args: unknown[]): void {
  if (!ENABLE_STREAM_DEBUG) return
  console.log('[ChatStream]', ...args)
}

/**
 * 创建带工具循环的 SSE 下游流。
 * 核心职责：
 * 1) 统一上游增量为下游事件；
 * 2) 在每轮中并发执行工具并回写结果；
 * 3) 组装下一轮 messages 继续请求模型；
 * 4) 在流结束时持久化完整结果。
 */
export function createSSEStreamWithTools(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: StreamContextWithTools
): ReadableStream {
  const {
    messageId,
    conversationId,
    userId,
    sessionId,
    apiKey,
    model,
    providerId,
    modelInfo,
    contextMessages,
    enableThinking,
    thinkingBudget,
    toolDefinitions,
  } = context

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const allowedToolNames = new Set(toolDefinitions.map((tool) => tool.function.name))

  let cancelled = false
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = reader

  return new ReadableStream({
    /**
     * ReadableStream 启动逻辑。
     * 负责完整 tool loop 生命周期和最终落库。
     */
    async start(controller) {
      const writer = new SSEWriter(controller, encoder, sessionId)

      try {
        let accumulatedThinkingContent = ''
        let accumulatedAnswerContent = ''
        const allToolCalls: ToolCall[] = []
        const allToolResults: Array<{
          toolCallId: string
          name: string
          result: Record<string, unknown>
        }> = []

        let currentMessages = [...contextMessages]
        let currentReader = reader
        let round = 0

        while (round < MAX_TOOL_ROUNDS) {
          if (cancelled) {
            debugLog('stream cancelled before round starts')
            return
          }

          round += 1
          debugLog(`round ${round} started`)

          const roundResult = await processAIResponseWithParallelTools(
            currentReader,
            decoder,
            writer,
            allowedToolNames
          )

          accumulatedThinkingContent += roundResult.thinkingContent
          accumulatedAnswerContent += roundResult.answerContent

          if (roundResult.toolCalls.length === 0) {
            debugLog(`round ${round} has no tool calls, finishing loop`)
            break
          }

          allToolCalls.push(...roundResult.toolCalls)

          const toolResults = await Promise.all(roundResult.toolPromises)
          for (const result of toolResults) {
            if (!cancelled) {
              writer.sendToolResult(result)
            }
            allToolResults.push(normalizePersistedToolResult(result))
          }

          const toolMessages = formatToolMessages(toolResults)
          currentMessages = [
            ...currentMessages,
            {
              role: 'assistant',
              content: roundResult.answerContent || null,
              tool_calls: roundResult.toolCalls,
            },
            ...(toolMessages as ChatMessage[]),
          ]

          if (cancelled) {
            debugLog('stream cancelled before next upstream request')
            return
          }

          const next = await createChatCompletionReader(providerId, apiKey, {
            model,
            messages: currentMessages as Array<{
              role: 'system' | 'user' | 'assistant'
              content: string
            }>,
            modelInfo,
            enableThinking,
            thinkingBudget,
            tools: toolDefinitions,
          })
          currentReader = next.reader
          activeReader = next.reader
        }

        if (cancelled) {
          debugLog('stream cancelled before persist')
          return
        }

        const contentWithImages = processImageResults(
          accumulatedAnswerContent,
          allToolCalls,
          allToolResults
        )

        await persistMessage(messageId, conversationId, userId, {
          thinkingContent: accumulatedThinkingContent,
          answerContent: contentWithImages,
          toolCallsData: allToolCalls.length > 0 ? allToolCalls : null,
          toolResultsData: allToolResults.length > 0 ? allToolResults : null,
        })

        writer.sendComplete()
        writer.close()
      } catch (error) {
        console.error('[ChatStream] stream with tools failed:', error)
        writer.error(error)
      }
    },
    /**
     * ReadableStream 取消逻辑。
     * 当前端中断连接时，主动取消上游 reader 以释放资源。
     */
    async cancel(reason) {
      cancelled = true
      if (activeReader) {
        try {
          await activeReader.cancel(reason)
        } catch {
          // ignore cancellation failures
        }
      }
    },
  })
}

/**
 * 处理单轮上游 SSE 响应（含并行工具启动）。
 * 输出该轮文本增量、完整工具调用及对应执行 Promise。
 */
async function processAIResponseWithParallelTools(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  writer: SSEWriter,
  allowedToolNames: ReadonlySet<string>
): Promise<RoundProcessingResult> {
  let buffer = ''
  let thinkingContent = ''
  let answerContent = ''
  const toolCallChunks: ToolCallChunk[] = []
  const toolPromises: Promise<ToolExecutionResult>[] = []
  const startedTools = new Set<string>()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const splitResult = splitSSEBuffer(buffer)
    buffer = splitResult.remaining

    for (const line of splitResult.lines) {
      const data = parseSSELine(line)
      if (!data) continue

      let parsed: unknown
      try {
        parsed = JSON.parse(data)
      } catch {
        continue
      }

      const delta = (parsed as UpstreamChunk)?.choices?.[0]?.delta
      if (!delta) continue

      if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
        thinkingContent += delta.reasoning_content
        writer.sendThinking(delta.reasoning_content)
      }

      if (typeof delta.content === 'string' && delta.content.length > 0) {
        answerContent += delta.content
        writer.sendAnswer(delta.content)
      }

      if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
        for (const toolCallDelta of delta.tool_calls) {
          const callChunk = appendToolCallChunk(toolCallChunks, toolCallDelta)
          maybeStartToolExecution(
            callChunk,
            startedTools,
            toolPromises,
            writer,
            allowedToolNames
          )
        }
      }
    }
  }

  const toolCalls = buildToolCalls(toolCallChunks)
  for (const toolCall of toolCalls) {
    if (startedTools.has(toolCall.id)) continue
    startedTools.add(toolCall.id)
    writer.sendToolCall(toolCall)
    toolPromises.push(startToolExecution(toolCall, writer, allowedToolNames))
  }

  return {
    thinkingContent,
    answerContent,
    toolCalls,
    toolPromises,
  }
}

/**
 * 将上游 tool_call 增量片段并入本地 chunk。
 * 关键行为是把 `function.arguments` 字符串按流式片段进行拼接。
 */
function appendToolCallChunk(
  chunks: ToolCallChunk[],
  toolCallDelta: ToolCallDelta
): ToolCallChunk {
  const index = typeof toolCallDelta?.index === 'number' ? toolCallDelta.index : 0
  if (!chunks[index]) {
    chunks[index] = { index }
  }

  const chunk = chunks[index]
  if (typeof toolCallDelta?.id === 'string') {
    chunk.id = toolCallDelta.id
  }

  if (toolCallDelta?.function) {
    if (!chunk.function) {
      chunk.function = {}
    }
    if (typeof toolCallDelta.function.name === 'string') {
      chunk.function.name = toolCallDelta.function.name
    }
    if (typeof toolCallDelta.function.arguments === 'string') {
      chunk.function.arguments =
        (chunk.function.arguments || '') + toolCallDelta.function.arguments
    }
  }

  return chunk
}

/**
 * 条件触发工具执行。
 * 当 chunk 具备 id/name 且 arguments 为完整 JSON 时立即异步启动工具。
 */
function maybeStartToolExecution(
  chunk: ToolCallChunk,
  startedTools: Set<string>,
  toolPromises: Array<Promise<ToolExecutionResult>>,
  writer: SSEWriter,
  allowedToolNames: ReadonlySet<string>
): void {
  if (!chunk.id || !chunk.function?.name || startedTools.has(chunk.id)) {
    return
  }

  const args = chunk.function.arguments || ''
  if (!isCompleteJSON(args)) {
    return
  }

  const toolCall: ToolCall = {
    id: chunk.id,
    type: 'function',
    function: {
      name: chunk.function.name,
      arguments: args,
    },
  }

  startedTools.add(chunk.id)
  writer.sendToolCall(toolCall)
  toolPromises.push(startToolExecution(toolCall, writer, allowedToolNames))
}

/**
 * 将聚合后的 chunk 列表转换为标准 ToolCall 数组。
 * 仅保留可执行项（有 id 且有 function.name）。
 */
function buildToolCalls(chunks: ToolCallChunk[]): ToolCall[] {
  return chunks
    .filter((chunk) => chunk.id && chunk.function?.name)
    .map((chunk) => ({
      id: chunk.id as string,
      type: 'function' as const,
      function: {
        name: chunk.function?.name as string,
        arguments: chunk.function?.arguments || '{}',
      },
    }))
}

/**
 * 执行单个工具调用。
 * - 先做 allowlist 校验；
 * - 生图工具走专门执行器（支持进度）；
 * - 其他工具走统一 registry；
 * - 错误统一转为结构化 content 返回。
 */
async function startToolExecution(
  toolCall: ToolCall,
  writer: SSEWriter,
  allowedToolNames: ReadonlySet<string>
): Promise<ToolExecutionResult> {
  const toolName = toolCall.function.name
  const parsedArgs = safeParseJSON(toolCall.function.arguments)

  if (!allowedToolNames.has(toolName)) {
    return {
      toolCallId: toolCall.id,
      name: toolName,
      success: false,
      content: JSON.stringify({
        error: `Tool "${toolName}" is not enabled for this request`,
      }),
    }
  }

  try {
    if (toolName === 'generate_image') {
      const result = await executeImageGeneration(parsedArgs, (progress) => {
        writer.sendToolProgress(toolCall.id, progress)
      })

      const normalizedImageResult = {
        imageUrl: result.url,
        url: result.url,
        width: result.width,
        height: result.height,
      }

      return {
        toolCallId: toolCall.id,
        name: toolName,
        success: true,
        content: JSON.stringify(normalizedImageResult),
      }
    }

    const content = await toolRegistry.executeByName(toolName, parsedArgs)
    return {
      toolCallId: toolCall.id,
      name: toolName,
      success: true,
      content,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown tool execution error'
    return {
      toolCallId: toolCall.id,
      name: toolName,
      success: false,
      content: JSON.stringify({ error: errorMessage }),
    }
  }
}

/**
 * 归一化工具结果，供数据库持久化使用。
 * 主要处理：统一 success 字段，以及生图结果的 `imageUrl/url` 双写兼容。
 */
function normalizePersistedToolResult(result: ToolExecutionResult): {
  toolCallId: string
  name: string
  result: Record<string, unknown>
} {
  const parsed = safeParseJSON(result.content)
  const normalized: Record<string, unknown> = {
    success: result.success,
    ...parsed,
  }

  if (result.name === 'generate_image') {
    const imageUrl = asString(parsed.imageUrl) || asString(parsed.url)
    if (imageUrl) {
      normalized.imageUrl = imageUrl
      normalized.url = imageUrl
    }
  }

  return {
    toolCallId: result.toolCallId,
    name: result.name,
    result: normalized,
  }
}

/**
 * 安全 JSON 解析。
 * 输入非法 JSON 时返回空对象，避免打断主流程。
 */
function safeParseJSON(input: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(input)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * 将未知值安全收敛为非空字符串。
 */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * 判断字符串是否为完整 JSON。
 * 用于流式 tool_call arguments 的“可执行门槛”判断。
 */
function isCompleteJSON(input: string): boolean {
  if (!input || input.trim() === '') return false
  try {
    JSON.parse(input)
    return true
  } catch {
    return false
  }
}

/**
 * 创建无工具模式的基础 SSE 流。
 * 职责仅包括：上游增量解析、下游事件转发、结束后持久化。
 */
export function createSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: StreamContext
): ReadableStream {
  const { messageId, conversationId, userId, sessionId } = context
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let cancelled = false

  return new ReadableStream({
    /**
     * ReadableStream 启动逻辑（无工具）。
     */
    async start(controller) {
      const writer = new SSEWriter(controller, encoder, sessionId)

      try {
        let buffer = ''
        let thinkingContent = ''
        let answerContent = ''

        while (true) {
          if (cancelled) {
            return
          }

          const { done, value } = await reader.read()
          if (done) {
            await persistMessage(messageId, conversationId, userId, {
              thinkingContent,
              answerContent,
              toolCallsData: null,
            })
            writer.sendComplete()
            writer.close()
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const splitResult = splitSSEBuffer(buffer)
          buffer = splitResult.remaining

          for (const line of splitResult.lines) {
            const data = parseSSELine(line)
            if (!data) continue
            let parsed: unknown
            try {
              parsed = JSON.parse(data)
            } catch {
              continue
            }

            const delta = (parsed as UpstreamChunk)?.choices?.[0]?.delta
            if (!delta) continue
            if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
              thinkingContent += delta.reasoning_content
              writer.sendThinking(delta.reasoning_content)
            }
            if (typeof delta.content === 'string' && delta.content.length > 0) {
              answerContent += delta.content
              writer.sendAnswer(delta.content)
            }
          }
        }
      } catch (error) {
        writer.error(error)
      }
    },
    /**
     * ReadableStream 取消逻辑（无工具）。
     */
    async cancel(reason) {
      cancelled = true
      try {
        await reader.cancel(reason)
      } catch {
        // ignore cancellation failures
      }
    },
  })
}
