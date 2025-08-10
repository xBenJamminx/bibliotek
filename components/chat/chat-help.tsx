import useHotkey from "@/lib/hooks/use-hotkey"
import {
  IconBrandGithub,
  IconBrandX,
  IconHelpCircle,
  IconQuestionMark
} from "@tabler/icons-react"
import Link from "next/link"
import { FC, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Announcements } from "../utility/announcements"

interface ChatHelpProps {}

export const ChatHelp: FC<ChatHelpProps> = ({}) => {
  useHotkey("/", () => setIsOpen(prevState => !prevState))

  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconQuestionMark className="bg-primary text-secondary size-[24px] cursor-pointer rounded-full p-0.5 opacity-60 hover:opacity-50 lg:size-[30px] lg:p-1" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Link
              className="cursor-pointer hover:opacity-50"
              href="https://x.com/particleink"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconBrandX />
            </Link>
          </div>

          <div className="flex space-x-2">
            <Announcements />

            {/* Help button removed */}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="flex justify-between">
          <div>Show Help</div>
          <div className="flex opacity-60">
            <div className="min-w-[36px] rounded border-DEFAULT p-1 text-center">
              Ctrl
            </div>
            <div className="min-w-[46px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              /
            </div>
          </div>
        </DropdownMenuItem>

        {/* Workspaces removed */}

        <DropdownMenuItem className="flex w-[300px] justify-between">
          <div>New Chat</div>
          <div className="flex opacity-60">
            <div className="min-w-[36px] rounded border-DEFAULT p-1 text-center">
              Ctrl
            </div>
            <div className="min-w-[46px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              O
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>Focus Chat</div>
          <div className="flex opacity-60">
            <div className="min-w-[36px] rounded border-DEFAULT p-1 text-center">
              Ctrl
            </div>
            <div className="min-w-[46px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              L
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>Toggle Files</div>
          <div className="flex opacity-60">
            <div className="min-w-[36px] rounded border-DEFAULT p-1 text-center">
              Ctrl
            </div>
            <div className="min-w-[46px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              F
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="flex justify-between">
          <div>Toggle Retrieval</div>
          <div className="flex opacity-60">
            <div className="min-w-[36px] rounded border-DEFAULT p-1 text-center">
              Ctrl
            </div>
            <div className="min-w-[46px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              E
            </div>
          </div>
        </DropdownMenuItem>

        {/* Settings removed */}

        {/* Quick settings removed */}

        <DropdownMenuItem className="flex justify-between">
          <div>Toggle Sidebar</div>
          <div className="flex opacity-60">
            <div className="min-w-[36px] rounded border-DEFAULT p-1 text-center">
              Ctrl
            </div>
            <div className="min-w-[46px] rounded border-DEFAULT p-1 text-center">
              Shift
            </div>
            <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
              S
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
