export interface UsuarioSAASAgente {
  id: string;
  email: string;
  nomeSoftware: string;
  dominio?: string;
  versao?: string;
  urlEvolution?: string;
  apiEvolution?: string;
  acessoAtualizacao?: boolean;
  /** Se false, atualizações automáticas estão desativadas para este cliente. */
  atualizacoes_automaticas?: boolean;
  corPrincipal?: string;
  corSecundaria?: string;
  urlLogo?: string;
  urlFavicon?: string;
  telefoneSuporte?: string;
  supabase_url?: string;
  supabase_apikey?: string;
  supabase_anon_key?: string;
  anon_key_token?: string;
  senha?: string;
  n8nUrl?: string;
  n8nApikey?: string;
  urlMinio?: string;
  idCredSupabase?: string;
  idCredPostgres?: string;
  idCredMinio?: string;
  idCredRedis?: string;
  idCredN8N?: string;
  idCredAdmin?: string;
  [key: string]: unknown;
}

export interface ModeloEmail {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
  created_at?: string;
}

export interface Vendedor {
  id: string;
  nome: string;
}

export type StatusVenda = "ativa" | "reembolsada";

export interface Venda {
  id: string;
  valor: number;
  vendedor: string;
  data_venda?: string;
  percentual_taxa_checkout?: number;
  status?: StatusVenda;
  created_at?: string;
}

export interface VendaACobrar {
  id: string;
  valor: number;
  vendedor: string;
  data_prevista_cobranca: string;
  descricao?: string;
  percentual_taxa_checkout?: number;
  created_at?: string;
}

export interface VersaoSAASAgente {
  id: string;
  nomeVersao: string;
  titulo?: string;
  linkVersao?: string;
  url_imagem?: string;
  correcoes?: string;
  implementacoes?: string;
  created_at?: string;
  /** Se true, o fluxo Atualizar todos já foi executado para esta versão. */
  atualizou_todos?: boolean;
}

export type StatusAtualizacaoLog = "sucesso" | "erro";
export type StatusEmailLog = "pendente" | "sucesso" | "erro";

export interface AtualizacaoTodoLog {
  id: string;
  versao_id: number;
  cliente_id: string;
  status_atualizacao: StatusAtualizacaoLog;
  mensagem_atualizacao?: string | null;
  /** Corpo da resposta da requisição POST criar-workflow2. */
  resposta_atualizacao?: string | null;
  status_email: StatusEmailLog;
  mensagem_email?: string | null;
  created_at?: string;
}

export type RoadmapStatus = "sugestao" | "planejado" | "em_andamento" | "concluido";

export interface RoadmapItem {
  id: string;
  titulo: string;
  descricao?: string;
  status: RoadmapStatus;
  votos_count: number;
  dominio_sugestao?: string;
  created_at?: string;
}

export interface RoadmapVoto {
  id: string;
  item_id: string;
  dominio: string;
  created_at?: string;
}

export type StatusInstalacao = "aguardando" | "em_andamento" | "finalizado";

export type PrioridadeInstalacao = "urgente" | "normal";

export interface InstalacaoArquivo {
  name: string;
  url: string;
}

export interface Instalacao {
  id: string;
  telefone?: string | null;
  dominio: string;
  acessos?: string | null;
  status: StatusInstalacao;
  prioridade?: PrioridadeInstalacao;
  coletar_acessos?: boolean;
  arquivos?: InstalacaoArquivo[];
  created_at?: string;
}
