import { createBrowserRouter } from "react-router";

import { AppShell } from "@/components/ui/app/components/app-shell";
import { AnalyticsPage } from "@/routes/analytics";
import { OverviewPage } from "@/routes/overview";
import { ProjectsPage } from "@/routes/projects";
import { SettingsPage } from "@/routes/settings";
import { WorkspacePage } from "@/routes/workspace";
import { StudioPage } from "@/remotion/studio";
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: "projects",
        element: <ProjectsPage />,
      },
      {
        path: "workspace",
        element: <WorkspacePage />,
      },
      {
        path: "analytics",
        element: <AnalyticsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
     
      {
        path: "studio",
        element: <StudioPage />,
      },
    ],
  },
]);
