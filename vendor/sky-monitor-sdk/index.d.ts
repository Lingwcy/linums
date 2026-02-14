export type ToolResult = {
  toolCallId?: string
  success: boolean
  imageUrl?: string
  width?: number
  height?: number
  resultCount?: number
  sources?: Array<{ title: string; url: string; snippet?: string }>
  error?: string
} & Record<string, unknown>

export type MonitorEvent = {
  id: string
  type: string
  timestamp: number
  data: Record<string, unknown>
  context?: Record<string, unknown>
}

export type ErrorReplayEvent = {
  id: string
  type: 'replay_scheduled' | 'replay_uploaded' | string
  timestamp: number
  errorMessage?: string
  payload?: unknown
} & Record<string, unknown>

export interface Trace {
  traceId: string
  start(): void
  complete(): void
  error(message: string): void
  abort(reason: string): void
  firstChunk(): void
  recordChunk(): void
  phaseStart(phase: string): void
  phaseEnd(phase: string): void
  toolStart(name: string, args?: Record<string, unknown>, toolCallId?: string): void
  toolEnd(name: string, result: ToolResult): void
}

export interface Session {
  id: string
  traceCount: number
  toolUsage: Record<string, number>
  incrementTraceCount(): void
  incrementToolUsage(name: string): void
}

export interface IMonitor {
  use(plugin: unknown): void
}

export type MonitorOptions = {
  appId: string
  debug?: boolean
  storage?: unknown
}

export class Monitor implements IMonitor {
  constructor(options: MonitorOptions)
  use(plugin: unknown): void
}

export class TracePlugin {
  constructor(options?: Record<string, unknown>)
}
export class SessionPlugin {
  constructor(options?: Record<string, unknown>)
}
export class TransportPlugin {
  constructor(options?: Record<string, unknown>)
}
export class DedupePlugin {
  constructor(options?: Record<string, unknown>)
}
export class ErrorPlugin {
  constructor(options?: Record<string, unknown>)
}
export class PerformancePlugin {
  constructor(options?: Record<string, unknown>)
}
export class FetchPlugin {
  constructor(options?: Record<string, unknown>)
}
export class OfflineQueuePlugin {
  constructor(options?: Record<string, unknown>)
}
export class DebugPlugin {
  constructor(options?: Record<string, unknown>)
}

export class BrowserStorage {
  constructor()
}

export class BrowserTransport {
  constructor(endpoint: string)
}
