import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  EVENTO,
  CRITERIOS,
  RESTAURANTES,
} from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Garante que não sobrou nenhuma sessão do Google de quando o admin
// usava login via Supabase Auth (antes de trocarmos pra senha simples).
// Sem isso, o Supabase trata as requisições como "authenticated" e cai
// em policies antigas que exigem vínculo com user_id.
supabase.auth.signOut();
// Senha única do admin — troque aqui se precisar alterar.
const SENHA_ADMIN = "boteco2026";
const CHAVE_SESSAO = "admin_autenticado";

const conteudo = document.getElementById("conteudo");
const atualizacao = document.getElementById("atualizacao");
const areaLogin = document.getElementById("areaLogin");
const areaAdmin = document.getElementById("areaAdmin");
const formSenhaAdmin = document.getElementById("formSenhaAdmin");
const campoSenhaAdmin = document.getElementById("campoSenhaAdmin");
const btnExportarPDF = document.getElementById("btnExportarPDF");
const adminMsg = document.getElementById("adminMsg");
const conteudoRevelacaoAdmin = document.getElementById(
  "conteudoRevelacaoAdmin",
);
const btnToggleRevelacao = document.getElementById("btnToggleRevelacao");
const btnTogglePublico = document.getElementById("btnTogglePublico");
const btnToggleJuri = document.getElementById("btnToggleJuri");
const btnToggleRevelacaoVoto = document.getElementById(
  "btnToggleRevelacaoVoto",
);
const btnToggleFinal = document.getElementById("btnToggleFinal");
const cedulaRestauranteSelect = document.getElementById("cedulaRestaurante");
const cedulaNotaInput = document.getElementById("cedulaNota");
const cedulaQuantidadeInput = document.getElementById("cedulaQuantidade");
const cedulaNomeInput = document.getElementById("cedulaNome");
const cedulaMsg = document.getElementById("cedulaMsg");
const formCedula = document.getElementById("formCedula");
const listaCedulas = document.getElementById("listaCedulas");
const btnVerCedulas = document.getElementById("btnVerCedulas");
let cedulasJaCarregadasUmaVez = false;

btnVerCedulas.addEventListener("click", async () => {
  const estaAberta = listaCedulas.style.display !== "none";

  if (estaAberta) {
    listaCedulas.style.display = "none";
    btnVerCedulas.textContent = "Ver últimas cédulas lançadas";
    return;
  }

  listaCedulas.style.display = "block";
  btnVerCedulas.textContent = "Ocultar cédulas lançadas";

  if (!cedulasJaCarregadasUmaVez) {
    cedulasJaCarregadasUmaVez = true;
    await carregarUltimasCedulas();
  }
});
async function atualizarBotaoFinal() {
  const { data, error } = await supabase
    .from("final_estado")
    .select("liberado")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  const liberado = data?.liberado || false;
  btnToggleFinal.textContent = liberado
    ? "Ocultar pódio final (voltar ao suspense)"
    : "Liberar pódio final";
  btnToggleFinal.dataset.liberado = liberado ? "1" : "0";
  btnToggleFinal.classList.toggle("liberado", liberado);
}

btnToggleFinal.addEventListener("click", async () => {
  const liberadoAtual = btnToggleFinal.dataset.liberado === "1";
  btnToggleFinal.disabled = true;

  const { error } = await supabase
    .from("final_estado")
    .update({ liberado: !liberadoAtual })
    .eq("id", 1);

  btnToggleFinal.disabled = false;

  if (error) {
    console.error(error);
    adminMsg.textContent = "Erro ao mudar o estado do pódio: " + error.message;
    return;
  }

  await atualizarBotaoFinal();
});
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

// Função genérica pra criar o toggle de cada área (público, júri, revelação),
// evitando repetir a mesma lógica 3 vezes com nomes diferentes.
function criarToggleVotacao({ botao, coluna, rotulo }) {
  async function atualizar() {
    const { data, error } = await supabase
      .from("votacao_estado")
      .select(coluna)
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    const aberto = data?.[coluna] ?? true;
    botao.textContent = aberto
      ? `Encerrar votação do ${rotulo}`
      : `Reabrir votação do ${rotulo}`;
    botao.dataset.aberto = aberto ? "1" : "0";
    botao.classList.toggle("encerrada", !aberto);
  }

  botao.addEventListener("click", async () => {
    const abertoAtual = botao.dataset.aberto === "1";
    const acao = abertoAtual ? "encerrar" : "reabrir";

    const confirmar = confirm(
      abertoAtual
        ? `Tem certeza que quer ENCERRAR a votação do ${rotulo}? Ninguém mais vai conseguir votar nessa parte até você reabrir.`
        : `Quer REABRIR a votação do ${rotulo}?`,
    );
    if (!confirmar) return;

    botao.disabled = true;

    const { error } = await supabase
      .from("votacao_estado")
      .update({ [coluna]: !abertoAtual })
      .eq("id", 1);

    botao.disabled = false;

    if (error) {
      console.error(error);
      adminMsg.textContent =
        `Erro ao mudar o estado do ${rotulo}: ` + error.message;
      return;
    }

    adminMsg.textContent = `Votação do ${rotulo} ${acao === "encerrar" ? "encerrada" : "reaberta"} com sucesso!`;
    await atualizar();
  });

  return atualizar;
}

const atualizarBotaoPublico = criarToggleVotacao({
  botao: btnTogglePublico,
  coluna: "publico_aberto",
  rotulo: "público",
});
const atualizarBotaoJuri = criarToggleVotacao({
  botao: btnToggleJuri,
  coluna: "juri_aberto",
  rotulo: "júri",
});
const atualizarBotaoRevelacaoVoto = criarToggleVotacao({
  botao: btnToggleRevelacaoVoto,
  coluna: "revelacao_aberta",
  rotulo: "Revelação",
});
// Monta o <select> de restaurantes a partir do config.js
cedulaRestauranteSelect.innerHTML = Object.entries(RESTAURANTES)
  .map(([id, r]) => `<option value="${id}">${r.nome}</option>`)
  .join("");

formCedula.addEventListener("submit", async (e) => {
  e.preventDefault();
  cedulaMsg.textContent = "";

  const restauranteId = cedulaRestauranteSelect.value;
  const nota = Number(cedulaNotaInput.value);
  const quantidade = Number(cedulaQuantidadeInput.value);

  if (!Number.isInteger(nota) || nota < 0 || nota > 10) {
    cedulaMsg.textContent = "A nota precisa ser um número inteiro de 0 a 10.";
    return;
  }

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    cedulaMsg.textContent = "A quantidade precisa ser 1 ou mais.";
    return;
  }

  const botao = formCedula.querySelector("button[type='submit']");
  botao.disabled = true;
  botao.textContent = "Lançando...";

  const nomeCedula = cedulaNomeInput.value.trim() || null;

  const lote = Array.from({ length: quantidade }, () => ({
    restaurante_id: restauranteId,
    restaurante_nome: RESTAURANTES[restauranteId].nome,
    user_id: null,
    nota,
    origem: "cedula_papel",
    nome_cedula: nomeCedula,
  }));

  const { error } = await supabase.from("avaliacoes_publico").insert(lote);

  botao.disabled = false;
  botao.textContent = "Lançar cédula";

  if (error) {
    console.error(error);
    cedulaMsg.textContent = "Erro ao lançar: " + error.message;
    return;
  }

  cedulaMsg.textContent = `${quantidade} cédula(s) lançada(s): ${RESTAURANTES[restauranteId].nome} — nota ${nota}${nomeCedula ? " (" + nomeCedula + ")" : ""}`;
  cedulaNotaInput.value = "";
  cedulaQuantidadeInput.value = "1";
  cedulaNomeInput.value = "";
  cedulaNotaInput.focus();

  carregar();
  carregarUltimasCedulas();
});

async function carregarUltimasCedulas() {
  const { data, error } = await supabase
    .from("avaliacoes_publico")
    .select("id, restaurante_nome, nota, nome_cedula, created_at")
    .eq("origem", "cedula_papel")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    listaCedulas.innerHTML = `<p class="legenda-pontuacao">Nenhuma cédula lançada ainda</p>`;
    return;
  }

  listaCedulas.innerHTML = `
    <p class="legenda-pontuacao">Últimas cédulas lançadas (${data.length})</p>
    <div class="ranking">
      ${data
        .map(
          (c) => `
        <div class="item">
          <div class="info">
            <div class="nome">${c.restaurante_nome}</div>
            <div class="meta">${c.nome_cedula ? c.nome_cedula + " · " : ""}${new Date(c.created_at).toLocaleTimeString("pt-BR")}</div>
          </div>
          <div class="media-geral">${c.nota}</div>
          <button
            type="button"
            class="btn-reset"
            style="margin-left: 10px; padding: 6px 10px; font-size: 11px;"
            onclick="window.removerCedula('${c.id}')"
          >
            Desfazer
          </button>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

// Exposta no window pra funcionar com o onclick inline acima
window.removerCedula = async (id) => {
  const confirmar = confirm("Remover essa cédula lançada por engano?");
  if (!confirmar) return;

  const { error } = await supabase
    .from("avaliacoes_publico")
    .delete()
    .eq("id", id)
    .eq("origem", "cedula_papel");

  if (error) {
    console.error(error);
    alert("Erro ao remover: " + error.message);
    return;
  }

  carregar();
  carregarUltimasCedulas();
};
// ===== Boteco Revelação (separado do carregar() acima) =====
async function carregarVotosRevelacao() {
  const { data, error } = await supabase
    .from("ranking_revelacao")
    .select("*")
    .order("total_votos", { ascending: false });

  if (error) {
    conteudoRevelacaoAdmin.innerHTML = `<div class="pombinha">Erro ao carregar: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    conteudoRevelacaoAdmin.innerHTML = `<div class="pombinha">Nenhum voto registrado ainda 🌟</div>`;
    return;
  }

  const totalVotos = data.reduce(
    (acc, r) => acc + Number(r.total_votos || 0),
    0,
  );

  conteudoRevelacaoAdmin.innerHTML = `
    <p class="legenda-pontuacao">${totalVotos} votos registrados no total</p>
    <div class="ranking">
      ${data
        .map(
          (r, i) => `
        <div class="item ${i === 0 ? "primeiro" : ""}">
          <div class="posicao">${MEDALHAS[i] || i + 1 + "º"}</div>
          <div class="info">
            <div class="nome">${r.restaurante_nome}${i === 0 ? '<span class="chip-lider">líder</span>' : ""}</div>
            <div class="meta">${r.total_votos} votos</div>
          </div>
          <div class="media-geral">${r.total_votos}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

async function atualizarBotaoRevelacao() {
  const { data, error } = await supabase
    .from("revelacao_estado")
    .select("liberado")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  const liberado = data?.liberado || false;
  btnToggleRevelacao.textContent = liberado
    ? "Ocultar resultado (voltar ao suspense)"
    : "Liberar resultado pro público";
  btnToggleRevelacao.dataset.liberado = liberado ? "1" : "0";
  btnToggleRevelacao.classList.toggle("liberado", liberado);
}

btnToggleRevelacao.addEventListener("click", async () => {
  const liberadoAtual = btnToggleRevelacao.dataset.liberado === "1";
  btnToggleRevelacao.disabled = true;

  const { error } = await supabase
    .from("revelacao_estado")
    .update({ liberado: !liberadoAtual })
    .eq("id", 1);

  btnToggleRevelacao.disabled = false;

  if (error) {
    console.error(error);
    adminMsg.textContent =
      "Erro ao mudar o estado do Revelação: " + error.message;
    return;
  }

  await atualizarBotaoRevelacao();
});

formSenhaAdmin.addEventListener("submit", (e) => {
  e.preventDefault();
  if (campoSenhaAdmin.value === SENHA_ADMIN) {
    sessionStorage.setItem(CHAVE_SESSAO, "1");
    adminMsg.textContent = "";
    campoSenhaAdmin.value = "";
    verificarAdmin();
  } else {
    adminMsg.textContent = "Senha incorreta.";
  }
});

btnExportarPDF.addEventListener("click", () => {
  if (typeof html2pdf !== "function") {
    alert(
      "A biblioteca de PDF não carregou. Verifica sua conexão e recarrega a página pra tentar de novo.",
    );
    return;
  }

  const agora = new Date();
  const dataArquivo = agora.toLocaleDateString("pt-BR").replace(/\//g, "-");
  const dataExtenso =
    agora.toLocaleDateString("pt-BR") +
    " às " +
    agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  btnExportarPDF.disabled = true;
  btnExportarPDF.textContent = "Gerando PDF...";

  const relatorioEl = document.getElementById("relatorio");

  const cabecalho = document.createElement("div");
  cabecalho.className = "pdf-cabecalho";
  cabecalho.innerHTML = `
    <p class="pdf-antetitulo">${EVENTO.antetitulo}</p>
    <h1 class="pdf-nome-evento">${EVENTO.nome}</h1>
    <p class="pdf-subtitulo-evento">${EVENTO.local} - ${EVENTO.edicao}</p>
    <span class="pdf-titulo-relatorio">Relatório detalhado do evento</span>
    <p class="pdf-gerado-em">Gerado em ${dataExtenso}</p>
  `;
  relatorioEl.insertBefore(cabecalho, relatorioEl.firstChild);
  relatorioEl.classList.add("pdf-wrapper");

  const larguraOriginal = relatorioEl.style.width;
  const raioOriginal = relatorioEl.style.borderRadius;
  relatorioEl.style.width = "700px";
  relatorioEl.style.borderRadius = "0";

  const elementosSemQuebra = relatorioEl.querySelectorAll(".item, .painel");
  elementosSemQuebra.forEach((el) => {
    el.style.pageBreakInside = "avoid";
    el.style.breakInside = "avoid";
  });

  html2pdf()
    .from(relatorioEl)
    .set({
      filename: `relatorio-comida-de-boteco-${dataArquivo}.pdf`,
      margin: [8, 6, 8, 6],
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      html2canvas: {
        scale: 2,
        backgroundColor: "#141d18",
        useCORS: true,
      },
      pagebreak: { mode: ["css"], avoid: [".item", ".painel"] },
    })
    .save()
    .catch((err) => {
      console.error("Erro ao gerar PDF:", err);
      alert(
        "Deu ruim ao gerar o PDF:\n\n" +
          (err && err.message ? err.message : String(err)),
      );
    })
    .finally(() => {
      cabecalho.remove();
      relatorioEl.classList.remove("pdf-wrapper");
      relatorioEl.style.width = larguraOriginal;
      relatorioEl.style.borderRadius = raioOriginal;
      btnExportarPDF.disabled = false;
      btnExportarPDF.textContent = "📄 Exportar PDF";
    });
});

function verificarAdmin() {
  const autenticado = sessionStorage.getItem(CHAVE_SESSAO) === "1";

  if (autenticado) {
    areaLogin.style.display = "none";
    areaAdmin.style.display = "block";
    if (!intervaloAtualizacao) {
      carregar();
      carregarVotosRevelacao();
      atualizarBotaoRevelacao();
      atualizarBotaoFinal();
      atualizarBotaoPublico();
      atualizarBotaoJuri();
      atualizarBotaoRevelacaoVoto();
      intervaloAtualizacao = setInterval(() => {
        carregar();
        carregarVotosRevelacao();
      }, 15000);
    }
  } else {
    areaLogin.style.display = "block";
    areaAdmin.style.display = "none";
    if (intervaloAtualizacao) {
      clearInterval(intervaloAtualizacao);
      intervaloAtualizacao = null;
    }
  }
}

verificarAdmin();
