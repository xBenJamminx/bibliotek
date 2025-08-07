import { ChatbotUIContext } from "@/context/context"
import { getAssistantCollectionsByAssistantId } from "@/db/assistant-collections"
import { getAssistantFilesByAssistantId } from "@/db/assistant-files"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { updateChat } from "@/db/chats"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import {
  deleteMessagesIncludingAndAfter,
  getMessagesByChatId
} from "@/db/messages"
import { buildFinalMessages } from "@/lib/build-prompt"
import { Tables } from "@/supabase/types"
import { ChatMessage, ChatPayload, LLMID, ModelProvider } from "@/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useRef } from "react"
import { LLM_LIST } from "../../../lib/models/llm/llm-list"
import {
  createTempMessages,
  handleAssistantChat,
  handleCreateChat,
  handleCreateMessages,
  handleHostedChat,
  handleLocalChat,
  handleRetrieval,
  processResponse,
  validateChatSettings
} from "../chat-helpers"
import { toast } from "sonner"

export const useChatHandler = () => {
  const router = useRouter()

  const {
    userInput,
    chatFiles,
    setUserInput,
    setNewMessageImages,
    profile,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setSelectedTools,
    availableLocalModels,
    availableOpenRouterModels,
    abortController,
    setAbortController,
    chatSettings,
    newMessageImages,
    selectedAssistant,
    chatMessages,
    chatImages,
    setChatImages,
    setChatFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    newMessageFiles,
    chatFileItems,
    setChatFileItems,
    setToolInUse,
    useRetrieval,
    sourceCount,
    setIsPromptPickerOpen,
    setIsFilePickerOpen,
    selectedTools,
    selectedPreset,
    setChatSettings,
    models,
    isPromptPickerOpen,
    isFilePickerOpen,
    isToolPickerOpen,
    threadId,
    setThreadId
  } = useContext(ChatbotUIContext)

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isPromptPickerOpen || !isFilePickerOpen || !isToolPickerOpen) {
      chatInputRef.current?.focus()
    }
  }, [isPromptPickerOpen, isFilePickerOpen, isToolPickerOpen])

  const handleNewChat = async () => {
    if (!selectedWorkspace) return

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)
    setChatFileItems([])
    setThreadId(null) // Reset thread ID for new chat

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)

    // Reset chat settings based on selected preset or assistant
    if (selectedAssistant) {
      setChatSettings({
        model: selectedAssistant.model as LLMID,
        prompt: selectedAssistant.prompt,
        temperature: selectedAssistant.temperature,
        contextLength: selectedAssistant.context_length,
        includeProfileContext: selectedAssistant.include_profile_context,
        includeWorkspaceInstructions:
          selectedAssistant.include_workspace_instructions,
        embeddingsProvider: selectedAssistant.embeddings_provider as
          | "openai"
          | "local"
      })
    } else if (selectedPreset) {
      setChatSettings({
        model: selectedPreset.model as LLMID,
        prompt: selectedPreset.prompt,
        temperature: selectedPreset.temperature,
        contextLength: selectedPreset.context_length,
        includeProfileContext: selectedPreset.include_profile_context,
        includeWorkspaceInstructions:
          selectedPreset.include_workspace_instructions,
        embeddingsProvider: selectedPreset.embeddings_provider as
          | "openai"
          | "local"
      })
    } else if (selectedWorkspace) {
      // setChatSettings({
      //   model: (selectedWorkspace.default_model ||
      //     "gpt-4-1106-preview") as LLMID,
      //   prompt:
      //     selectedWorkspace.default_prompt ||
      //     "You are a friendly, helpful AI assistant.",
      //   temperature: selectedWorkspace.default_temperature || 0.5,
      //   contextLength: selectedWorkspace.default_context_length || 4096,
      //   includeProfileContext:
      //     selectedWorkspace.include_profile_context || true,
      //   includeWorkspaceInstructions:
      //     selectedWorkspace.include_workspace_instructions || true,
      //   embeddingsProvider:
      //     (selectedWorkspace.embeddings_provider as "openai" | "local") ||
      //     "openai"
      // })
    }

    return router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const loadChatMessages = async (chatId: string) => {
    try {
      const messages = await getMessagesByChatId(chatId)
      const chatMessages = messages.map(message => ({
        message,
        fileItems: []
      }))
      setChatMessages(chatMessages)
    } catch (error) {
      console.error("Error loading chat messages:", error)
    }
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    console.log("handleSendMessage called with:", messageContent)
    const startingInput = messageContent

    try {
      setUserInput("")
      setIsGenerating(true)

      // Create a chat if one doesn't exist
      let currentChat = selectedChat
      if (!currentChat && profile && selectedWorkspace) {
        console.log("Creating new chat...")
        currentChat = await handleCreateChat(
          chatSettings,
          profile,
          selectedWorkspace,
          messageContent,
          selectedAssistant,
          [], // newMessageFiles
          setSelectedChat,
          setChats,
          setChatFiles
        )
        console.log("Created chat:", currentChat.id)

        // Set the selected chat so we can use it for message persistence
        setSelectedChat(currentChat)
      }

      // Add the user message immediately
      const currentTime = Date.now()
      const tempUserMessage: ChatMessage = {
        message: {
          id: `user-${currentTime}`,
          chat_id: currentChat?.id || "temp",
          assistant_id: null,
          user_id: profile?.user_id || "",
          content: messageContent,
          model: "gpt-4-turbo-preview",
          role: "user",
          sequence_number: currentTime,
          image_paths: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        fileItems: []
      }

      // Create initial assistant message with loading state
      const tempAssistantMessage: ChatMessage = {
        message: {
          id: `assistant-${currentTime}`,
          chat_id: currentChat?.id || "temp",
          assistant_id: null,
          user_id: profile?.user_id || "",
          content: "Thinking...",
          model: "gpt-4-turbo-preview",
          role: "assistant",
          sequence_number: currentTime + 1,
          image_paths: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        fileItems: []
      }

      // Add both messages to chat immediately
      setChatMessages(prev => [...prev, tempUserMessage, tempAssistantMessage])

      // Use the existing chat helpers infrastructure
      console.log("Using chat helpers...")

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      const payload = {
        chatSettings,
        chatMessages,
        messageContent,
        selectedAssistant,
        selectedTools,
        chatImages,
        newMessageFiles: [],
        isRegeneration
      }

      const modelData = LLM_LIST.find(llm => llm.modelId === chatSettings.model)
      if (!modelData) {
        throw new Error("Model not found")
      }

      try {
        const finalAssistantContent = await handleHostedChat(
          payload,
          profile!,
          modelData,
          tempAssistantMessage,
          isRegeneration,
          newAbortController,
          [], // newMessageImages
          chatImages,
          setIsGenerating,
          setFirstTokenReceived,
          setChatMessages,
          setToolInUse
        )

        console.log("Chat completed successfully:", finalAssistantContent)

        // Persist messages to database after streaming is complete
        if (currentChat && profile && finalAssistantContent) {
          try {
            await handleCreateMessages(
              chatMessages,
              currentChat,
              profile,
              modelData,
              messageContent,
              finalAssistantContent,
              [], // newMessageImages
              isRegeneration,
              [], // retrievedFileItems
              setChatMessages,
              setChatFileItems,
              setChatImages,
              selectedAssistant
            )
            console.log("Messages persisted to database successfully")
          } catch (error) {
            console.error("Error persisting messages:", error)
            toast.error("Failed to save messages to database")
          }
        }
      } catch (error) {
        console.error("Error in chat:", error)
        setIsGenerating(false)
        setFirstTokenReceived(false)

        // Remove the temporary messages on error
        setChatMessages(prev => prev.slice(0, -2))

        toast.error("Failed to send message. Please try again.")
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error)
      setIsGenerating(false)
      setUserInput(startingInput)
    }
  }

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    if (!selectedChat) return

    await deleteMessagesIncludingAndAfter(
      selectedChat.user_id,
      selectedChat.id,
      sequenceNumber
    )

    const filteredMessages = chatMessages.filter(
      chatMessage => chatMessage.message.sequence_number < sequenceNumber
    )

    setChatMessages(filteredMessages)

    handleSendMessage(editedContent, filteredMessages, false)
  }

  return {
    chatInputRef,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  }
}
