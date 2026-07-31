import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const conteudo = document.getElementById("conteudoRevelacao");
const atualizacao = document.getElementById("atualizacao");
// ===== Fogos de artifício (canvas puro, sem biblioteca externa) =====
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

function criarExplosao(x, y) {
  const qtdParticulas = 55;
  for (let i = 0; i < qtdParticulas; i++) {
    const angulo = (Math.PI * 2 * i) / qtdParticulas;
    const velocidade = 2 + Math.random() * 3.5;
    particulasFogos.push({
      x,
      y,
      vx: Math.cos(angulo) * velocidade,
      vy: Math.sin(angulo) * velocidade,
      vida: 1,
      cor: CORES_FOGOS[Math.floor(Math.random() * CORES_FOGOS.length)],
      raio: 2 + Math.random() * 2,
    });
  }
}

function passoAnimacao() {
  ctxFogos.clearRect(0, 0, canvasFogos.width, canvasFogos.height);

  particulasFogos.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // gravidade leve
    p.vida -= 0.012;

    ctxFogos.globalAlpha = Math.max(p.vida, 0);
    ctxFogos.fillStyle = p.cor;
    ctxFogos.beginPath();
    ctxFogos.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
    ctxFogos.fill();
  });

  particulasFogos = particulasFogos.filter((p) => p.vida > 0);
  ctxFogos.globalAlpha = 1;

  if (particulasFogos.length > 0 || animandoFogos) {
    requestAnimationFrame(passoAnimacao);
  }
}

function dispararFogos() {
  animandoFogos = true;
  let explosoes = 0;
  const maxExplosoes = 6;

  const intervalo = setInterval(() => {
    const x = canvasFogos.width * (0.2 + Math.random() * 0.6);
    const y = canvasFogos.height * (0.2 + Math.random() * 0.35);
    criarExplosao(x, y);
    explosoes++;

    if (explosoes >= maxExplosoes) {
      clearInterval(intervalo);
      animandoFogos = false;
    }
  }, 350);

  requestAnimationFrame(passoAnimacao);
}
let jaRevelado = false;

async function buscarEstado() {
  const { data, error } = await supabase
    .from("revelacao_estado")
    .select("liberado")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }
  return data?.liberado || false;
}

async function buscarVencedor() {
  const { data, error } = await supabase
    .from("ranking_revelacao")
    .select("*")
    .order("total_votos", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

function renderSuspense() {
  conteudo.innerHTML = `
    <div class="suspense-card">
      <div class="suspense-icone">🌟</div>
      <div class="suspense-titulo">Em breve...</div>
      <p class="suspense-texto">
        O organizador ainda não liberou o resultado do Boteco Revelação.
        Assim que liberar, um botão vai aparecer bem aqui.
      </p>
    </div>
  `;
}

function renderBotaoRevelar() {
  conteudo.innerHTML = `
    <div class="suspense-card">
      <div class="suspense-icone">🎉</div>
      <div class="suspense-titulo">Chegou a hora!</div>
      <p class="suspense-texto">Toca no botão pra descobrir o Boteco Revelação da noite.</p>
      <button type="button" class="btn-revelar" id="btnRevelar">Revelar o Boteco Revelação</button>
    </div>
  `;
  document.getElementById("btnRevelar").addEventListener("click", async () => {
    jaRevelado = true;
    const vencedor = await buscarVencedor();
    renderVencedor(vencedor);
  });
}

function renderVencedor(vencedor) {
  if (!vencedor) {
    conteudo.innerHTML = `<div class="pombinha">Nenhum voto registrado ainda 🍻</div>`;
    return;
    function renderVencedor(vencedor) {
      if (!vencedor) {
        conteudo.innerHTML = `<div class="pombinha">Nenhum voto registrado ainda 🍻</div>`;
        return;
      }
      conteudo.innerHTML = `
    <div class="revelado-card">
      <span class="revelado-selo">Boteco Revelação</span>
      <div class="revelado-nome">${vencedor.restaurante_nome}</div>
      <div class="revelado-votos">${vencedor.total_votos} votos do público</div>
    </div>
  `;
      dispararFogos();
    }
  }
  conteudo.innerHTML = `
    <div class="revelado-card">
      <span class="revelado-selo">Boteco Revelação</span>
      <div class="revelado-nome">${vencedor.restaurante_nome}</div>
      <div class="revelado-votos">${vencedor.total_votos} votos do público</div>
    </div>
  `;
}

async function ciclo() {
  if (jaRevelado) return;

  const liberado = await buscarEstado();

  if (!liberado) {
    renderSuspense();
  } else if (!document.getElementById("btnRevelar")) {
    renderBotaoRevelar();
  }

  atualizacao.textContent =
    "atualizado às " + new Date().toLocaleTimeString("pt-BR");
}

ciclo();
setInterval(ciclo, 8000);
