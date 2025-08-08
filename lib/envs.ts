import { EnvKey } from "@/types/key-type"

// returns true if the key is found in the environment variables
export function isUsingEnvironmentKey(type: EnvKey) {
  return Boolean(process.env[type])
}

const REQUIRED_SUPABASE_ENVS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
]

export function validateSupabaseEnv() {
  const missing = REQUIRED_SUPABASE_ENVS.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(", ")}`)
  }
}
