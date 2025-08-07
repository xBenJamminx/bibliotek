import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

interface SendMessageRequest {
  threadId?: string
  message: string
}

interface SendMessageResponse {
  message: string
  timestamp: string
  threadId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json()
    const { threadId, message } = body

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error("OPENAI_API_KEY not found in environment variables")
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    // Get Assistant ID from environment
    const assistantId = process.env.ASSISTANT_ID
    if (!assistantId) {
      console.error("ASSISTANT_ID not found in environment variables")
      return NextResponse.json(
        { error: "Assistant ID not configured" },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: apiKey
    })

    let currentThreadId = threadId

    // Create a new thread if none provided
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create()
      currentThreadId = thread.id
      console.log("Created new thread:", currentThreadId)
    }

    // Add the user message to the thread
    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: message
    })

    // Create and run the assistant
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantId
    })

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(
      currentThreadId,
      run.id
    )

    // Keep checking until the run is completed
    while (
      runStatus.status === "queued" ||
      runStatus.status === "in_progress"
    ) {
      console.log("Run status:", runStatus.status)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      runStatus = await openai.beta.threads.runs.retrieve(
        currentThreadId,
        run.id
      )
    }

    if (runStatus.status === "completed") {
      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(currentThreadId)
      const assistantMessage = messages.data.find(
        msg => msg.role === "assistant" && msg.run_id === run.id
      )

      if (assistantMessage && assistantMessage.content[0]?.type === "text") {
        const response: SendMessageResponse = {
          message: assistantMessage.content[0].text.value,
          timestamp: new Date().toISOString(),
          threadId: currentThreadId
        }

        return NextResponse.json(response)
      } else {
        console.error("No assistant message found")
        return NextResponse.json(
          { error: "No response from assistant" },
          { status: 500 }
        )
      }
    } else {
      console.error("Run failed with status:", runStatus.status)
      return NextResponse.json(
        { error: `Assistant run failed with status: ${runStatus.status}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Error in send-message API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
