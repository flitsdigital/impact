"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/store/auth"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session)
        })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  return <>{children}</>
}
