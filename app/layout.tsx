import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/layout/AuthProvider"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Flits Impact CRM",
  description: "Agency management voor Flits Digital",
}

// viewport-fit=cover laat env(safe-area-inset-*) werken (notch/home-bar op telefoon).
// Geen maximumScale/userScalable: zoom blijft toegankelijk.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070707",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className="h-full font-sans">
      <body className="h-full">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-1)",
              border: "1px solid var(--border-subtle)",
              color: "var(--fg-1)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-13)",
            },
          }}
        />
      </body>
    </html>
  )
}
