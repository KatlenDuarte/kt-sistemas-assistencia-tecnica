-- =====================================================================
-- KT SISTEMAS · Banco de dados (Supabase / PostgreSQL)
-- ---------------------------------------------------------------------
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- Pode ser executado mais de uma vez (é idempotente onde possível).
--
-- Modelo multi-loja: cada cliente (loja) só enxerga os próprios dados.
-- O isolamento é garantido pelo banco (Row Level Security), não pelo app.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- LOJAS (clientes da KT Sistemas)
-- ---------------------------------------------------------------------
create table if not exists public.stores (
    id            uuid primary key default gen_random_uuid(),
    name          text not null,
    owner_id      uuid references auth.users(id) on delete set null,
    contact_email text,
    contact_phone text,
    document      text,
    address       text,
    logo_url      text,
    brand_color   text not null default '#3e63dd',
    plan          text not null default 'mensal' check (plan in ('mensal', 'anual', 'vitalicio')),
    status        text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
    expires_at    timestamptz,
    admin_notes   text,
    created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PERFIS (1 por usuário do Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
    id             uuid primary key references auth.users(id) on delete cascade,
    store_id       uuid references public.stores(id) on delete set null,
    full_name      text,
    role           text not null default 'owner' check (role in ('owner', 'staff')),
    is_super_admin boolean not null default false,
    created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- FUNÇÕES AUXILIARES DE PERMISSÃO
-- ---------------------------------------------------------------------
create or replace function public.current_store_id() returns uuid
language sql stable security definer set search_path = public as $$
    select store_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
    select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.store_is_active(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.stores
        where id = sid and status = 'active' and (expires_at is null or expires_at > now())
    )
$$;

-- Acesso aos dados operacionais: só a própria loja, e só com assinatura ativa
create or replace function public.can_access_store(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select sid is not null and sid = public.current_store_id() and public.store_is_active(sid)
$$;

-- ---------------------------------------------------------------------
-- DADOS OPERACIONAIS
-- ---------------------------------------------------------------------
create table if not exists public.products (
    id          uuid primary key default gen_random_uuid(),
    store_id    uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
    name        text not null,
    brand       text,
    model       text,
    category    text not null default 'acessorios',
    barcode     text,
    supplier    text,
    stock       integer not null default 0,
    min_stock   integer not null default 5,
    price       numeric(12, 2) not null default 0,
    cost_price  numeric(12, 2),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create index if not exists products_store_idx on public.products (store_id, name);
create unique index if not exists products_store_barcode_uq on public.products (store_id, barcode) where barcode is not null and barcode <> '';

create table if not exists public.sales (
    id             uuid primary key default gen_random_uuid(),
    store_id       uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
    created_at     timestamptz not null default now(),
    kind           text not null default 'venda' check (kind in ('venda', 'servico', 'perda')),
    items          jsonb not null default '[]'::jsonb,   -- [{product_id, name, qty, price}]
    subtotal       numeric(12, 2) not null default 0,
    discount       numeric(12, 2) not null default 0,
    total          numeric(12, 2) not null default 0,
    payment_method text not null default 'pix' check (payment_method in ('pix', 'cartao', 'dinheiro', 'multiplo', 'fiado', 'nenhum')),
    payments       jsonb not null default '{}'::jsonb,   -- {pix, cartao, dinheiro}
    status         text not null default 'concluida' check (status in ('concluida', 'fiado_pendente', 'fiado_quitado', 'estornada', 'cancelada', 'perda')),
    customer_name  text,
    customer_phone text,
    note           text,
    part_cost      numeric(12, 2) not null default 0,
    paid_at        timestamptz,
    paid_method    text,
    created_by     uuid default auth.uid()
);
create index if not exists sales_store_date_idx on public.sales (store_id, created_at desc);
create index if not exists sales_store_status_idx on public.sales (store_id, status);

create table if not exists public.service_orders (
    id             uuid primary key default gen_random_uuid(),
    number         bigint generated always as identity,
    store_id       uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
    created_at     timestamptz not null default now(),
    customer_name  text not null,
    customer_phone text,
    device         text not null,
    brand          text,
    model          text,
    issue          text,
    notes          text,
    status         text not null default 'aguardando' check (status in ('aguardando', 'peca_pedida', 'em_reparo', 'pronto', 'entregue', 'cancelado')),
    value          numeric(12, 2) not null default 0,
    part_cost      numeric(12, 2) not null default 0,
    paid           boolean not null default false,
    delivered_at   timestamptz
);
create index if not exists service_orders_store_idx on public.service_orders (store_id, created_at desc);

create table if not exists public.cash_sessions (
    id              uuid primary key default gen_random_uuid(),
    store_id        uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
    opened_at       timestamptz not null default now(),
    opened_by       uuid default auth.uid(),
    opening_balance numeric(12, 2) not null default 0,
    closed_at       timestamptz,
    expected        numeric(12, 2),
    counted         numeric(12, 2),
    difference      numeric(12, 2),
    status          text not null default 'aberto' check (status in ('aberto', 'fechado'))
);
create unique index if not exists cash_sessions_one_open_uq on public.cash_sessions (store_id) where status = 'aberto';

create table if not exists public.cash_movements (
    id          uuid primary key default gen_random_uuid(),
    store_id    uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
    session_id  uuid not null references public.cash_sessions(id) on delete cascade,
    kind        text not null check (kind in ('entrada', 'saida')),
    description text not null,
    amount      numeric(12, 2) not null check (amount > 0),
    created_at  timestamptz not null default now()
);
create index if not exists cash_movements_session_idx on public.cash_movements (session_id);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.stores          enable row level security;
alter table public.profiles        enable row level security;
alter table public.products        enable row level security;
alter table public.sales           enable row level security;
alter table public.service_orders  enable row level security;
alter table public.cash_sessions   enable row level security;
alter table public.cash_movements  enable row level security;

-- Lojas: o dono vê/edita a própria loja; o super admin (KT) vê e edita todas
drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores for select
    using (id = public.current_store_id() or public.is_super_admin());

drop policy if exists stores_update on public.stores;
create policy stores_update on public.stores for update
    using (id = public.current_store_id() or public.is_super_admin())
    with check (id = public.current_store_id() or public.is_super_admin());

drop policy if exists stores_delete on public.stores;
create policy stores_delete on public.stores for delete using (public.is_super_admin());

-- Perfis: cada um vê o seu (e os da mesma loja); super admin vê todos
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
    using (id = auth.uid() or store_id = public.current_store_id() or public.is_super_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
    using (id = auth.uid() or public.is_super_admin())
    with check (id = auth.uid() or public.is_super_admin());

-- Tabelas operacionais: só a própria loja, com assinatura ativa
do $$
declare t text;
begin
    foreach t in array array['products', 'sales', 'service_orders', 'cash_sessions', 'cash_movements'] loop
        execute format('drop policy if exists %I_all on public.%I', t, t);
        execute format(
            'create policy %I_all on public.%I for all using (public.can_access_store(store_id)) with check (public.can_access_store(store_id))',
            t, t);
    end loop;
end $$;

-- ---------------------------------------------------------------------
-- PROTEÇÕES: o cliente não pode alterar plano, status ou vencimento
-- ---------------------------------------------------------------------
create or replace function public.guard_store_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    -- auth.uid() nulo = SQL Editor / service role (você, no painel do Supabase)
    if auth.uid() is not null and not public.is_super_admin() then
        new.plan        := old.plan;
        new.status      := old.status;
        new.expires_at  := old.expires_at;
        new.owner_id    := old.owner_id;
        new.admin_notes := old.admin_notes;
    end if;
    return new;
end $$;

drop trigger if exists stores_guard on public.stores;
create trigger stores_guard before update on public.stores
    for each row execute function public.guard_store_update();

create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is not null and not public.is_super_admin() then
        new.store_id       := old.store_id;
        new.role           := old.role;
        new.is_super_admin := old.is_super_admin;
    end if;
    return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
    for each row execute function public.guard_profile_update();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
    for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- CADASTRO: ao criar a conta, cria a loja (pendente) e o perfil do dono
-- Metadados enviados pelo app no signUp: full_name, store_name, phone, plan
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
    v_store uuid;
    v_plan  text := coalesce(new.raw_user_meta_data ->> 'plan', 'mensal');
begin
    if v_plan not in ('mensal', 'anual', 'vitalicio') then v_plan := 'mensal'; end if;

    if coalesce(new.raw_user_meta_data ->> 'store_name', '') <> '' then
        insert into public.stores (name, owner_id, contact_email, contact_phone, plan, status)
        values (new.raw_user_meta_data ->> 'store_name', new.id, new.email,
                new.raw_user_meta_data ->> 'phone', v_plan, 'pending')
        returning id into v_store;
    end if;

    insert into public.profiles (id, store_id, full_name, role)
    values (new.id, v_store, new.raw_user_meta_data ->> 'full_name', 'owner')
    on conflict (id) do nothing;

    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- OPERAÇÕES ATÔMICAS (executam com as permissões do usuário: RLS vale)
-- ---------------------------------------------------------------------

-- Registra venda/serviço/perda e baixa o estoque na mesma transação
create or replace function public.register_sale(p_sale jsonb) returns public.sales
language plpgsql security invoker set search_path = public as $$
declare
    v_sale  public.sales;
    v_item  jsonb;
    v_qty   integer;
    v_prod  public.products;
begin
    insert into public.sales (kind, items, subtotal, discount, total, payment_method, payments, status,
                              customer_name, customer_phone, note, part_cost)
    values (
        coalesce(p_sale ->> 'kind', 'venda'),
        coalesce(p_sale -> 'items', '[]'::jsonb),
        coalesce((p_sale ->> 'subtotal')::numeric, 0),
        coalesce((p_sale ->> 'discount')::numeric, 0),
        coalesce((p_sale ->> 'total')::numeric, 0),
        coalesce(p_sale ->> 'payment_method', 'pix'),
        coalesce(p_sale -> 'payments', '{}'::jsonb),
        coalesce(p_sale ->> 'status', 'concluida'),
        p_sale ->> 'customer_name',
        p_sale ->> 'customer_phone',
        p_sale ->> 'note',
        coalesce((p_sale ->> 'part_cost')::numeric, 0)
    ) returning * into v_sale;

    if v_sale.kind in ('venda', 'perda') then
        for v_item in select * from jsonb_array_elements(v_sale.items) loop
            if coalesce(v_item ->> 'product_id', '') <> '' then
                v_qty := coalesce((v_item ->> 'qty')::integer, 1);
                select * into v_prod from public.products where id = (v_item ->> 'product_id')::uuid for update;
                if not found then
                    raise exception 'Produto não encontrado: %', v_item ->> 'name';
                end if;
                if v_prod.stock < v_qty then
                    raise exception 'Estoque insuficiente para "%": disponível %, solicitado %', v_prod.name, v_prod.stock, v_qty;
                end if;
                update public.products set stock = stock - v_qty where id = v_prod.id;
            end if;
        end loop;
    end if;

    return v_sale;
end $$;

-- Estorna uma venda e devolve os itens ao estoque
create or replace function public.refund_sale(p_id uuid) returns public.sales
language plpgsql security invoker set search_path = public as $$
declare
    v_sale public.sales;
    v_item jsonb;
begin
    select * into v_sale from public.sales where id = p_id for update;
    if not found then raise exception 'Venda não encontrada'; end if;
    if v_sale.status in ('estornada', 'cancelada') then raise exception 'Esta venda já foi estornada ou cancelada'; end if;

    if v_sale.kind in ('venda', 'perda') then
        for v_item in select * from jsonb_array_elements(v_sale.items) loop
            if coalesce(v_item ->> 'product_id', '') <> '' then
                update public.products
                   set stock = stock + coalesce((v_item ->> 'qty')::integer, 1)
                 where id = (v_item ->> 'product_id')::uuid;
            end if;
        end loop;
    end if;

    update public.sales
       set status = case when status = 'fiado_pendente' then 'cancelada' else 'estornada' end
     where id = p_id
     returning * into v_sale;
    return v_sale;
end $$;

grant execute on function public.register_sale(jsonb) to authenticated;
grant execute on function public.refund_sale(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- STORAGE: logos das lojas (leitura pública, escrita só na pasta da loja)
-- Caminho do arquivo: <store_id>/logo-<timestamp>.png
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "logos_read" on storage.objects;
create policy "logos_read" on storage.objects for select
    using (bucket_id = 'logos');

drop policy if exists "logos_write" on storage.objects;
create policy "logos_write" on storage.objects for insert to authenticated
    with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_store_id()::text);

drop policy if exists "logos_update" on storage.objects;
create policy "logos_update" on storage.objects for update to authenticated
    using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_store_id()::text);

drop policy if exists "logos_delete" on storage.objects;
create policy "logos_delete" on storage.objects for delete to authenticated
    using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_store_id()::text);

-- =====================================================================
-- DEPOIS DE CRIAR SUA PRÓPRIA CONTA NO SISTEMA, torne-se super admin:
--   update public.profiles set is_super_admin = true
--   where id = (select id from auth.users where email = 'katlenduarte.dev@gmail.com');
-- =====================================================================
