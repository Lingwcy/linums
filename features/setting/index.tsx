import { ReactNode, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from "haiku-react-ui"
import { BookAlert, Boxes, Key } from "lucide-react"
import { cn } from '@/lib/utils'
import { ModelConfig } from "./components/ModelConfig"
import { ApiKeyConfig } from "./components/ApiKeyConfig"
interface SettingDialogProps {
  setOpen: (value: boolean) => void
  open: boolean
}

export default function SettingDialog({
  open,
  setOpen
}: SettingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-5xl h-[85vh] max-h-[85vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>
        <Setting />
      </DialogContent>
    </Dialog>
  )
}

function Setting() {
  const [activeTab, setActiveTab] = useState<'模型' | 'API Key' | '关于'>('模型')

  return (
    <div className="flex h-[calc(85vh-60px)]">
      {/* 侧边栏 */}
      <div className="w-28 space-y-2 flex-shrink-0 bg-muted/20 flex flex-col py-2">
        <SettingItem
          title="模型"
          active={activeTab === '模型'}
          onClick={() => setActiveTab('模型')}
          icon={<Boxes className="w-4 h-4" />} />
        <SettingItem
          title="API Key"
          active={activeTab === 'API Key'}
          onClick={() => setActiveTab('API Key')}
          icon={<Key className="w-4 h-4" />} />
        <SettingItem
          title="关于"
          active={activeTab === '关于'}
          onClick={() => setActiveTab('关于')}
          icon={<BookAlert className="w-4 h-4" />} />
      </div>
      {/* 主内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === '模型' && (
          <ModelConfig></ModelConfig>
        )}

        {activeTab === 'API Key' && (
          <ApiKeyConfig></ApiKeyConfig>
        )}

        {activeTab === '关于' && (
          <div className="p-6 text-sm">
            <div className="font-semibold text-lg mb-2">关于</div>
            <div className="opacity-80">应用信息与说明</div>
          </div>
        )}
      </div>
    </div>
  )
}

interface SettingItemProps {
  title: string,
  icon: ReactNode
  active: boolean
  onClick: () => void
}
function SettingItem({
  title,
  icon,
  active,
  onClick,
}: SettingItemProps) {
  return (
    <Button
      variant="text"
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-2 w-full px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors',
        active
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {icon}
      <span>{title}</span>
    </Button>
  )
}
