import {
  BarChart3,
  Film,
  FolderKanban,
  Home,
  Layers3,
  Settings,
  Sparkles,
  Clapperboard,
} from "lucide-react";
import { NavLink } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  {
    label: "Overview",
    href: "/",
    icon: Home,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Workspace",
    href: "/workspace",
    icon: Layers3,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },

  {
    label: "Studio",
    href: "/studio",
    icon: Clapperboard,
  },
];

export function AppSidebar() {
  return (
    <aside className="flex h-screen w-[264px] shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">New App</div>
          <div className="truncate text-xs text-muted-foreground">
            SaaS Dashboard
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-4">
        <div className="mb-3 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Main
        </div>

        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  [
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")
                }
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>

                {item.label === "Projects" ? (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    0
                  </Badge>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <Separator className="my-5" />

        <div className="rounded-xl border bg-background p-3">
          <div className="text-sm font-medium">MVP mode</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            App shell trước. Feature sẽ được chốt sau.
          </p>
        </div>
      </div>

      <div className="border-t p-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")
          }
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
