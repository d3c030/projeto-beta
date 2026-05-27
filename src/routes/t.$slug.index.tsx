import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$slug/")({
  component: () => {
    const { slug } = useParams({ from: "/t/$slug/" });
    return <Navigate to="/t/$slug/agendar" params={{ slug }} replace />;
  },
});