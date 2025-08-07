import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { messages, model, temperature, assistantId, workspaceId } =
      await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    const assistantIdFromEnv = process.env.ASSISTANT_ID
    const vectorStoreId = process.env.VECTOR_STORE_ID

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const encoder = new TextEncoder()

    // Helper: fetch all file names from a vector store (paginates)
    const fetchAllVectorStoreFileNames = async (
      vsId: string
    ): Promise<string[]> => {
      const names: string[] = []
      let after: string | undefined = undefined
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const resp: any = await (openai as any).beta.vectorStores.files.list(
          vsId,
          {
            limit: 100,
            after
          }
        )
        const data = resp?.data || []
        for (const f of data) {
          const filename = (f as any)?.filename
          if (filename) names.push(filename)
        }
        if (resp?.has_more) {
          after = resp?.last_id
        } else {
          break
        }
      }
      return Array.from(new Set(names))
    }

    // Helper: fetch app DB file names for a workspace (two-step query)
    const fetchWorkspaceDbFileNames = async (
      wsId?: string
    ): Promise<string[]> => {
      if (!wsId) return []
      try {
        const supabase = createClient(cookies())
        const { data: fw, error: fwErr } = await supabase
          .from("file_workspaces")
          .select("file_id")
          .eq("workspace_id", wsId)
        if (fwErr || !fw || fw.length === 0) return []
        const ids = fw.map((r: any) => r.file_id)
        const { data: files, error: fErr } = await supabase
          .from("files")
          .select("name")
          .in("id", ids)
        if (fErr || !files) return []
        return files.map((f: any) => f.name).filter(Boolean)
      } catch {
        return []
      }
    }

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

            // Build run params and gather filenames
            const runParams: any = { assistant_id: resolvedAssistantId }

            let vectorNames: string[] = []
            if (vectorStoreId) {
              runParams.tools = [{ type: "file_search" }]
              runParams.tool_resources = {
                file_search: { vector_store_ids: [vectorStoreId] }
              }
              try {
                vectorNames = await fetchAllVectorStoreFileNames(vectorStoreId)
              } catch {}
            }

            const dbNames = await fetchWorkspaceDbFileNames(workspaceId)
            const allNames = Array.from(
              new Set([...(vectorNames || []), ...(dbNames || [])])
            )
            if (allNames.length > 0) {
              runParams.instructions = `You have access to a file search tool and app-managed files. Total files available: ${allNames.length}. File names: ${allNames.join(", ")}. When asked about available files, enumerate these exactly; when asked to exclude certain files, ensure the remainder also reflect this full set.`
            }

            const assistantStream = await openai.beta.threads.runs.stream(
              thread.id,
              runParams
            )

            assistantStream.on("textDelta", delta => {
              const content = (delta as any).value ?? ""
              if (content) send({ type: "content", content })
            })

            assistantStream.on("end", () => finish())
            assistantStream.on("error", (err: any) => {
              send({ type: "error", error: String(err?.message || err) })
              controller.close()
            })

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
