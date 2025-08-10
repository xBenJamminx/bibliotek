"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Database } from "@/supabase/types"

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const session = (await supabase.auth.getSession()).data.session

  if (session) {
    const { data: homeWorkspace } = await supabase
      .from("workspaces")
      .select("id,is_home")
      .eq("user_id", session.user.id)
      .eq("is_home", true)
      .single()

    if (homeWorkspace) {
      return redirect(`/${homeWorkspace.id}/chat`)
    }
  }

  return redirect("/login")
}
