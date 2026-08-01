import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const conteudo = document.getElementById("conteudoFinal");

let jaTerminouCiclo = false;
let podio = null;
let etapaAtual = 0; // 0 = nada revelado, 1 = 3º revelado, 2 = 2º revelado, 3 = 1º revelado

// ===== Fogos de artifício (mesmo motor usado na revelação) =====
const canvasFogos = document.getElementById("fogosCanvas");
const ctxFogos = canvasFogos.getContext("2d");
let particulasFogos = [];
let animandoFogos = false;

function redimensionarCanvas() {
  canvasFogos.width = window.innerWidth;
  canvasFogos.height = window.innerHeight;
}
redimensionarCanvas();
window.addEventListener("resize", redimensionarCanvas);

const CORES_FOGOS = ["#e8a93b", "#c1432e", "#f3ecd8", "#3d6b4f", "#f7dfa0"];

function criarExplosao(x, y, intensidade = 1) {
  const qtdParticulas = Math.round(55 * intensidade);
  for (let i = 0; i < qtdParticulas; i++) {
    const angulo = (Math.PI * 2 * i) / qtdParticulas;
    const velocidade = (2 + Math.random() * 3.5) * intensidade;
    particulasFogos.push({
      x,
      y,
      vx: Math.cos(angulo) * velocidade,
      vy: Math.sin(angulo) * velocidade,
      vida: 1,
      cor: CORES_FOGOS[Math.floor(Math.random() * CORES_FOGOS.length)],
      raio: (2 + Math.random() * 2) * (intensidade > 1 ? 1.2 : 1),
    });
  }
}

function passoAnimacao() {
  ctxFogos.clearRect(0, 0, canvasFogos.width, canvasFogos.height);

  particulasFogos.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.vida -= 0.012;

    ctxFogos.globalAlpha = Math.max(p.vida, 0);
    ctxFogos.fillStyle = p.cor;
    ctxFogos.beginPath();
    ctxFogos.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
    ctxFogos.fill();
  });

  particulasFogos = particulasFogos.filter((p) => p.vida > 0);
  ctxFogos.globalAlpha = 1;

  // Continua o loop enquanto houver partícula viva OU enquanto ainda
  // estivermos disparando novas explosões (evita que a animação pare
  // antes da primeira explosão nascer, que era o bug original).
  if (particulasFogos.length > 0 || animandoFogos) {
    requestAnimationFrame(passoAnimacao);
  }
}

// intensidade: 1 = leve (3º/2º lugar), 2 = grande (1º lugar, várias explosões)
function dispararFogos(intensidade = 1) {
  animandoFogos = true;
  const qtdExplosoes = intensidade > 1 ? 10 : 3;
  let feitas = 0;

  const intervalo = setInterval(() => {
    const x = canvasFogos.width * (0.15 + Math.random() * 0.7);
    const y = canvasFogos.height * (0.15 + Math.random() * 0.4);
    criarExplosao(x, y, intensidade);
    feitas++;
    if (feitas >= qtdExplosoes) {
      clearInterval(intervalo);
      animandoFogos = false;
    }
  }, 280);

  requestAnimationFrame(passoAnimacao);
}

// ===== Dados =====
async function buscarEstado() {
  const { data, error } = await supabase
    .from("final_estado")
    .select("liberado")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }
  return data?.liberado || false;
}

async function buscarPodio() {
  const { data, error } = await supabase
    .from("ranking_final")
    .select("restaurante_nome, pontuacao_final")
    .order("pontuacao_final", { ascending: false })
    .limit(3);

  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

// ===== Telas =====
function renderSuspense() {
  conteudo.innerHTML = `
    <div class="suspense-card">
      <div class="suspense-icone">🏆</div>
      <div class="suspense-titulo">Em breve...</div>
      <p class="suspense-texto">
        O organizador ainda não liberou o pódio final. Assim que liberar,
        um botão vai aparecer bem aqui.
      </p>
    </div>
  `;
}

function renderEtapa() {
  if (!podio || podio.length === 0) {
    conteudo.innerHTML = `<div class="pombinha">Nenhuma avaliação registrada ainda 🍻</div>`;
    return;
  }

  const [primeiro, segundo, terceiro] = podio;
  const ordemRevelacao = [
    { pos: 3, dado: terceiro, medalha: "🥉" },
    { pos: 2, dado: segundo, medalha: "🥈" },
    { pos: 1, dado: primeiro, medalha: "🥇" },
  ];

  const jaRevelados = ordemRevelacao.slice(0, etapaAtual);
  const proximo = ordemRevelacao[etapaAtual];

  const blocosRevelados = jaRevelados
    .slice()
    .reverse()
    .map(
      (r) => `
    <div class="revelado-card" style="margin-bottom: 14px;">
      <span class="revelado-selo">${r.medalha} ${r.pos}º lugar</span>
      <div class="revelado-nome" style="font-size: ${r.pos === 1 ? "clamp(28px, 7vw, 44px)" : "clamp(20px, 5vw, 30px)"};">${r.dado?.restaurante_nome || "—"}</div>
      <div class="revelado-votos">${Number(r.dado?.pontuacao_final || 0).toFixed(1)} pontos</div>
    </div>
  `,
    )
    .join("");

  if (!proximo) {
    // Todos os 3 já revelados
    conteudo.innerHTML = blocosRevelados;
    return;
  }

  conteudo.innerHTML = `
    ${blocosRevelados}
    <div class="suspense-card">
      <div class="suspense-icone">${proximo.medalha}</div>
      <div class="suspense-titulo">Quem será o ${proximo.pos}º lugar?</div>
      <button type="button" class="btn-revelar" id="btnRevelarEtapa">Revelar ${proximo.pos}º lugar</button>
    </div>
  `;

  document.getElementById("btnRevelarEtapa").addEventListener("click", () => {
    etapaAtual++;
    renderEtapa();
    dispararFogos(proximo.pos === 1 ? 2 : 1);
  });
}

async function ciclo() {
  if (jaTerminouCiclo) return;

  const liberado = await buscarEstado();

  if (!liberado) {
    renderSuspense();
    return;
  }

  if (!podio) {
    podio = await buscarPodio();
  }

  jaTerminouCiclo = true; // a partir daqui o fluxo é local (clique a clique)
  renderEtapa();
}

ciclo();
setInterval(() => {
  if (!jaTerminouCiclo) ciclo();
}, 8000);
