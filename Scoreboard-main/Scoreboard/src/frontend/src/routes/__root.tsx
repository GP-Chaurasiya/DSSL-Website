import { AppLayout } from "@/components/AppLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
