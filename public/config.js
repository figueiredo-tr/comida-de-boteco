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
  nome: "Primeiro Festival de Comida de Boteco",
  local: "Água Boa, MG",
  edicao: "1ª Edição",
};
export const CRITERIOS = [
  { chave: "sabor", label: "Sabor", icone: "😋" },
  { chave: "apresentacao", label: "Apresentação", icone: "🎨" },
  { chave: "textura", label: "Textura", icone: "🍗" },
  { chave: "criatividade", label: "Criatividade", icone: "💡" },
];
export const RESTAURANTES = {
  1: "Recanto Bonanza",
  2: "Bar Anexo do Sabor Expresso",
  3: "Prosa Mineira",
  4: "A Nós Gastrobar",
};
