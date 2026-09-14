import { QueryClient } from "@tanstack/react-query";
import {
  createHashHistory,
  createMemoryHistory,
  createRouter as createTanStackRouter,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

const isSingleFile = import.meta.env.VITE_SINGLE_FILE === "1";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  });
  const router = createTanStackRouter({
    routeTree,
    ...(isSingleFile
      ? {
          history:
            typeof document === "undefined"
              ? createMemoryHistory({ initialEntries: ["/"] })
              : createHashHistory(),
        }
      : {}),
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
