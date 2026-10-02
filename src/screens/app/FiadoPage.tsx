// src/screens/app/FiadoPage.tsx — vendas a prazo

import { useMemo, useState } from "react";
import { Search, Wallet, Users, CheckCircle2, Clock, MessageCircle, Check, X, BookOpenText, Phone, QrCode, CreditCard, Banknote } from "lucide-react";
import { Page, PageHeader, Card, StatCard, Button, IconButton, Badge, Segmented, SearchInput, EmptyState, LoadingState, Modal } from "../../components/ui";
import { useStoreData } from "../../contexts/StoreDataContext";
import { useApi, useSession } from "../../contexts/SessionContext";
import { useToast } from "../../contexts/ToastContext";
import { formatBRL, formatDate, formatPhone, initials, onlyDigits } from "../../lib/format";
import type { Sale } from "../../data/types";

type Tab = "pendentes" | "historico";

export default function FiadoPage() {
    const api = useApi();
    const { store } = useSession();
    const { sales, loading, reloadSales, reloadProducts } = useStoreData();
    const { toast, confirm } = useToast();

    const [tab, setTab] = useState<Tab>("pendentes");
    const [search, setSearch] = useState("");
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [paying, setPaying] = useState<Sale | null>(null);
    const [payMethod, setPayMethod] = useState<"pix" | "cartao" | "dinheiro">("pix");
    const [busy, setBusy] = useState(false);

    const pending = useMemo(() => sales.filter(s => s.status === "fiado_pendente"), [sales]);
    const history = useMemo(() => sales.filter(s => s.status === "fiado_quitado"), [sales]);

    const list = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (tab === "pendentes" ? pending : history).filter(s =>
            !q || (s.customer_name || "").toLowerCase().includes(q) || (s.customer_phone || "").includes(q));
    }, [tab, pending, history, search]);

    const totalPending = pending.reduce((a, s) => a + s.total, 0);
    const [now] = useState(() => Date.now());
    const days = (s: Sale) => Math.floor((now - new Date(s.created_at).getTime()) / 86400000);
    const oldest = pending.reduce((m, s) => Math.max(m, days(s)), 0);

    const saveNote = async (s: Sale) => {
        try {
            await api.updateSale(s.id, { note: notes[s.id] ?? "" });
            await reloadSales();
            setNotes(n => { const c = { ...n }; delete c[s.id]; return c; });
            toast("Observação salva.");
        } catch (e) { toast((e as Error).message, "error"); }
    };

    const markPaid = async () => {
        if (!paying) return;
        setBusy(true);
        try {
            await api.updateSale(paying.id, { status: "fiado_quitado", paid_at: new Date().toISOString(), paid_method: payMethod });
            await reloadSales();
            toast(`Fiado de ${paying.customer_name} quitado.`);
            setPaying(null);
        } catch (e) { toast((e as Error).message, "error"); }
        finally { setBusy(false); }
    };

    const cancel = async (s: Sale) => {
        const ok = await confirm({ title: "Cancelar fiado?", message: "A venda será cancelada e os itens voltam para o estoque.", confirmLabel: "Cancelar fiado", danger: true });
        if (!ok) return;
        try {
            await api.refundSale(s.id);
            await Promise.all([reloadSales(), reloadProducts()]);
            toast("Fiado cancelado.");
        } catch (e) { toast((e as Error).message, "error"); }
    };

    const whatsapp = (s: Sale) => {
        const phone = onlyDigits(s.customer_phone || "");
        const msg = `Olá ${s.customer_name}, tudo bem? Aqui é da ${store?.name}. Passando para lembrar do valor de ${formatBRL(s.total)} em aberto desde ${formatDate(new Date(s.created_at))}. Qualquer dúvida estou à disposição!`;
        return `https://wa.me/${phone.length <= 11 ? "55" + phone : phone}?text=${encodeURIComponent(msg)}`;
    };

    return (
        <Page>
            <PageHeader title="Fiado" description="Vendas a prazo: cobre, registre pagamentos e acompanhe o histórico." />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Total a receber" value={formatBRL(totalPending)} icon={Wallet} tone="danger" hint="Soma dos fiados em aberto" />
                <StatCard label="Em aberto" value={pending.length} icon={Users} tone="warning" hint={pending.length ? `Mais antigo há ${oldest} dias` : "Ninguém devendo"} />
                <StatCard label="Quitados" value={history.length} icon={CheckCircle2} tone="success" hint="Nos últimos 120 dias" />
                <StatCard label="Atrasados (+30 dias)" value={pending.filter(s => days(s) > 30).length} icon={Clock} tone="info" hint="Priorize a cobrança" />
            </div>

            <Card padded={false} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
                    <Segmented value={tab} onChange={setTab} options={[
                        { value: "pendentes", label: `Pendentes${pending.length ? ` · ${pending.length}` : ""}` },
                        { value: "historico", label: "Histórico" },
                    ]} />
                    <SearchInput icon={Search} value={search} onChange={setSearch} placeholder="Buscar cliente ou telefone..." className="w-full md:w-72" />
                </div>

                {loading ? <LoadingState /> : list.length === 0 ? (
                    <EmptyState icon={tab === "pendentes" ? CheckCircle2 : BookOpenText}
                        title={tab === "pendentes" ? "Nenhum fiado pendente" : "Nenhum fiado quitado"}
                        description={tab === "pendentes" ? "Todos os clientes estão em dia." : "Fiados quitados aparecem aqui."} />
                ) : (
                    <ul className="divide-y divide-line">
                        {list.map(s => {
                            const d = days(s);
                            const note = notes[s.id] ?? s.note ?? "";
                            const changed = notes[s.id] !== undefined && notes[s.id] !== (s.note ?? "");
                            return (
                                <li key={s.id} className="p-4 sm:p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                                        <div className="flex min-w-0 flex-1 gap-3">
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-subtle text-sm font-semibold text-fg-muted">{initials(s.customer_name)}</span>
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-[15px] font-semibold text-fg">{s.customer_name || "Cliente"}</h3>
                                                    {tab === "pendentes"
                                                        ? <Badge tone={d > 30 ? "danger" : d > 7 ? "warning" : "neutral"} dot>{d === 0 ? "Hoje" : `${d} ${d === 1 ? "dia" : "dias"} em aberto`}</Badge>
                                                        : <Badge tone="success" dot>Quitado em {s.paid_at ? formatDate(new Date(s.paid_at)) : "—"}</Badge>}
                                                </div>
                                                <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-subtle">
                                                    <span>Compra em {formatDate(new Date(s.created_at))}</span>
                                                    {s.customer_phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {formatPhone(s.customer_phone)}</span>}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {s.items.map((i, k) => <Badge key={k}><span className="text-fg-subtle">{i.qty}×</span> {i.name}</Badge>)}
                                                </div>
                                                {tab === "pendentes" && (
                                                    <div className="flex gap-2">
                                                        <input className="ui-input" placeholder="Observação (ex.: paga dia 10)" value={note} onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))} />
                                                        {changed && <Button onClick={() => saveNote(s)}>Salvar</Button>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 lg:w-auto lg:flex-col lg:items-end">
                                            <p className="text-xl font-bold text-fg tabular">{formatBRL(s.total)}</p>
                                            {tab === "pendentes" && (
                                                <div className="flex items-center gap-1.5">
                                                    {s.customer_phone && (
                                                        <a href={whatsapp(s)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-fg hover:bg-hover">
                                                            <MessageCircle size={16} className="text-success" /> Cobrar
                                                        </a>
                                                    )}
                                                    <Button variant="primary" icon={Check} onClick={() => { setPayMethod("pix"); setPaying(s); }}>Quitar</Button>
                                                    <IconButton icon={X} label="Cancelar fiado" tone="danger" onClick={() => cancel(s)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>

            <Modal open={!!paying} onClose={() => setPaying(null)} size="sm" title="Quitar fiado"
                description={paying ? `${paying.customer_name} · ${formatBRL(paying.total)}` : undefined}
                footer={<><Button onClick={() => setPaying(null)}>Cancelar</Button><Button variant="primary" loading={busy} onClick={markPaid}>Confirmar pagamento</Button></>}>
                <p className="ui-label">Como o cliente pagou?</p>
                <div className="grid grid-cols-3 gap-2">
                    {([["pix", "PIX", QrCode], ["cartao", "Cartão", CreditCard], ["dinheiro", "Dinheiro", Banknote]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setPayMethod(id)}
                            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium ${payMethod === id ? "border-primary bg-primary-soft text-primary-text" : "border-line text-fg-muted hover:bg-hover"}`}>
                            <Icon size={18} /> {label}
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-xs text-fg-subtle">O fiado passa a constar como recebido na forma escolhida.</p>
            </Modal>
        </Page>
    );
}
