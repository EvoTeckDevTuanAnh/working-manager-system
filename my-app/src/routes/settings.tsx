import { Settings } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Settings</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          Trang settings placeholder. Sau này mới quyết định cần account,
          theme, workspace config hay app preferences.
        </p>
      </CardContent>
    </Card>
  )
}