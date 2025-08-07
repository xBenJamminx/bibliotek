import { FC } from "react"

interface ThinkingAnimationProps {
  message?: string
}

export const ThinkingAnimation: FC<ThinkingAnimationProps> = ({
  message = "AI is thinking"
}) => {
  return (
    <div className="text-muted-foreground flex items-center space-x-3">
      <div className="flex space-x-1">
        <div className="size-3 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
        <div className="size-3 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
        <div className="size-3 animate-bounce rounded-full bg-blue-500"></div>
      </div>
      <span className="text-sm font-medium">{message}...</span>
    </div>
  )
}
