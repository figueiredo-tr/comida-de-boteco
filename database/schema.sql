-- ============================================================
-- Schema: avaliações do evento de comida de boteco
-- Rode isso no SQL Editor do seu projeto Supabase
-- ============================================================

create table if not exists avaliacoes (
  id uuid primary key default gen_random_uuid(),
  restaurante_id text not null,        -- ex: "1", "2", "3", "4"
  restaurante_nome text not null,      -- ex: "Boteco do Zé"
  nota_comida numeric(2,1) not null check (nota_comida >= 0 and nota_comida <= 5 and (nota_comida * 2) = round(nota_comida * 2)),
  nota_ambiente numeric(2,1) not null check (nota_ambiente >= 0 and nota_ambiente <= 5 and (nota_ambiente * 2) = round(nota_ambiente * 2)),
  nota_bebidas numeric(2,1) not null check (nota_bebidas >= 0 and nota_bebidas <= 5 and (nota_bebidas * 2) = round(nota_bebidas * 2)),
  comentario text,
  created_at timestamptz not null default now()
);

create index if not exists idx_avaliacoes_restaurante on avaliacoes (restaurante_id);

alter table avaliacoes enable row level security;

create policy "permitir insercao publica"
  on avaliacoes for insert
  to anon
  with check (true);

create policy "permitir leitura publica"
  on avaliacoes for select
  to anon
  using (true);

create or replace view ranking_restaurantes as
select
  restaurante_id,
  restaurante_nome,
  count(*) as total_avaliacoes,
  round(avg(nota_comida)::numeric, 2) as media_comida,
  round(avg(nota_ambiente)::numeric, 2) as media_ambiente,
  round(avg(nota_bebidas)::numeric, 2) as media_bebidas,
  round(avg((nota_comida + nota_ambiente + nota_bebidas) / 3.0)::numeric, 2) as media_geral
from avaliacoes
group by restaurante_id, restaurante_nome
order by media_geral desc;