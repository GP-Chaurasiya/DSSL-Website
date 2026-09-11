import { MedalTallyPage } from "@/pages/MedalTallyPage";
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/medal-tally",
  component: MedalTallyPage,
});
