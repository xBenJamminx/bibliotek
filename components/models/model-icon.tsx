import { cn } from "@/lib/utils"
import mistral from "@/public/providers/mistral.png"
import groq from "@/public/providers/groq.png"
import perplexity from "@/public/providers/perplexity.png"
import { ModelProvider } from "@/types"
import { IconSparkles } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import { forwardRef, HTMLAttributes } from "react"
import { AnthropicSVG } from "../icons/anthropic-svg"
import { GoogleSVG } from "../icons/google-svg"
import { OpenAISVG } from "../icons/openai-svg"

interface ModelIconProps extends HTMLAttributes<HTMLDivElement> {
  provider: ModelProvider
  height: number
  width: number
}

export const ModelIcon = forwardRef<HTMLDivElement, ModelIconProps>(
  ({ provider, height, width, ...props }, ref) => {
    const { theme } = useTheme()

    switch (provider as ModelProvider) {
      case "openai":
        return (
          <div ref={ref} {...props}>
            <OpenAISVG
              className={cn(
                "rounded-sm bg-white p-1 text-black",
                props.className,
                theme === "dark" ? "bg-white" : "border-DEFAULT border-black"
              )}
              width={width}
              height={height}
            />
          </div>
        )
      case "mistral":
        return (
          <div ref={ref} {...props}>
            <Image
              className={cn(
                "rounded-sm p-1",
                theme === "dark" ? "bg-white" : "border-DEFAULT border-black"
              )}
              src={mistral.src}
              alt="Mistral"
              width={width}
              height={height}
            />
          </div>
        )
      case "groq":
        return (
          <div ref={ref} {...props}>
            <Image
              className={cn(
                "rounded-sm p-0",
                theme === "dark" ? "bg-white" : "border-DEFAULT border-black"
              )}
              src={groq.src}
              alt="Groq"
              width={width}
              height={height}
            />
          </div>
        )
      case "anthropic":
        return (
          <div ref={ref} {...props}>
            <AnthropicSVG
              className={cn(
                "rounded-sm bg-white p-1 text-black",
                props.className,
                theme === "dark" ? "bg-white" : "border-DEFAULT border-black"
              )}
              width={width}
              height={height}
            />
          </div>
        )
      case "google":
        return (
          <div ref={ref} {...props}>
            <GoogleSVG
              className={cn(
                "rounded-sm bg-white p-1 text-black",
                props.className,
                theme === "dark" ? "bg-white" : "border-DEFAULT border-black"
              )}
              width={width}
              height={height}
            />
          </div>
        )
      case "perplexity":
        return (
          <div ref={ref} {...props}>
            <Image
              className={cn(
                "rounded-sm p-1",
                theme === "dark" ? "bg-white" : "border-DEFAULT border-black"
              )}
              src={perplexity.src}
              alt="Mistral"
              width={width}
              height={height}
            />
          </div>
        )
      default:
        return (
          <div ref={ref} {...props}>
            <IconSparkles size={width} />
          </div>
        )
    }
  }
)

ModelIcon.displayName = "ModelIcon"
