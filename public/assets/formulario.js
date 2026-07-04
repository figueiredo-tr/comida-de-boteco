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

// Logo + nome do prato, inseridos no topo da ficha
const cabecalho = document.querySelector(".cabecalho");
if (restaurante.logo) {
  const logo = document.createElement("img");
  logo.src = restaurante.logo;
  logo.alt = restaurante.nome;
  logo.className = "logo-restaurante";
  cabecalho.insertBefore(logo, cabecalho.firstChild);
}
if (restaurante.prato) {
  const prato = document.createElement("p");
  prato.className = "prato-nome";
  prato.textContent = `Prato: ${restaurante.prato}`;
  document.querySelector(".subt").after(prato);
}

// Monta as categorias de avaliação a partir do CRITERIOS (config.js)
const categoriasContainer = document.querySelector(".categorias-container");
CRITERIOS.forEach((crit) => {
  const div = document.createElement("div");
  div.className = "categoria";
  div.dataset.cat = crit.chave;
  div.innerHTML = `
    <div class="categoria-label"><span class="icone">${crit.icone}</span> ${crit.label}</div>
    <div class="tampinhas" data-nota="0"></div>
  `;
  categoriasContainer.appendChild(div);
});

const form = document.getElementById("formAvaliacao");
const telaObrigado = document.getElementById("telaObrigado");
const msgErro = document.getElementById("msgErro");

// ---- Telas de login e "já avaliado", criadas dinamicamente ----
const telaLogin = document.createElement("div");
telaLogin.className = "tela-login";
telaLogin.innerHTML = `
  <p class="subt" style="margin-bottom:16px;">Entre com sua conta Google pra avaliar</p>
  <button type="button" class="botao-google" id="botaoGoogle">
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
    Entrar com Google
  </button>
`;

const telaJaAvaliado = document.createElement("div");
telaJaAvaliado.className = "tela-obrigado";
telaJaAvaliado.innerHTML = `
  <div class="carimbo" style="border-color:var(--madeira); color:var(--madeira);">Já avaliado ✓</div>
  <h1 style="font-size:22px;">Você já avaliou esse boteco!</h1>
  <p class="subt">Cada pessoa avalia um restaurante só uma vez. Bora avaliar os outros? 🍻</p>
  <button type="button" class="botao-outro" id="botaoOutros">Ver outros restaurantes</button>
`;

form.after(telaLogin, telaJaAvaliado);
form.style.display = "none";
telaLogin.style.display = "none";
telaJaAvaliado.style.display = "none";

document.getElementById("botaoGoogle").addEventListener("click", async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.href },
  });
});

telaJaAvaliado.querySelector("#botaoOutros").addEventListener("click", () => {
  window.location.href = "../dashboard.html";
});

// ---- Widget de estrelas (0 a 5, passos de 0.5) ----
function montarEstrelas() {
  document.querySelectorAll(".tampinhas").forEach((container) => {
    if (container.dataset.montado === "1") return;
    container.dataset.montado = "1";
    container.classList.add("estrelas");
    container.dataset.nota = "0";
    container.dataset.avaliado = "0";

    for (let i = 1; i <= 5; i++) {
      const estrela = document.createElement("div");
      estrela.className = "estrela";
      estrela.dataset.indice = i;
      estrela.innerHTML = `
        <span class="estrela-fundo">★</span>
        <span class="estrela-preenchida" style="width:0%">★</span>
        <button type="button" class="zona-meia zona-esquerda" data-valor="${i - 0.5}" aria-label="Nota ${i - 0.5}"></button>
        <button type="button" class="zona-meia zona-direita" data-valor="${i}" aria-label="Nota ${i}"></button>
      `;
      container.appendChild(estrela);
    }

    const rotulo = document.createElement("div");
    rotulo.className = "estrelas-valor";
    rotulo.textContent = "toque para avaliar";
    container.after(rotulo);

    container.querySelectorAll(".zona-meia").forEach((botao) => {
      botao.addEventListener("click", () => {
        const valorClicado = Number(botao.dataset.valor);
        const notaAtual = Number(container.dataset.nota);
        const novaNota =
          container.dataset.avaliado === "1" && valorClicado === notaAtual
            ? 0
            : valorClicado;

        container.dataset.nota = novaNota;
        container.dataset.avaliado = "1";

        container.querySelectorAll(".estrela").forEach((estrela) => {
          const idx = Number(estrela.dataset.indice);
          const preench = Math.max(0, Math.min(1, novaNota - (idx - 1))) * 100;
          estrela.querySelector(".estrela-preenchida").style.width =
            preench + "%";
        });

        rotulo.textContent =
          novaNota % 1 === 0
            ? `nota: ${novaNota.toFixed(0)}`
            : `nota: ${novaNota.toFixed(1)}`;
      });
    });
  });
}

async function verificarJaAvaliado(userId) {
  const { data } = await supabase
    .from("avaliacoes")
    .select("id")
    .eq("user_id", userId)
    .eq("restaurante_id", restauranteId)
    .maybeSingle();
  return !!data;
}

async function iniciar() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    telaLogin.style.display = "block";
    form.style.display = "none";
    telaJaAvaliado.style.display = "none";
    return;
  }

  const jaAvaliado = await verificarJaAvaliado(session.user.id);

  if (jaAvaliado) {
    telaJaAvaliado.style.display = "block";
    form.style.display = "none";
    telaLogin.style.display = "none";
    return;
  }

  telaLogin.style.display = "none";
  telaJaAvaliado.style.display = "none";
  form.style.display = "block";
  montarEstrelas();

  form.onsubmit = async (e) => {
    e.preventDefault();
    msgErro.style.display = "none";

    const campos = CRITERIOS.map((crit) => ({
      chave: crit.chave,
      el: form.querySelector(`[data-cat="${crit.chave}"] .tampinhas`),
    }));

    const todasAvaliadas = campos.every((c) => c.el.dataset.avaliado === "1");

    if (!todasAvaliadas) {
      msgErro.textContent =
        "Dá uma nota em todas as categorias antes de enviar 🙂";
      msgErro.style.display = "block";
      return;
    }

    const botao = form.querySelector(".enviar");
    botao.disabled = true;
    botao.textContent = "Enviando...";

    const notas = {};
    campos.forEach((c) => {
      notas[`nota_${c.chave}`] = Number(c.el.dataset.nota);
    });

    const { error } = await supabase.from("avaliacoes").insert({
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

    form.style.display = "none";
    telaObrigado.style.display = "block";
  };
}

supabase.auth.onAuthStateChange(() => iniciar());
iniciar();
