import {
  ArrowUpRight,
  CheckCircle2,
  Layers3,
  LayoutDashboard,
  Palette,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const setupItems = [
  { title: "React", value: "Ready" },
  { title: "TypeScript", value: "Ready" },
  { title: "Tailwind", value: "Ready" },
  { title: "shadcn/ui", value: "Ready" },
]

const decisions = [
  "Project mới hoàn toàn",
  "Layout sidebar trái + main content",
  "Style sạch, nghiêm túc, SaaS dashboard",
  "Accent tím / indigo",
  "React Router added",
]

export function OverviewPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex items-start justify-between gap-6">
        <div>
          <Badge variant="secondary" className="mb-3">
            App shell v0.2
          </Badge>

          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight">
            Base UI đã có routing để mở rộng thành nhiều màn hình.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Sidebar bây giờ không còn là menu giả. Mỗi item đã trỏ tới một route
            riêng để sau này build từng module.
          </p>
        </div>

        <Button>
          Continue build
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {setupItems.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <CardTitle>UI direction</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Layers3 className="h-4 w-4 text-primary" />
                Layout
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Sidebar trái, main content bên phải. Hợp để mở rộng thành app có
                nhiều module sau này.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Palette className="h-4 w-4 text-primary" />
                Visual style
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Sạch, nghiêm túc, nhiều khoảng trắng, border mỏng, accent tím /
                indigo dùng vừa đủ.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current decisions</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {decisions.map((item) => (
                <div key={item} className="flex gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}