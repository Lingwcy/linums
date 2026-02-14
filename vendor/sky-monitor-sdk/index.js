function now() {
  return Date.now();
}

function safeUUID() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `m_${now()}_${Math.random().toString(16).slice(2)}`;
}

class LocalSession {
  constructor(monitor) {
    this._monitor = monitor;
    this.id = safeUUID();
    this.traceCount = 0;
    this.toolUsage = {};
  }

  incrementTraceCount() {
    this.traceCount += 1;
  }

  incrementToolUsage(name) {
    this.toolUsage[name] = (this.toolUsage[name] ?? 0) + 1;
  }
}

class LocalTrace {
  constructor(monitor, options) {
    this._monitor = monitor;
    this.traceId = safeUUID();
    this._aiMessageId = options?.aiMessageId ?? '';
    this._previousTraceId = options?.previousTraceId;
    this._startTime = undefined;
    this._firstChunkAt = undefined;
    this._chunks = 0;
    this._phaseStarts = new Map();
    this._toolStarts = new Map();
  }

  start() {
    this._startTime = now();
    this._monitor._emit('sse_start', {
      traceId: this.traceId,
      aiMessageId: this._aiMessageId,
      previousTraceId: this._previousTraceId,
    });
  }

  complete() {
    const duration = this._startTime ? now() - this._startTime : 0;
    this._monitor._emit('sse_complete', { traceId: this.traceId, ttlb: duration, duration });
  }

  error(message) {
    const duration = this._startTime ? now() - this._startTime : 0;
    this._monitor._emit('sse_error', { traceId: this.traceId, message, ttlb: duration, duration });
  }

  abort(reason) {
    const duration = this._startTime ? now() - this._startTime : 0;
    this._monitor._emit('sse_abort', { traceId: this.traceId, reason, ttlb: duration, duration });
  }

  firstChunk() {
    if (!this._startTime) return;
    if (this._firstChunkAt) return;
    this._firstChunkAt = now();
    const ttfb = this._firstChunkAt - this._startTime;
    this._monitor._emit('sse_first_chunk', { traceId: this.traceId, ttfb });
  }

  recordChunk() {
    this._chunks += 1;
    this._monitor._emit('sse_chunk', { traceId: this.traceId, chunkCount: this._chunks });
  }

  phaseStart(phase) {
    this._phaseStarts.set(phase, now());
    this._monitor._emit('phase_start', { traceId: this.traceId, phase });
  }

  phaseEnd(phase) {
    const startTime = this._phaseStarts.get(phase);
    const duration = startTime ? now() - startTime : undefined;
    this._monitor._emit('phase_end', { traceId: this.traceId, phase, duration });
  }

  toolStart(name, args, toolCallId) {
    const id = toolCallId ?? safeUUID();
    this._toolStarts.set(id, now());
    this._monitor._emit('tool_start', { traceId: this.traceId, name, args: args ?? {}, toolCallId: id });
  }

  toolEnd(name, result) {
    const toolCallId = result?.toolCallId ?? '';
    const startTime = this._toolStarts.get(toolCallId);
    const duration = startTime ? now() - startTime : undefined;
    this._monitor._emit('tool_end', { traceId: this.traceId, name, ...result, toolCallId, duration });
  }
}

class DebugBridge {
  constructor() {
    this._events = [];
    this._subs = new Set();
    this._errorReplayEvents = [];
    this._errorReplaySubs = new Set();
  }

  _pushEvent(evt) {
    this._events.unshift(evt);
    for (const fn of this._subs) fn(evt);
  }

  _pushErrorReplayEvent(evt) {
    this._errorReplayEvents.unshift(evt);
    for (const fn of this._errorReplaySubs) fn(evt);
  }

  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }

  subscribeErrorReplay(fn) {
    this._errorReplaySubs.add(fn);
    return () => this._errorReplaySubs.delete(fn);
  }

  getEvents() {
    return [...this._events];
  }

  getEventsByType(type) {
    return this._events.filter((e) => e.type === type);
  }

  getStats() {
    const stats = {};
    for (const e of this._events) stats[e.type] = (stats[e.type] ?? 0) + 1;
    return stats;
  }

  getErrorReplayEvents() {
    return [...this._errorReplayEvents];
  }

  clearEvents() {
    this._events = [];
  }
}

export class Monitor {
  constructor(options) {
    this._options = options;
    this._plugins = [];
    this._debugBridge = null;
    this._context = { appId: options?.appId ?? 'app' };
  }

  use(plugin) {
    this._plugins.push(plugin);
    if (plugin && typeof plugin.setup === 'function') {
      plugin.setup(this);
    }
  }

  _emit(type, data) {
    const evt = {
      id: safeUUID(),
      type,
      timestamp: now(),
      data: data ?? {},
      context: this._context,
    };

    if (this._debugBridge) {
      this._debugBridge._pushEvent(evt);
    }

    // Transport/offline queue plugins omitted in local build.
    return evt;
  }
}

export class TracePlugin {
  setup(monitor) {
    let currentTrace = null;

    monitor.createTrace = (options) => new LocalTrace(monitor, options);
    monitor.setCurrentTrace = (trace) => {
      currentTrace = trace;
    };
    monitor.getCurrentTrace = () => currentTrace;
  }
}

export class SessionPlugin {
  setup(monitor) {
    let session = null;

    monitor.startSession = () => {
      session = new LocalSession(monitor);
      monitor._emit('session_start', { sessionId: session.id });
    };

    monitor.endSession = () => {
      if (!session) return;
      monitor._emit('session_end', { sessionId: session.id, traceCount: session.traceCount, toolUsage: session.toolUsage });
      session = null;
    };

    monitor.getSession = () => session;
  }
}

export class DebugPlugin {
  constructor(options) {
    this._options = options ?? {};
  }

  setup(monitor) {
    monitor._debugBridge = new DebugBridge();

    try {
      if (typeof window !== 'undefined') {
        window.__SKY_MONITOR_DEBUG__ = monitor._debugBridge;
      }
    } catch {
      // ignore
    }
  }
}

// The following plugins are placeholders for compatibility.
export class TransportPlugin {
  constructor(options) {
    this._options = options ?? {};
  }
  setup() {}
}
export class DedupePlugin {
  constructor(options) {
    this._options = options ?? {};
  }
  setup() {}
}
export class ErrorPlugin {
  constructor(options) {
    this._options = options ?? {};
  }
  setup() {}
}
export class PerformancePlugin {
  constructor(options) {
    this._options = options ?? {};
  }
  setup() {}
}
export class FetchPlugin {
  constructor(options) {
    this._options = options ?? {};
  }
  setup() {}
}
export class OfflineQueuePlugin {
  constructor(options) {
    this._options = options ?? {};
  }
  setup() {}
}

export class BrowserStorage {
  constructor() {}
}

export class BrowserTransport {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }
}
