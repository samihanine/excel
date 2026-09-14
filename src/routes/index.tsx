import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Page,
  head: () => ({
    meta: [{ title: "Agent" }],
  }),
});

function Page() {
  return (
    <div>
      <h1>Agent</h1>
    </div>
  );
}
