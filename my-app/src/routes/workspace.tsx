import { Layers3 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function WorkspacePage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers3 className="h-5 w-5 text-primary" />
          <CardTitle>Workspace</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          Trang workspace placeholder. Đây có thể là khu vực làm việc chính của
          app sau này.
        </p>
      </CardContent>
    </Card>
  )
}