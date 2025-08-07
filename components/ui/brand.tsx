"use client"

import { FC } from "react"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <div className="flex cursor-pointer flex-col items-center">
      <div className="mb-2">
        <img
          src="/particle.png"
          alt="Particle Ink Logo"
          width={120}
          height={80}
          className="object-contain"
          style={{ maxWidth: "120px", maxHeight: "80px" }}
        />
      </div>

      <div className="text-4xl font-bold tracking-wide">
        Particle Ink Chatbot
      </div>
    </div>
  )
}
