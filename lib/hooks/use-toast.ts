/**
 * Toast 通知 Hook
 *
 * 受 react-hot-toast 启发的 Toast 通知系统。
 * 提供简洁的 API 显示临时通知消息。
 *
 * 功能：
 * - 显示临时通知（自动消失）
 * - 支持成功/错误/警告等类型
 * - 最多同时显示 3 条通知
 * - 3 秒后自动移除
 *
 * @module lib/hooks/use-toast
 */

"use client"

// Inspired by react-hot-tout library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

/** 最多同时显示的通知数量 */
const TOAST_LIMIT = 3
/** 通知自动移除的延迟时间（毫秒） */
const TOAST_REMOVE_DELAY = 3000

/**
 * Toast 通知数据结构
 */
type ToasterToast = ToastProps & {
  /** 唯一标识 */
  id: string
  /** 标题 */
  title?: React.ReactNode
  /** 描述 */
  description?: React.ReactNode
  /** 操作按钮 */
  action?: ToastActionElement
}

/**
 * Action 类型定义
 *
 * 支持的操作：
 * - ADD_TOAST: 添加新通知
 * - UPDATE_TOAST: 更新通知内容
 * - DISMISS_TOAST: 隐藏通知
 * - REMOVE_TOAST: 移除通知
 */
type ActionType = {
  ADD_TOAST: "ADD_TOAST"
  UPDATE_TOAST: "UPDATE_TOAST"
  DISMISS_TOAST: "DISMISS_TOAST"
  REMOVE_TOAST: "REMOVE_TOAST"
}

/** 全局计数器，用于生成唯一 ID */
let count = 0

/**
 * 生成唯一的 Toast ID
 *
 * @returns 字符串形式的唯一 ID
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

/**
 * Toast Action 联合类型
 */
type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

/**
 * Toast Store 状态
 */
interface State {
  /** 当前所有 Toast 通知列表 */
  toasts: ToasterToast[]
}

/** 存储定时器的 Map，用于自动移除 Toast */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * 将 Toast 添加到移除队列
 *
 * 设置定时器，在 TOAST_REMOVE_DELAY 后自动移除该 Toast。
 *
 * @param toastId - Toast 唯一标识
 */
const addToRemoveQueue = (toastId: string) => {
  // 如果已有定时器，跳过
  if (toastTimeouts.has(toastId)) {
    return
  }

  // 设置定时器自动移除
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

/**
 * Toast Reducer - 处理状态更新
 *
 * 根据 Action 类型更新 Toast 列表：
 * - ADD_TOAST: 添加到列表头部，保留最多 TOAST_LIMIT 条
 * - UPDATE_TOAST: 更新指定 Toast 的内容
 * - DISMISS_TOAST: 隐藏指定 Toast（或全部）
 * - REMOVE_TOAST: 从列表移除指定 Toast（或全部）
 *
 * @param state - 当前状态
 * @param action - 要执行的操作
 * @returns 新状态
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // 添加到列表头部，保留最多 TOAST_LIMIT 条
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      // 更新指定 Toast
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // 副作用：设置自动移除定时器
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        // 隐藏所有 Toast
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        // 移除所有
        return {
          ...state,
          toasts: [],
        }
      }
      // 移除指定 Toast
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

/** 订阅状态变化的监听器列表 */
const listeners: Array<(state: State) => void> = []

/** 内存中的状态（用于 SSR） */
let memoryState: State = { toasts: [] }

/**
 * 派发 Action
 *
 * 更新内存状态并通知所有监听器。
 *
 * @param action - 要执行的 Action
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

/** Toast 类型（不含 id） */
type Toast = Omit<ToasterToast, "id">

/**
 * 创建 Toast 通知
 *
 * 简化版 API，用于快速创建通知。
 * 自动生成唯一 ID，设置打开状态。
 *
 * @param props - Toast 属性
 * @returns 包含 dismiss 和 update 方法的对象
 */
function toast({ ...props }: Toast) {
  const id = genId()

  /**
   * 更新 Toast 内容
   */
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })

  /**
   * 隐藏/移除 Toast
   */
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  // 添加到通知队列
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * useToast Hook
 *
 * 在组件中使用 Toast 通知：
 * - 访问当前 Toast 列表
 * - 创建新通知
 * - 手动隐藏通知
 *
 * @example
 * ```tsx
 * const { toast, dismiss } = useToast()
 *
 * // 显示通知
 * toast({ title: '成功', description: '操作完成' })
 *
 * // 显示错误通知
 * toast({ title: '错误', variant: 'destructive' })
 * ```
 *
 * @returns Toast 状态和方法
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  // 订阅状态变化
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      // 组件卸载时移除监听器
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, []) // 只在组件挂载/卸载时执行，不依赖 state

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
