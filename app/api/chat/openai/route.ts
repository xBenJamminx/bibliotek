import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
// Removed Supabase DB retrieval; relying solely on OpenAI Vector Store

export async function POST(request: NextRequest) {
  try {
    // Require auth for sending chat requests
    const supabase = createClient(cookies())
    const session = (await supabase.auth.getSession()).data.session
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages, model, temperature, assistantId, workspaceId } =
      await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    const assistantIdFromEnv = process.env.ASSISTANT_ID
    const vectorStoreId = process.env.VECTOR_STORE_ID
    const vectorStoreIdsEnv = process.env.VECTOR_STORE_IDS // optional comma-separated list

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const encoder = new TextEncoder()

    // Always use Assistants. Resolve ID with env-first strategy and a final static fallback.
    const resolvedAssistantId: string =
      assistantIdFromEnv ||
      assistantId ||
      process.env.NEXT_PUBLIC_ASSISTANT_ID ||
      "asst_default"

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

        // vector-store file objects typically contain file_id; retrieve filename per item
        const fileIds = data.map((d: any) => d?.file_id).filter(Boolean)
        if (fileIds.length > 0) {
          const details = await Promise.all(
            fileIds.map(async (fid: string) => {
              try {
                const file = await (openai as any).files.retrieve(fid)
                return file?.filename as string | undefined
              } catch {
                return undefined
              }
            })
          )
          for (const name of details) {
            if (name) names.push(name)
          }
        }

        if (resp?.has_more) {
          after = resp?.last_id
        } else {
          break
        }
      }
      return Array.from(new Set(names))
    }

    // Removed DB filename fetch; only using OpenAI Vector Store awareness

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
          // Assistants v2 streaming path (always used)
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

          // Removed Supabase-based retrieval augmentation; rely on OpenAI vector store

          // Build run params and gather filenames
          const runParams: any = { assistant_id: resolvedAssistantId }

          let vectorNames: string[] = []
          const vectorIds: string[] = (
            vectorStoreIdsEnv
              ? vectorStoreIdsEnv
                  .split(",")
                  .map(s => s.trim())
                  .filter(Boolean)
              : []
          ).concat(vectorStoreId ? [vectorStoreId] : [])
          if (vectorIds.length > 0) {
            runParams.tools = [{ type: "file_search" }]
            runParams.tool_resources = {
              file_search: { vector_store_ids: vectorIds }
            }
            try {
              const nameLists = await Promise.all(
                vectorIds.map(id => fetchAllVectorStoreFileNames(id))
              )
              vectorNames = Array.from(new Set(nameLists.flat()))
            } catch {}
          }

          // Privacy-preserving instructions: never reveal sources, files, or storage mechanisms
          const userAskedAboutSources =
            /\b(source|sources|file|files|document|documents|knowledge\s*base|kb|trained\s*on|training\s*data|vector\s*store)\b/i.test(
              lastUser || ""
            )

          const basePrivacyInstructions =
            "You may silently use a private knowledge base via a retrieval tool to answer questions, but you must never mention, enumerate, or reference files, file names, documents, sources, vector stores, or training data. If the user asks about data sources, files, or what the system is trained on, politely say you can't share that information and continue to answer the question directly without mentioning any sources."

          if ((vectorNames || []).length > 0) {
            runParams.instructions = basePrivacyInstructions
          } else {
            runParams.instructions = basePrivacyInstructions
          }

          if (userAskedAboutSources) {
            runParams.instructions +=
              " Always avoid acknowledging the existence of documents or files; provide an answer without referencing any underlying materials."
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
