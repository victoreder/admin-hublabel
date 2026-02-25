import { useState, useEffect } from "react";
import { Plus, MoreVertical, Pencil, RotateCcw, Wallet, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format, startOfDay, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Venda, Vendedor, VendaACobrar } from "@/types/database";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRLInput(str: string): number {
  const noSpace = str.replace(/\s/g, "");
  const noThousands = noSpace.replace(/\./g, "");
  const normalized = noThousands.replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function sanitizeBRLInput(str: string): string {
  const raw = str.replace(/[^\d,]/g, "");
  const commaIdx = raw.indexOf(",");
  if (commaIdx === -1) return raw;
  const intPart = raw.slice(0, commaIdx);
  const decPart = raw.slice(commaIdx + 1).replace(/\D/g, "").slice(0, 2);
  return `${intPart},${decPart}`;
}

/** Interpreta string YYYY-MM-DD como data local (evita -1 dia por timezone UTC). */
function parseDateOnly(isoDateStr: string): Date {
  if (!isoDateStr) return new Date(NaN);
  const part = String(isoDateStr).split("T")[0];
  const [y, m, d] = part.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date(NaN);
  return new Date(y, m - 1, d);
}

type DateFilterMode = "7" | "30" | "month" | "range";

function getFilterBounds(
  mode: DateFilterMode,
  rangeFrom: string,
  rangeTo: string
): { fromStr: string; toStr: string } {
  const today = new Date();
  if (mode === "7") {
    const from = subDays(today, 6);
    return {
      fromStr: format(startOfDay(from), "yyyy-MM-dd"),
      toStr: format(startOfDay(today), "yyyy-MM-dd"),
    };
  }
  if (mode === "30") {
    const from = subDays(today, 29);
    return {
      fromStr: format(startOfDay(from), "yyyy-MM-dd"),
      toStr: format(startOfDay(today), "yyyy-MM-dd"),
    };
  }
  if (mode === "month") {
    return {
      fromStr: format(startOfMonth(today), "yyyy-MM-dd"),
      toStr: format(endOfMonth(today), "yyyy-MM-dd"),
    };
  }
  return { fromStr: rangeFrom || format(today, "yyyy-MM-dd"), toStr: rangeTo || format(today, "yyyy-MM-dd") };
}

export function SalesAdmin() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [dataVenda, setDataVenda] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [vendedorId, setVendedorId] = useState<string>("");
  const [taxaCheckout, setTaxaCheckout] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editVenda, setEditVenda] = useState<Venda | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editDataVenda, setEditDataVenda] = useState("");
  const [editVendedorId, setEditVendedorId] = useState("");
  const [editTaxaCheckout, setEditTaxaCheckout] = useState("");
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("month");
  const now = new Date();
  const [dateRangeFrom, setDateRangeFrom] = useState(() =>
    format(startOfMonth(now), "yyyy-MM-dd")
  );
  const [dateRangeTo, setDateRangeTo] = useState(() =>
    format(endOfMonth(now), "yyyy-MM-dd")
  );
  const [vendasACobrar, setVendasACobrar] = useState<VendaACobrar[]>([]);
  const [newCobrancaOpen, setNewCobrancaOpen] = useState(false);
  const [cobrancaValor, setCobrancaValor] = useState("");
  const [cobrancaData, setCobrancaData] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [cobrancaVendedorId, setCobrancaVendedorId] = useState("");
  const [cobrancaDescricao, setCobrancaDescricao] = useState("");
  const [cobrancaTaxa, setCobrancaTaxa] = useState("");
  const [marcandoPagoId, setMarcandoPagoId] = useState<string | null>(null);
  const ITENS_POR_PAGINA_COBRANCA = 10;
  const [paginaCobranca, setPaginaCobranca] = useState(1);

  const { fromStr: filterFrom, toStr: filterTo } = getFilterBounds(
    dateFilterMode,
    dateRangeFrom,
    dateRangeTo
  );

  const vendasAtivas = vendas.filter((v) => v.status !== "reembolsada");

  const vendasFiltradas = vendasAtivas.filter((v) => {
    const key = v.data_venda
      ? String(v.data_venda).split("T")[0]
      : v.created_at
        ? format(startOfDay(new Date(v.created_at)), "yyyy-MM-dd")
        : "";
    if (!key) return false;
    return key >= filterFrom && key <= filterTo;
  });

  const ITENS_POR_PAGINA = 10;
  const [paginaLista, setPaginaLista] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(vendasFiltradas.length / ITENS_POR_PAGINA));
  const vendasPaginadas = vendasFiltradas.slice(
    (paginaLista - 1) * ITENS_POR_PAGINA,
    paginaLista * ITENS_POR_PAGINA
  );
  const inicioItem = vendasFiltradas.length === 0 ? 0 : (paginaLista - 1) * ITENS_POR_PAGINA + 1;
  const fimItem = Math.min(paginaLista * ITENS_POR_PAGINA, vendasFiltradas.length);

  const faturamentoLiquido = (valor: number, percentual: number) =>
    valor * (1 - percentual / 100);

  const fetchVendas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("data_venda", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setVendas((data as Venda[]) ?? []);
    } catch {
      setVendas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from("vendedores")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      setVendedores((data as Vendedor[]) ?? []);
    } catch {
      setVendedores([]);
    }
  };

  const fetchVendasACobrar = async () => {
    try {
      const { data, error } = await supabase
        .from("vendas_a_cobrar")
        .select("*")
        .order("data_prevista_cobranca", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setVendasACobrar((data as VendaACobrar[]) ?? []);
    } catch {
      setVendasACobrar([]);
    }
  };

  const totalPaginasCobranca = Math.max(1, Math.ceil(vendasACobrar.length / ITENS_POR_PAGINA_COBRANCA));
  const vendasACobrarPaginadas = vendasACobrar.slice(
    (paginaCobranca - 1) * ITENS_POR_PAGINA_COBRANCA,
    paginaCobranca * ITENS_POR_PAGINA_COBRANCA
  );
  const inicioItemCobranca = vendasACobrar.length === 0 ? 0 : (paginaCobranca - 1) * ITENS_POR_PAGINA_COBRANCA + 1;
  const fimItemCobranca = Math.min(paginaCobranca * ITENS_POR_PAGINA_COBRANCA, vendasACobrar.length);
  const totalPendente = vendasACobrar.reduce((s, c) => s + Number(c.valor), 0);

  useEffect(() => {
    fetchVendas();
    fetchVendedores();
    fetchVendasACobrar();
  }, []);

  useEffect(() => {
    if (newSaleOpen) {
      setDataVenda(format(new Date(), "yyyy-MM-dd"));
      fetchVendedores();
    }
  }, [newSaleOpen]);

  useEffect(() => {
    if (editVenda) fetchVendedores();
  }, [editVenda]);

  useEffect(() => {
    setPaginaLista(1);
  }, [filterFrom, filterTo]);

  useEffect(() => {
    setPaginaLista((p) => Math.min(p, totalPaginas));
  }, [totalPaginas]);

  useEffect(() => {
    setPaginaCobranca((p) => Math.min(p, totalPaginasCobranca));
  }, [totalPaginasCobranca]);

  const totalVendas = vendasFiltradas.reduce((s, v) => s + Number(v.valor), 0);
  const totalLiquido = vendasFiltradas.reduce(
    (s, v) => s + faturamentoLiquido(Number(v.valor), Number(v.percentual_taxa_checkout ?? 0)),
    0
  );

  const porDia = vendasFiltradas.reduce<Record<string, number>>((acc, v) => {
    const key = v.data_venda
      ? String(v.data_venda).split("T")[0]
      : v.created_at
        ? format(startOfDay(new Date(v.created_at)), "yyyy-MM-dd")
        : "";
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + Number(v.valor);
    return acc;
  }, {});
  const chartData = Object.entries(porDia)
    .map(([date, total]) => ({
      date: format(parseDateOnly(date), "dd/MM", { locale: ptBR }),
      total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const porVendedor = vendasFiltradas.reduce<Record<string, number>>((acc, v) => {
    const nome = v.vendedor?.trim() || "Sem nome";
    acc[nome] = (acc[nome] ?? 0) + Number(v.valor);
    return acc;
  }, {});
  const rankingVendedores = Object.entries(porVendedor)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, total]) => ({ nome, total }));

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseBRLInput(valor);
    if (v <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    const vendedor = vendedores.find((x) => x.id === vendedorId);
    if (!vendedorId || !vendedor) {
      toast.error("Selecione o vendedor.");
      return;
    }
    setIsSubmitting(true);
    try {
      const taxa = Math.min(100, Math.max(0, parseFloat(taxaCheckout.replace(",", ".")) || 0));
      const { error } = await supabase.from("vendas").insert({
        valor: v,
        vendedor: vendedor.nome,
        data_venda: dataVenda,
        percentual_taxa_checkout: taxa,
        status: "ativa",
      });
      if (error) throw error;
      setValor("");
      setVendedorId("");
      setTaxaCheckout("");
      setNewSaleOpen(false);
      fetchVendas();
      toast.success("Venda registrada!");
    } catch {
      toast.error("Erro ao registrar venda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (v: Venda) => {
    setEditVenda(v);
    setEditValor(formatBRL(Number(v.valor)));
    setEditDataVenda(String(v.data_venda || "").split("T")[0] || format(new Date(), "yyyy-MM-dd"));
    const vend = vendedores.find((x) => x.nome === v.vendedor);
    setEditVendedorId(vend?.id ?? "");
    setEditTaxaCheckout(String(v.percentual_taxa_checkout ?? ""));
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVenda) return;
    const v = parseBRLInput(editValor);
    if (v <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    const vendedor = vendedores.find((x) => x.id === editVendedorId);
    if (!editVendedorId || !vendedor) {
      toast.error("Selecione o vendedor.");
      return;
    }
    setIsSubmitting(true);
    try {
      const taxa = Math.min(100, Math.max(0, parseFloat(editTaxaCheckout.replace(",", ".")) || 0));
      const { error } = await supabase
        .from("vendas")
        .update({
          valor: v,
          vendedor: vendedor.nome,
          data_venda: editDataVenda,
          percentual_taxa_checkout: taxa,
        })
        .eq("id", editVenda.id);
      if (error) throw error;
      setEditVenda(null);
      fetchVendas();
      toast.success("Venda atualizada!");
    } catch {
      toast.error("Erro ao atualizar venda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefund = async (v: Venda) => {
    try {
      const { error } = await supabase
        .from("vendas")
        .update({ status: "reembolsada" })
        .eq("id", v.id);
      if (error) throw error;
      fetchVendas();
      toast.success("Venda marcada como reembolsada.");
    } catch {
      toast.error("Erro ao reembolsar.");
    }
  };

  const handleCreateCobranca = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseBRLInput(cobrancaValor);
    if (v <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    const vendedor = vendedores.find((x) => x.id === cobrancaVendedorId);
    if (!cobrancaVendedorId || !vendedor) {
      toast.error("Selecione o vendedor.");
      return;
    }
    setIsSubmitting(true);
    try {
      const taxa = Math.min(100, Math.max(0, parseFloat(cobrancaTaxa.replace(",", ".")) || 0));
      const { error } = await supabase.from("vendas_a_cobrar").insert({
        valor: v,
        vendedor: vendedor.nome,
        data_prevista_cobranca: cobrancaData,
        descricao: cobrancaDescricao.trim() || null,
        percentual_taxa_checkout: taxa,
      });
      if (error) throw error;
      setCobrancaValor("");
      setCobrancaData(format(new Date(), "yyyy-MM-dd"));
      setCobrancaVendedorId("");
      setCobrancaDescricao("");
      setCobrancaTaxa("");
      setNewCobrancaOpen(false);
      fetchVendasACobrar();
      toast.success("Cobrança adicionada.");
    } catch {
      toast.error("Erro ao adicionar cobrança.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarcarComoPago = async (c: VendaACobrar) => {
    setMarcandoPagoId(c.id);
    try {
      const dataPagamento = format(new Date(), "yyyy-MM-dd");
      const taxaCobranca = Number(c.percentual_taxa_checkout ?? 0);
      const { error: errInsert } = await supabase.from("vendas").insert({
        valor: Number(c.valor),
        vendedor: c.vendedor,
        data_venda: dataPagamento,
        percentual_taxa_checkout: taxaCobranca,
        status: "ativa",
      });
      if (errInsert) throw errInsert;
      const { error: errDelete } = await supabase
        .from("vendas_a_cobrar")
        .delete()
        .eq("id", c.id);
      if (errDelete) throw errDelete;
      fetchVendas();
      fetchVendasACobrar();
      toast.success("Marcado como pago e registrado nas vendas.");
    } catch {
      toast.error("Erro ao marcar como pago.");
    } finally {
      setMarcandoPagoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="date-filter" className="text-sm text-muted-foreground whitespace-nowrap">
              Período
            </Label>
            <Select
              value={dateFilterMode}
              onValueChange={(v) => setDateFilterMode(v as DateFilterMode)}
            >
              <SelectTrigger id="date-filter" className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="range">Intervalo personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dateFilterMode === "range" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={dateRangeFrom}
                onChange={(e) => setDateRangeFrom(e.target.value)}
                className="w-full sm:w-[140px]"
              />
              <span className="text-muted-foreground hidden sm:inline">até</span>
              <Input
                type="date"
                value={dateRangeTo}
                onChange={(e) => setDateRangeTo(e.target.value)}
                className="w-full sm:w-[140px]"
              />
            </div>
          )}
          <Button onClick={() => setNewSaleOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova venda
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total de vendas (bruto)</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              R$ {totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturamento líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              R$ {totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendas por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum dado para exibir.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => [`R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Total"]} />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ranking por vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : rankingVendedores.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum dado para exibir.</p>
          ) : (
            <div className="space-y-6">
              {/* Pódio: 2º esquerda, 1º centro, 3º direita */}
              {rankingVendedores.length >= 3 && (
                <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-md mx-auto">
                  <div className="flex-1 flex flex-col items-center min-w-0">
                    <span className="text-2xl mb-1" aria-hidden>🥈</span>
                    <span className="font-medium text-sm truncate w-full text-center">{rankingVendedores[1].nome}</span>
                    <span className="text-xs text-muted-foreground">R$ {formatBRL(rankingVendedores[1].total)}</span>
                    <div className="w-full bg-muted rounded-t-md mt-2 h-20" />
                  </div>
                  <div className="flex-1 flex flex-col items-center min-w-0">
                    <span className="text-3xl mb-1" aria-hidden>🥇</span>
                    <span className="font-bold text-sm truncate w-full text-center">{rankingVendedores[0].nome}</span>
                    <span className="text-xs text-muted-foreground">R$ {formatBRL(rankingVendedores[0].total)}</span>
                    <div className="w-full bg-primary/25 rounded-t-md mt-2 h-28 border border-primary/30" />
                  </div>
                  <div className="flex-1 flex flex-col items-center min-w-0">
                    <span className="text-2xl mb-1" aria-hidden>🥉</span>
                    <span className="font-medium text-sm truncate w-full text-center">{rankingVendedores[2].nome}</span>
                    <span className="text-xs text-muted-foreground">R$ {formatBRL(rankingVendedores[2].total)}</span>
                    <div className="w-full bg-muted rounded-t-md mt-2 h-14" />
                  </div>
                </div>
              )}
              {/* Lista completa (ou só os 3 no pódio + resto) */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingVendedores.map(({ nome, total }, idx) => (
                    <TableRow key={nome}>
                      <TableCell className="font-medium">
                        {idx === 0 && <span aria-hidden>🥇</span>}
                        {idx === 1 && <span aria-hidden>🥈</span>}
                        {idx === 2 && <span aria-hidden>🥉</span>}
                        {idx > 2 && idx + 1}
                      </TableCell>
                      <TableCell>{nome}</TableCell>
                      <TableCell className="text-right">
                        R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : vendas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma venda registrada.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Taxa %</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead className="w-10" aria-label="Ações" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasPaginadas.map((v) => {
                  const pct = Number(v.percentual_taxa_checkout ?? 0);
                  const liq = faturamentoLiquido(Number(v.valor), pct);
                  const isReembolsada = v.status === "reembolsada";
                  return (
                    <TableRow key={v.id} className={isReembolsada ? "opacity-70" : undefined}>
                      <TableCell>
                        {v.data_venda
                          ? format(parseDateOnly(v.data_venda), "dd/MM/yyyy", { locale: ptBR })
                          : v.created_at
                            ? format(new Date(v.created_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                      </TableCell>
                      <TableCell>{v.vendedor}</TableCell>
                      <TableCell>
                        {isReembolsada ? (
                          <Badge variant="secondary">Reembolsada</Badge>
                        ) : (
                          <Badge variant="outline">Ativa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {Number(v.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">{pct}%</TableCell>
                      <TableCell className="text-right">
                        R$ {liq.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {!isReembolsada && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(v)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRefund(v)}
                                className="text-destructive focus:text-destructive"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reembolsar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
              {vendasFiltradas.length > ITENS_POR_PAGINA && (
                <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {inicioItem}-{fimItem} de {vendasFiltradas.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaLista((p) => Math.max(1, p - 1))}
                      disabled={paginaLista <= 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                      Página {paginaLista} de {totalPaginas}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaLista((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaLista >= totalPaginas}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Vendas a cobrar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden />
            Vendas a cobrar
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCobrancaData(format(new Date(), "yyyy-MM-dd"));
              setCobrancaValor("");
              setCobrancaVendedorId("");
              setCobrancaDescricao("");
              setCobrancaTaxa("");
              fetchVendedores();
              setNewCobrancaOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar cobrança
          </Button>
        </CardHeader>
        <CardContent>
          {vendasACobrar.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Nenhuma cobrança pendente.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data a cobrar</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Taxa %</TableHead>
                    <TableHead className="w-10" aria-label="Ações" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasACobrarPaginadas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {format(parseDateOnly(c.data_prevista_cobranca), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={c.descricao ?? ""}>
                        {c.descricao || "—"}
                      </TableCell>
                      <TableCell>{c.vendedor}</TableCell>
                      <TableCell className="text-right">
                        R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">{Number(c.percentual_taxa_checkout ?? 0)}%</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Ações"
                              disabled={marcandoPagoId === c.id}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleMarcarComoPago(c)}
                              disabled={marcandoPagoId === c.id}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {marcandoPagoId === c.id ? "Registrando..." : "Marcar como pago"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-amber-100 dark:bg-amber-950/50">
                    <TableCell colSpan={3} className="text-right font-medium text-amber-900 dark:text-amber-200">
                      Total pendente
                    </TableCell>
                    <TableCell className="text-right font-medium text-amber-900 dark:text-amber-200">
                      R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              </Table>
              {vendasACobrar.length > ITENS_POR_PAGINA_COBRANCA && (
                <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {inicioItemCobranca}-{fimItemCobranca} de {vendasACobrar.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaCobranca((p) => Math.max(1, p - 1))}
                      disabled={paginaCobranca <= 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                      Página {paginaCobranca} de {totalPaginasCobranca}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaCobranca((p) => Math.min(totalPaginasCobranca, p + 1))}
                      disabled={paginaCobranca >= totalPaginasCobranca}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={newCobrancaOpen} onOpenChange={(o) => !o && setNewCobrancaOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar cobrança</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCobranca} className="space-y-4">
            <div>
              <Label htmlFor="cobranca_data">Data a cobrar</Label>
              <Input
                id="cobranca_data"
                type="date"
                value={cobrancaData}
                onChange={(e) => setCobrancaData(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cobranca_valor">Valor (R$)</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground pointer-events-none">R$</span>
                <Input
                  id="cobranca_valor"
                  value={cobrancaValor}
                  onChange={(e) => setCobrancaValor(sanitizeBRLInput(e.target.value))}
                  onBlur={() => {
                    const v = parseBRLInput(cobrancaValor);
                    if (cobrancaValor.trim()) setCobrancaValor(v > 0 ? formatBRL(v) : "0,00");
                  }}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cobranca_taxa">Taxa checkout (%)</Label>
              <Input
                id="cobranca_taxa"
                type="text"
                inputMode="decimal"
                value={cobrancaTaxa}
                onChange={(e) => setCobrancaTaxa(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="cobranca_descricao">Descrição</Label>
              <Input
                id="cobranca_descricao"
                value={cobrancaDescricao}
                onChange={(e) => setCobrancaDescricao(e.target.value)}
                placeholder="Ex.: Pedido #123, boleto vencimento..."
              />
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select value={cobrancaVendedorId} onValueChange={setCobrancaVendedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((vend) => (
                    <SelectItem key={vend.id} value={vend.id}>
                      {vend.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewCobrancaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={newSaleOpen} onOpenChange={(o) => !o && setNewSaleOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova venda</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSale} className="space-y-4">
            <div>
              <Label htmlFor="data_venda">Data da venda</Label>
              <Input
                id="data_venda"
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground pointer-events-none">
                  R$
                </span>
                <Input
                  id="valor"
                  value={valor}
                  onChange={(e) => setValor(sanitizeBRLInput(e.target.value))}
                  onBlur={() => {
                    const v = parseBRLInput(valor);
                    if (valor.trim()) setValor(v > 0 ? formatBRL(v) : "0,00");
                  }}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="taxa_checkout">Taxa checkout (%)</Label>
              <Input
                id="taxa_checkout"
                type="text"
                inputMode="decimal"
                value={taxaCheckout}
                onChange={(e) => setTaxaCheckout(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select value={vendedorId} onValueChange={setVendedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((vend) => (
                    <SelectItem key={vend.id} value={vend.id}>
                      {vend.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewSaleOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVenda} onOpenChange={(o) => !o && setEditVenda(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar venda</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSale} className="space-y-4">
            <div>
              <Label htmlFor="edit_data_venda">Data da venda</Label>
              <Input
                id="edit_data_venda"
                type="date"
                value={editDataVenda}
                onChange={(e) => setEditDataVenda(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit_valor">Valor (R$)</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground pointer-events-none">R$</span>
                <Input
                  id="edit_valor"
                  value={editValor}
                  onChange={(e) => setEditValor(sanitizeBRLInput(e.target.value))}
                  onBlur={() => {
                    const v = parseBRLInput(editValor);
                    if (editValor.trim()) setEditValor(v > 0 ? formatBRL(v) : "0,00");
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_taxa_checkout">Taxa checkout (%)</Label>
              <Input
                id="edit_taxa_checkout"
                type="text"
                inputMode="decimal"
                value={editTaxaCheckout}
                onChange={(e) => setEditTaxaCheckout(e.target.value)}
              />
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select value={editVendedorId} onValueChange={setEditVendedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((vend) => (
                    <SelectItem key={vend.id} value={vend.id}>
                      {vend.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditVenda(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
