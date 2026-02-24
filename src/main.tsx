import { Component, Suspense, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { router } from "./routes";
import "./index.css";

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4 bg-background text-foreground">
          <p className="text-destructive font-medium">{this.state.error.message}</p>
          <button
            type="button"
            className="px-4 py-2 rounded border border-input bg-background"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Elemento #root não encontrado.");

createRoot(rootEl).render(
  <StrictMode>
    <AppErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
            Carregando...
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
      <Toaster richColors position="top-center" />
    </AppErrorBoundary>
  </StrictMode>
);
