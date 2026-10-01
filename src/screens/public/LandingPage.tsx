// src/screens/public/LandingPage.tsx — site de vendas da KT Sistemas

import { useState } from "react";
import {
    PlayCircle, ShoppingCart, Package, BookOpenText, Wrench, Receipt, BarChart3, Smartphone, Palette,
    ShieldCheck, Check, MessageCircle, Mail, ChevronDown, Menu, X, Sun, Moon, Sparkles,
} from "lucide-react";
import { COMPANY, PLANS, PLAN_FEATURES, whatsappLink, mailtoLink } from "../../config/brand";
import { formatBRL } from "../../lib/format";
import { navigate } from "../../lib/router";
import { useSession } from "../../contexts/SessionContext";
import { useTheme } from "../../contexts/ThemeContext";

export function KtLogo({ light = false, className = "" }: { light?: boolean; className?: string }) {
    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f26419] text-sm font-extrabold tracking-tight text-white shadow-sm">KT</span>
            <span className={`text-lg font-bold tracking-tight ${light ? "text-white" : "text-fg"}`}>KT <span className="font-medium opacity-70">Sistemas</span></span>
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

const FAQ = [
    { q: "Preciso instalar alguma coisa?", a: "Não. O sistema funciona no navegador do computador, tablet ou celular. Basta acessar e entrar com seu e-mail." },
    { q: "Meus dados ficam separados das outras lojas?", a: "Sim. Cada loja tem um banco de dados isolado por regras de segurança no servidor: ninguém além da sua equipe acessa suas vendas e clientes." },
    { q: "Como funciona o pagamento?", a: "Você escolhe o plano e faz o cadastro. Em seguida combinamos o pagamento por PIX pelo WhatsApp e liberamos seu acesso no mesmo dia." },
    { q: "Posso testar antes?", a: "Pode! Clique em “Ver demonstração” e use o sistema completo com dados de exemplo, sem cadastro." },
    { q: "Funciona com impressora de cupom?", a: "Sim. O cupom é impresso pelo próprio navegador em impressoras térmicas de 80 mm ou comuns." },
];

export default function LandingPage() {
    const { enterDemo } = useSession();
    const { theme, toggleTheme } = useTheme();
    const [menu, setMenu] = useState(false);
    const [faq, setFaq] = useState<number | null>(0);

    const demo = () => { enterDemo(); navigate("/"); };
    const scrollTo = (id: string) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

    return (
        <div className="min-h-screen bg-bg font-sans text-fg-muted">
            {/* Topo */}
            <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
                    <KtLogo />
                    <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
                        <button onClick={() => scrollTo("recursos")} className="hover:text-fg">Recursos</button>
                        <button onClick={() => scrollTo("planos")} className="hover:text-fg">Planos</button>
                        <button onClick={() => scrollTo("duvidas")} className="hover:text-fg">Dúvidas</button>
                        <button onClick={() => scrollTo("contato")} className="hover:text-fg">Contato</button>
                    </nav>
                    <span className="flex-1" />
                    <button onClick={toggleTheme} aria-label="Alternar tema" className="flex h-9 w-9 items-center justify-center rounded-xl text-fg-subtle hover:bg-hover">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
                    <a href="#/entrar" className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-fg hover:bg-hover sm:inline-flex">Entrar</a>
                    <button onClick={demo} className="hidden h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm shadow-primary/25 hover:bg-primary-hover sm:inline-flex">
                        <PlayCircle size={16} /> Ver demonstração
                    </button>
                    <button onClick={() => setMenu(!menu)} aria-label="Menu" className="flex h-9 w-9 items-center justify-center rounded-xl text-fg md:hidden">{menu ? <X size={20} /> : <Menu size={20} />}</button>
                </div>
                {menu && (
                    <div className="space-y-1 border-t border-line px-4 py-3 md:hidden">
                        {[["recursos", "Recursos"], ["planos", "Planos"], ["duvidas", "Dúvidas"], ["contato", "Contato"]].map(([id, l]) => (
                            <button key={id} onClick={() => scrollTo(id)} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fg hover:bg-hover">{l}</button>
                        ))}
                        <a href="#/entrar" className="block rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-hover">Entrar</a>
                    </div>
                )}
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
                <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-muted">
                            <Sparkles size={13} className="text-primary" /> Feito para lojas de celular e assistência técnica
                        </span>
                        <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-fg sm:text-5xl">
                            Venda, controle o estoque e o caixa <span className="text-primary">sem planilha</span>.
                        </h1>
                        <p className="mt-5 max-w-xl text-lg text-fg-subtle">
                            O {COMPANY.name} reúne vendas, estoque, fiado, ordens de serviço e fechamento de caixa num só lugar — com a logo da sua loja.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <button onClick={demo} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover">
                                <PlayCircle size={18} /> Testar a demonstração grátis
                            </button>
                            <button onClick={() => scrollTo("planos")} className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold text-fg hover:bg-hover">
                                Ver planos
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-fg-subtle">Sem cadastro para testar · A partir de {formatBRL(PLANS[0].price)}/mês</p>
                    </div>

                    {/* Prévia do produto */}
                    <div className="relative">
                        <div className="rounded-3xl border border-line bg-surface p-3 shadow-2xl">
                            <div className="flex overflow-hidden rounded-2xl border border-line">
                                <div className="hidden w-36 shrink-0 flex-col gap-2 bg-nav p-3 sm:flex">
                                    <div className="mb-2 flex items-center gap-2"><span className="h-6 w-6 rounded-lg bg-primary" /><span className="h-2 w-14 rounded bg-white/30" /></div>
                                    {[1, 0, 0, 0, 0, 0].map((a, i) => <span key={i} className={`h-6 rounded-lg ${a ? "bg-white/15" : ""} flex items-center gap-2 px-2`}><span className="h-2 w-2 rounded bg-white/40" /><span className="h-1.5 w-12 rounded bg-white/25" /></span>)}
                                </div>
                                <div className="flex-1 space-y-3 bg-bg p-4">
                                    <div className="h-3 w-32 rounded bg-fg/80" />
                                    <div className="grid grid-cols-3 gap-2">
                                        {["R$ 1.521", "R$ 190", "R$ 303"].map((v, i) => (
                                            <div key={i} className="rounded-xl border border-line bg-surface p-2.5">
                                                <span className={`block h-1 w-full rounded ${["bg-primary", "bg-info", "bg-danger"][i]}`} />
                                                <span className="mt-2 block text-[11px] text-fg-subtle">{["Faturamento", "Ticket", "Fiado"][i]}</span>
                                                <span className="block text-sm font-bold text-fg">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex h-32 items-end gap-1.5 rounded-xl border border-line bg-surface p-3">
                                        {[40, 22, 55, 30, 80, 62, 35, 48, 70, 52, 90, 66].map((h, i) => <span key={i} className="flex-1 rounded-t bg-primary/85" style={{ height: `${h}%` }} />)}
                                    </div>
                                    <div className="space-y-1.5 rounded-xl border border-line bg-surface p-3">
                                        {["Película 3D iPhone 15", "Carregador turbo 20W", "Capa anti-impacto A54"].map(n => (
                                            <div key={n} className="flex items-center justify-between text-[11px]"><span className="text-fg">{n}</span><span className="rounded-full bg-success-soft px-1.5 text-success">PIX</span></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recursos */}
            <section id="recursos" className="border-t border-line bg-surface py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Recursos</p>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Tudo que a loja precisa no dia a dia</h2>
                        <p className="mt-3 text-fg-subtle">Do balcão ao fechamento do caixa, sem planilhas e sem papel.</p>
                    </div>
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {FEATURES.map(f => (
                            <div key={f.title} className="rounded-2xl border border-line bg-bg p-5">
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-text"><f.icon size={20} /></span>
                                <h3 className="mt-4 font-semibold text-fg">{f.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-fg-subtle">{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Planos */}
            <section id="planos" className="py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Planos</p>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Escolha o plano ideal para sua loja</h2>
                        <p className="mt-3 text-fg-subtle">Todos os planos incluem todos os recursos, atualizações e suporte pelo WhatsApp.</p>
                    </div>
                    <PlanCards />
                </div>
            </section>

            {/* Como funciona */}
            <section className="border-y border-line bg-surface py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <h2 className="text-center text-3xl font-bold tracking-tight text-fg">Como começar</h2>
                    <div className="mt-12 grid gap-6 md:grid-cols-3">
                        {[
                            ["1", "Escolha o plano e cadastre sua loja", "Informe o nome da loja, envie sua logo e crie seu acesso."],
                            ["2", "Combine o pagamento", "Fale com a gente pelo WhatsApp e pague por PIX."],
                            ["3", "Comece a vender", "Liberamos o acesso e o sistema já abre com a cara da sua loja."],
                        ].map(([n, t, d]) => (
                            <div key={n} className="rounded-2xl border border-line bg-bg p-6">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{n}</span>
                                <h3 className="mt-4 font-semibold text-fg">{t}</h3>
                                <p className="mt-1.5 text-sm text-fg-subtle">{d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dúvidas */}
            <section id="duvidas" className="py-20">
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                    <h2 className="text-center text-3xl font-bold tracking-tight text-fg">Perguntas frequentes</h2>
                    <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-surface">
                        {FAQ.map((f, i) => (
                            <div key={f.q}>
                                <button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-fg">
                                    {f.q}<ChevronDown size={18} className={`shrink-0 text-fg-subtle transition-transform ${faq === i ? "rotate-180" : ""}`} />
                                </button>
                                {faq === i && <p className="px-5 pb-5 text-sm leading-relaxed text-fg-subtle">{f.a}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section id="contato" className="px-4 pb-20 sm:px-6">
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-nav px-6 py-14 text-center text-white sm:px-12">
                    <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/30 blur-[90px]" />
                    <h2 className="relative text-3xl font-bold tracking-tight">Ficou com alguma dúvida?</h2>
                    <p className="relative mx-auto mt-3 max-w-xl text-white/70">Fale com a gente. Ajudamos a configurar sua loja e a cadastrar os produtos.</p>
                    <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <a href={whatsappLink("Olá! Vi o KT Sistemas e quero saber mais.")} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-6 font-semibold text-white hover:opacity-90">
                            <MessageCircle size={18} /> WhatsApp {COMPANY.whatsappDisplay}
                        </a>
                        <a href={mailtoLink("Quero conhecer o KT Sistemas", "Olá! Gostaria de mais informações sobre o sistema.")} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-6 font-semibold text-white hover:bg-white/15">
                            <Mail size={18} /> {COMPANY.email}
                        </a>
                    </div>
                </div>
            </section>

            <footer className="border-t border-line py-8">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-fg-subtle sm:flex-row sm:px-6">
                    <KtLogo />
                    <p className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> © {new Date().getFullYear()} {COMPANY.name}. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}

export function PlanCards({ compact = false }: { compact?: boolean }) {
    return (
        <div className={`grid gap-5 ${compact ? "mt-6" : "mt-12"} lg:grid-cols-3`}>
            {PLANS.map(p => {
                const featured = !!p.highlight;
                return (
                    <div key={p.id} className={`relative flex flex-col rounded-3xl border p-6 sm:p-7 ${featured ? "border-primary bg-surface shadow-2xl ring-4 ring-primary/10" : "border-line bg-surface"}`}>
                        {featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">{p.highlight}</span>}
                        <h3 className="text-lg font-semibold text-fg">{p.name}</h3>
                        <p className="mt-1 text-sm text-fg-subtle">{p.description}</p>
                        <p className="mt-5 flex items-baseline gap-1.5">
                            <span className="text-4xl font-extrabold tracking-tight text-fg tabular">{formatBRL(p.price)}</span>
                            <span className="text-sm text-fg-subtle">{p.period}</span>
                        </p>
                        {p.id === "anual" && <p className="mt-1 text-xs font-medium text-success">Equivale a {formatBRL(p.price / 12)}/mês</p>}
                        {!compact && (
                            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                                {PLAN_FEATURES.map(f => <li key={f} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-success" /><span>{f}</span></li>)}
                            </ul>
                        )}
                        <a href={`#/cadastro?plano=${p.id}`} className={`mt-7 inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-semibold ${featured ? "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-hover" : "border border-line text-fg hover:bg-hover"}`}>
                            Assinar plano {p.name.toLowerCase()}
                        </a>
                    </div>
                );
            })}
        </div>
    );
}
