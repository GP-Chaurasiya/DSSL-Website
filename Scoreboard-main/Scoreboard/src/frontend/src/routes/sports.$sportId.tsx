import { SportScoreboardPage } from "@/pages/SportScoreboardPage";
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sports/$sportId",
  component: SportScoreboardPage,
});
