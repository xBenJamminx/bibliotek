import { ChatbotUIContext } from "@/context/context"
import { FC, useContext } from "react"
import { Button } from "../ui/button"
import { useChatHandler } from "./chat-hooks/use-chat-handler"

interface QuickReplyButtonsProps {}

const QUICK_REPLIES = [
  "Can you explain that in simpler terms?",
  "What are the pros and cons?",
  "Can you give me an example?",
  "What's the best approach?",
  "Tell me more about this"
]

export const QuickReplyButtons: FC<QuickReplyButtonsProps> = ({}) => {
  const { chatMessages, userInput, setUserInput } = useContext(ChatbotUIContext)
  const { handleSendMessage } = useChatHandler()

  const handleQuickReply = (reply: string) => {
    setUserInput(reply)
    handleSendMessage(reply, chatMessages, false)
  }

  // Only show if there are messages and we're not currently typing
  if (chatMessages.length === 0 || userInput.trim()) {
    return null
  }

  return (
    <div className="animate-slide-in-up mt-2 flex flex-wrap gap-2">
      {QUICK_REPLIES.map((reply, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className="text-xs transition-transform duration-200 hover:scale-105"
          onClick={() => handleQuickReply(reply)}
        >
          {reply}
        </Button>
      ))}
    </div>
  )
}
