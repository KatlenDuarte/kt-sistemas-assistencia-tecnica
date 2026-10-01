# KT Sistemas

Sistema de gestão para **lojas de celular e assistência técnica**, vendido por assinatura (SaaS).
Cada cliente tem sua própria loja, com a **logo, o nome e a cor** dele no sistema, e dados totalmente isolados das outras lojas.

- **Site de vendas** com recursos, planos, dúvidas e contato
- **Demonstração** completa sem cadastro (dados fictícios no navegador)
- **Cadastro em 3 passos**: plano → dados da loja + logo → acesso
- **Pagamento manual** (PIX via WhatsApp) e **painel do administrador** para liberar, renovar e bloquear clientes
- Sistema da loja: vendas (PIX, cartão, dinheiro, múltiplos, fiado), estoque, fiado, ordens de serviço, caixa, dashboard e relatórios em PDF
- Responsivo (computador, tablet e celular), tema claro e escuro

| Plano | Valor |
|---|---|
| Mensal | R$ 99,90 / mês |
| Anual | R$ 999,90 / ano |
| Vitalício | R$ 1.999,90 (pagamento único) |

Preços, contato e textos ficam em [`src/config/brand.ts`](src/config/brand.ts).

---

## Rodar no computador

```bash
npm install
npm run dev
```

Sem configurar o banco, o site e a **demonstração** já funcionam. O cadastro e o login reais precisam do Supabase (abaixo).

## Configurar o banco de dados (Supabase)

1. Crie uma conta em [supabase.com](https://supabase.com) e um **novo projeto** (região *South America (São Paulo)*).
2. Vá em **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Crie o arquivo `.env` na raiz (use o `.env.example` como modelo):
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   > A chave **anon** é pública por natureza (a segurança é feita pelo banco). **Nunca** use a chave `service_role` no site.
5. Em **Authentication → URL Configuration**, coloque o endereço onde o site vai ficar (ex.: `https://kt-sistemas.vercel.app`) em *Site URL* e em *Redirect URLs*.
6. *(Opcional)* Em **Authentication → Providers → Email**, desative **Confirm email** para o cliente entrar logo após o cadastro. Se deixar ativo, ele recebe um e-mail de confirmação antes do primeiro acesso.

### Tornar-se administradora (super admin)

1. Faça um cadastro normal no seu próprio site com o seu e-mail.
2. No **SQL Editor**, rode:
   ```sql
   update public.profiles set is_super_admin = true
   where id = (select id from auth.users where email = 'katlenduarte.dev@gmail.com');
   ```
3. Entre de novo: aparece o menu **Clientes e planos**.

## Como funciona a venda para um cliente

1. O cliente acessa o site, testa a demonstração e clica em **Assinar** no plano desejado.
2. Ele cadastra a loja, envia a logo e cria o acesso. A loja fica **“Aguardando pagamento”** e ele vê um botão para falar com você no WhatsApp com a mensagem pronta.
3. Você recebe o PIX e, em **Clientes e planos**, clica em **Liberar** e escolhe o plano. O vencimento é calculado sozinho (mensal +31 dias, anual +366 dias, vitalício sem vencimento).
4. Na renovação, clique em **Renovar**: o prazo é somado ao vencimento atual.
5. Se a assinatura vencer, o acesso é bloqueado automaticamente, **sem apagar nenhum dado**.

## Segurança

O isolamento entre lojas é feito no próprio banco (*Row Level Security*), não só no app:

- cada loja só lê e grava os próprios dados, e só com assinatura ativa;
- o cliente não consegue alterar plano, status, vencimento nem se tornar administrador;
- logos só podem ser enviadas para a pasta da própria loja;
- vendas e estornos usam funções transacionais (o estoque nunca fica pela metade).

Para conferir tudo isso num PostgreSQL embutido:

```bash
npm run test:db
```

## Publicar o site

Recomendado: **[Vercel](https://vercel.com)** (grátis) ou Netlify.

1. Importe o repositório do GitHub.
2. Em *Environment Variables*, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Build command: `npm run build` · Output: `dist`.

As rotas usam `#` (ex.: `/#/entrar`), então funciona em qualquer hospedagem estática, inclusive GitHub Pages.

## Estrutura

```
src/
  config/brand.ts          empresa, contato, planos
  data/                    contrato de dados + implementação Supabase e demonstração
  contexts/                sessão (login, loja, white label), dados da loja, tema, avisos
  screens/public/          site, login, cadastro
  screens/account/         aguardando pagamento, bloqueado
  screens/app/             sistema da loja
  screens/admin/           painel KT Sistemas (clientes e planos)
supabase/schema.sql        banco completo (tabelas, segurança, funções, storage)
supabase/tests/            testes de segurança do banco
```
