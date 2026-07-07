import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  RESTAURANTES,
  CRITERIOS,
} from "../config.js";

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

// Monta um grid de botões 0-5 por categoria (visual igual ao do público).
// O valor é gravado direto, sem meia-nota, pra bater certinho com o banco
// (check nota <= 5) e com a fórmula de pontuação (máx 50).
const categoriasContainer = document.querySelector(".categorias-container");
CRITERIOS.forEach((crit) => {
  const div = document.createElement("div");
  div.className = "categoria";
  div.dataset.cat = crit.chave;
  div.innerHTML = `
    <div class="categoria-label"><span class="icone">${crit.icone}</span> ${crit.label}</div>
    <div class="nota-publica-grade" data-nota="0" data-avaliado="0"></div>
    <div class="nota-publica-valor">toque para avaliar</div>
  `;
  categoriasContainer.appendChild(div);
});

const telaCarregando = document.getElementById("telaCarregando");
const telaLogin = document.getElementById("telaLogin");
const form = document.getElementById("formAvaliacao");
const telaObrigado = document.getElementById("telaObrigado");
const telaJaAvaliado = document.getElementById("telaJaAvaliado");
const btnEntrarGoogle = document.getElementById("btnEntrarGoogle");
const btnTentarNovamente = document.getElementById("btnTentarNovamente");
const msgErro = document.getElementById("msgErro");

let iniciando = false;

function mostrarTela(tela) {
  [telaCarregando, telaLogin, form, telaObrigado, telaJaAvaliado].forEach(
    (el) => {
      if (el) el.style.display = "none";
    },
  );
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
      .from("avaliacoes_juri")
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
    montarNotasCategorias();
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

// Cria os botões 0-5 dentro de cada .nota-publica-grade (uma por categoria)
function montarNotasCategorias() {
  document.querySelectorAll(".nota-publica-grade").forEach((grade) => {
    if (grade.dataset.montado === "1") return;
    grade.dataset.montado = "1";

    const valorEl = grade.nextElementSibling; // .nota-publica-valor logo depois

    for (let n = 0; n <= 5; n++) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "nota-botao";
      botao.textContent = n;
      botao.dataset.valorExibido = n;
      botao.addEventListener("click", () => {
        grade
          .querySelectorAll(".nota-botao")
          .forEach((b) => b.classList.remove("selecionada"));
        botao.classList.add("selecionada");

        grade.dataset.nota = n;
        grade.dataset.avaliado = "1";
        if (valorEl) valorEl.textContent = `sua nota: ${n}`;
      });
      grade.appendChild(botao);
    }
  });
}

iniciar();
supabase.auth.onAuthStateChange(() => iniciar());

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgErro.style.display = "none";

  const campos = CRITERIOS.map((crit) => ({
    chave: crit.chave,
    el: form.querySelector(`[data-cat="${crit.chave}"] .nota-publica-grade`),
  }));

  const todasAvaliadas = campos.every((c) => c.el.dataset.avaliado === "1");

  if (!todasAvaliadas) {
    msgErro.textContent =
      "Dá uma nota em todas as categorias antes de enviar 🙂";
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

  const notas = {};
  campos.forEach((c) => {
    notas[`nota_${c.chave}`] = Number(c.el.dataset.nota);
  });

  const botao = form.querySelector(".enviar");
  botao.disabled = true;
  botao.textContent = "Enviando...";

  const { error } = await supabase.from("avaliacoes_juri").insert({
    restaurante_id: restauranteId,
    restaurante_nome: restaurante.nome,
    user_id: session.user.id,
    ...notas,
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
