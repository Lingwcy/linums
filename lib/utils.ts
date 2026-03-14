/**
 * 通用工具函数
 *
 * 提供 clsx 和 tailwind-merge 的组合功能
 * 用于合并 CSS 类名
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 CSS 类名
 *
 * 组合了 clsx（条件类名）和 tailwind-merge（解决冲突）的功能
 *
 * @param inputs - 类名参数
 * @returns 合并后的类名字符串
 *
 * @example
 * cn('px-2 py-1', isActive && 'bg-blue-500', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
