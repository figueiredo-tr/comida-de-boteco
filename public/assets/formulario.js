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
      // tocar de novo no mesmo ponto zera a nota (permite dar nota 0)
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

const form = document.getElementById("formAvaliacao");
const msgErro = document.getElementById("msgErro");

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
    nota_comida: notaComida,
    nota_ambiente: notaAmbiente,
    nota_bebidas: notaBebidas,
    comentario: comentario || null,
  });

  if (error) {
    console.error(error);
    botao.disabled = false;
    botao.textContent = "Carimbar avaliação";
    msgErro.textContent = "Deu ruim ao enviar. Tenta de novo?";
    msgErro.style.display = "block";
    return;
  }

  form.style.display = "none";
  document.getElementById("telaObrigado").style.display = "block";
});
