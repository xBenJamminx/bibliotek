import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { IconMessagePlus } from "@tabler/icons-react"
import { FC } from "react"
import { WithTooltip } from "../ui/with-tooltip"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { handleNewChat } = useChatHandler()

  return (
    <>
      {/* New Chat button - only visible */}
      <WithTooltip
        delayDuration={200}
        display={<div>Start a new chat</div>}
        trigger={
          <div className="mt-1">
            <IconMessagePlus
              className="cursor-pointer transition-transform duration-200 hover:scale-110 hover:opacity-50"
              size={24}
              onClick={handleNewChat}
            />
          </div>
        }
      />
    </>
  )
}
