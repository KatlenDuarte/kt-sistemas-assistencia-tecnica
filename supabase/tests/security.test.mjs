// Testes de segurança do banco (RLS, triggers e funções) num PostgreSQL embutido.
// Rodar: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
const db = new PGlite();
const ok = (m) => console.log("  ✔", m);
const bad = (m) => { console.log("  ✘", m); process.exitCode = 1; };

await db.exec(`
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
alter table storage.objects enable row level security;
create role authenticated;
`);
const schema = fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8").replace(/create extension if not exists pgcrypto;/, "");
await db.exec(schema);
await db.exec(`
grant usage on schema public, auth, storage to authenticated;
grant all on all tables in schema public to authenticated;
grant all on storage.objects to authenticated;
grant execute on all functions in schema public to authenticated;
`);
console.log("Schema aplicado.");

const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b", ADM = "00000000-0000-0000-0000-0000000000ad";
await db.query(`insert into auth.users values ($1,'a@loja.com','{"full_name":"Ana","store_name":"Loja A","phone":"31999","plan":"anual"}')`, [A]);
await db.query(`insert into auth.users values ($1,'b@loja.com','{"full_name":"Beto","store_name":"Loja B","plan":"mensal"}')`, [B]);
await db.query(`insert into auth.users values ($1,'adm@kt.com','{"full_name":"Katlen"}')`, [ADM]);
await db.query(`update public.profiles set is_super_admin = true where id = $1`, [ADM]);
const stores = (await db.query(`select id, name, status, plan, owner_id from public.stores order by name`)).rows;
stores.length === 2 && stores.every(s => s.status === "pending") ? ok("Cadastro cria loja pendente + perfil (trigger)") : bad("trigger de cadastro");
const storeA = stores[0].id, storeB = stores[1].id;
stores[0].plan === "anual" ? ok("Plano escolhido no cadastro é gravado") : bad("plano");

const as = async (uid, sql, params = []) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
  try { return await db.query(sql, params); } finally { await db.exec("reset role;"); }
};
const fails = async (uid, sql, params, label) => {
  try { await as(uid, sql, params); bad(label + " (deveria falhar)"); } catch (e) { ok(label + " → bloqueado: " + e.message.split("\n")[0].slice(0, 70)); }
};

await fails(A, `insert into public.products (name, stock, price) values ('Capa', 5, 50)`, [], "Loja pendente não consegue cadastrar produto");
await as(A, `update public.stores set status='active', plan='vitalicio', expires_at=null where id=$1`, [storeA]);
let st = (await db.query(`select status, plan from public.stores where id=$1`, [storeA])).rows[0];
st.status === "pending" && st.plan === "anual" ? ok("Cliente não consegue se liberar nem trocar de plano sozinho") : bad("guard de loja: " + JSON.stringify(st));

await as(ADM, `update public.stores set status='active', expires_at=now()+interval '30 days' where id=$1`, [storeA]);
st = (await db.query(`select status from public.stores where id=$1`, [storeA])).rows[0];
st.status === "active" ? ok("Super admin libera a loja") : bad("admin update");

const prod = (await as(A, `insert into public.products (name, stock, price, cost_price) values ('Capa', 5, 50, 20) returning id, store_id`)).rows[0];
prod.store_id === storeA ? ok("Produto recebe a loja automaticamente") : bad("store_id default");

const sale = (await as(A, `select * from public.register_sale($1::jsonb)`, [JSON.stringify({ kind: "venda", items: [{ product_id: prod.id, name: "Capa", qty: 2, price: 50 }], subtotal: 100, total: 100, payment_method: "pix", payments: { pix: 100 } })])).rows[0];
let stock = (await db.query(`select stock from public.products where id=$1`, [prod.id])).rows[0].stock;
stock === 3 ? ok("register_sale grava a venda e baixa o estoque (5 → 3)") : bad("estoque após venda: " + stock);
await fails(A, `select public.register_sale($1::jsonb)`, [JSON.stringify({ kind: "venda", items: [{ product_id: prod.id, name: "Capa", qty: 10, price: 50 }], total: 500 })], "Venda acima do estoque");
stock = (await db.query(`select stock from public.products where id=$1`, [prod.id])).rows[0].stock;
const salesCount = (await db.query(`select count(*)::int c from public.sales`)).rows[0].c;
stock === 3 && salesCount === 1 ? ok("Venda recusada não deixa rastro (transação desfeita)") : bad(`rollback: stock ${stock}, vendas ${salesCount}`);
await as(A, `select public.refund_sale($1)`, [sale.id]);
stock = (await db.query(`select stock from public.products where id=$1`, [prod.id])).rows[0].stock;
const sst = (await db.query(`select status from public.sales where id=$1`, [sale.id])).rows[0].status;
stock === 5 && sst === "estornada" ? ok("refund_sale estorna e devolve ao estoque (3 → 5)") : bad(`estorno: ${stock} ${sst}`);
await fails(A, `select public.refund_sale($1)`, [sale.id], "Estornar duas vezes");

// Isolamento entre lojas
await as(ADM, `update public.stores set status='active' where id=$1`, [storeB]);
const seen = (await as(B, `select count(*)::int c from public.products`)).rows[0].c;
seen === 0 ? ok("Loja B não enxerga os produtos da Loja A") : bad("isolamento select: " + seen);
const upd = await as(B, `update public.products set price = 1 where id=$1`, [prod.id]);
(await db.query(`select price from public.products where id=$1`, [prod.id])).rows[0].price == 50 ? ok("Loja B não altera produto da Loja A") : bad("isolamento update");
await fails(B, `insert into public.products (store_id, name) values ($1, 'Invasor')`, [storeA], "Loja B inserindo produto na Loja A");
const otherStores = (await as(B, `select count(*)::int c from public.stores`)).rows[0].c;
otherStores === 1 ? ok("Cada loja só vê a própria loja") : bad("stores visíveis: " + otherStores);
const admSees = (await as(ADM, `select count(*)::int c from public.stores`)).rows[0].c;
admSees === 2 ? ok("Super admin vê todas as lojas") : bad("admin stores: " + admSees);
await as(A, `update public.profiles set is_super_admin = true where id = $1`, [A]);
const isAdm = (await db.query(`select is_super_admin from public.profiles where id=$1`, [A])).rows[0].is_super_admin;
isAdm === false ? ok("Cliente não consegue virar super admin") : bad("escalada de privilégio");

// Vencimento bloqueia
await as(ADM, `update public.stores set expires_at = now() - interval '1 day' where id=$1`, [storeA]);
const afterExp = (await as(A, `select count(*)::int c from public.products`)).rows[0].c;
afterExp === 0 ? ok("Assinatura vencida bloqueia o acesso aos dados (sem apagar)") : bad("vencimento");
const stillThere = (await db.query(`select count(*)::int c from public.products`)).rows[0].c;
stillThere === 1 ? ok("Dados continuam guardados após o vencimento") : bad("dados apagados?");

// Storage
await as(A, `insert into storage.objects (bucket_id, name) values ('logos', $1)`, [`${storeA}/logo.png`]);
ok("Loja A envia logo para a própria pasta");
await fails(A, `insert into storage.objects (bucket_id, name) values ('logos', $1)`, [`${storeB}/logo.png`], "Loja A enviando logo na pasta da Loja B");

// Caixa: um aberto por loja
await as(ADM, `update public.stores set expires_at = now() + interval '30 days' where id=$1`, [storeA]);
await as(A, `insert into public.cash_sessions (opening_balance) values (100)`);
await fails(A, `insert into public.cash_sessions (opening_balance) values (50)`, [], "Abrir dois caixas ao mesmo tempo");
console.log(process.exitCode ? "\nFALHOU" : "\nTODOS OS TESTES PASSARAM");
