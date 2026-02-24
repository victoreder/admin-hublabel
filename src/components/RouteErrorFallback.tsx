import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RouteErrorFallback() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? error.statusText || error.data?.message
    : error instanceof Error
      ? error.message
      : "Algo deu errado ao carregar esta página.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <p className="text-destructive font-medium">{message}</p>
      <Button
        variant="outline"
        onClick={() => window.location.replace(window.location.pathname)}
      >
        Recarregar
      </Button>
    </div>
  );
}
