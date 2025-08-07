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

interface StreamResponse {
  type: "content" | "done"
  content?: string
  threadId?: string
  timestamp?: string
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
      const thread = await openai.beta.threads.create(
        {},
        {
          headers: {
            "OpenAI-Beta": "assistants=v2"
          }
        }
      )
      currentThreadId = thread.id
      console.log("Created new thread:", currentThreadId)
    }

    // Add the user message to the thread
    await openai.beta.threads.messages.create(
      currentThreadId,
      {
        role: "user",
        content: message
      },
      {
        headers: {
          "OpenAI-Beta": "assistants=v2"
        }
      }
    )

    // Create and run the assistant with streaming
    const run = await openai.beta.threads.runs.create(
      currentThreadId,
      {
        assistant_id: assistantId,
        stream: true
      },
      {
        headers: {
          "OpenAI-Beta": "assistants=v2"
        }
      }
    )

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Poll for completion with streaming
          let runStatus = await openai.beta.threads.runs.retrieve(
            currentThreadId,
            run.id,
            {
              headers: {
                "OpenAI-Beta": "assistants=v2"
              }
            }
          )

          // Keep checking until the run is completed
          while (
            runStatus.status === "queued" ||
            runStatus.status === "in_progress"
          ) {
            console.log("Run status:", runStatus.status)
            await new Promise(resolve => setTimeout(resolve, 500)) // Reduced to 500ms for faster response
            runStatus = await openai.beta.threads.runs.retrieve(
              currentThreadId,
              run.id,
              {
                headers: {
                  "OpenAI-Beta": "assistants=v2"
                }
              }
            )
          }

          if (runStatus.status === "completed") {
            // Get the assistant's response
            const messages = await openai.beta.threads.messages.list(
              currentThreadId,
              {
                headers: {
                  "OpenAI-Beta": "assistants=v2"
                }
              }
            )
            const assistantMessage = messages.data.find(
              msg => msg.role === "assistant" && msg.run_id === run.id
            )

            if (
              assistantMessage &&
              assistantMessage.content[0]?.type === "text"
            ) {
              const fullMessage = assistantMessage.content[0].text.value

              // Stream the message in chunks
              const chunkSize = 10
              for (let i = 0; i < fullMessage.length; i += chunkSize) {
                const chunk = fullMessage.slice(i, i + chunkSize)
                const streamResponse: StreamResponse = {
                  type: "content",
                  content: chunk
                }
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(streamResponse)}\n\n`)
                )
                await new Promise(resolve => setTimeout(resolve, 50)) // Small delay for streaming effect
              }

              // Send completion signal
              const finalResponse: StreamResponse = {
                type: "done",
                threadId: currentThreadId,
                timestamp: new Date().toISOString()
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(finalResponse)}\n\n`)
              )
            } else {
              console.error("No assistant message found")
              const errorResponse: StreamResponse = {
                type: "done"
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`)
              )
            }
          } else {
            console.error("Run failed with status:", runStatus.status)
            const errorResponse: StreamResponse = {
              type: "done"
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`)
            )
          }
        } catch (error) {
          console.error("Error in streaming:", error)
          const errorResponse: StreamResponse = {
            type: "done"
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`)
          )
        } finally {
          controller.close()
        }
      }
    })

    console.log("Returning streaming response")
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    })
  } catch (error: any) {
    console.error("Error in send-message API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
