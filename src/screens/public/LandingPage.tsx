// src/screens/public/LandingPage.tsx — site de vendas da KT Sistemas

import { useState, type ReactNode } from "react";
import {
    PlayCircle, ShoppingCart, Package, BookOpenText, Wrench, Receipt, BarChart3, Smartphone, Palette,
    ShieldCheck, Check, MessageCircle, Mail, ChevronDown, Menu, X, Sun, Moon, ArrowRight, Lock,
    Cloud, Headphones, Printer, ScanBarcode, Minus, Store, Zap, QrCode, type LucideIcon,
} from "lucide-react";
import { COMPANY, PLANS, PLAN_FEATURES, whatsappLink, mailtoLink } from "../../config/brand";
import { formatBRL } from "../../lib/format";
import { navigate } from "../../lib/router";
import { useSession } from "../../contexts/SessionContext";
import { useTheme } from "../../contexts/ThemeContext";

/** Marca da KT Sistemas (cor fixa, não muda com o white label das lojas). */
export function KtLogo({ light = false, className = "" }: { light?: boolean; className?: string }) {
    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#4b6bdc] to-[#27397f] text-[13px] font-bold tracking-tight text-white shadow-sm ring-1 ring-inset ring-white/15">
                KT
                <span className="absolute bottom-1.5 right-1.5 h-1 w-1 rounded-full bg-[#b8c7f5]" />
            </span>
            <span className={`text-[17px] font-semibold tracking-tight ${light ? "text-white" : "text-fg"}`}>KT <span className="font-normal opacity-60">Sistemas</span></span>
        </span>
    );
}

const FEATURES = [
    { icon: ShoppingCart, title: "Vendas rápidas", text: "Busca por nome ou leitor de código de barras, desconto, troco e pagamento em PIX, cartão, dinheiro ou dividido." },
    { icon: Package, title: "Estoque sob controle", text: "Baixa automática a cada venda, alerta de reposição, custo, margem de lucro e exportação em PDF." },
    { icon: BookOpenText, title: "Fiado organizado", text: "Saiba quem deve, há quantos dias, e cobre com um toque pelo WhatsApp com a mensagem pronta." },
    { icon: Wrench, title: "Ordens de serviço", text: "Acompanhe cada reparo da assistência, avise o cliente quando estiver pronto e receba na entrega." },
    { icon: Receipt, title: "Caixa do dia", text: "Abertura com fundo de troco, sangrias, conferência no fechamento e relatório em PDF." },
    { icon: BarChart3, title: "Relatórios e lucro", text: "Faturamento por período, formas de pagamento, mais vendidos e lucro bruto estimado." },
    { icon: Palette, title: "Com a cara da sua loja", text: "Sua logo, seu nome e sua cor no sistema e nos cupons impressos." },
    { icon: Smartphone, title: "Computador e celular", text: "Use no balcão, no tablet ou no celular. Tema claro e escuro." },
];

const HIGHLIGHTS = [
    {
        tag: "Balcão", title: "Venda em segundos, sem errar o troco",
        text: "Monte o carrinho pelo nome ou pelo leitor de código de barras. O sistema calcula desconto e troco, baixa o estoque e imprime o cupom.",
        points: ["Pagamento dividido entre PIX, cartão e dinheiro", "Venda no fiado com nome e telefone do cliente", "Cupom de 80 mm com a logo da sua loja"],
        preview: "sale" as const,
    },
    {
        tag: "Assistência técnica", title: "Cada aparelho com sua ordem de serviço",
        text: "Registre defeito, orçamento e prazo. Acompanhe o reparo por etapas e avise o cliente pelo WhatsApp quando estiver pronto.",
        points: ["Etapas: aguardando, peça pedida, em reparo, pronto", "Mensagem pronta para avisar o cliente", "Recebimento na entrega já entra no caixa"],
        preview: "orders" as const,
    },
    {
        tag: "Financeiro", title: "Feche o caixa sabendo exatamente o que entrou",
        text: "Abra o caixa com o fundo de troco, registre sangrias e reforços, e compare o esperado com o contado no fechamento.",
        points: ["Resumo por forma de pagamento", "Diferença de caixa destacada", "Relatórios em PDF para guardar ou enviar"],
        preview: "cash" as const,
    },
];

const COMPARISON = [
    "Estoque atualizado sozinho a cada venda",
    "Saber quem está devendo e desde quando",
    "Acompanhar os reparos da assistência",
    "Fechamento de caixa conferido",
    "Lucro e mais vendidos do mês",
    "Acesso pelo celular de qualquer lugar",
];

const FAQ = [
    { q: "Preciso instalar alguma coisa?", a: "Não. O sistema funciona no navegador do computador, tablet ou celular. Basta acessar e entrar com seu e-mail." },
    { q: "Meus dados ficam separados das outras lojas?", a: "Sim. Cada loja tem os dados isolados por regras de segurança no próprio banco de dados: ninguém além de você acessa suas vendas e clientes." },
    { q: "Como funciona o pagamento?", a: "Você escolhe o plano e faz o cadastro. Em seguida combinamos o pagamento por PIX pelo WhatsApp e liberamos seu acesso no mesmo dia." },
    { q: "Posso testar antes?", a: "Pode! Clique em “Ver demonstração” e use o sistema completo com dados de exemplo, sem cadastro." },
    { q: "Funciona com impressora de cupom e leitor de código de barras?", a: "Sim. O cupom é impresso pelo próprio navegador em impressoras térmicas de 80 mm ou comuns, e o leitor de código de barras USB funciona direto na tela de venda." },
    { q: "E se a assinatura vencer?", a: "O acesso fica pausado até a renovação, mas nenhum dado é apagado. Ao renovar, tudo volta exatamente como estava." },
    { q: "Vocês ajudam a cadastrar os produtos?", a: "Sim. No início ajudamos a configurar a loja e a organizar o cadastro dos produtos pelo WhatsApp." },
];

const TRUST: [LucideIcon, string, string][] = [
    [Cloud, "Na nuvem", "Acesse de qualquer lugar"],
    [Lock, "Seguro", "Cada loja isolada no banco"],
    [Printer, "Cupom 80 mm", "Impressora térmica ou comum"],
    [Headphones, "Suporte humano", "Direto pelo WhatsApp"],
];

export default function LandingPage() {
    const { enterDemo } = useSession();
    const { theme, toggleTheme } = useTheme();
    const [menu, setMenu] = useState(false);
    const [faq, setFaq] = useState<number | null>(0);

    const demo = () => { enterDemo(); navigate("/"); };
    const scrollTo = (id: string) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
    const links: [string, string][] = [["recursos", "Recursos"], ["como-funciona", "Como funciona"], ["planos", "Planos"], ["duvidas", "Dúvidas"], ["contato", "Contato"]];

    return (
        <div className="min-h-screen bg-bg font-sans text-fg-muted">
            {/* Topo */}
            <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
                    <a href="#/" aria-label={COMPANY.name}><KtLogo /></a>
                    <nav className="ml-4 hidden items-center gap-0.5 text-sm md:flex">
                        {links.map(([id, l]) => <button key={id} onClick={() => scrollTo(id)} className="rounded-lg px-3 py-1.5 text-fg-subtle hover:bg-hover hover:text-fg">{l}</button>)}
                    </nav>
                    <span className="flex-1" />
                    <button onClick={toggleTheme} aria-label="Alternar tema" className="flex h-9 w-9 items-center justify-center rounded-xl text-fg-subtle hover:bg-hover">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
                    <a href="#/entrar" className="hidden h-9 items-center rounded-xl px-3.5 text-sm font-medium text-fg hover:bg-hover sm:inline-flex">Entrar</a>
                    <button onClick={demo} className="hidden h-9 items-center gap-2 rounded-xl bg-fg px-4 text-sm font-semibold text-bg hover:opacity-90 sm:inline-flex">
                        Ver demonstração
                    </button>
                    <button onClick={() => setMenu(!menu)} aria-label="Menu" className="flex h-9 w-9 items-center justify-center rounded-xl text-fg md:hidden">{menu ? <X size={20} /> : <Menu size={20} />}</button>
                </div>
                {menu && (
                    <div className="space-y-1 border-t border-line px-4 py-3 md:hidden">
                        {links.map(([id, l]) => (
                            <button key={id} onClick={() => scrollTo(id)} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fg hover:bg-hover">{l}</button>
                        ))}
                        <a href="#/entrar" className="block rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-hover">Entrar</a>
                        <button onClick={demo} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white"><PlayCircle size={16} /> Ver demonstração</button>
                    </div>
                )}
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--ui-line-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
                <div className="pointer-events-none absolute -top-48 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[110px]" />
                <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-muted shadow-[var(--ui-shadow)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Para lojas de celular e assistência técnica
                        </span>
                        <h1 className="mt-6 text-[38px] font-bold leading-[1.07] tracking-[-0.025em] text-fg sm:text-[52px]">
                            A gestão da sua loja, <span className="text-fg-subtle">organizada do balcão ao caixa.</span>
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-subtle">
                            Vendas, estoque, fiado, ordens de serviço e fechamento de caixa num só lugar — com a logo e as cores da sua loja.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <button onClick={demo} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-white shadow-[var(--ui-shadow-md)] hover:bg-primary-hover">
                                <PlayCircle size={18} /> Testar a demonstração
                            </button>
                            <button onClick={() => scrollTo("planos")} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold text-fg shadow-[var(--ui-shadow)] hover:bg-hover">
                                Ver planos <ArrowRight size={16} />
                            </button>
                        </div>
                        <ul className="mt-8 grid max-w-lg grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-fg-subtle">
                            {["Sem instalação", "Teste sem cadastro", "Dados isolados por loja", `A partir de ${formatBRL(PLANS[0].price)}/mês`].map(t => (
                                <li key={t} className="flex items-center gap-2"><Check size={15} className="shrink-0 text-success" />{t}</li>
                            ))}
                        </ul>
                    </div>
                    <ProductPreview />
                </div>
            </section>

            {/* Faixa de confiança */}
            <section className="border-y border-line bg-surface">
                <div className="mx-auto grid max-w-6xl grid-cols-2 divide-line px-4 sm:px-6 md:grid-cols-4 md:divide-x">
                    {TRUST.map(([Icon, t, d]) => (
                        <div key={t} className="flex items-center gap-3 px-2 py-5 md:px-6">
                            <Icon size={20} className="shrink-0 text-fg-faint" />
                            <div><p className="text-sm font-semibold text-fg">{t}</p><p className="text-xs text-fg-subtle">{d}</p></div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Recursos */}
            <section id="recursos" className="scroll-mt-16 py-20 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <SectionTitle eyebrow="Recursos" title="Tudo que a loja precisa no dia a dia" text="Do balcão ao fechamento do caixa, sem planilhas e sem papel." />
                    <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-[var(--ui-shadow)] sm:grid-cols-2 lg:grid-cols-4">
                        {FEATURES.map(f => (
                            <div key={f.title} className="bg-surface p-6 transition-colors hover:bg-subtle">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-subtle text-fg-muted"><f.icon size={19} /></span>
                                <h3 className="mt-4 font-semibold text-fg">{f.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-fg-subtle">{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Destaques */}
            <section id="como-funciona" className="scroll-mt-16 border-y border-line bg-surface py-20 sm:py-24">
                <div className="mx-auto max-w-6xl space-y-20 px-4 sm:px-6 lg:space-y-28">
                    {HIGHLIGHTS.map((h, i) => (
                        <div key={h.tag} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                            <div className={i % 2 ? "lg:order-2" : ""}>
                                <p className="text-sm font-semibold text-primary-text">{h.tag}</p>
                                <h3 className="mt-2 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{h.title}</h3>
                                <p className="mt-4 leading-relaxed text-fg-subtle">{h.text}</p>
                                <ul className="mt-6 space-y-3">
                                    {h.points.map(p => (
                                        <li key={p} className="flex items-start gap-3 text-sm text-fg-muted">
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"><Check size={12} strokeWidth={3} /></span>{p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className={i % 2 ? "lg:order-1" : ""}><HighlightPreview kind={h.preview} /></div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Comparação */}
            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                    <SectionTitle center eyebrow="Por que trocar" title="Caderno e planilha não dão conta" text="Veja o que muda quando a loja passa a usar um sistema de verdade." />
                    <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--ui-shadow)]">
                        <div className="grid grid-cols-[1fr_76px_92px] border-b border-line bg-subtle px-5 py-3 text-xs font-semibold text-fg-subtle sm:grid-cols-[1fr_120px_120px]">
                            <span>Na rotina da loja</span><span className="text-center">Caderno</span><span className="text-center text-fg">{COMPANY.name}</span>
                        </div>
                        {COMPARISON.map(t => (
                            <div key={t} className="grid grid-cols-[1fr_76px_92px] items-center border-b border-line px-5 py-3.5 text-sm last:border-b-0 sm:grid-cols-[1fr_120px_120px]">
                                <span className="text-fg-muted">{t}</span>
                                <span className="flex justify-center"><Minus size={17} className="text-fg-faint" /></span>
                                <span className="flex justify-center"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-soft text-success"><Check size={14} strokeWidth={3} /></span></span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Planos */}
            <section id="planos" className="scroll-mt-16 border-y border-line bg-surface py-20 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <SectionTitle center eyebrow="Planos" title="Escolha o plano ideal para sua loja" text="Todos os planos incluem todos os recursos, atualizações e suporte pelo WhatsApp." />
                    <PlanCards />
                    <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-fg-subtle">
                        <span className="inline-flex items-center gap-2"><Zap size={15} className="text-fg-faint" /> Liberação no mesmo dia</span>
                        <span className="inline-flex items-center gap-2"><QrCode size={15} className="text-fg-faint" /> Pagamento por PIX</span>
                        <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-fg-faint" /> Dados preservados se a assinatura vencer</span>
                    </p>
                </div>
            </section>

            {/* Como começar */}
            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <SectionTitle center eyebrow="Começar é simples" title="Sua loja funcionando em 3 passos" />
                    <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
                        <span className="pointer-events-none absolute left-[17%] right-[17%] top-5 hidden h-px bg-line-strong md:block" />
                        {[
                            ["Escolha o plano e cadastre a loja", "Informe o nome da loja, envie sua logo e crie seu acesso."],
                            ["Combine o pagamento", "Fale com a gente pelo WhatsApp e pague por PIX."],
                            ["Comece a vender", "Liberamos o acesso e o sistema já abre com a cara da sua loja."],
                        ].map(([t, d], i) => (
                            <li key={t} className="relative text-center">
                                <span className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface text-sm font-semibold text-fg shadow-[var(--ui-shadow)]">{i + 1}</span>
                                <h3 className="mt-5 font-semibold text-fg">{t}</h3>
                                <p className="mx-auto mt-1.5 max-w-xs text-sm text-fg-subtle">{d}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Dúvidas */}
            <section id="duvidas" className="scroll-mt-16 border-t border-line bg-surface py-20 sm:py-24">
                <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
                    <div>
                        <SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" text="Não achou sua resposta? Chame a gente no WhatsApp." />
                        <a href={whatsappLink("Olá! Tenho uma dúvida sobre o KT Sistemas.")} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-fg shadow-[var(--ui-shadow)] hover:bg-hover">
                            <MessageCircle size={16} /> Falar no WhatsApp
                        </a>
                    </div>
                    <div className="divide-y divide-line rounded-2xl border border-line bg-bg">
                        {FAQ.map((f, i) => (
                            <div key={f.q}>
                                <button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-fg">
                                    {f.q}<ChevronDown size={18} className={`shrink-0 text-fg-faint transition-transform ${faq === i ? "rotate-180" : ""}`} />
                                </button>
                                {faq === i && <p className="-mt-1 px-5 pb-5 text-sm leading-relaxed text-fg-subtle">{f.a}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section id="contato" className="scroll-mt-16 px-4 py-20 sm:px-6">
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-nav px-6 py-14 text-white sm:px-14 sm:py-16">
                    <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:20px_20px]" />
                    <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#4b6bdc]/25 blur-[100px]" />
                    <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Gostou do sistema?</h2>
                            <p className="mt-3 max-w-xl text-white/65">Fale com a gente para tirar dúvidas ou contratar. Ajudamos a configurar sua loja e a cadastrar os produtos.</p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <a href={whatsappLink("Olá! Vi o KT Sistemas e quero saber mais.")} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-[#0f172a] hover:bg-white/90">
                                    <MessageCircle size={18} /> Chamar no WhatsApp
                                </a>
                                <a href={mailtoLink("Quero conhecer o KT Sistemas", "Olá! Gostaria de mais informações sobre o sistema.")} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 font-semibold text-white hover:bg-white/10">
                                    <Mail size={18} /> Enviar e-mail
                                </a>
                            </div>
                        </div>
                        <div className="space-y-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm">
                            <p className="flex items-center gap-3"><MessageCircle size={17} className="shrink-0 text-white/50" /> {COMPANY.whatsappDisplay}</p>
                            <p className="flex items-center gap-3 break-all"><Mail size={17} className="shrink-0 text-white/50" /> {COMPANY.email}</p>
                            <p className="flex items-center gap-3"><Headphones size={17} className="shrink-0 text-white/50" /> Ajuda para configurar a loja</p>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="border-t border-line bg-surface">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
                    <div>
                        <KtLogo />
                        <p className="mt-3 max-w-xs text-sm text-fg-subtle">{COMPANY.tagline}.</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-fg">Produto</p>
                        <ul className="mt-3 space-y-2 text-sm text-fg-subtle">
                            <li><button onClick={() => scrollTo("recursos")} className="hover:text-fg">Recursos</button></li>
                            <li><button onClick={() => scrollTo("planos")} className="hover:text-fg">Planos</button></li>
                            <li><button onClick={demo} className="hover:text-fg">Demonstração</button></li>
                            <li><a href="#/entrar" className="hover:text-fg">Entrar</a></li>
                        </ul>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-fg">Contato</p>
                        <ul className="mt-3 space-y-2 text-sm text-fg-subtle">
                            <li><a href={whatsappLink("Olá!")} target="_blank" rel="noreferrer" className="hover:text-fg">{COMPANY.whatsappDisplay}</a></li>
                            <li><a href={`mailto:${COMPANY.email}`} className="break-all hover:text-fg">{COMPANY.email}</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-line">
                    <p className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-5 text-xs text-fg-faint sm:px-6"><ShieldCheck size={13} /> © {new Date().getFullYear()} {COMPANY.name}. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}

function SectionTitle({ eyebrow, title, text, center }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
    return (
        <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
            <p className="text-sm font-semibold text-primary-text">{eyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-[38px] sm:leading-tight">{title}</h2>
            {text && <p className="mt-3 text-fg-subtle">{text}</p>}
        </div>
    );
}

/* ------------------------------------------------------------------ Prévias ilustrativas */

function Window({ children, title }: { children: ReactNode; title?: string }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--ui-shadow-lg)]">
            <div className="flex items-center gap-1.5 border-b border-line bg-subtle px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" /><span className="h-2.5 w-2.5 rounded-full bg-line-strong" /><span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                {title && <span className="ml-3 text-[11px] font-medium text-fg-faint">{title}</span>}
            </div>
            {children}
        </div>
    );
}

function ProductPreview() {
    const bars = [40, 28, 55, 36, 70, 58, 42, 50, 66, 54, 84, 72];
    return (
        <div className="relative">
            <Window title="Visão geral">
                <div className="flex">
                    <div className="hidden w-36 shrink-0 flex-col gap-1.5 bg-nav p-3 sm:flex">
                        <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10"><Store size={12} className="text-white/70" /></span><span className="h-2 w-14 rounded bg-white/25" /></div>
                        {[1, 0, 0, 0, 0, 0].map((a, i) => <span key={i} className={`flex h-6 items-center gap-2 rounded-md px-2 ${a ? "bg-white/10" : ""}`}><span className="h-2 w-2 rounded-sm bg-white/35" /><span className="h-1.5 w-12 rounded bg-white/20" /></span>)}
                    </div>
                    <div className="flex-1 space-y-3 bg-bg p-4">
                        <div className="flex items-center justify-between"><span className="h-3 w-28 rounded bg-fg/70" /><span className="h-5 w-24 rounded-md border border-line bg-surface" /></div>
                        <div className="grid grid-cols-3 gap-2">
                            {[["Faturamento", "R$ 1.521", "+12%"], ["Ticket médio", "R$ 89", "+4%"], ["Fiado", "R$ 303", "-8%"]].map(([l, v, d]) => (
                                <div key={l} className="rounded-lg border border-line bg-surface p-2.5">
                                    <span className="block truncate text-[10px] text-fg-subtle">{l}</span>
                                    <span className="mt-0.5 block text-sm font-semibold text-fg">{v}</span>
                                    <span className={`mt-1 inline-block rounded px-1 text-[9px] font-semibold ${d.startsWith("+") ? "bg-success-soft text-success" : "bg-subtle text-fg-subtle"}`}>{d}</span>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-lg border border-line bg-surface p-3">
                            <div className="flex h-24 items-end gap-1.5">
                                {bars.map((h, i) => <span key={i} className={`flex-1 rounded-t-[3px] ${i === bars.length - 1 ? "bg-primary" : "bg-primary/25"}`} style={{ height: `${h}%` }} />)}
                            </div>
                        </div>
                        <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
                            {[["Película 3D iPhone 15", "PIX"], ["Carregador turbo 20W", "Cartão"], ["Capa anti-impacto A54", "Dinheiro"]].map(([n, m]) => (
                                <div key={n} className="flex items-center justify-between gap-2 text-[11px]"><span className="truncate text-fg-muted">{n}</span><span className="rounded border border-line bg-subtle px-1.5 text-fg-subtle">{m}</span></div>
                            ))}
                        </div>
                    </div>
                </div>
            </Window>
            <div className="absolute -bottom-6 -left-4 hidden w-60 rounded-xl border border-line bg-surface p-3.5 shadow-[var(--ui-shadow-lg)] sm:block">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success"><Check size={16} strokeWidth={2.5} /></span>
                    <div><p className="text-xs font-semibold text-fg">Venda registrada</p><p className="text-[11px] text-fg-subtle">R$ 129,90 · estoque atualizado</p></div>
                </div>
            </div>
        </div>
    );
}

const STATUS_CLASS = {
    info: "border-info/20 bg-info-soft text-info",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning-soft text-warning",
    neutral: "border-line bg-subtle text-fg-subtle",
};

function HighlightPreview({ kind }: { kind: "sale" | "orders" | "cash" }) {
    if (kind === "sale") {
        const items: [string, number, number][] = [["Película 3D iPhone 15", 1, 39.9], ["Carregador turbo 20W", 1, 59.9], ["Cabo USB-C 1m", 2, 15]];
        return (
            <Window title="Nova venda">
                <div className="space-y-3 p-5">
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-line bg-bg px-3 text-sm text-fg-faint"><ScanBarcode size={16} /> Buscar produto ou ler código…</div>
                    {items.map(([n, q, p]) => (
                        <div key={n} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 text-sm last:border-b-0">
                            <span className="truncate text-fg">{n} <span className="text-fg-faint">× {q}</span></span>
                            <span className="font-medium text-fg tabular">{formatBRL(q * p)}</span>
                        </div>
                    ))}
                    <div className="grid grid-cols-4 gap-2 pt-1 text-center text-[11px] font-medium">
                        {["PIX", "Cartão", "Dinheiro", "Fiado"].map((m, i) => <span key={m} className={`rounded-lg border py-2 ${i === 0 ? "border-primary/40 bg-primary-soft text-primary-text" : "border-line text-fg-subtle"}`}>{m}</span>)}
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-subtle px-4 py-3"><span className="text-sm text-fg-subtle">Total</span><span className="text-lg font-semibold text-fg tabular">{formatBRL(129.8)}</span></div>
                </div>
            </Window>
        );
    }
    if (kind === "orders") {
        const rows: [string, string, string, keyof typeof STATUS_CLASS][] = [
            ["iPhone 12", "Troca de tela", "Em reparo", "info"], ["Galaxy A32", "Conector de carga", "Pronto", "success"],
            ["Moto G60", "Bateria", "Peça pedida", "warning"], ["Redmi Note 11", "Não liga", "Aguardando", "neutral"],
        ];
        return (
            <Window title="Ordens de serviço">
                <div className="divide-y divide-line">
                    {rows.map(([d, i, s, t], n) => (
                        <div key={d} className="flex items-center gap-3 px-5 py-3.5">
                            <span className="text-xs font-medium text-fg-faint tabular">#{1042 + n}</span>
                            <div className="min-w-0 flex-1"><p className="text-sm font-medium text-fg">{d}</p><p className="truncate text-xs text-fg-subtle">{i}</p></div>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CLASS[t]}`}>{s}</span>
                        </div>
                    ))}
                </div>
            </Window>
        );
    }
    const mix: [string, number, string, number][] = [["PIX", 812.4, "bg-chart-2", 52], ["Cartão", 455, "bg-chart-1", 29], ["Dinheiro", 298.5, "bg-chart-3", 19]];
    return (
        <Window title="Fechamento de caixa">
            <div className="space-y-4 p-5">
                {mix.map(([l, v, c, p]) => (
                    <div key={l}>
                        <div className="flex justify-between text-sm"><span className="flex items-center gap-2 text-fg-muted"><span className={`h-2 w-2 rounded-full ${c}`} />{l}</span><span className="font-medium text-fg tabular">{formatBRL(v)}</span></div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-hover"><div className={`h-full rounded-full ${c}`} style={{ width: `${p}%` }} /></div>
                    </div>
                ))}
                <div className="grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                    {[["Esperado", "R$ 448,50", "text-fg"], ["Contado", "R$ 450,00", "text-fg"], ["Diferença", "+ R$ 1,50", "text-success"]].map(([l, v, c]) => (
                        <div key={l} className="rounded-lg bg-subtle px-2 py-2.5"><p className="text-[11px] text-fg-subtle">{l}</p><p className={`text-sm font-semibold tabular ${c}`}>{v}</p></div>
                    ))}
                </div>
            </div>
        </Window>
    );
}

/* ------------------------------------------------------------------ Planos */

export function PlanCards({ compact = false }: { compact?: boolean }) {
    return (
        <div className={`grid items-stretch gap-5 ${compact ? "mt-6" : "mt-12"} lg:grid-cols-3`}>
            {PLANS.map(p => {
                const featured = !!p.highlight;
                return (
                    <div key={p.id} className={`relative flex flex-col rounded-2xl border bg-surface p-6 sm:p-7 ${featured ? "border-primary/50 shadow-[var(--ui-shadow-lg)] ring-1 ring-primary/30" : "border-line shadow-[var(--ui-shadow)]"}`}>
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-lg font-semibold text-fg">{p.name}</h3>
                            {featured && <span className="rounded-full border border-primary/25 bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-text">{p.highlight}</span>}
                        </div>
                        <p className="mt-1 text-sm text-fg-subtle">{p.description}</p>
                        <p className="mt-6 flex items-baseline gap-1.5">
                            <span className="text-[36px] font-bold tracking-tight text-fg tabular">{formatBRL(p.price)}</span>
                            <span className="text-sm text-fg-subtle">{p.period}</span>
                        </p>
                        <p className="mt-1 min-h-4 text-xs font-medium text-success">
                            {p.id === "anual" && `Equivale a ${formatBRL(p.price / 12)}/mês`}
                            {p.id === "vitalicio" && "Sem mensalidade"}
                        </p>
                        <a href={`#/cadastro?plano=${p.id}`} className={`mt-6 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${featured ? "bg-primary text-white shadow-[var(--ui-shadow-md)] hover:bg-primary-hover" : "border border-line bg-surface text-fg hover:bg-hover"}`}>
                            Assinar plano {p.name.toLowerCase()}
                        </a>
                        {!compact && (
                            <ul className="mt-7 flex-1 space-y-3 border-t border-line pt-6 text-sm">
                                {PLAN_FEATURES.map(f => <li key={f} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-success" /><span>{f}</span></li>)}
                            </ul>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
