import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, RESTAURANTES } from "../config.js";

const restauranteId = document.body.dataset.restaurante;
const restaurante = RESTAURANTES[restauranteId] || {
  nome: "Restaurante desconhecido",
  prato: "",
  logo: "",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("nomeRestaurante").textContent = restaurante.nome;
document.getElementById("numComanda").textContent = String(
  Math.floor(1000 + Math.random() * 8999),
);

document.querySelector(".subt")?.remove();

const cabecalho = document.querySelector(".cabecalho");
if (restaurante.logo) {
  const carimbo = document.createElement("div");
  carimbo.className = "carimbo-logo";
  carimbo.innerHTML = `<img src="${restaurante.logo}" alt="${restaurante.nome}">`;
  cabecalho.appendChild(carimbo);

  const nomeDestaque = document.createElement("p");
  nomeDestaque.className = "nome-restaurante-logo";
  nomeDestaque.textContent = restaurante.nome;
  cabecalho.appendChild(nomeDestaque);
}
if (restaurante.foto) {
  const polaroid = document.createElement("div");
  polaroid.className = "polaroid-prato";
  polaroid.innerHTML = `
    <img src="${restaurante.foto}" alt="${restaurante.prato}">
    <p class="polaroid-legenda">${restaurante.prato}</p>
  `;
  cabecalho.after(polaroid);
}

const notaContainer = document.querySelector(".nota-publica-container");
let notaEscolhida = null;

function montarNotaUnica() {
  notaContainer.innerHTML = `
    <div class="nota-publica-label">De 0 a 10, qual sua nota pra esse boteco?</div>
    <div class="nota-publica-grade" id="notaGrade"></div>
    <div class="nota-publica-valor" id="notaValor">toque para avaliar</div>
  `;

  const grade = document.getElementById("notaGrade");
  const valorEl = document.getElementById("notaValor");

  for (let n = 0; n <= 10; n++) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "nota-botao";
    botao.textContent = n;
    botao.dataset.valor = n;
    botao.addEventListener("click", () => {
      notaEscolhida = n;
      grade
        .querySelectorAll(".nota-botao")
        .forEach((b) => b.classList.remove("selecionada"));
      botao.classList.add("selecionada");
      valorEl.textContent = `sua nota: ${n}`;
    });
    grade.appendChild(botao);
  }
}

montarNotaUnica();

const telaCarregando = document.getElementById("telaCarregando");
const telaLogin = document.getElementById("telaLogin");
const form = document.getElementById("formAvaliacao");
const telaObrigado = document.getElementById("telaObrigado");
const telaJaAvaliado = document.getElementById("telaJaAvaliado");
const btnEntrarGoogle = document.getElementById("btnEntrarGoogle");
const btnTentarNovamente = document.getElementById("btnTentarNovamente");
const msgErro = document.getElementById("msgErro");

// Tela dinâmica de "votação encerrada" — criada uma única vez, sem
// precisar editar o HTML de cada um dos restaurantes.
const telaEncerrada = document.createElement("div");
telaEncerrada.className = "tela-obrigado";
telaEncerrada.style.display = "none";
telaEncerrada.innerHTML = `
  <div class="carimbo" style="border-color:var(--madeira); color:var(--madeira);">Encerrado</div>
  <h1 style="font-size:22px;">Votações encerradas</h1>
  <p class="subt">O organizador encerrou as avaliações. Obrigado por participar do festival!</p>
`;
form.after(telaEncerrada);

let iniciando = false;

function mostrarTela(tela) {
  [
    telaCarregando,
    telaLogin,
    form,
    telaObrigado,
    telaJaAvaliado,
    telaEncerrada,
  ].forEach((el) => {
    if (el) el.style.display = "none";
  });
  if (tela) tela.style.display = "block";
}

function comTimeout(promessa, ms) {
  return Promise.race([
    promessa,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

async function votacaoEstaAberta() {
  try {
    const { data, error } = await comTimeout(
      supabase
        .from("votacao_estado")
        .select("aberto")
        .eq("id", 1)
        .maybeSingle(),
      6000,
    );
    if (error) {
      console.error(error);
      return true;
    }
    return data?.aberto ?? true;
  } catch (err) {
    console.error("Erro ao checar estado da votacao:", err);
    return true;
  }
}

btnEntrarGoogle.addEventListener("click", async () => {
  btnEntrarGoogle.disabled = true;
  btnEntrarGoogle.textContent = "Redirecionando...";
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.href },
  });
});

btnTentarNovamente.addEventListener("click", () => {
  iniciando = false;
  iniciar();
});

async function verificarJaAvaliado(userId) {
  const { data, error } = await comTimeout(
    supabase
      .from("avaliacoes_publico")
      .select("id")
      .eq("user_id", userId)
      .eq("restaurante_id", restauranteId)
      .maybeSingle(),
    6000,
  );
  if (error) {
    console.error(error);
    return false;
  }
  return !!data;
}

async function iniciar() {
  if (iniciando) return;
  iniciando = true;

  mostrarTela(telaCarregando);
  const textoCarregando = telaCarregando.querySelector(".carregando-texto");
  textoCarregando.textContent = "carregando...";
  btnTentarNovamente.style.display = "none";

  try {
    const aberta = await votacaoEstaAberta();
    if (!aberta) {
      mostrarTela(telaEncerrada);
      return;
    }

    const {
      data: { session },
    } = await comTimeout(supabase.auth.getSession(), 6000);

    if (!session) {
      mostrarTela(telaLogin);
      return;
    }

    const jaAvaliado = await verificarJaAvaliado(session.user.id);

    if (jaAvaliado) {
      mostrarTela(telaJaAvaliado);
      return;
    }

    mostrarTela(form);
  } catch (err) {
    console.error("Erro ao iniciar:", err);
    mostrarTela(telaCarregando);
    textoCarregando.textContent =
      "Demorou demais pra carregar. Toca no botão abaixo pra tentar de novo.";
    btnTentarNovamente.style.display = "inline-block";
  } finally {
    iniciando = false;
  }
}

iniciar();
supabase.auth.onAuthStateChange(() => iniciar());

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgErro.style.display = "none";

  const aberta = await votacaoEstaAberta();
  if (!aberta) {
    mostrarTela(telaEncerrada);
    return;
  }

  if (notaEscolhida === null) {
    msgErro.textContent = "Dá uma nota de 0 a 10 antes de enviar 🙂";
    msgErro.style.display = "block";
    return;
  }

  let session;
  try {
    const resultado = await comTimeout(supabase.auth.getSession(), 6000);
    session = resultado.data.session;
  } catch (err) {
    msgErro.textContent = "Deu ruim ao verificar seu login. Tenta de novo?";
    msgErro.style.display = "block";
    return;
  }

  if (!session) {
    mostrarTela(telaLogin);
    return;
  }

  const botao = form.querySelector(".enviar");
  botao.disabled = true;
  botao.textContent = "Enviando...";

  const { error } = await supabase.from("avaliacoes_publico").insert({
    restaurante_id: restauranteId,
    restaurante_nome: restaurante.nome,
    user_id: session.user.id,
    nota: notaEscolhida,
    comentario: document.getElementById("comentario").value.trim() || null,
  });

  if (error) {
    console.error(error);
    botao.disabled = false;
    botao.textContent = "Carimbar avaliação";
    msgErro.textContent =
      error.code === "23505"
        ? "Você já avaliou esse restaurante."
        : "Deu ruim ao enviar. Tenta de novo?";
    msgErro.style.display = "block";
    return;
  }

  mostrarTela(telaObrigado);
});
