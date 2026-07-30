import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, RESTAURANTES } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const CHAVE_LOCALSTORAGE = "revelacao_ja_votou";

document.getElementById("numVoto").textContent = String(
  Math.floor(1000 + Math.random() * 8999),
);

const telaCarregando = document.getElementById("telaCarregando");
const form = document.getElementById("formRevelacao");
const telaObrigado = document.getElementById("telaObrigado");
const telaJaVotado = document.getElementById("telaJaVotado");
const telaEncerrada = document.getElementById("telaEncerrada");
const msgErro = document.getElementById("msgErro");
const opcoesContainer = document.getElementById("revelacaoOpcoes");
const botaoEnviar = form.querySelector(".enviar");

let restauranteEscolhido = null;

// Monta os cartões de escolha, com logo de cada restaurante
opcoesContainer.innerHTML = Object.entries(RESTAURANTES)
  .map(([id, r]) => {
    const logoSrc = (r.logo || "").replace("../assets/", "assets/");
    return `
    <button type="button" class="opcao-revelacao" data-id="${id}">
      <span class="opcao-logo">
        ${logoSrc ? `<img src="${logoSrc}" alt="${r.nome}">` : ""}
      </span>
      <span class="opcao-texto">
        <strong>${r.nome}</strong>
        ${r.prato ? `<span>${r.prato}</span>` : ""}
      </span>
    </button>
  `;
  })
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
  [telaCarregando, form, telaObrigado, telaJaVotado, telaEncerrada].forEach(
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

async function iniciar() {
  mostrarTela(telaCarregando);

  const aberta = await votacaoEstaAberta();
  if (!aberta) {
    mostrarTela(telaEncerrada);
    return;
  }

  if (localStorage.getItem(CHAVE_LOCALSTORAGE)) {
    mostrarTela(telaJaVotado);
    return;
  }

  mostrarTela(form);
}

iniciar();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgErro.style.display = "none";

  const aberta = await votacaoEstaAberta();
  if (!aberta) {
    mostrarTela(telaEncerrada);
    return;
  }

  if (localStorage.getItem(CHAVE_LOCALSTORAGE)) {
    mostrarTela(telaJaVotado);
    return;
  }

  if (!restauranteEscolhido) {
    msgErro.textContent = "Escolhe um boteco antes de confirmar 🙂";
    msgErro.style.display = "block";
    return;
  }

  botaoEnviar.disabled = true;
  botaoEnviar.textContent = "Enviando...";

  const { error } = await supabase.from("votos_revelacao").insert({
    restaurante_id: restauranteEscolhido,
    restaurante_nome: RESTAURANTES[restauranteEscolhido].nome,
  });

  if (error) {
    console.error(error);
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = "Confirmar voto";
    msgErro.textContent = "Deu ruim ao enviar. Tenta de novo?";
    msgErro.style.display = "block";
    return;
  }

  localStorage.setItem(CHAVE_LOCALSTORAGE, restauranteEscolhido);
  mostrarTela(telaObrigado);
});
