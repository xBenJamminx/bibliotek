"use client"

import ChatWidget from "@/components/widget/chat-widget"
import { useSearchParams } from "next/navigation"

export default function WidgetPage() {
  const params = useSearchParams()

  const assistantId = params.get("assistantId") || undefined
  const primaryColor = params.get("primaryColor") || undefined
  const title = params.get("title") || undefined
  const subtitle = params.get("subtitle") || undefined
  const brandLabel = params.get("brand") || undefined

  return (
    <div className="min-h-screen bg-transparent">
      <ChatWidget
        assistantId={assistantId}
        primaryColor={primaryColor}
        title={title}
        subtitle={subtitle}
        brandLabel={brandLabel}
      />
    </div>
  )
}
