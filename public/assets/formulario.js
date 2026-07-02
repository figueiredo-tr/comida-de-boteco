import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, RESTAURANTES } from "../config.js";

const restauranteId = document.body.dataset.restaurante;
const restauranteNome =
  RESTAURANTES[restauranteId] || "Restaurante desconhecido";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("nomeRestaurante").textContent = restauranteNome;
document.getElementById("numComanda").textContent = String(
  Math.floor(1000 + Math.random() * 8999),
);

const telaLogin = document.getElementById("telaLogin");
const form = document.getElementById("formAvaliacao");
const telaObrigado = document.getElementById("telaObrigado");
const telaJaAvaliado = document.getElementById("telaJaAvaliado");
const telaCarregando = document.getElementById("telaCarregando");
const btnEntrarGoogle = document.getElementById("btnEntrarGoogle");
const btnTentarNovamente = document.getElementById("btnTentarNovamente");
const msgErro = document.getElementById("msgErro");

let iniciando = false;

function mostrarTela(tela) {
  [telaLogin, form, telaObrigado, telaJaAvaliado, telaCarregando].forEach(
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

async function jaAvaliouEsseRestaurante(userId) {
  try {
    const { data, error } = await comTimeout(
      supabase
        .from("avaliacoes")
        .select("id")
        .eq("restaurante_id", restauranteId)
        .eq("user_id", userId)
        .maybeSingle(),
      6000,
    );

    if (error) {
      console.error(error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error("Erro ou timeout ao verificar avaliação:", err);
    throw err;
  }
}

async function iniciar() {
  if (iniciando) return;
  iniciando = true;
  mostrarTela(telaCarregando);

  try {
    const {
      data: { session },
    } = await comTimeout(supabase.auth.getSession(), 6000);

    if (!session) {
      mostrarTela(telaLogin);
      iniciando = false;
      return;
    }

    const jaAvaliou = await jaAvaliouEsseRestaurante(session.user.id);
    mostrarTela(jaAvaliou ? telaJaAvaliado : form);
  } catch (err) {
    console.error("Erro ao iniciar:", err);
    msgErro.textContent =
      "Demorou demais pra carregar. Toca no botão abaixo pra tentar de novo.";
    msgErro.style.display = "block";
    mostrarTela(telaCarregando);
    telaCarregando.querySelector(".carregando-texto").style.display = "none";
    btnTentarNovamente.style.display = "inline-block";
  } finally {
    iniciando = false;
  }
}

iniciar();
supabase.auth.onAuthStateChange(() => iniciar());

// Monta o widget de estrelas (0 a 5, em passos de 0.5) dentro de cada categoria
document.querySelectorAll(".tampinhas").forEach((container) => {
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgErro.style.display = "none";

  const campoComida = form.querySelector('[data-cat="comida"] .tampinhas');
  const campoAmbiente = form.querySelector('[data-cat="ambiente"] .tampinhas');
  const campoBebidas = form.querySelector('[data-cat="bebidas"] .tampinhas');

  const todasAvaliadas = [campoComida, campoAmbiente, campoBebidas].every(
    (c) => c.dataset.avaliado === "1",
  );

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

  const notaComida = Number(campoComida.dataset.nota);
  const notaAmbiente = Number(campoAmbiente.dataset.nota);
  const notaBebidas = Number(campoBebidas.dataset.nota);
  const comentario = document.getElementById("comentario").value.trim();

  const botao = form.querySelector(".enviar");
  botao.disabled = true;
  botao.textContent = "Enviando...";

  const { error } = await supabase.from("avaliacoes").insert({
    restaurante_id: restauranteId,
    restaurante_nome: restauranteNome,
    user_id: session.user.id,
    nota_comida: notaComida,
    nota_ambiente: notaAmbiente,
    nota_bebidas: notaBebidas,
    comentario: comentario || null,
  });

  if (error) {
    console.error(error);
    botao.disabled = false;
    botao.textContent = "Carimbar avaliação";
    msgErro.textContent =
      error.code === "23505"
        ? "Você já avaliou esse restaurante!"
        : "Deu ruim ao enviar. Tenta de novo?";
    msgErro.style.display = "block";
    return;
  }

  mostrarTela(telaObrigado);
});
