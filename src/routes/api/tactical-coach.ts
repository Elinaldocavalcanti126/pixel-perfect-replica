import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tactical-coach")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleTacticalCoach } = await import("@/lib/tactical-coach.server");
    return handleTacticalCoach(request);
  } } },
});