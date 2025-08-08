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
  handleOpenaiAssistantChat,
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
    isGenerating,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setSelectedTools,
    // availableLocalModels removed
    availableOpenRouterModels,
    abortController,
    setAbortController,
    chatSettings,
    newMessageImages,
    selectedAssistant,
    setSelectedAssistant,
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

  // Cleanup abort controller on unmount - only abort if we're not currently generating
  useEffect(() => {
    return () => {
      if (abortController && !abortController.signal.aborted && !isGenerating) {
        try {
          abortController.abort()
        } catch (error) {
          console.error("Error cleaning up abort controller on unmount:", error)
        }
      }
    }
  }, [abortController, isGenerating])

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
    if (abortController && !abortController.signal.aborted) {
      try {
        abortController.abort()
      } catch (error) {
        console.error("Error aborting controller:", error)
      }
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

      // Clean up any existing abort controller
      if (abortController && !abortController.signal.aborted) {
        try {
          abortController.abort()
        } catch (error) {
          console.error("Error cleaning up previous abort controller:", error)
        }
      }

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      // Ensure a chat exists so history can persist
      const defaultChatSettings = {
        model: (chatSettings?.model ?? "gpt-4o-mini") as LLMID,
        prompt: chatSettings?.prompt ?? "You are a helpful AI assistant.",
        temperature: chatSettings?.temperature ?? 0.5,
        contextLength: chatSettings?.contextLength ?? 4096,
        includeProfileContext: chatSettings?.includeProfileContext ?? false,
        includeWorkspaceInstructions:
          chatSettings?.includeWorkspaceInstructions ?? false,
        embeddingsProvider: chatSettings?.embeddingsProvider ?? "openai"
      }

      let currentChat = selectedChat
      if (!currentChat && profile && selectedWorkspace) {
        try {
          currentChat = await handleCreateChat(
            defaultChatSettings,
            profile,
            selectedWorkspace,
            messageContent,
            null,
            [],
            setSelectedChat,
            setChats,
            setChatFiles,
            true
          )
          setSelectedChat(currentChat)
        } catch (error) {
          console.error("Failed to create chat:", error)
        }
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
          model: defaultChatSettings.model,
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
          model: defaultChatSettings.model,
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

      // Make direct API call to OpenAI
      try {
        // Check if the request was aborted before making the call
        if (newAbortController.signal.aborted) {
          return
        }

        console.log("Making API request to /api/chat/openai")
        const response = await fetch("/api/chat/openai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "You are a helpful AI assistant." },
              ...chatMessages.map(msg => ({
                role: msg.message.role,
                content: msg.message.content
              })),
              { role: "user", content: messageContent }
            ],
            model: defaultChatSettings.model,
            temperature: defaultChatSettings.temperature,
            assistantId: process.env.ASSISTANT_ID,
            workspaceId: selectedWorkspace?.id,
            stream: true
          }),
          signal: newAbortController.signal
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        let fullContent = ""
        setFirstTokenReceived(true)

        while (true) {
          try {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6))

                  if (data.type === "content") {
                    fullContent += data.content

                    // Update the assistant message with streaming content
                    setChatMessages(prev => {
                      const newMessages = [...prev]
                      if (newMessages.length > 0) {
                        const lastMessage = newMessages[newMessages.length - 1]
                        if (lastMessage.message.role === "assistant") {
                          lastMessage.message.content = fullContent
                        }
                      }
                      return newMessages
                    })
                  } else if (data.type === "done") {
                    console.log("Chat completed successfully:", fullContent)
                    setIsGenerating(false)
                    setFirstTokenReceived(false)

                    // Persist messages to DB if we have a chat
                    try {
                      if (currentChat && profile) {
                        const modelData = LLM_LIST.find(
                          llm => llm.modelId === defaultChatSettings.model
                        )
                        if (modelData) {
                          await handleCreateMessages(
                            chatMessages,
                            currentChat,
                            profile,
                            modelData,
                            messageContent,
                            fullContent,
                            [],
                            isRegeneration,
                            [],
                            setChatMessages,
                            setChatFileItems,
                            setChatImages,
                            null
                          )
                        }
                      }
                    } catch (persistError) {
                      console.error("Failed to persist messages:", persistError)
                    }

                    return
                  }
                } catch (error) {
                  console.error("Error parsing streaming data:", error)
                }
              }
            }
          } catch (error) {
            if ((error as any).name === "AbortError") {
              console.log("Request was aborted")
              return
            }
            throw error
          }
        }

        setIsGenerating(false)
        setFirstTokenReceived(false)
      } catch (error: any) {
        console.error("Error in chat:", error)
        setIsGenerating(false)
        setFirstTokenReceived(false)

        // Only remove messages if it's not an abort error
        if (error.name !== "AbortError") {
          // Remove the temporary messages on error
          setChatMessages(prev => prev.slice(0, -2))
          toast.error("Failed to send message. Please try again.")
        }
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
