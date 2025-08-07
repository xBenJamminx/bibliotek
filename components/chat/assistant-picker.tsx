import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { IconRobotFace } from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useRef } from "react"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"

interface AssistantPickerProps {}

export const AssistantPicker: FC<AssistantPickerProps> = ({}) => {
  const {
    assistants,
    openaiAssistants,
    assistantImages,
    focusAssistant,
    atCommand,
    isAssistantPickerOpen,
    setIsAssistantPickerOpen
  } = useContext(ChatbotUIContext)

  const { handleSelectAssistant, handleSelectOpenaiAssistant } =
    usePromptAndCommand()

  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (focusAssistant && itemsRef.current[0]) {
      itemsRef.current[0].focus()
    }
  }, [focusAssistant])

  const filteredLocalAssistants = assistants.filter(assistant =>
    assistant.name.toLowerCase().includes(atCommand.toLowerCase())
  )

  const filteredOpenaiAssistants = openaiAssistants.filter(assistant =>
    assistant.name.toLowerCase().includes(atCommand.toLowerCase())
  )

  const allAssistants = [
    ...filteredLocalAssistants,
    ...filteredOpenaiAssistants
  ]

  const handleOpenChange = (isOpen: boolean) => {
    setIsAssistantPickerOpen(isOpen)
  }

  const callSelectAssistant = (assistant: Tables<"assistants"> | any) => {
    if (assistant.id.startsWith("asst_")) {
      // OpenAI assistant
      handleSelectOpenaiAssistant(assistant)
    } else {
      // Local assistant
      handleSelectAssistant(assistant as Tables<"assistants">)
    }
    handleOpenChange(false)
  }

  const getKeyDownHandler =
    (index: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault()
        handleOpenChange(false)
      } else if (e.key === "Enter") {
        e.preventDefault()
        callSelectAssistant(allAssistants[index])
      } else if (
        (e.key === "Tab" || e.key === "ArrowDown") &&
        !e.shiftKey &&
        index === allAssistants.length - 1
      ) {
        e.preventDefault()
        itemsRef.current[0]?.focus()
      } else if (e.key === "ArrowUp" && !e.shiftKey && index === 0) {
        // go to last element if arrow up is pressed on first element
        e.preventDefault()
        itemsRef.current[itemsRef.current.length - 1]?.focus()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const prevIndex =
          index - 1 >= 0 ? index - 1 : itemsRef.current.length - 1
        itemsRef.current[prevIndex]?.focus()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        const nextIndex = index + 1 < itemsRef.current.length ? index + 1 : 0
        itemsRef.current[nextIndex]?.focus()
      }
    }

  return (
    <>
      {isAssistantPickerOpen && (
        <div className="bg-background flex flex-col space-y-1 rounded-xl border-2 p-2 text-sm">
          {allAssistants.length === 0 ? (
            <div className="text-md flex h-14 cursor-pointer items-center justify-center italic hover:opacity-50">
              No matching assistants.
            </div>
          ) : (
            <>
              {allAssistants.map((item, index) => (
                <div
                  key={item.id}
                  ref={ref => {
                    itemsRef.current[index] = ref
                  }}
                  tabIndex={0}
                  className="hover:bg-accent focus:bg-accent flex cursor-pointer items-center rounded p-2 focus:outline-none"
                  onClick={() => callSelectAssistant(item)}
                  onKeyDown={getKeyDownHandler(index)}
                >
                  {item.id.startsWith("asst_") ? (
                    // OpenAI assistant - show different icon
                    <div className="flex size-8 items-center justify-center rounded bg-blue-500">
                      <IconRobotFace size={24} className="text-white" />
                    </div>
                  ) : item.image_path ? (
                    <Image
                      src={
                        assistantImages.find(
                          image => image.path === item.image_path
                        )?.url || ""
                      }
                      alt={item.name}
                      width={32}
                      height={32}
                      className="rounded"
                    />
                  ) : (
                    <IconRobotFace size={32} />
                  )}

                  <div className="ml-3 flex flex-col">
                    <div className="font-bold">{item.name}</div>

                    <div className="truncate text-sm opacity-80">
                      {item.description || "No description."}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  )
}
