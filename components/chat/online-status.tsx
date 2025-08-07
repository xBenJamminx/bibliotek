import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { FC, useContext } from "react"

interface OnlineStatusProps {}

export const OnlineStatus: FC<OnlineStatusProps> = ({}) => {
  const { isGenerating } = useContext(ChatbotUIContext)

  return (
    <div className="text-muted-foreground flex items-center space-x-2 text-xs">
      <div
        className={cn(
          "size-2 rounded-full",
          isGenerating
            ? "animate-pulse bg-yellow-500"
            : "animate-pulse bg-green-500"
        )}
      ></div>
      <span>{isGenerating ? "AI Thinking..." : "AI Online"}</span>
    </div>
  )
}
