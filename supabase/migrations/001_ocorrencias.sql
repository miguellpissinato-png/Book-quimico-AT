-- Registro compartilhado de ocorrências do Book Químico.
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.

create table if not exists public.ocorrencias (
  id               uuid primary key,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  status           text not null default 'aberta' check (status in ('aberta', 'concluida', 'descartada')),
  produtos         jsonb not null default '[]'::jsonb,   -- [{ "id": "...", "nome": "..." }]
  acoes            jsonb not null default '[]'::jsonb,   -- [{ "tipo": "ligou_samu", "em": "...", ... }]
  responsavel      text not null default '',
  local            text not null default '',
  area             text not null default '',
  exposicao        text[] not null default '{}',
  pessoa_atendida  text not null default '',
  descricao        text not null default '',
  encaminhamento   text not null default '',
  dispositivo      text not null default '',
  recebido_em      timestamptz not null default now()   -- quando chegou ao servidor (auditoria)
);

create index if not exists ocorrencias_criado_em_idx on public.ocorrencias (criado_em desc);

-- Segurança (Row Level Security): o app usa a chave pública "anon".
-- Ele pode LER, CRIAR e ATUALIZAR registros, mas NUNCA apagar
-- (registros enviados por engano são marcados como "descartada").
alter table public.ocorrencias enable row level security;

drop policy if exists "app pode ler" on public.ocorrencias;
create policy "app pode ler" on public.ocorrencias
  for select to anon using (true);

drop policy if exists "app pode criar" on public.ocorrencias;
create policy "app pode criar" on public.ocorrencias
  for insert to anon with check (true);

drop policy if exists "app pode atualizar" on public.ocorrencias;
create policy "app pode atualizar" on public.ocorrencias
  for update to anon using (true) with check (true);
