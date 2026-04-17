-- Share tokens para vista pública read-only de Finanzas.
-- El owner crea un token desde la app y comparte el link /vista/:token
-- con la dueña. Si el link se filtra, revoca el token (revoked=true) y
-- el link deja de funcionar sin afectar a los demás tokens.

create table if not exists finanzas_share_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists finanzas_share_tokens_user_idx
  on finanzas_share_tokens(user_id);

alter table finanzas_share_tokens enable row level security;

-- Solo el dueño puede listar/crear/modificar sus propios tokens.
drop policy if exists "owner_crud_own_tokens" on finanzas_share_tokens;
create policy "owner_crud_own_tokens" on finanzas_share_tokens
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── RPC públicas ───────────────────────────────────────────────────────
-- Devuelven el jsonb `data` del usuario dueño del token. Security definer
-- para poder saltar RLS de finanzas_contratos / finanzas_caja, pero SOLO
-- si hay un token válido y no revocado. Cualquiera que sepa el token puede
-- leer; nadie puede escribir (no hay funciones de escritura).

create or replace function public_get_contratos(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select fc.data
  from finanzas_share_tokens fst
  join finanzas_contratos fc on fc.user_id = fst.user_id
  where fst.token = p_token
    and fst.revoked = false
  limit 1;
$$;

create or replace function public_get_caja(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select fc.data
  from finanzas_share_tokens fst
  join finanzas_caja fc on fc.user_id = fst.user_id
  where fst.token = p_token
    and fst.revoked = false
  limit 1;
$$;

-- Permitir que anon (sin login) y usuarios autenticados llamen a las RPC.
grant execute on function public_get_contratos(text) to anon, authenticated;
grant execute on function public_get_caja(text) to anon, authenticated;
