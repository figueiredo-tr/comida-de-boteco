import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  EVENTO,
  CRITERIOS,
  RESTAURANTES,
} from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const conteudo = document.getElementById("conteudo");
const atualizacao = document.getElementById("atualizacao");
const acessoRapido = document.getElementById("acessoRapido");

// Busca a logo de um restaurante a partir do nome vindo do Supabase
function logoPorNome(nome) {
  const entry = Object.values(RESTAURANTES).find((r) => r.nome === nome);
  return entry?.logo || "";
}

// Monta os botões de acesso rápido — aqui aponta pro formulário do JÚRI
// (arquivo restaurante-X.html na mesma pasta /jurados)
acessoRapido.innerHTML = Object.entries(RESTAURANTES)
  .map(
    ([id, r]) => `
  <a class="botao-restaurante" href="/jurados/restaurante-${id}.html">
    ${
      r.logo
        ? `<span class="carimbo-logo-mini"><img src="${r.logo}" alt="Logo ${r.nome}" loading="lazy"></span>`
        : `<span class="numero">${id}</span>`
    }
    <span class="nome">${r.nome}</span>
  </a>
`,
  )
  .join("");

// Renderiza a parte fixa do herói do festival (nome, local, edição, stats)
function renderHero() {
  document.getElementById("festivalBanner").innerHTML = `
    <p class="hero-antetitulo">${EVENTO.antetitulo}</p>
    <h1 class="hero-nome">${EVENTO.nome}</h1>
    <p class="hero-subtitulo">${EVENTO.local} · ${EVENTO.edicao}</p>
    <div class="hero-stats">
      <div class="stat">
        <span class="stat-num">${Object.keys(RESTAURANTES).length}</span>
        <span class="stat-label">barracas</span>
      </div>
      <div class="stat">
        <span class="stat-num" id="statAvaliacoes">0</span>
        <span class="stat-label">avaliações</span>
      </div>
      <div class="stat stat-live">
        <span class="live-dot"></span>
        <span class="stat-label">ao vivo</span>
      </div>
    </div>
  `;
}

renderHero();

const MEDALHAS = ["🥇", "🥈", "🥉"];

async function carregar() {
  const { data, error } = await supabase
    .from("ranking_final")
    .select("*")
    .order("pontuacao_final", { ascending: false });

  if (error) {
    conteudo.innerHTML = `<div class="pombinha">Erro ao carregar: ${error.message}</div>`;
    return;
  }

  const totalAvaliacoes = (data || []).reduce(
    (acc, r) =>
      acc +
      Number(r.total_avaliacoes_juri || 0) +
      Number(r.total_avaliacoes_publico || 0),
    0,
  );
  const statEl = document.getElementById("statAvaliacoes");
  if (statEl) statEl.textContent = totalAvaliacoes;

  if (!data || data.length === 0) {
    conteudo.innerHTML = `
      <div class="vazio">
        <div class="vazio-icone">🍻</div>
        <div class="vazio-titulo">Ainda sem avaliações</div>
        <p class="vazio-texto">Toque num restaurante acima e seja o primeiro a avaliar!</p>
      </div>
    `;
    return;
  }

  const ranking = data
    .map((r, i) => {
      const logo = logoPorNome(r.restaurante_nome);
      return `
    <div class="item ${i === 0 ? "primeiro" : ""}">
      <div class="posicao">${MEDALHAS[i] || i + 1 + "º"}</div>
      ${
        logo
          ? `<span class="carimbo-logo-mini"><img src="${logo}" alt="Logo ${r.restaurante_nome}" loading="lazy"></span>`
          : ""
      }
      <div class="info">
        <div class="nome">${r.restaurante_nome}${i === 0 ? '<span class="chip-lider">líder</span>' : ""}</div>
        <div class="meta">
          ${r.total_avaliacoes_publico} avaliações do público · ${r.total_avaliacoes_juri} do júri
        </div>
        <div class="meta-pontos">
          júri ${Number(r.pontuacao_juri).toFixed(1)}/50 · público ${Number(r.pontuacao_publico).toFixed(1)}/50
        </div>
      </div>
      <div class="media-geral">${Number(r.pontuacao_final).toFixed(1)}</div>
    </div>
  `;
    })
    .join("");

  const categorias = CRITERIOS.map((c) => ({
    chave: `media_${c.chave}`,
    label: `${c.icone} ${c.label}`,
  }));

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
    <p class="legenda-pontuacao">Pontuação final = nota do júri (máx 50) + nota do público (máx 50)</p>
    <div class="ranking">${ranking}</div>
    <div class="grid-categorias">${paineis}</div>
  `;

  atualizacao.textContent =
    "atualizado às " + new Date().toLocaleTimeString("pt-BR");
}

carregar();
setInterval(carregar, 15000);
