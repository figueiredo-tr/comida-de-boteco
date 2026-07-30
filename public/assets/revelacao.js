import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, RESTAURANTES } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("numVoto").textContent = String(
  Math.floor(1000 + Math.random() * 8999),
);

const telaCarregando = document.getElementById("telaCarregando");
const telaLogin = document.getElementById("telaLogin");
const form = document.getElementById("formRevelacao");
const telaObrigado = document.getElementById("telaObrigado");
const telaJaVotado = document.getElementById("telaJaVotado");
const btnEntrarGoogle = document.getElementById("btnEntrarGoogle");
const btnTentarNovamente = document.getElementById("btnTentarNovamente");
const msgErro = document.getElementById("msgErro");
const opcoesContainer = document.getElementById("revelacaoOpcoes");
const botaoEnviar = form.querySelector(".enviar");

let restauranteEscolhido = null;
let iniciando = false;

// Monta os cartões de escolha a partir do RESTAURANTES (config.js)
opcoesContainer.innerHTML = Object.entries(RESTAURANTES)
  .map(
    ([id, r]) => `
    <button type="button" class="opcao-revelacao" data-id="${id}">
      <span class="opcao-numero">${id}</span>
      <span class="opcao-texto">
        <strong>${r.nome}</strong>
        ${r.prato ? `<span>${r.prato}</span>` : ""}
      </span>
    </button>
  `,
  )
  .join("");

opcoesContainer.querySelectorAll(".opcao-revelacao").forEach((botao) => {
  botao.addEventListener("click", () => {
    opcoesContainer
      .querySelectorAll(".opcao-revelacao")
      .forEach((b) => b.classList.remove("selecionada"));
    botao.classList.add("selecionada");
    restauranteEscolhido = botao.dataset.id;
    botaoEnviar.disabled = false;
  });
});

function mostrarTela(tela) {
  [telaCarregando, telaLogin, form, telaObrigado, telaJaVotado].forEach(
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

async function jaVotou(userId) {
  const { data, error } = await comTimeout(
    supabase
      .from("votos_revelacao")
      .select("id")
      .eq("user_id", userId)
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

    const votou = await jaVotou(session.user.id);

    if (votou) {
      mostrarTela(telaJaVotado);
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

  if (!restauranteEscolhido) {
    msgErro.textContent = "Escolhe um boteco antes de confirmar 🙂";
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

  botaoEnviar.disabled = true;
  botaoEnviar.textContent = "Enviando...";

  const { error } = await supabase.from("votos_revelacao").insert({
    restaurante_id: restauranteEscolhido,
    restaurante_nome: RESTAURANTES[restauranteEscolhido].nome,
    user_id: session.user.id,
  });

  if (error) {
    console.error(error);
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = "Confirmar voto";
    msgErro.textContent =
      error.code === "23505"
        ? "Você já votou no revelação."
        : "Deu ruim ao enviar. Tenta de novo?";
    msgErro.style.display = "block";
    return;
  }

  mostrarTela(telaObrigado);
});
