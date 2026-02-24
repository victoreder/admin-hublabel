import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import type { VersaoSAASAgente } from "@/types/database";

interface UpdatesTableProps {
  updates: VersaoSAASAgente[];
}

export function UpdatesTable({ updates }: UpdatesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Versão</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Correções</TableHead>
          <TableHead>Implementações</TableHead>
          <TableHead>Link</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {updates.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium">{u.nomeVersao}</TableCell>
            <TableCell>
              {u.created_at
                ? format(new Date(u.created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })
                : "-"}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {u.correcoes || "-"}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {u.implementacoes || "-"}
            </TableCell>
            <TableCell>
              {u.linkVersao ? (
                <a
                  href={u.linkVersao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" /> Abrir
                </a>
              ) : (
                "-"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
