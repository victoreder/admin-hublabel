import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Users,
  Mail,
  Package,
  LogOut,
  Menu,
  X,
  DollarSign,
  Settings,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSales } from "@/lib/salesAccess";

const navItems = [
  { to: "/admin/clientes", icon: Users, label: "Clientes" },
  { to: "/admin/emails", icon: Mail, label: "Emails" },
  { to: "/admin/atualizacoes", icon: Package, label: "Atualizações" },
  { to: "/admin/instalacoes", icon: Settings, label: "Instalações" },
  { to: "/admin/vendas", icon: DollarSign, label: "Vendas" },
  { to: "/admin/logs-atualizacao", icon: FileText, label: "Logs" },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const visibleNavItems = navItems.filter(
    (item) => item.to !== "/admin/vendas" || canAccessSales(user?.id)
  );
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const isExpanded = expanded || mobileOpen;
  const faviconUrl =
    "https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/FAVICON.png";
  const logoUrl =
    "https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png";

  return (
    <>
      <button
        className="lg:hidden fixed z-50 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md bg-card border border-border top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))]"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full bg-card border-r border-border shadow-sm transition-all duration-300 flex flex-col pt-[env(safe-area-inset-top)]",
          "w-[70px] hover:w-[250px]",
          expanded && "w-[250px]",
          mobileOpen ? "translate-x-0 w-[250px]" : "lg:translate-x-0 -translate-x-full lg:w-[70px]"
        )}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="flex flex-col h-full pt-16 lg:pt-6">
          <div
            className={cn(
              "border-b border-border shrink-0 flex items-center min-h-[3.5rem] py-4 justify-center",
              isExpanded ? "px-3" : "px-0"
            )}
          >
            {isExpanded ? (
              <img
                src={logoUrl}
                alt="HubLabel"
                className="h-8 w-auto max-w-[220px] object-contain"
              />
            ) : (
              <img
                src={faviconUrl}
                alt="HubLabel"
                className="h-8 w-8 object-contain"
              />
            )}
          </div>

          <nav className="flex-1 py-4 space-y-1 px-2">
            {visibleNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap overflow-hidden">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden">Sair</span>
            </Button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
