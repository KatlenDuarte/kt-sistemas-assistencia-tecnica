// src/screens/app/AppShell.tsx — layout do sistema (menu lateral, barra inferior no celular)

import { useState } from "react";
import {
    LayoutDashboard, Package, ShoppingCart, BookOpenText, Receipt, Wrench, BarChart3, Store as StoreIcon,
    Plus, LogOut, Sun, Moon, Grid2x2, X, ShieldCheck, Sparkles, type LucideIcon,
} from "lucide-react";
import { useSession } from "../../contexts/SessionContext";
import { useTheme } from "../../contexts/ThemeContext";
import { StoreDataProvider } from "../../contexts/StoreDataContext";
import ErrorBoundary from "../../components/ErrorBoundary";
import { initials } from "../../lib/format";
import { COMPANY } from "../../config/brand";
import NewSaleModal from "./NewSaleModal";
import DashboardPage from "./DashboardPage";
import SalesPage from "./SalesPage";
import FiadoPage from "./FiadoPage";
import CashPage from "./CashPage";
import ServiceOrdersPage from "./ServiceOrdersPage";
import ProductsPage from "./ProductsPage";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";
import AdminPage from "../admin/AdminPage";

interface NavItem { id: string; name: string; short?: string; icon: LucideIcon }

const SECTIONS: { title: string; items: NavItem[] }[] = [
    { title: "Operação", items: [
        { id: "sales", name: "Vendas", icon: ShoppingCart },
        { id: "fiado", name: "Fiado", icon: BookOpenText },
        { id: "cash", name: "Caixa", icon: Receipt },
        { id: "orders", name: "Ordens de serviço", short: "O.S.", icon: Wrench },
    ] },
    { title: "Gestão", items: [
        { id: "dashboard", name: "Visão geral", short: "Início", icon: LayoutDashboard },
        { id: "products", name: "Produtos", icon: Package },
        { id: "reports", name: "Relatórios", icon: BarChart3 },
    ] },
    { title: "Conta", items: [
        { id: "settings", name: "Minha loja", short: "Loja", icon: StoreIcon },
    ] },
];

const MOBILE_TABS = ["sales", "fiado", "cash"];

export function StoreMark({ size = "md" }: { size?: "sm" | "md" }) {
    const { store } = useSession();
    const box = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
    if (store?.logo_url) return <img src={store.logo_url} alt={store.name} className={`${box} shrink-0 rounded-xl bg-white object-contain p-1`} />;
    return <span className={`${box} flex shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-white`}>{initials(store?.name)}</span>;
}

export default function AppShell({ onShowPlans }: { onShowPlans: () => void }) {
    const { store, profile, user, isDemo, signOut } = useSession();
    const { theme, toggleTheme } = useTheme();
    const [page, setPage] = useState("dashboard");
    const [saleOpen, setSaleOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);

    const sections = profile?.is_super_admin
        ? [...SECTIONS, { title: "KT Sistemas", items: [{ id: "admin", name: "Clientes e planos", short: "Admin", icon: ShieldCheck }] }]
        : SECTIONS;
    const all = sections.flatMap(s => s.items);
    const userName = isDemo ? "Visitante" : profile?.full_name || user?.email?.split("@")[0] || "Usuário";

    const go = (id: string) => { setPage(id); setMoreOpen(false); window.scrollTo({ top: 0 }); };

    const render = () => {
        switch (page) {
            case "sales": return <SalesPage onNewSale={() => setSaleOpen(true)} />;
            case "fiado": return <FiadoPage />;
            case "cash": return <CashPage />;
            case "orders": return <ServiceOrdersPage />;
            case "products": return <ProductsPage />;
            case "reports": return <ReportsPage />;
            case "settings": return <SettingsPage />;
            case "admin": return <AdminPage />;
            default: return <DashboardPage go={go} />;
        }
    };

    const ThemeIcon = theme === "dark" ? Sun : Moon;

    return (
        <StoreDataProvider>
            <div className="relative flex min-h-screen w-full bg-bg font-sans text-fg-muted">
                {/* Menu lateral */}
                <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-nav text-white lg:flex">
                    <div className="flex h-[76px] shrink-0 items-center gap-3 px-5">
                        <StoreMark />
                        <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold">{store?.name}</p>
                            <p className="text-[11px] text-white/45">por {COMPANY.name}</p>
                        </div>
                    </div>
                    <div className="px-4 pb-4">
                        <button onClick={() => setSaleOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-primary-hover">
                            <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} /> Nova operação
                        </button>
                    </div>
                    <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
                        {sections.map(sec => (
                            <div key={sec.title}>
                                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">{sec.title}</p>
                                <div className="space-y-1">
                                    {sec.items.map(item => {
                                        const Icon = item.icon;
                                        const active = page === item.id;
                                        return (
                                            <button key={item.id} onClick={() => go(item.id)} aria-current={active ? "page" : undefined}
                                                className={`relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? "bg-white/[0.09] font-medium text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.05)]" : "text-white/60 hover:bg-white/[0.05] hover:text-white"}`}>
                                                                                                <Icon className={`h-[18px] w-[18px] ${active ? "text-white" : "text-white/45"}`} />
                                                {item.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                    <div className="shrink-0 border-t border-white/[0.08] p-3">
                        <div className="flex items-center gap-2 rounded-xl p-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase">{userName.charAt(0)}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium capitalize">{userName}</p>
                                <p className="truncate text-xs text-white/50">{isDemo ? "Demonstração" : profile?.is_super_admin ? "Administrador KT" : "Dono da loja"}</p>
                            </div>
                            <button onClick={toggleTheme} aria-label="Alternar tema" className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><ThemeIcon size={17} /></button>
                            <button onClick={signOut} aria-label="Sair" title="Sair" className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><LogOut size={16} /></button>
                        </div>
                    </div>
                </aside>

                <main className="relative flex min-h-screen w-full min-w-0 flex-1 flex-col lg:pl-[264px]">
                    {/* Barra superior (celular) */}
                    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-nav px-4 pt-[env(safe-area-inset-top)] text-white lg:hidden">
                        <StoreMark size="sm" />
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{store?.name}</p>
                        <button onClick={toggleTheme} aria-label="Alternar tema" className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70"><ThemeIcon size={18} /></button>
                        <button onClick={() => setMoreOpen(true)} aria-label="Menu da conta" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase">{userName.charAt(0)}</button>
                    </header>

                    {isDemo && (
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5 text-center text-xs text-fg-muted sm:justify-between sm:px-6 sm:text-sm lg:px-10">
                            <span className="inline-flex items-center gap-2"><span className="rounded-md border border-warning/25 bg-warning-soft px-1.5 py-0.5 text-[11px] font-semibold text-warning">DEMO</span> Dados fictícios: nada é salvo de verdade.</span>
                            <span className="flex gap-2">
                                <button onClick={onShowPlans} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover"><Sparkles size={13} /> Gostou? Ver planos</button>
                                <button onClick={signOut} className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-medium text-fg-muted hover:bg-hover">Sair</button>
                            </span>
                        </div>
                    )}

                    <div className="w-full max-w-full flex-1 overflow-x-hidden pb-28 lg:pb-0">
                        <ErrorBoundary key={page} onReset={() => go("dashboard")}>{render()}</ErrorBoundary>
                    </div>
                </main>

                {/* Navegação inferior (celular) */}
                <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
                    <div className="grid h-16 grid-cols-5">
                        {all.filter(i => MOBILE_TABS.includes(i.id)).slice(0, 2).map(i => <Tab key={i.id} item={i} active={page === i.id} onClick={() => go(i.id)} />)}
                        <div className="flex items-start justify-center">
                            <button onClick={() => setSaleOpen(true)} aria-label="Nova operação" className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[var(--ui-shadow-md)] ring-4 ring-bg active:scale-95">
                                <Plus className="h-6 w-6" strokeWidth={2.5} />
                            </button>
                        </div>
                        {all.filter(i => MOBILE_TABS.includes(i.id)).slice(2, 3).map(i => <Tab key={i.id} item={i} active={page === i.id} onClick={() => go(i.id)} />)}
                        <Tab item={{ id: "more", name: "Mais", icon: Grid2x2 }} active={!MOBILE_TABS.includes(page) || moreOpen} onClick={() => setMoreOpen(true)} />
                    </div>
                </nav>

                {moreOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
                        <div className="animate-sheet absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
                            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line-strong" />
                            <div className="mb-5 flex items-center gap-3">
                                <StoreMark />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-fg">{store?.name}</p>
                                    <p className="truncate text-sm text-fg-subtle">{isDemo ? "Demonstração" : user?.email}</p>
                                </div>
                                <button onClick={() => setMoreOpen(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-xl text-fg-subtle hover:bg-hover"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {all.map(item => {
                                    const Icon = item.icon;
                                    return (
                                        <button key={item.id} onClick={() => go(item.id)}
                                            className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-xs font-medium ${page === item.id ? "border-primary/40 bg-primary-soft text-primary-text" : "border-line text-fg-muted"}`}>
                                            <Icon size={20} /> {item.short || item.name}
                                        </button>
                                    );
                                })}
                            </div>
                            {isDemo && (
                                <button onClick={() => { setMoreOpen(false); onShowPlans(); }} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-white">
                                    <Sparkles size={16} /> Gostou? Ver planos
                                </button>
                            )}
                            <button onClick={signOut} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line text-sm font-medium text-danger">
                                <LogOut size={16} /> {isDemo ? "Sair da demonstração" : "Sair da conta"}
                            </button>
                        </div>
                    </div>
                )}

                {saleOpen && <NewSaleModal open={saleOpen} onClose={() => setSaleOpen(false)} />}
            </div>
        </StoreDataProvider>
    );
}

function Tab({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
    const Icon = item.icon;
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-primary" : "text-fg-subtle"}`}>
            <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.8} />
            {item.short || item.name}
        </button>
    );
}
