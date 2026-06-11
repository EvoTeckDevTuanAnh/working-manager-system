import { Outlet, useLocation } from "react-router"

import { AppSidebar } from "@/components/ui/app/components/app-sidebar"

export function AppShell() {
  const location = useLocation()
  const isStudioRoute = location.pathname.startsWith("/studio")

  if (isStudioRoute) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background">
        <div className="flex h-full w-full">
          <AppSidebar />

          <main className="h-full min-w-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AppSidebar />

        <main className="min-h-screen flex-1">
          <div className="flex h-16 items-center justify-between border-b bg-card px-8">
            <div>
              <h1 className="text-base font-semibold">Overview</h1>
              <p className="text-xs text-muted-foreground">
                Clean SaaS dashboard base layout
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Ready for build
            </div>
          </div>

          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}