import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  EVENTO,
  CRITERIOS,
} from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_EMAIL = "andrefigueiredo.v@gmail.com";

const conteudo = document.getElementById("conteudo");
const atualizacao = document.getElementById("atualizacao");
const areaLogin = document.getElementById("areaLogin");
const areaAdmin = document.getElementById("areaAdmin");
const btnAdminLogin = document.getElementById("btnAdminLogin");
const btnResetPlacar = document.getElementById("btnResetPlacar");
const btnExportarPDF = document.getElementById("btnExportarPDF");
const adminMsg = document.getElementById("adminMsg");

function renderHero() {
  document.getElementById("festivalBanner").innerHTML = `
    <p class="hero-antetitulo">${EVENTO.antetitulo}</p>
    <h1 class="hero-nome">${EVENTO.nome}</h1>
    <p class="hero-subtitulo">${EVENTO.local} - ${EVENTO.edicao}</p>
  `;
}
renderHero();

const MEDALHAS = ["🥇", "🥈", "🥉"];
let intervaloAtualizacao = null;

async function carregar() {
  const { data, error } = await supabase
    .from("ranking_final")
    .select("*")
    .order("pontuacao_final", { ascending: false });

  if (error) {
    conteudo.innerHTML = `<div class="pombinha">Erro ao carregar: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    conteudo.innerHTML = `
      <div class="vazio">
        <div class="vazio-icone">🍻</div>
        <div class="vazio-titulo">Ainda sem avaliações</div>
      </div>
    `;
    return;
  }

  const ranking = data
    .map(
      (r, i) => `
    <div class="item ${i === 0 ? "primeiro" : ""}">
      <div class="posicao">${MEDALHAS[i] || i + 1 + "º"}</div>
      <div class="info">
        <div class="nome">${r.restaurante_nome}${i === 0 ? '<span class="chip-lider">líder</span>' : ""}</div>
        <div class="meta">${r.total_avaliacoes_publico} avaliações do público · ${r.total_avaliacoes_juri} do júri</div>
        <div class="meta-pontos">júri ${Number(r.pontuacao_juri).toFixed(1)}/50 · público ${Number(r.pontuacao_publico).toFixed(1)}/50</div>
      </div>
      <div class="media-geral">${Number(r.pontuacao_final).toFixed(1)}</div>
    </div>
  `,
    )
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

btnAdminLogin.addEventListener("click", async () => {
  btnAdminLogin.disabled = true;
  btnAdminLogin.textContent = "Redirecionando...";
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.href },
  });
});

btnResetPlacar.addEventListener("click", async () => {
  const confirmar = confirm(
    "Tem certeza que quer apagar TODAS as avaliações (júri e público)? Essa ação não pode ser desfeita.",
  );
  if (!confirmar) return;

  const confirmarDeNovo = confirm(
    "Confirmando de novo: isso vai zerar o placar geral pra todos os restaurantes. Continuar?",
  );
  if (!confirmarDeNovo) return;

  btnResetPlacar.disabled = true;
  btnResetPlacar.textContent = "Resetando...";

  const [{ error: erroJuri }, { error: erroPublico }] = await Promise.all([
    supabase
      .from("avaliacoes_juri")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"),
    supabase
      .from("avaliacoes_publico")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"),
  ]);

  btnResetPlacar.disabled = false;
  btnResetPlacar.textContent = "Resetar placar";

  if (erroJuri || erroPublico) {
    adminMsg.textContent =
      "Erro ao resetar: " + (erroJuri?.message || erroPublico?.message);
    return;
  }

  adminMsg.textContent = "Placar resetado com sucesso!";
  carregar();
});

btnExportarPDF.addEventListener("click", () => {
  const agora = new Date();
  const dataArquivo = agora.toLocaleDateString("pt-BR").replace(/\//g, "-");
  const dataExtenso =
    agora.toLocaleDateString("pt-BR") +
    " às " +
    agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  btnExportarPDF.disabled = true;
  btnExportarPDF.textContent = "Gerando PDF...";

  // Monta um documento dedicado pro PDF: largura fixa (proporcional à
  // folha A4) + cabeçalho com nome do evento, pra não depender do
  // tamanho da tela de quem clicou em exportar e pra ficar com layout
  // profissional (não só o placar cru).
  const wrapper = document.createElement("div");
  wrapper.className = "pdf-wrapper";
  wrapper.style.width = "794px"; // ~ largura A4 a 96dpi
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";

  wrapper.innerHTML = `
    <div class="pdf-cabecalho">
      <p class="pdf-antetitulo">${EVENTO.antetitulo}</p>
      <h1 class="pdf-nome-evento">${EVENTO.nome}</h1>
      <p class="pdf-subtitulo-evento">${EVENTO.local} - ${EVENTO.edicao}</p>
      <span class="pdf-titulo-relatorio">Relatório detalhado do evento</span>
      <p class="pdf-gerado-em">Gerado em ${dataExtenso}</p>
    </div>
  `;
  wrapper.innerHTML += document.getElementById("relatorio").innerHTML;

  document.body.appendChild(wrapper);

  html2pdf()
    .from(wrapper)
    .set({
      filename: `relatorio-comida-de-boteco-${dataArquivo}.pdf`,
      margin: [10, 8, 10, 8],
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      html2canvas: {
        scale: 2,
        backgroundColor: "#141d18",
        useCORS: true,
        windowWidth: 794,
      },
      pagebreak: { mode: ["css", "legacy"], avoid: [".item", ".painel"] },
    })
    .save()
    .then(() => {
      document.body.removeChild(wrapper);
      btnExportarPDF.disabled = false;
      btnExportarPDF.textContent = "📄 Exportar PDF";
    });
});

async function verificarAdmin() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const ehAdmin = session?.user?.email === ADMIN_EMAIL;

  if (ehAdmin) {
    areaLogin.style.display = "none";
    areaAdmin.style.display = "block";
    if (!intervaloAtualizacao) {
      carregar();
      intervaloAtualizacao = setInterval(carregar, 15000);
    }
  } else {
    areaLogin.style.display = "block";
    areaAdmin.style.display = "none";
    if (intervaloAtualizacao) {
      clearInterval(intervaloAtualizacao);
      intervaloAtualizacao = null;
    }
    adminMsg.textContent = session
      ? "Essa conta não tem permissão de admin."
      : "";
  }
}

supabase.auth.onAuthStateChange(() => verificarAdmin());
verificarAdmin();
