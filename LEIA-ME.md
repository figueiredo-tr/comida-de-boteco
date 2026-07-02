# Avaliação do Arraiá / Noite do Boteco

## Estrutura de pastas

```
boteco-avaliacao/
├── LEIA-ME.md
├── database/
│   └── schema.sql              → roda no SQL Editor do Supabase
└── public/                     → isso aqui é o que vai pro deploy (Vercel)
    ├── config.js                → chave do Supabase + nomes dos restaurantes (editar aqui!)
    ├── dashboard.html            → placar/ranking
    ├── assets/
    │   ├── estilo-comanda.css    → visual dos formulários
    │   ├── estilo-placar.css     → visual do dashboard
    │   ├── formulario.js         → lógica compartilhada dos formulários
    │   └── placar.js             → lógica do dashboard
    └── formularios/
        ├── restaurante-1.html    → um arquivo por restaurante, edite à vontade
        ├── restaurante-2.html
        ├── restaurante-3.html
        └── restaurante-4.html
```

Cada `restaurante-N.html` é independente — dá pra editar o texto, ícones ou até o layout
de um sem afetar os outros. Mas a chave do Supabase e os nomes dos restaurantes moram
só em `config.js`, então você só precisa trocar isso **uma vez** e todos os formulários
e o dashboard já usam o valor novo.

## Passo a passo

### 1. Banco de dados (Supabase)
No SQL Editor do seu projeto Supabase, rode o conteúdo de `database/schema.sql`.

### 2. Configuração
Abra `public/config.js` e confira/ajuste:
- `SUPABASE_URL` e `SUPABASE_ANON_KEY` (a chave **publishable/anon**, nunca a `secret`)
- os nomes reais dos 4 restaurantes no objeto `RESTAURANTES`

### 3. Deploy
No Vercel, o **Root Directory** do projeto deve ser a pasta `public/` (é ela que contém
os arquivos que precisam ficar acessíveis pela web). As pastas `database/` e este
`LEIA-ME.md` ficam de fora do deploy — são só para você.

Depois do deploy, as URLs ficam assim:
- `https://seu-projeto.vercel.app/formularios/restaurante-1.html`
- `https://seu-projeto.vercel.app/formularios/restaurante-2.html`
- `https://seu-projeto.vercel.app/formularios/restaurante-3.html`
- `https://seu-projeto.vercel.app/formularios/restaurante-4.html`
- `https://seu-projeto.vercel.app/dashboard.html`

### 4. QR Codes
Gere um QR code pra cada uma das 4 URLs de formulário acima (em qualquer gerador,
tipo qr-code-generator.com), e imprime pra colocar em cada barraca.

### 5. Placar
Deixe `dashboard.html` aberto num tablet/notebook/TV — atualiza sozinho a cada 15s.

## Sobre segurança
A tabela está com leitura pública pra o dashboard funcionar sem login — tranquilo pra
um evento único. Nunca coloque a chave `secret`/`service_role` nesses arquivos: eles
rodam no navegador de quem escaneia o QR code, então qualquer chave ali fica visível
pra qualquer pessoa.
