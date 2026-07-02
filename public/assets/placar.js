import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, RESTAURANTES } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const conteudo = document.getElementById("conteudo");
const atualizacao = document.getElementById("atualizacao");
const acessoRapido = document.getElementById("acessoRapido");

// Monta os botões de acesso rápido a partir do config.js
acessoRapido.innerHTML = Object.entries(RESTAURANTES)
  .map(
    ([id, nome]) => `
  <a class="botao-restaurante" href="formularios/restaurante-${id}.html">
    <span class="numero">${id}</span>
    <span class="nome">${nome}</span>
  </a>
`,
  )
  .join("");

async function carregar() {
  const { data, error } = await supabase
    .from("ranking_restaurantes")
    .select("*")
    .order("media_geral", { ascending: false });

  if (error) {
    conteudo.innerHTML = `<div class="pombinha">Erro ao carregar: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    conteudo.innerHTML = `<div class="pombinha">Nenhuma avaliação registrada ainda 🍻</div>`;
    return;
  }

  const ranking = data
    .map(
      (r, i) => `
    <div class="item ${i === 0 ? "primeiro" : ""}">
      <div class="posicao">${i + 1}º</div>
      <div class="info">
        <div class="nome">${r.restaurante_nome}</div>
        <div class="meta">${r.total_avaliacoes} avaliações</div>
      </div>
      <div class="media-geral">${Number(r.media_geral).toFixed(1)}</div>
    </div>
  `,
    )
    .join("");

  const categorias = [
    { chave: "media_comida", label: "🍢 Comida" },
    { chave: "media_ambiente", label: "💡 Ambiente" },
    { chave: "media_bebidas", label: "🍺 Bebidas" },
  ];

  const paineis = categorias
    .map(
      (cat) => `
    <div class="painel">
      <h2>${cat.label}</h2>
      ${data
        .map(
          (r) => `
        <div class="barra-linha">
          <div class="barra-topo"><span>${r.restaurante_nome}</span><span>${Number(r[cat.chave]).toFixed(1)}</span></div>
          <div class="barra-fundo"><div class="barra-cheia" style="width:${(Number(r[cat.chave]) / 5) * 100}%"></div></div>
        </div>
      `,
        )
        .join("")}
    </div>
  `,
    )
    .join("");

  conteudo.innerHTML = `
    <div class="ranking">${ranking}</div>
    <div class="grid-categorias">${paineis}</div>
  `;

  atualizacao.textContent =
    "atualizado às " + new Date().toLocaleTimeString("pt-BR");
}

carregar();
setInterval(carregar, 15000);
