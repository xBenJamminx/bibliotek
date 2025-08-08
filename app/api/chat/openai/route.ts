import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import { generateEmbedding } from "@/lib/generate-local-embedding"

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
    const supabaseAdmin = createSupabaseAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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

            // Optionally augment thread with Supabase workspace retrieval (no local upload required)
            try {
              if (workspaceId && lastUser) {
                const { data: fw } = await supabaseAdmin
                  .from("file_workspaces")
                  .select("file_id")
                  .eq("workspace_id", workspaceId)

                const fileIds: string[] = (fw || []).map((r: any) => r.file_id)
                if (fileIds.length > 0) {
                  const queryEmbedding = await generateEmbedding(
                    openai as any,
                    lastUser
                  )
                  const { data: matches } = await supabaseAdmin.rpc(
                    "match_file_items_openai",
                    {
                      query_embedding: queryEmbedding as unknown as any,
                      match_count: 4,
                      file_ids: fileIds
                    }
                  )

                  if (matches && matches.length > 0) {
                    const retrievalText =
                      "You may use the following sources if needed to answer the user's question. If you don't know the answer, say \"I don't know.\"\n\n" +
                      matches
                        .map(
                          (m: any) =>
                            `\n<BEGIN SOURCE>\n${m.content}\n</END SOURCE>`
                        )
                        .join("\n\n")

                    await openai.beta.threads.messages.create(thread.id, {
                      role: "user",
                      content: retrievalText
                    })
                  }
                }
              }
            } catch {
              // Non-fatal: continue without retrieval augmentation
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
            // Chat Completions fallback streaming with optional workspace retrieval
            let enhancedMessages = messages || []

            try {
              const lastUser =
                enhancedMessages && enhancedMessages.length
                  ? enhancedMessages[enhancedMessages.length - 1]?.content ?? ""
                  : ""

              if (workspaceId && lastUser) {
                // Fetch file IDs for the workspace
                const { data: fw } = await supabaseAdmin
                  .from("file_workspaces")
                  .select("file_id")
                  .eq("workspace_id", workspaceId)

                const fileIds: string[] = (fw || []).map((r: any) => r.file_id)

                if (fileIds.length > 0) {
                  const queryEmbedding = await generateEmbedding(
                    openai as any,
                    lastUser
                  )
                  const { data: matches } = await supabaseAdmin.rpc(
                    "match_file_items_openai",
                    {
                      query_embedding: queryEmbedding as unknown as any,
                      match_count: 4,
                      file_ids: fileIds
                    }
                  )

                  if (matches && matches.length > 0) {
                    const retrievalText =
                      "You may use the following sources if needed to answer the user's question. If you don't know the answer, say \"I don't know.\"\n\n" +
                      matches
                        .map(
                          (m: any) => `
<BEGIN SOURCE>
${m.content}
</END SOURCE>`
                        )
                        .join("\n\n")

                    // Append retrieval to the last user message
                    const lastIdx = enhancedMessages.length - 1
                    if (
                      lastIdx >= 0 &&
                      enhancedMessages[lastIdx]?.role === "user"
                    ) {
                      enhancedMessages[lastIdx] = {
                        ...enhancedMessages[lastIdx],
                        content: `${lastUser}\n\n${retrievalText}`
                      }
                    } else {
                      enhancedMessages.push({
                        role: "system",
                        content: retrievalText
                      })
                    }
                  }
                }
              }
            } catch {
              // Non-fatal: continue without retrieval
            }

            const completion = await openai.chat.completions.create({
              model: model || "gpt-4o-mini",
              messages: enhancedMessages,
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
