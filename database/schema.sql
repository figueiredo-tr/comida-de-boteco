-- ============================================================
-- Schema: avaliações do evento de comida de boteco
-- Rode isso no SQL Editor do seu projeto Supabase
--
-- MUDANÇA: agora existem dois tipos de avaliação:
--   - avaliacoes_juri     -> formulário dos jurados (4 categorias, 0 a 5)
--   - avaliacoes_publico  -> formulário do público (nota única, 0 a 10)
--
-- Nota final do evento = pontuação do júri + pontuação do público
--   pontuação do júri    = média das 4 categorias (0-5) x 10  -> máx 50
--   pontuação do público = média das notas (0-10) x 5         -> máx 50
-- ============================================================

-- ---------- JÚRI ----------
create table if not exists avaliacoes_juri (
  id uuid primary key default gen_random_uuid(),
  restaurante_id text not null,
  restaurante_nome text not null,
  user_id uuid not null references auth.users (id),
  nota_sabor numeric(2,1) not null check (nota_sabor >= 0 and nota_sabor <= 5 and (nota_sabor * 2) = round(nota_sabor * 2)),
  nota_apresentacao numeric(2,1) not null check (nota_apresentacao >= 0 and nota_apresentacao <= 5 and (nota_apresentacao * 2) = round(nota_apresentacao * 2)),
  nota_experiencia_geral numeric(2,1) not null check (nota_experiencia_geral >= 0 and nota_experiencia_geral <= 5 and (nota_experiencia_geral * 2) = round(nota_experiencia_geral * 2)),
  nota_criatividade numeric(2,1) not null check (nota_criatividade >= 0 and nota_criatividade <= 5 and (nota_criatividade * 2) = round(nota_criatividade * 2)),
  comentario text,
  created_at timestamptz not null default now(),
  unique (user_id, restaurante_id)
);

create index if not exists idx_avaliacoes_juri_restaurante on avaliacoes_juri (restaurante_id);

alter table avaliacoes_juri enable row level security;

create policy "juri: permitir insercao de usuarios autenticados"
  on avaliacoes_juri for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "juri: permitir leitura publica"
  on avaliacoes_juri for select
  to anon, authenticated
  using (true);

-- ---------- PÚBLICO ----------
create table if not exists avaliacoes_publico (
  id uuid primary key default gen_random_uuid(),
  restaurante_id text not null,
  restaurante_nome text not null,
  user_id uuid not null references auth.users (id),
  nota smallint not null check (nota >= 0 and nota <= 10),
  comentario text,
  created_at timestamptz not null default now(),
  unique (user_id, restaurante_id)
);

create index if not exists idx_avaliacoes_publico_restaurante on avaliacoes_publico (restaurante_id);

alter table avaliacoes_publico enable row level security;

create policy "publico: permitir insercao de usuarios autenticados"
  on avaliacoes_publico for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "publico: permitir leitura publica"
  on avaliacoes_publico for select
  to anon, authenticated
  using (true);

-- ---------- VIEWS ----------

create or replace view ranking_juri as
select
  restaurante_id,
  restaurante_nome,
  count(*) as total_avaliacoes_juri,
  round(avg(nota_sabor)::numeric, 2) as media_sabor,
  round(avg(nota_apresentacao)::numeric, 2) as media_apresentacao,
  round(avg(nota_experiencia_geral)::numeric, 2) as media_experiencia_geral,
  round(avg(nota_criatividade)::numeric, 2) as media_criatividade,
  round((avg((nota_sabor + nota_apresentacao + nota_experiencia_geral + nota_criatividade) / 4.0) * 10)::numeric, 2) as pontuacao_juri
from avaliacoes_juri
group by restaurante_id, restaurante_nome;

create or replace view ranking_publico as
select
  restaurante_id,
  restaurante_nome,
  count(*) as total_avaliacoes_publico,
  round(avg(nota)::numeric, 2) as media_publico,
  round((avg(nota) * 5)::numeric, 2) as pontuacao_publico
from avaliacoes_publico
group by restaurante_id, restaurante_nome;

-- View final: junta júri + público e soma as pontuações (máx 100)
create or replace view ranking_final as
select
  coalesce(j.restaurante_id, p.restaurante_id) as restaurante_id,
  coalesce(j.restaurante_nome, p.restaurante_nome) as restaurante_nome,
  coalesce(j.total_avaliacoes_juri, 0) as total_avaliacoes_juri,
  coalesce(j.media_sabor, 0) as media_sabor,
  coalesce(j.media_apresentacao, 0) as media_apresentacao,
  coalesce(j.media_experiencia_geral, 0) as media_experiencia_geral,
  coalesce(j.media_criatividade, 0) as media_criatividade,
  coalesce(j.pontuacao_juri, 0) as pontuacao_juri,
  coalesce(p.total_avaliacoes_publico, 0) as total_avaliacoes_publico,
  coalesce(p.media_publico, 0) as media_publico,
  coalesce(p.pontuacao_publico, 0) as pontuacao_publico,
  round((coalesce(j.pontuacao_juri, 0) + coalesce(p.pontuacao_publico, 0))::numeric, 2) as pontuacao_final
from ranking_juri j
full outer join ranking_publico p
  on j.restaurante_id = p.restaurante_id
order by pontuacao_final desc;

-- ============================================================
-- MIGRAÇÃO: se a tabela antiga "avaliacoes" (comida/ambiente/bebidas)
-- já tiver dados de teste, você pode simplesmente apagá-la depois de
-- conferir que os dois formulários novos estão gravando certinho:
--
--   drop view if exists ranking_restaurantes;
--   drop table if exists avaliacoes;
-- ============================================================