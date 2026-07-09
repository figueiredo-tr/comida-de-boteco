import { EVENTO, RESTAURANTES } from "../config.js";

const acessoRapido = document.getElementById("acessoRapido");

acessoRapido.innerHTML = Object.entries(RESTAURANTES)
  .map(
    ([id, r]) => `
  <a class="botao-restaurante" href="formularios/restaurante-${id}.html">
    ${
      r.logo
        ? `<span class="carimbo-logo-mini"><img src="${r.logo}" alt="Logo ${r.nome}" loading="lazy"></span>`
        : `<span class="numero">${id}</span>`
    }
    <span class="nome">${r.nome}</span>
  </a>
`,
  )
  .join("");

document.getElementById("festivalBanner").innerHTML = `
  <p class="hero-antetitulo">${EVENTO.antetitulo}</p>
  <h1 class="hero-nome">${EVENTO.nome}</h1>
  <p class="hero-subtitulo">${EVENTO.local} - ${EVENTO.edicao}</p>
`;
