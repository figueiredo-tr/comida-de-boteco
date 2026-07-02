import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, RESTAURANTES } from '../config.js';

// Cada página restaurante-N.html define isso antes de importar este script:
// <body data-restaurante="1">
const restauranteId = document.body.dataset.restaurante;
const restauranteNome = RESTAURANTES[restauranteId] || "Restaurante desconhecido";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById('nomeRestaurante').textContent = restauranteNome;
document.getElementById('numComanda').textContent = String(Math.floor(1000 + Math.random() * 8999));

document.querySelectorAll('.tampinhas').forEach(container => {
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tampinha';
    btn.dataset.valor = i;
    btn.setAttribute('aria-label', `Nota ${i}`);
    btn.addEventListener('click', () => {
      container.dataset.nota = i;
      [...container.children].forEach(t => {
        t.classList.toggle('marcada', Number(t.dataset.valor) <= i);
      });
    });
    container.appendChild(btn);
  }
});

const form = document.getElementById('formAvaliacao');
const msgErro = document.getElementById('msgErro');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msgErro.style.display = 'none';

  const notaComida = Number(form.querySelector('[data-cat="comida"] .tampinhas').dataset.nota);
  const notaAmbiente = Number(form.querySelector('[data-cat="ambiente"] .tampinhas').dataset.nota);
  const notaBebidas = Number(form.querySelector('[data-cat="bebidas"] .tampinhas').dataset.nota);
  const comentario = document.getElementById('comentario').value.trim();

  if (!notaComida || !notaAmbiente || !notaBebidas) {
    msgErro.style.display = 'block';
    return;
  }

  const botao = form.querySelector('.enviar');
  botao.disabled = true;
  botao.textContent = 'Enviando...';

  const { error } = await supabase.from('avaliacoes').insert({
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
    botao.textContent = 'Carimbar avaliação';
    msgErro.textContent = 'Deu ruim ao enviar. Tenta de novo?';
    msgErro.style.display = 'block';
    return;
  }

  form.style.display = 'none';
  document.getElementById('telaObrigado').style.display = 'block';
});
