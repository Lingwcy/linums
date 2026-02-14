"use client"

import { useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Check, Copy, Pencil, Plus, Trash2 } from "lucide-react"

import { useModelStore } from "@/features/setting/store/model.store"
import {
    MODEL_ZOO_PROVIDERS,
    type ModelProviderItem,
    type ProviderId,
    useModelZooStore,
} from "@/features/setting/store/modelzoo.store"

const PAGE_SIZE = 12

export function ModelConfig() {
    const providerId = useModelZooStore(s => s.providerId)
    const keyword = useModelZooStore(s => s.keyword)
    const currentPage = useModelZooStore(s => s.currentPage)
    const setProviderId = useModelZooStore(s => s.setProviderId)
    const setKeyword = useModelZooStore(s => s.setKeyword)
    const setCurrentPage = useModelZooStore(s => s.setCurrentPage)
    const resetQuery = useModelZooStore(s => s.resetQuery)
    const providerModels = useModelZooStore(s => s.providerModels)
    const providerStatus = useModelZooStore(s => s.providerStatus)
    const providerError = useModelZooStore(s => s.providerError)
    const loadProviderModels = useModelZooStore(s => s.loadProviderModels)

    const addedModel = useModelStore(s => s.addedModel)
    const addModel = useModelStore(s => s.addModel)
    const removeModel = useModelStore(s => s.removeModel)

    const activeProvider = useMemo(
        () => MODEL_ZOO_PROVIDERS.find(p => p.id === providerId) ?? MODEL_ZOO_PROVIDERS[0],
        [providerId]
    )

    const activeModels = providerModels[providerId] ?? []
    const activeStatus = providerStatus[providerId]
    const activeError = providerError[providerId]

    useEffect(() => {
        // OpenRouter 模型需要异步加载；其它 provider 后续也可复用这个通路
        loadProviderModels(providerId)
    }, [providerId, loadProviderModels])

    const isModelAdded = (id: string, pId: ProviderId) => addedModel.some(m => m.id === id && m.providerId === pId)

    const addCloudModelToLocal = (m: ModelProviderItem) => {
        addModel({
            id: m.id,
            name: m.name,
            providerId: m.providerId,
            description: m.description,
            category: m.category,
            isReasoningModel: m.isReasoningModel,
            supportsThinkingToggle: m.supportsThinkingToggle,
            maxTokens: m.maxTokens,
        })
    }

    const filteredModels = useMemo(() => {
        const normalized = keyword.trim().toLowerCase()
        if (!normalized) return activeModels

        return activeModels.filter(m => {
            return (
                m.name.toLowerCase().includes(normalized) ||
                m.id.toLowerCase().includes(normalized) ||
                (m.description ?? "").toLowerCase().includes(normalized)
            )
        })
    }, [activeModels, keyword])

    const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE))

    const safeCurrentPage = Math.min(currentPage, totalPages)
    const paginatedModels = useMemo(() => {
        const start = (safeCurrentPage - 1) * PAGE_SIZE
        return filteredModels.slice(start, start + PAGE_SIZE)
    }, [filteredModels, safeCurrentPage])

    const hasPrevPage = safeCurrentPage > 1
    const hasNextPage = safeCurrentPage < totalPages

    const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages))
    const prevPage = () => hasPrevPage && setCurrentPage(Math.max(1, safeCurrentPage - 1))
    const nextPage = () => hasNextPage && setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))

    const onSelectProvider = (next: ProviderId) => {
        setProviderId(next)
        resetQuery()
    }

    return (
        <div className="flex flex-col space-y-3">
            <div className="flex gap-4 w-full">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="rounded-sm" size='sm'>供应商：{activeProvider.label}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>模型提供商</DropdownMenuLabel>
                        <DropdownMenuGroup>
                            <DropdownMenuItem onSelect={() => onSelectProvider("bigmodel")}>智谱</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onSelectProvider("siliconflow")}>硅基流动</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onSelectProvider("openrouter")}>OpenRouter</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onSelectProvider("openai")}>OpenAI</DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <input
                    placeholder="筛选模型"
                    value={keyword}
                    onChange={(e) => {
                        setKeyword(e.target.value)
                        setCurrentPage(1)
                    }}
                    className="flex-1 h-8 pl-3 rounded-md border bg-background text-sm outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
            </div>
            <div className="flex-1">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
                    {/* 左侧：云端模型 */}
                    <div className="min-w-0 space-y-2">
                        <ScrollArea className="h-[calc(90vh-170px)] w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 p-1">
                                {activeStatus === "loading" ? (
                                    <div className="text-sm text-muted-foreground p-4">加载中...</div>
                                ) : activeStatus === "error" ? (
                                    <div className="text-sm text-muted-foreground p-4">加载失败：{activeError ?? "未知错误"}</div>
                                ) : paginatedModels.length > 0 ? (
                                    paginatedModels.map(item => (
                                        <ModelProviderCard
                                            key={item.id}
                                            data={item}
                                            onAddToLocal={addCloudModelToLocal}
                                            isAdded={isModelAdded(item.id, item.providerId)}
                                        />
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground p-4">暂无可用模型</div>
                                )}
                            </div>
                            <ScrollBar orientation="vertical" />
                        </ScrollArea>

                        {/* 分页组件（仅云端模型） */}
                        {totalPages > 1 && (
                            <div className="flex justify-center px-4 pb-4">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={prevPage}
                                                className={!hasPrevPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>

                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <PaginationItem key={pageNum}>
                                                    <PaginationLink
                                                        onClick={() => goToPage(pageNum)}
                                                        isActive={safeCurrentPage === pageNum}
                                                        className="cursor-pointer"
                                                    >
                                                        {pageNum}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        })}

                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={nextPage}
                                                className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </div>

                    {/* 右侧：已添加（全局） */}
                    <div className="min-w-0">
                        <div className="text-sm font-semibold px-1">已添加</div>
                        <ScrollArea className="h-[calc(90vh-170px)] w-full">
                            <div className="grid grid-cols-1 gap-4 p-1">
                                {addedModel.length > 0 ? (
                                    addedModel.map(m => (
                                        <ModelProviderCard
                                            key={`${m.providerId}:${m.id}`}
                                            status="local"
                                            data={{ id: m.id, name: m.name, providerId: m.providerId }}
                                            onDelete={() => removeModel(m.id, m.providerId)}
                                        />
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground p-4">还没有添加常用模型</div>
                                )}
                            </div>
                            <ScrollBar orientation="vertical" />
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </div>
    )
}
interface ModelProviderCardProps {
    data: ModelProviderItem
    status?: 'cloud' | 'local'
    onDelete?: (m: ModelProviderItem) => void
    onAddToLocal?: (m: ModelProviderItem) => void
    isAdded?: boolean 
}
export default function ModelProviderCard({
    data,
    status = 'cloud',
    onDelete,
    onAddToLocal,
    isAdded = false
}: ModelProviderCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="">
                    <div className="text-md flex justify-between items-center space-x-2 ">
                        <span className="truncate text-[18px]">{data?.name || '未知模型'}</span>
                        {
                            status == 'cloud' ?
                                <Button
                                    className="h-8 text-xs rounded-md cursor-pointer"
                                    disabled={isAdded}
                                    onClick={() => !isAdded && onAddToLocal?.(data)}
                                    variant={isAdded ? "secondary" : "default"}
                                >
                                    {isAdded ? (
                                        <span className="flex items-center gap-1">
                                            已添加
                                        </span>
                                    ) : (
                                        <>
                                            添加常用
                                        </>
                                    )}
                                </Button> :
                                <div className="space-x-1.5 flex">
                                    <Button
                                        variant="ghost"
                                        className="h-8 w-8 text-xs rounded-md cursor-pointer"
                                        onClick={() => onDelete?.(data)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                        }
                    </div>
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-2">
                        {data.category && <Badge variant="secondary">{data.category}</Badge>}
                        {data.isReasoningModel && <Badge variant="secondary">推理</Badge>}
                        {data.supportsThinkingToggle && <Badge variant="secondary">可切换思考</Badge>}
                        {(data.name.includes("免费") || (data.description ?? "").includes("免费") || data.id.includes("free")) && (
                            <Badge variant="secondary">免费</Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {data.description && <div className="text-xs text-muted-foreground line-clamp-2">{data.description}</div>}
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="truncate">ID: {data.id}</span>
                    {typeof navigator !== "undefined" && status === "cloud" && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => navigator.clipboard?.writeText(data.id)}
                            aria-label="复制模型 ID"
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
                {typeof data.maxTokens === "number" && (
                    <div className="text-xs text-muted-foreground">最大 tokens: {data.maxTokens.toLocaleString()}</div>
                )}
            </CardContent>
        </Card>
    )
}
