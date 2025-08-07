import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    const { messages, model, temperature, assistantId } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    const assistantIdFromEnv = process.env.ASSISTANT_ID

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        }

        const finish = () => {
          send({ type: "done" })
          controller.close()
        }

        try {
          const resolvedAssistantId = assistantId || assistantIdFromEnv

          if (resolvedAssistantId) {
            // Assistants v2 streaming path
            const thread = await openai.beta.threads.create()

            // Append only the latest user turn (fallback if not present)
            const lastUser =
              messages && messages.length
                ? messages[messages.length - 1]?.content ?? ""
                : ""

            if (lastUser) {
              await openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: lastUser
              })
            }

            const assistantStream = await openai.beta.threads.runs.stream(
              thread.id,
              {
                assistant_id: resolvedAssistantId
              }
            )

            // Stream text tokens as they arrive
            assistantStream.on("textDelta", delta => {
              const content = (delta as any).value ?? ""
              if (content) send({ type: "content", content })
            })

            assistantStream.on("end", () => {
              finish()
            })

            assistantStream.on("error", (err: any) => {
              send({ type: "error", error: String(err?.message || err) })
              controller.close()
            })

            // Wait until the stream completes to keep the route alive
            await assistantStream.finalRun()
          } else {
            // Chat Completions fallback streaming
            const completion = await openai.chat.completions.create({
              model: model || "gpt-4o-mini",
              messages: messages || [],
              temperature: temperature ?? 0.5,
              stream: true
            })

            for await (const chunk of completion) {
              const token = chunk.choices?.[0]?.delta?.content || ""
              if (token) send({ type: "content", content: token })
            }

            finish()
          }
        } catch (err: any) {
          send({ type: "error", error: String(err?.message || err) })
          controller.close()
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    )
  }
}
