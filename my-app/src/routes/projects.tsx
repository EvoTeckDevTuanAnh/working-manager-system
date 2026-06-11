import { FolderKanban } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ProjectsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-primary" />
          <CardTitle>Projects</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          Trang project placeholder. Sau này sẽ chốt có cần danh sách project,
          create project, search, filter hay không.
        </p>
      </CardContent>
    </Card>
  )
}