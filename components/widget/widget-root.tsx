"use client"

import ChatWidget from "./chat-widget"

export default function WidgetRoot() {
  // You can customize or source these from public env vars later
  return (
    <ChatWidget
      // assistantId can be omitted to use server-side ASSISTANT_ID
      primaryColor="#2563eb"
      title="Chat with us!"
      subtitle="We typically reply in a few minutes."
      brandLabel="Powered by Biblio-Tek"
    />
  )
}
