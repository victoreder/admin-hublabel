import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAccessData, buildAccessText } from "@/lib/accessText";
import type { UsuarioSAASAgente } from "@/types/database";
import { Workflow, Server, LayoutDashboard, ShieldCheck, Bot, Copy, ExternalLink } from "lucide-react";

function isLink(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://") || /^[\w.-]+\.[\w.-]+(\/|$)/.test(v);
}

function toHref(value: string): string {
  const v = value.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return "https://" + v;
}

function copyValue(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copiado!`);
}

interface AccessDialogProps {
  client: UsuarioSAASAgente | null;
  open: boolean;
  onClose: () => void;
}

const blockStyles = [
  {
    key: "n8n",
    icon: Workflow,
    bg: "bg-[#FF6D5A]/10",
    border: "border-[#FF6D5A]/40",
    header: "text-[#FF6D5A]",
    label: "n8n",
  },
  {
    key: "portainer",
    icon: Server,
    bg: "bg-[#13B9EA]/10",
    border: "border-[#13B9EA]/40",
    header: "text-[#13B9EA]",
    label: "Portainer",
  },
  {
    key: "app",
    icon: LayoutDashboard,
    bg: "bg-primary/10",
    border: "border-primary/40",
    header: "text-primary",
    label: "Aplicativo",
  },
  {
    key: "painelAdmin",
    icon: ShieldCheck,
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    header: "text-amber-600",
    label: "Painel de Administração",
  },
  {
    key: "evolution",
    icon: Bot,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    header: "text-emerald-600",
    label: "Evolution",
  },
] as const;

function BlockCard({
  title,
  items,
  style,
}: {
  title: string;
  items: { label: string; value: string }[];
  style: (typeof blockStyles)[number];
}) {
  const Icon = style.icon;
  return (
    <div
      className={`rounded-xl border-2 ${style.border} ${style.bg} p-4 space-y-3`}
    >
      <div className={`flex items-center gap-2 font-semibold ${style.header}`}>
        <Icon className="h-5 w-5" />
        <span>{title}</span>
      </div>
      <ul className="space-y-2">
        {items.map(({ label, value }) => {
          const link = isLink(value);
          return (
            <li key={label} className="flex items-center gap-x-2 text-sm min-w-0">
              <span className="text-muted-foreground shrink-0">{label}:</span>
              <span className="font-medium flex-1 min-w-0 truncate">
                {link ? (
                  <a
                    href={toHref(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{value}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="truncate">{value}</span>
                )}
              </span>
              {!link && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyValue(value, label)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AccessDialog({ client, open, onClose }: AccessDialogProps) {
  if (!client) return null;

  const data = getAccessData(client);
  const accessText = buildAccessText(client);

  const blocks = [
    { ...data.n8n, style: blockStyles[0] },
    { ...data.portainer, style: blockStyles[1] },
    { ...data.app, style: blockStyles[2] },
    { ...data.painelAdmin, style: blockStyles[3] },
    ...(data.evolution ? [{ ...data.evolution, style: blockStyles[4] }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showClose className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Acessos — {client.nomeSoftware || client.email}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {blocks.map((block) => (
            <BlockCard
              key={block.title}
              title={block.title}
              items={block.items}
              style={block.style}
            />
          ))}
        </div>
        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(accessText);
              toast.success("Acessos copiados!");
            }}
          >
            Copiar tudo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
