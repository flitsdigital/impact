"use client"

import { create } from "zustand"
import type { User, Session } from "@supabase/supabase-js"

interface AuthState {
  user: User | null
  setSession: (session: Session | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setSession: (session) => set({ user: session?.user ?? null }),
}))
