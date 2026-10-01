// src/screens/admin/AdminPage.tsx — painel da KT Sistemas: clientes, planos e liberação

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Store as StoreIcon, Clock, CheckCircle2, Lock, DollarSign, MessageCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { Page, PageHeader, Card, StatCard, Button, Badge, SearchInput, EmptyState, LoadingState, Modal, Field, Segmented } from "../../components/ui";
import { useSession } from "../../contexts/SessionContext";
import { createSupabaseApi } from "../../data/supabaseApi";
import { supabase } from "../../lib/supabase";
import { demoApi } from "../../data/demoApi";
import { useToast } from "../../contexts/ToastContext";
import { formatBRL, formatDate, formatPhone, initials, onlyDigits } from "../../lib/format";
import { PLANS, planById, type PlanId } from "../../config/brand";
import type { Store } from "../../data/types";

type Filter = "all" | "pending" | "active" | "expiring" | "blocked";

const isExpired = (s: Store) => !!s.expires_at && new Date(s.expires_at) <= new Date();
const daysLeft = (s: Store) => (s.expires_at ? Math.ceil((new Date(s.expires_at).getTime() - Date.now()) / 86400000) : null);

function statusOf(s: Store): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
    if (s.status === "pending") return { label: "Aguardando pagamento", tone: "warning" };
    if (s.status === "blocked") return { label: "Bloqueada", tone: "danger" };
    if (isExpired(s)) return { label: "Vencida", tone: "danger" };
    return { label: "Ativa", tone: "success" };
}

export default function AdminPage() {
    const { isDemo } = useSession();
    const { toast, confirm } = useToast();
    const api = useMemo(() => (isDemo || !supabase ? demoApi : createSupabaseApi(supabase, "")), [isDemo]);

    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");
    const [activating, setActivating] = useState<Store | null>(null);
    const [plan, setPlan] = useState<PlanId>("mensal");
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setStores(await api.adminListStores()); }
        catch (e) { toast((e as Error).message, "error"); }
        finally { setLoading(false); }
    }, [api, toast]);

    useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return stores.filter(s => {
            const d = daysLeft(s);
            if (filter === "pending" && s.status !== "pending") return false;
            if (filter === "active" && !(s.status === "active" && !isExpired(s))) return false;
            if (filter === "expiring" && !(s.status === "active" && d != null && d <= 7)) return false;
            if (filter === "blocked" && !(s.status === "blocked" || isExpired(s))) return false;
            return !q || [s.name, s.contact_email, s.contact_phone].some(v => (v || "").toLowerCase().includes(q));
        });
    }, [stores, filter, search]);

    const active = stores.filter(s => s.status === "active" && !isExpired(s));
    const mrr = active.reduce((a, s) => a + (s.plan === "mensal" ? 99.9 : s.plan === "anual" ? 999.9 / 12 : 0), 0);

    const openActivate = (s: Store) => { setActivating(s); setPlan(s.plan); setNotes(s.admin_notes || ""); };

    const activate = async () => {
        if (!activating) return;
        const p = planById(plan)!;
        // Renovação soma ao vencimento atual se ainda estiver válido
        const base = activating.expires_at && !isExpired(activating) ? new Date(activating.expires_at) : new Date();
        const expires = p.durationDays == null ? null : new Date(base.getTime() + p.durationDays * 86400000).toISOString();
        setBusy(true);
        try {
            await api.adminUpdateStore(activating.id, { status: "active", plan, expires_at: expires, admin_notes: notes || null });
            toast(`${activating.name} liberada (${p.name}${expires ? ` até ${formatDate(new Date(expires))}` : ", vitalício"}).`);
            setActivating(null);
            await load();
        } catch (e) { toast((e as Error).message, "error"); }
        finally { setBusy(false); }
    };

    const block = async (s: Store) => {
        if (!(await confirm({ title: `Bloquear ${s.name}?`, message: "A loja perde o acesso até ser liberada novamente. Os dados não são apagados.", confirmLabel: "Bloquear", danger: true }))) return;
        await api.adminUpdateStore(s.id, { status: "blocked" });
        toast("Loja bloqueada.");
        await load();
    };

    const wa = (s: Store) => {
        const d = onlyDigits(s.contact_phone || "");
        return `https://wa.me/${d.length <= 11 ? "55" + d : d}?text=${encodeURIComponent(`Olá! Aqui é da KT Sistemas, sobre a loja ${s.name}.`)}`;
    };

    return (
        <Page>
            <PageHeader title="Clientes e planos" description="Libere o acesso após o pagamento, renove e acompanhe vencimentos."
                meta={<Badge tone="primary"><ShieldCheck size={12} /> Área exclusiva KT Sistemas</Badge>}
                actions={<Button icon={RefreshCw} onClick={load}>Atualizar</Button>} />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Lojas ativas" value={active.length} icon={CheckCircle2} tone="success" onClick={() => setFilter("active")} active={filter === "active"} />
                <StatCard label="Aguardando pagamento" value={stores.filter(s => s.status === "pending").length} icon={Clock} tone="warning" onClick={() => setFilter("pending")} active={filter === "pending"} />
                <StatCard label="Vencem em 7 dias" value={stores.filter(s => s.status === "active" && (daysLeft(s) ?? 99) <= 7 && !isExpired(s)).length} icon={Lock} tone="danger" onClick={() => setFilter("expiring")} active={filter === "expiring"} />
                <StatCard label="Receita mensal recorrente" value={formatBRL(mrr)} icon={DollarSign} tone="primary" hint="Mensal + anual ÷ 12 (sem vitalício)" />
            </div>

            <Card padded={false} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
                    <Segmented value={filter} onChange={setFilter} options={[
                        { value: "all", label: "Todas" }, { value: "pending", label: "Pendentes" }, { value: "active", label: "Ativas" },
                        { value: "expiring", label: "Vencendo" }, { value: "blocked", label: "Bloqueadas/vencidas" },
                    ]} />
                    <SearchInput icon={Search} value={search} onChange={setSearch} placeholder="Loja, e-mail ou telefone" className="w-full lg:w-72" />
                </div>
                {loading ? <LoadingState /> : visible.length === 0 ? <EmptyState icon={StoreIcon} title="Nenhuma loja encontrada" description="Novos cadastros aparecem aqui como “Aguardando pagamento”." /> : (
                    <ul className="divide-y divide-line">
                        {visible.map(s => {
                            const st = statusOf(s);
                            const p = planById(s.plan);
                            const d = daysLeft(s);
                            return (
                                <li key={s.id} className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        {s.logo_url ? <img src={s.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-line bg-white object-contain p-1" />
                                            : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary-text">{initials(s.name)}</span>}
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-2 font-semibold text-fg">{s.name}<Badge tone={st.tone} dot>{st.label}</Badge></p>
                                            <p className="truncate text-xs text-fg-subtle">{s.contact_email}{s.contact_phone ? ` · ${formatPhone(s.contact_phone)}` : ""} · desde {formatDate(new Date(s.created_at))}</p>
                                            {s.admin_notes && <p className="mt-0.5 truncate text-xs text-fg-faint">Obs.: {s.admin_notes}</p>}
                                        </div>
                                    </div>
                                    <div className="text-sm lg:w-48 lg:text-right">
                                        <p className="font-semibold text-fg">{p?.name} · {p && formatBRL(p.price)}</p>
                                        <p className="text-xs text-fg-subtle">{s.status === "pending" ? "aguardando 1º pagamento" : s.expires_at ? `${isExpired(s) ? "venceu" : "vence"} em ${formatDate(new Date(s.expires_at))}${d != null && d > 0 && d <= 30 ? ` (${d}d)` : ""}` : "sem vencimento"}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {s.contact_phone && <a href={wa(s)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-success hover:bg-hover"><MessageCircle size={16} /></a>}
                                        <Button variant="primary" onClick={() => openActivate(s)}>{s.status === "pending" ? "Liberar" : "Renovar"}</Button>
                                        {s.status !== "blocked" && <Button variant="danger" onClick={() => block(s)}>Bloquear</Button>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>

            <Modal open={!!activating} onClose={() => setActivating(null)} title={activating?.status === "pending" ? `Liberar ${activating?.name}` : `Renovar ${activating?.name}`}
                description="Confirme após receber o pagamento."
                footer={<><Button onClick={() => setActivating(null)}>Cancelar</Button><Button variant="primary" loading={busy} onClick={activate}>Confirmar liberação</Button></>}>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        {PLANS.map(p => (
                            <button key={p.id} onClick={() => setPlan(p.id)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${plan === p.id ? "border-primary bg-primary-soft" : "border-line hover:bg-hover"}`}>
                                <span><span className="font-semibold text-fg">{p.name}</span><span className="block text-xs text-fg-subtle">{p.durationDays ? `+${p.durationDays} dias de acesso` : "Sem vencimento"}</span></span>
                                <span className="font-bold text-fg tabular">{formatBRL(p.price)}</span>
                            </button>
                        ))}
                    </div>
                    <Field label="Observação interna" hint="Ex.: pago via PIX em 10/10"><input className="ui-input" value={notes} onChange={e => setNotes(e.target.value)} /></Field>
                </div>
            </Modal>
        </Page>
    );
}
