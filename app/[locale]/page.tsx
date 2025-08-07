"use client"

import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div>
        <img
          src="/particle.png"
          alt="Particle Ink Logo"
          width={120}
          height={80}
          className="object-contain"
          style={{ maxWidth: "120px", maxHeight: "80px" }}
        />
      </div>

      <div className="mt-2 text-4xl font-bold">Particle Ink Chatbot</div>

      <Link
        className="mt-4 flex w-[200px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold"
        href="/login"
      >
        Start Chatting
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
