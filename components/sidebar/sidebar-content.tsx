"use client"
import { Tables } from "@/supabase/types"
import { ContentType, DataListType } from "@/types"
import { FC, useState } from "react"
import { SidebarCreateButtons } from "./sidebar-create-buttons"
import { ProfileSettings } from "../utility/profile-settings"
import { SidebarDataList } from "./sidebar-data-list"
import { SidebarSearch } from "./sidebar-search"

interface SidebarContentProps {
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
}

export const SidebarContent: FC<SidebarContentProps> = ({
  contentType,
  data,
  folders
}) => {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredData: any = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    // Full-height container; position profile button absolutely at bottom-left
    <div className="relative flex h-full grow flex-col">
      <div className="mt-2 flex items-center">
        <SidebarCreateButtons
          contentType={contentType}
          hasData={data.length > 0}
        />
      </div>

      <div className="mt-2">
        <SidebarSearch
          contentType={contentType}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>

      <div className="pb-14">
        <SidebarDataList
          contentType={contentType}
          data={filteredData}
          folders={folders}
        />
      </div>

      {/* Account/profile button at bottom of chat column */}
      {contentType === "chats" && (
        <div className="absolute bottom-2 left-2">
          <ProfileSettings />
        </div>
      )}
    </div>
  )
}
