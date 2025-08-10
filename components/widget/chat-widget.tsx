"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type WidgetMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatWidgetProps {
  assistantId?: string
  title?: string
  subtitle?: string
  brandLabel?: string
  primaryColor?: string
}

// A lightweight, self-contained chat widget that streams from /api/send-message
export default function ChatWidget({
  assistantId,
  title = "Chat with us!",
  subtitle = "We typically reply in a few minutes.",
  brandLabel = "POWERED BY Biblio-Tek",
  primaryColor = "#1e90ff"
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Respond to host page messages and request size updates
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!e || !e.data) return
      if (e.data.type === "widget-open") setIsOpen(true)
      if (e.data.type === "widget-close") setIsOpen(false)
    }
    window.addEventListener("message", onMsg)
    // Tell parent we're ready and request initial sizing
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "widget-ready" }, "*")
    }
    return () => window.removeEventListener("message", onMsg)
  }, [])

  // Notify parent to resize iframe when state changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.parent) return
    const size = isOpen
      ? { width: 380, height: 620 }
      : { width: 80, height: 80 }
    window.parent.postMessage({ type: "widget-resize", ...size }, "*")
  }, [isOpen])

  const gradientStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${primaryColor} 0%, #7aa8ff 100%)`
    }),
    [primaryColor]
  )

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return
    const userMessage: WidgetMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content
    }
    const tempAssistant: WidgetMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: ""
    }
    setMessages(prev => [...prev, userMessage, tempAssistant])
    setInput("")
    setIsStreaming(true)

    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: content,
          assistantId
        })
      })

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      // Stream Server-Sent Events style chunks
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split("\n\n")
        buffer = events.pop() || ""

        for (const ev of events) {
          const line = ev.trim()
          if (!line.startsWith("data:")) continue
          const payloadStr = line.replace(/^data:\s*/, "")
          if (!payloadStr) continue
          try {
            const data = JSON.parse(payloadStr) as {
              type: "content" | "done"
              content?: string
              threadId?: string
            }
            if (data.type === "content" && data.content) {
              setMessages(prev => {
                const updated = [...prev]
                // Last message is the temp assistant message
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content:
                    (updated[updated.length - 1]?.content || "") + data.content
                }
                return updated
              })
            }
            if (data.type === "done") {
              if (data.threadId) setThreadId(data.threadId)
              setIsStreaming(false)
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err) {
      setIsStreaming(false)
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong."
        }
      ])
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        aria-label="Open chat"
        onClick={() => setIsOpen(s => !s)}
        style={{ backgroundColor: primaryColor }}
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="mx-auto size-7"
        >
          <path d="M2 5a3 3 0 013-3h14a3 3 0 013 3v9a3 3 0 01-3 3H9l-5 4v-4H5a3 3 0 01-3-3V5z" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-[320px] max-w-[92vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-neutral-900"
        >
          <div className="p-4 text-white" style={gradientStyle}>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-semibold">{title}</div>
                <div className="opacity-90">{subtitle}</div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-white/20 focus:outline-none"
                aria-label="Close chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex max-h-[420px] min-h-[320px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length === 0 && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
                  <div className="font-medium">
                    Hi there! I’m your assistant.
                  </div>
                  <div>How can I help you today?</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <button
                      className="rounded-md bg-white px-3 py-2 text-left text-sm shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-neutral-900 dark:ring-neutral-700"
                      onClick={() => sendMessage("Just playing around")}
                    >
                      Just playing around
                    </button>
                    <button
                      className="rounded-md bg-white px-3 py-2 text-left text-sm shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-neutral-900 dark:ring-neutral-700"
                      onClick={() => sendMessage("I need support")}
                    >
                      I need Support
                    </button>
                  </div>
                </div>
              )}

              {messages.map(m => (
                <div key={m.id} className="flex">
                  {m.role === "assistant" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-gray-100 p-3 text-sm text-gray-900 dark:bg-neutral-800 dark:text-gray-100">
                      {m.content || (isStreaming ? "…" : "")}
                    </div>
                  ) : (
                    <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-none bg-blue-600 p-3 text-sm text-white">
                      {m.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 p-2 dark:border-neutral-800">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  sendMessage(input)
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message…"
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  Send
                </button>
              </form>
              <div className="mt-1 text-center text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {brandLabel}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
