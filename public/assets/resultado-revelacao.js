import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const conteudo = document.getElementById("conteudoRevelacao");
const atualizacao = document.getElementById("atualizacao");

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
