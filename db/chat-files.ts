import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

export const getChatFilesByChatId = async (chatId: string) => {
  const { data: chatFiles, error } = await supabase
    .from("chat_files")
    .select(
      `
      file_id,
      files (
        id,
        name,
        type,
        file_path,
        size,
        tokens
      )
    `
    )
    .eq("chat_id", chatId)

  if (error) {
    throw new Error(error.message)
  }

  return {
    id: chatId,
    name: "Chat Files",
    files: chatFiles.map(cf => cf.files).filter(Boolean)
  }
}

export const createChatFile = async (chatFile: TablesInsert<"chat_files">) => {
  const { data: createdChatFile, error } = await supabase
    .from("chat_files")
    .insert(chatFile)
    .select("*")

  if (!createdChatFile) {
    throw new Error(error.message)
  }

  return createdChatFile
}

export const createChatFiles = async (
  chatFiles: TablesInsert<"chat_files">[]
) => {
  const { data: createdChatFiles, error } = await supabase
    .from("chat_files")
    .insert(chatFiles)
    .select("*")

  if (!createdChatFiles) {
    throw new Error(error.message)
  }

  return createdChatFiles
}
