export interface UsuarioSAASAgente {
  id: string;
  email: string;
  nomeSoftware: string;
  dominio?: string;
  versao?: string;
  urlEvolution?: string;
  apiEvolution?: string;
  acessoAtualizacao?: boolean;
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

export interface VersaoSAASAgente {
  id: string;
  nomeVersao: string;
  titulo?: string;
  linkVersao?: string;
  url_imagem?: string;
  correcoes?: string;
  implementacoes?: string;
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
