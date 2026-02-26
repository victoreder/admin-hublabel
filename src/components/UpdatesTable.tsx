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
import { MoreHorizontal, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VersaoSAASAgente } from "@/types/database";

interface UpdatesTableProps {
  updates: VersaoSAASAgente[];
  onEdit?: (update: VersaoSAASAgente) => void;
  onDelete?: (update: VersaoSAASAgente) => void;
  onAtualizarTodos?: (update: VersaoSAASAgente) => void;
}

export function UpdatesTable({ updates, onEdit, onDelete, onAtualizarTodos }: UpdatesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Versão</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Correções</TableHead>
          <TableHead>Implementações</TableHead>
          {(onEdit || onDelete) && <TableHead className="w-[60px]">Ações</TableHead>}
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
            {(onEdit || onDelete) && (
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(u)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(u)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                    {onAtualizarTodos &&
                      !u.atualizou_todos &&
                      u.linkVersao && (
                        <DropdownMenuItem onClick={() => onAtualizarTodos(u)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Atualizar todos
                        </DropdownMenuItem>
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
