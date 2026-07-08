// ============================================================
// CONFIGURAÇÃO CENTRAL
// Edite só este arquivo pra trocar a chave do Supabase
// ou os nomes dos restaurantes — todos os formulários e o
// dashboard puxam daqui.
// ============================================================

export const SUPABASE_URL = "https://jchrsexjqsjsnstxggvr.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_bHt1HT7PA-LyYjZkmN3xMg_PYzNTtF-";

export const EVENTO = {
  antetitulo: "Primeiro Festival de",
  nome: "Comida de Boteco",
  local: "Água Boa",
  edicao: "1ª Edição",
};
export const CRITERIOS = [
  { chave: "sabor", label: "Sabor", icone: "😋" },
  { chave: "apresentacao", label: "Apresentação", icone: "🎨" },
  { chave: "experiencia_geral", label: "Experiência Geral", icone: "🌟" },
  { chave: "criatividade", label: "Criatividade", icone: "💡" },
];
export const RESTAURANTES = {
  1: {
    nome: "Recanto Bonanza",
    prato: "Romance de Tilápia",
    logo: "../assets/logos/recanto-bonanza.png",
    foto: "../assets/fotos/recanto-bonanza.jpg",
  },
  2: {
    nome: "Bar Anexo do Sabor Expresso",
    prato: "Crocante de Sabor",
    logo: "../assets/logos/bar-anexo.png",
    foto: "../assets/fotos/bar-anexo.jpg",
  },
  3: {
    nome: "Prosa Mineira",
    prato: "Iscas de Tilápia",
    logo: "../assets/logos/prosa-mineira.png",
    foto: "../assets/fotos/prosa-mineira.jpg",
  },
  4: {
    nome: "A Nós Gastrobar",
    prato: "Tentação de Costelinha",
    logo: "../assets/logos/a-nos-gastrobar.png",
    foto: "../assets/fotos/a-nos-gastrobar.jpg",
  },
};
