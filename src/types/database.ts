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
  linkVersao?: string;
  correcoes?: string;
  implementacoes?: string;
  created_at?: string;
}
