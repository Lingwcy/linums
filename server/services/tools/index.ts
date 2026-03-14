/**
 * 工具服务入口模块
 *
 * 负责工具的初始化和全局注册
 *
 * 支持的工具：
 * - web_search: 网页搜索（需要 TAVILY_API_KEY）
 * - generate_image: 图片生成（需要 SILICONFLOW_API_KEY）
 *
 * 使用方式：
 * ```typescript
 * import { toolRegistry, ensureToolsReady } from '@/server/services/tools'
 *
 * // 在使用工具前确保初始化完成
 * await ensureToolsReady()
 *
 * // 检查工具是否可用
 * if (toolRegistry.has('web_search')) {
 *   const tool = toolRegistry.get('web_search')
 * }
 * ```
 */

import { ToolRegistry } from './registry'
import { createWebSearchTool } from './web-search'
import { createImageGenerationTool } from './image-generation'
import { isSiliconFlowS3Available } from '@/server/services/image/network-probe'

// 创建全局工具注册表（单例）
const toolRegistry = new ToolRegistry()

// 工具初始化 Promise（确保只初始化一次）
let toolsInitPromise: Promise<void> | null = null

/**
 * 初始化所有工具（只执行一次）
 *
 * 根据环境变量配置决定注册哪些工具：
 * - TAVILY_API_KEY → 注册 web_search
 * - SILICONFLOW_API_KEY + S3 可达 → 注册 generate_image
 */
async function initTools(): Promise<void> {
  // 注册 web_search 工具
  if (process.env.TAVILY_API_KEY) {
    toolRegistry.register(createWebSearchTool(process.env.TAVILY_API_KEY))
  } else {
    console.warn('[Tools] TAVILY_API_KEY not configured, web_search disabled')
  }

  // 注册 generate_image 工具（需要探测网络可达性）
  if (process.env.SILICONFLOW_API_KEY) {
    const s3Available = await isSiliconFlowS3Available()
    if (s3Available) {
      toolRegistry.register(createImageGenerationTool())
    } else {
      console.warn('[Tools] SiliconFlow S3 不可达，generate_image disabled')
    }
  } else {
    console.warn('[Tools] SILICONFLOW_API_KEY not configured, generate_image disabled')
  }

  console.log(`[Tools] 已注册工具: ${
    toolRegistry.getAll().map(item => {
      return item.name
    })}`)
}

/**
 * 确保工具初始化完成
 *
 * 在使用任何工具前必须调用此函数
 * 函数会等待工具初始化完成后才返回
 */
export async function ensureToolsReady(): Promise<void> {
  if (!toolsInitPromise) {
    toolsInitPromise = initTools()
  }
  await toolsInitPromise
}

/** 全局工具注册表实例 */
export { toolRegistry }

// 导出类型
export type {
  Tool,
  ToolCall,
  ParsedToolCall,
  ToolCallResult,
  ToolMessage,
  OpenAIToolDefinition,
  IToolRegistry,
} from './types'

// 导出工具创建函数
export { createWebSearchTool } from './web-search'
export { createImageGenerationTool } from './image-generation'
export { ToolRegistry } from './registry'
