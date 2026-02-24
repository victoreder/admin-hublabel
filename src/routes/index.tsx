import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Login } from "@/pages/Login";
import { ClientAdmin } from "@/pages/ClientAdmin";
import { EmailAdmin } from "@/pages/EmailAdmin";
import { UpdatesAdmin } from "@/pages/UpdatesAdmin";
import { ChangelogPublic } from "@/pages/ChangelogPublic";
import { SalesAdmin } from "@/pages/SalesAdmin";
import { canAccessSales } from "@/lib/salesAccess";
import { RouteErrorFallback } from "@/components/RouteErrorFallback";

function ProtectedWrapper() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AdminLayout />;
}

function SalesGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!canAccessSales(user?.id)) {
    return <Navigate to="/admin/clientes" replace />;
  }

  return <SalesAdmin />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: "login", element: <Login /> },
      { path: "changelog", element: <ChangelogPublic /> },
      {
        path: "admin",
        element: <ProtectedWrapper />,
        children: [
          { index: true, element: <Navigate to="/admin/clientes" replace /> },
          { path: "clientes", element: <ClientAdmin /> },
          { path: "emails", element: <EmailAdmin /> },
          { path: "atualizacoes", element: <UpdatesAdmin /> },
          { path: "vendas", element: <SalesGuard /> },
        ],
      },
      { index: true, element: <Navigate to="/admin/clientes" replace /> },
      { path: "*", element: <Navigate to="/admin/clientes" replace /> },
    ],
  },
]);
