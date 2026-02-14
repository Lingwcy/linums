import { ReactNode, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileBox, BookAlert, Boxes } from "lucide-react"
import { cn } from '@/lib/utils'
import { ModelConfig } from "./components/ModelConfig"
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
      <DialogContent className="w-[95vw] max-w-5xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>
        <Setting />
      </DialogContent>
    </Dialog>
  )
}



function Setting() {
  const [activeTab, setActiveTab] = useState<'模型' | '参数' | '关于'>('模型')

  return (
    <div className="flex space-x-3">
      {/* 侧边栏 */}
      <div className="flex space-y-1 flex-col justify-start items-center w-[75px] ">
        <SettingItem
          title="模型"
          active={activeTab === '模型'}
          onClick={() => setActiveTab('模型')}
          icon={<Boxes className="w-5 h-5" />} />
        <SettingItem
          title="参数"
          active={activeTab === '参数'}
          onClick={() => setActiveTab('参数')}
          icon={<FileBox className="w-5 h-5" />} />
        <SettingItem
          title="关于"
          active={activeTab === '关于'}
          onClick={() => setActiveTab('关于')}
          icon={<BookAlert className="w-5 h-5" />} />
      </div>
      {/* 主内容 */}
      <div className="flex-1 h-[80vh] ">
        {activeTab === '模型' && (
          <ModelConfig></ModelConfig>
        )}

        {activeTab === '参数' && (
          <div className="text-sm">
            <div className="font-semibold">参数</div>
            <div className="opacity-80">在这里调整对话参数</div>
          </div>
        )}

        {activeTab === '关于' && (
          <div className="text-sm">
            <div className="font-semibold">关于</div>
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex rounded-sm cursor-pointer justify-center items-center gap-1 w-full h-7 hover:bg-[hsl(var(--sidebar-hover))]',
        active && 'bg-[hsl(var(--sidebar-hover))]'
      )}
    >
      {icon}
      <span className="text-md font-semibold">{title}</span>
    </button>
  )
}