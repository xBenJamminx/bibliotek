import { ChatbotUIContext } from "@/context/context"
import { FC, useContext } from "react"
import { Button } from "../ui/button"
import { useChatHandler } from "./chat-hooks/use-chat-handler"

interface QuickReplyButtonsProps {}

const QUICK_REPLIES = [
  "Tell me all about Particle Ink",
  "Who is the Ink God?",
  "Who is Root and Bloom?",
  "What is Luminocity?",
  "What is the 2.5th dimension?"
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
