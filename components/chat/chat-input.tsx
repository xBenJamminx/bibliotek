import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import {
  IconBolt,
  IconCirclePlus,
  IconPlayerStopFilled,
  IconSend
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { useChatHistoryHandler } from "./chat-hooks/use-chat-history"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"

interface ChatInputProps {}

export const ChatInput: FC<ChatInputProps> = ({}) => {
  const { t } = useTranslation()

  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)

  const {
    isAssistantPickerOpen,
    focusAssistant,
    setFocusAssistant,
    userInput,
    chatMessages,
    isGenerating,
    selectedPreset,
    selectedAssistant,
    focusPrompt,
    setFocusPrompt,
    focusFile,
    focusTool,
    setFocusTool,
    isToolPickerOpen,
    isPromptPickerOpen,
    setIsPromptPickerOpen,
    isFilePickerOpen,
    setFocusFile,
    chatSettings,
    selectedTools,
    setSelectedTools,
    assistantImages,
    setUserInput
  } = useContext(ChatbotUIContext)

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const { handleInputChange } = usePromptAndCommand()

  const { filesToAccept, handleSelectDeviceFile } = useSelectFileHandler()

  const {
    setNewMessageContentToNextUserMessage,
    setNewMessageContentToPreviousUserMessage
  } = useChatHistoryHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
  }, [selectedPreset, selectedAssistant])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    console.log("handleKeyDown called with key:", event.key)
    console.log("isTyping state:", isTyping)
    console.log("userInput state:", userInput)

    if (!isTyping && event.key === "Enter" && !event.shiftKey) {
      console.log(
        "Enter key condition met, preventing default and sending message"
      )
      event.preventDefault()
      setIsPromptPickerOpen(false)
      handleSendMessage(userInput, chatMessages, false)
    } else {
      console.log("Enter key condition NOT met:")
      console.log("- isTyping:", isTyping)
      console.log("- event.key === 'Enter':", event.key === "Enter")
      console.log("- !event.shiftKey:", !event.shiftKey)
    }

    // Consolidate conditions to avoid TypeScript error
    if (
      isPromptPickerOpen ||
      isFilePickerOpen ||
      isToolPickerOpen ||
      isAssistantPickerOpen
    ) {
      if (
        event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault()
        // Toggle focus based on picker type
        if (isPromptPickerOpen) setFocusPrompt(!focusPrompt)
        if (isFilePickerOpen) setFocusFile(!focusFile)
        if (isToolPickerOpen) setFocusTool(!focusTool)
        if (isAssistantPickerOpen) setFocusAssistant(!focusAssistant)
      }
    }

    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }

    //use shift+ctrl+up and shift+ctrl+down to navigate through chat history
    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }

    if (
      isAssistantPickerOpen &&
      (event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault()
      setFocusAssistant(!focusAssistant)
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const imagesAllowed = LLM_LIST.find(
      llm => llm.modelId === chatSettings?.model
    )?.imageInput

    const items = event.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        if (!imagesAllowed) {
          toast.error(
            `Images are not supported for this model. Use models like GPT-4 Vision instead.`
          )
          return
        }
        const file = item.getAsFile()
        if (!file) return
        handleSelectDeviceFile(file)
      }
    }
  }

  return (
    <>
      <div className="flex flex-col flex-wrap justify-center gap-2">
        <ChatFilesDisplay />

        {selectedTools &&
          selectedTools.map((tool, index) => (
            <div
              key={index}
              className="flex justify-center"
              onClick={() =>
                setSelectedTools(
                  selectedTools.filter(
                    selectedTool => selectedTool.id !== tool.id
                  )
                )
              }
            >
              <div className="flex cursor-pointer items-center justify-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 hover:opacity-50">
                <IconBolt size={20} />

                <div>{tool.name}</div>
              </div>
            </div>
          ))}

        {selectedAssistant && (
          <div className="border-primary mx-auto flex w-fit items-center space-x-2 rounded-lg border p-1.5">
            {selectedAssistant.image_path && (
              <Image
                className="rounded"
                src={
                  assistantImages.find(
                    img => img.path === selectedAssistant.image_path
                  )?.base64
                }
                width={28}
                height={28}
                alt={selectedAssistant.name}
              />
            )}

            <div className="text-sm font-bold">
              Talking to {selectedAssistant.name}
            </div>
          </div>
        )}
      </div>

      <div className="border-input relative mt-3 flex min-h-[60px] w-full items-center justify-center rounded-xl border-2">
        {/* Test div to verify rendering */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            left: "0",
            background: "yellow",
            padding: "5px",
            zIndex: 10000
          }}
        >
          TEST: Input field should be below
        </div>

        {/* Simple test input */}
        <input
          type="text"
          placeholder="SIMPLE TEST INPUT"
          style={{
            position: "absolute",
            top: "-30px",
            left: "0",
            background: "green",
            color: "white",
            padding: "5px",
            zIndex: 10001,
            width: "200px"
          }}
          onChange={e =>
            console.log("SIMPLE TEST INPUT onChange:", e.target.value)
          }
          onClick={() => console.log("SIMPLE TEST INPUT clicked")}
          onFocus={() => console.log("SIMPLE TEST INPUT focused")}
        />

        {/* Isolated test textarea */}
        <textarea
          placeholder="ISOLATED TEST TEXTAREA"
          style={{
            position: "absolute",
            top: "-60px",
            left: "0",
            background: "blue",
            color: "white",
            padding: "5px",
            zIndex: 10002,
            width: "200px",
            height: "50px"
          }}
          onChange={e =>
            console.log("ISOLATED TEST TEXTAREA onChange:", e.target.value)
          }
          onClick={() => console.log("ISOLATED TEST TEXTAREA clicked")}
          onFocus={() => console.log("ISOLATED TEST TEXTAREA focused")}
          onKeyDown={e =>
            console.log("ISOLATED TEST TEXTAREA onKeyDown:", e.key)
          }
        />

        <div className="absolute bottom-[76px] left-0 max-h-[300px] w-full overflow-auto rounded-xl dark:border-none">
          <ChatCommandInput />
        </div>

        <>
          <IconCirclePlus
            className="absolute bottom-[12px] left-3 cursor-pointer p-1 hover:opacity-50"
            size={32}
            onClick={() => fileInputRef.current?.click()}
          />

          {/* Hidden input to select files from device */}
          <Input
            ref={fileInputRef}
            className="hidden"
            type="file"
            onChange={e => {
              if (!e.target.files) return
              handleSelectDeviceFile(e.target.files[0])
            }}
            accept={filesToAccept}
          />
        </>

        {/* Temporary debug textarea */}
        <textarea
          className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none rounded-md border-none bg-transparent px-14 py-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="DEBUG: Try typing here"
          value={userInput}
          onChange={e => {
            console.log("DEBUG textarea onChange:", e.target.value)
            setUserInput(e.target.value)
          }}
          style={{
            position: "absolute",
            top: "-100px",
            left: "0",
            zIndex: 9999
          }}
        />

        {/* Temporary regular textarea instead of TextareaAutosize */}
        <textarea
          ref={chatInputRef}
          className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none rounded-md border-none bg-transparent px-14 py-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t(
            // `Ask anything. Type "@" for assistants, "/" for prompts, "#" for files, and "!" for tools.`
            `Ask anything. Type @  /  #  !`
          )}
          value={userInput}
          onChange={e => {
            console.log("Main textarea onChange:", e.target.value)
            console.log("Event target:", e.target)
            console.log("Event target disabled:", e.target.disabled)
            console.log("Event target readonly:", e.target.readOnly)
            handleInputChange(e.target.value)
          }}
          onKeyDown={e => {
            console.log("Main textarea onKeyDown:", e.key)
            console.log("Event target:", e.target)
            handleKeyDown(e)
          }}
          onPaste={handlePaste}
          onCompositionStart={() => {
            console.log("Composition start - setting isTyping to true")
            setIsTyping(true)
          }}
          onCompositionEnd={() => {
            console.log("Composition end - setting isTyping to false")
            setIsTyping(false)
          }}
          onFocus={() => console.log("Input focused")}
          onBlur={() => console.log("Input blurred")}
          onClick={() => console.log("Input clicked")}
          onMouseDown={() => console.log("Input mouse down")}
          onMouseUp={() => console.log("Input mouse up")}
          rows={1}
          style={{
            minHeight: "60px",
            maxHeight: "200px",
            border: "2px solid red",
            zIndex: 9999,
            backgroundColor: "rgba(255, 0, 0, 0.1)",
            cursor: "text"
          }}
          disabled={false}
          readOnly={false}
        />

        {/* Original TextareaAutosize (commented out for testing)
        <TextareaAutosize
          textareaRef={chatInputRef}
          className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none rounded-md border-none bg-transparent px-14 py-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t(
            // `Ask anything. Type "@" for assistants, "/" for prompts, "#" for files, and "!" for tools.`
            `Ask anything. Type @  /  #  !`
          )}
          onValueChange={(value) => {
            console.log("TextareaAutosize onValueChange called with:", value)
            handleInputChange(value)
          }}
          value={userInput}
          minRows={1}
          maxRows={18}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
          onFocus={() => console.log("Input focused")}
          onBlur={() => console.log("Input blurred")}
        />
        */}

        <div className="absolute bottom-[14px] right-3 cursor-pointer hover:opacity-50">
          {isGenerating ? (
            <IconPlayerStopFilled
              className="hover:bg-background animate-pulse rounded bg-transparent p-1"
              onClick={handleStopMessage}
              size={30}
            />
          ) : (
            <IconSend
              className={cn(
                "bg-primary text-secondary rounded p-1",
                !userInput && "cursor-not-allowed opacity-50"
              )}
              onClick={() => {
                if (!userInput) return

                handleSendMessage(userInput, chatMessages, false)
              }}
              size={30}
            />
          )}
        </div>
      </div>
    </>
  )
}
