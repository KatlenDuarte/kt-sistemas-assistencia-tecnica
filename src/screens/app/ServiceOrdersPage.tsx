// src/screens/app/ServiceOrdersPage.tsx — ordens de serviço (assistência técnica)

import { useMemo, useState } from "react";
import { Plus, Search, Wrench, CheckCircle2, AlertCircle, DollarSign, Clock, ChevronsRight, Printer, Edit2, Trash2, MessageCircle, Wallet, QrCode, CreditCard, Banknote } from "lucide-react";
import { Page, PageHeader, Card, StatCard, Button, IconButton, Badge, Segmented, SearchInput, EmptyState, LoadingState, ListRow, Modal, Field, MoneyInput } from "../../components/ui";
import { useApi, useSession } from "../../contexts/SessionContext";
import { useStoreData } from "../../contexts/StoreDataContext";
import { useToast } from "../../contexts/ToastContext";
import { formatBRL, formatDate, formatPhone, initials, onlyDigits, parseMoney } from "../../lib/format";
import { SERVICE_FLOW, SERVICE_STATUS, printReceipt } from "../../lib/domain";
import DateRangeFilter from "../../components/DateRangeFilter";
import { inDateRange, describeRange, toInputDate, type DateRange } from "../../lib/dateRange";
import type { ServiceOrder, ServiceStatus } from "../../data/types";

const EMPTY = { customer_name: "", customer_phone: "", device: "", brand: "", model: "", issue: "", notes: "", value: "", part_cost: "" };

export default function ServiceOrdersPage() {
    const api = useApi();
    const { store } = useSession();
    const { orders, loading, reloadOrders, reloadSales } = useStoreData();
    const { toast, confirm } = useToast();

    const [status, setStatus] = useState<ServiceStatus | "abertas" | "todas">("abertas");
    const [search, setSearch] = useState("");
    const [byDate, setByDate] = useState<"all" | "range">("all");
    const [range, setRange] = useState<DateRange>(() => {
        const now = new Date();
        return { from: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toInputDate(now) };
    });
    const [editing, setEditing] = useState<ServiceOrder | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [receiving, setReceiving] = useState<ServiceOrder | null>(null);
    const [method, setMethod] = useState<"pix" | "cartao" | "dinheiro">("pix");

    const open = orders.filter(o => o.status !== "entregue" && o.status !== "cancelado");
    // Filtro pela data de entrada do aparelho (abertura da O.S.)
    const dated = useMemo(
        () => byDate === "all" ? orders : orders.filter(o => inDateRange(new Date(o.created_at), range)),
        [orders, byDate, range]);
    const datedOpen = dated.filter(o => o.status !== "entregue" && o.status !== "cancelado");

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return dated.filter(o => {
            if (status === "abertas" && (o.status === "entregue" || o.status === "cancelado")) return false;
            if (status !== "abertas" && status !== "todas" && o.status !== status) return false;
            if (!q) return true;
            return [o.customer_name, o.device, o.model, o.issue, String(o.number)].some(v => (v || "").toLowerCase().includes(q));
        });
    }, [dated, status, search]);

    const counts = dated.reduce<Record<string, number>>((a, o) => { a[o.status] = (a[o.status] || 0) + 1; return a; }, {});
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthRevenue = orders.filter(o => o.paid && new Date(o.created_at) >= monthStart).reduce((a, o) => a + o.value, 0);

    const startNew = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
    const startEdit = (o: ServiceOrder) => {
        setEditing(o);
        setForm({
            customer_name: o.customer_name, customer_phone: o.customer_phone || "", device: o.device, brand: o.brand || "", model: o.model || "",
            issue: o.issue || "", notes: o.notes || "", value: o.value ? String(o.value).replace(".", ",") : "", part_cost: o.part_cost ? String(o.part_cost).replace(".", ",") : "",
        });
        setFormOpen(true);
    };

    const save = async (print = false) => {
        if (!form.customer_name.trim() || !form.device.trim()) { toast("Informe cliente e aparelho.", "error"); return; }
        setSaving(true);
        try {
            const saved = await api.saveServiceOrder({
                id: editing?.id,
                customer_name: form.customer_name.trim(), customer_phone: form.customer_phone.trim() || null,
                device: form.device.trim(), brand: form.brand.trim() || null, model: form.model.trim() || null,
                issue: form.issue.trim() || null, notes: form.notes.trim() || null,
                value: parseMoney(form.value), part_cost: parseMoney(form.part_cost),
            });
            await reloadOrders();
            setFormOpen(false);
            toast(editing ? "Ordem de serviço atualizada." : `O.S. nº ${saved.number} aberta.`);
            if (print) printOrder(saved);
        } catch (e) { toast((e as Error).message, "error"); }
        finally { setSaving(false); }
    };

    const advance = async (o: ServiceOrder) => {
        const next = SERVICE_FLOW[SERVICE_FLOW.indexOf(o.status) + 1];
        if (!next) return;
        await api.saveServiceOrder({ id: o.id, customer_name: o.customer_name, device: o.device, status: next, delivered_at: next === "entregue" ? new Date().toISOString() : o.delivered_at });
        await reloadOrders();
        toast(`O.S. nº ${o.number}: ${SERVICE_STATUS[next].label}.`);
    };

    const remove = async (o: ServiceOrder) => {
        if (!(await confirm({ title: `Excluir O.S. nº ${o.number}?`, message: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
        await api.deleteServiceOrder(o.id);
        await reloadOrders();
        toast("Ordem de serviço excluída.");
    };

    const receive = async () => {
        if (!receiving) return;
        setSaving(true);
        try {
            await api.registerSale({
                kind: "servico", items: [{ product_id: null, name: `O.S. ${receiving.number} · ${receiving.device}${receiving.issue ? ` – ${receiving.issue}` : ""}`, price: receiving.value, qty: 1 }],
                subtotal: receiving.value, discount: 0, total: receiving.value, payment_method: method, payments: { [method]: receiving.value },
                status: "concluida", customer_name: receiving.customer_name, customer_phone: receiving.customer_phone, note: null, part_cost: receiving.part_cost,
            });
            await api.saveServiceOrder({ id: receiving.id, customer_name: receiving.customer_name, device: receiving.device, paid: true });
            await Promise.all([reloadOrders(), reloadSales()]);
            toast("Pagamento registrado nas vendas.");
            setReceiving(null);
        } catch (e) { toast((e as Error).message, "error"); }
        finally { setSaving(false); }
    };

    const printOrder = (o: ServiceOrder) => {
        if (!store) return;
        printReceipt(store, {
            title: `Ordem de serviço nº ${o.number}`,
            lines: [
                { name: `Aparelho: ${o.device}${o.model ? ` ${o.model}` : ""}`, value: o.value },
                ...(o.issue ? [{ name: `Defeito: ${o.issue}`, value: 0 }] : []),
            ],
            total: o.value,
            payment: o.paid ? "Pago" : "A pagar na retirada",
            customer: o.customer_name,
            phone: o.customer_phone,
            date: formatDate(new Date(o.created_at)),
            footer: "Guarde este comprovante para retirar o aparelho.",
        });
    };

    const notify = (o: ServiceOrder) => {
        const phone = onlyDigits(o.customer_phone || "");
        const msg = o.status === "pronto"
            ? `Olá ${o.customer_name}! Seu ${o.device} está pronto para retirada na ${store?.name}. Valor: ${formatBRL(o.value)}.`
            : `Olá ${o.customer_name}! Atualização da O.S. nº ${o.number} (${o.device}): ${SERVICE_STATUS[o.status].label}.`;
        return `https://wa.me/${phone.length <= 11 ? "55" + phone : phone}?text=${encodeURIComponent(msg)}`;
    };

    const rowActions = (o: ServiceOrder) => (
        <>
            {SERVICE_FLOW.indexOf(o.status) >= 0 && o.status !== "entregue" && <IconButton icon={ChevronsRight} label={`Avançar para ${SERVICE_STATUS[SERVICE_FLOW[SERVICE_FLOW.indexOf(o.status) + 1]].label}`} tone="primary" onClick={() => advance(o)} />}
            {!o.paid && o.value > 0 && o.status !== "cancelado" && <IconButton icon={Wallet} label="Receber pagamento" tone="success" onClick={() => { setMethod("pix"); setReceiving(o); }} />}
            {o.customer_phone && <a href={notify(o)} target="_blank" rel="noreferrer" title="Avisar no WhatsApp" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-fg-subtle hover:bg-success-soft hover:text-success"><MessageCircle size={16} /></a>}
            <IconButton icon={Printer} label="Imprimir" onClick={() => printOrder(o)} />
            <IconButton icon={Edit2} label="Editar" onClick={() => startEdit(o)} />
            <IconButton icon={Trash2} label="Excluir" tone="danger" onClick={() => remove(o)} />
        </>
    );

    const chip = (id: typeof status, label: string, count?: number) => (
        <button key={id} onClick={() => setStatus(id)}
            className={`h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${status === id ? "border-fg bg-fg text-bg" : "border-line text-fg-muted hover:bg-hover"}`}>
            {label}{count ? <span className="ml-1.5 opacity-60">{count}</span> : null}
        </button>
    );

    return (
        <Page>
            <PageHeader title="Ordens de serviço" description="Assistência técnica: acompanhe reparos, avise o cliente e receba na entrega."
                actions={<Button variant="primary" icon={Plus} onClick={startNew}>Nova O.S.</Button>} />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Em aberto" value={open.length} icon={Wrench} tone="primary" hint="Aguardando, peça pedida ou em reparo" />
                <StatCard label="Prontas p/ retirada" value={counts.pronto || 0} icon={CheckCircle2} tone="success" hint="Avise o cliente" />
                <StatCard label="A receber" value={formatBRL(orders.filter(o => !o.paid && o.status !== "cancelado").reduce((a, o) => a + o.value, 0))} icon={AlertCircle} tone="danger" />
                <StatCard label="Recebido no mês" value={formatBRL(monthRevenue)} icon={DollarSign} tone="info" />
            </div>

            <Card padded={false} className="overflow-hidden">
                <div className="space-y-3 border-b border-line p-4">
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
                        {chip("abertas", "Em aberto", datedOpen.length)}
                        {(Object.keys(SERVICE_STATUS) as ServiceStatus[]).map(s => chip(s, SERVICE_STATUS[s].label, counts[s]))}
                        {chip("todas", "Todas", dated.length)}
                    </div>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <Segmented value={byDate} onChange={setByDate} options={[{ value: "all", label: "Qualquer data" }, { value: "range", label: "Período" }]} />
                            {byDate === "range" && (
                                <div className="basis-full pt-1">
                                    <DateRangeFilter value={range} onChange={setRange} />
                                    <p className="mt-2 text-xs text-fg-subtle">{dated.length} {dated.length === 1 ? "O.S. registrada" : "O.S. registradas"} {describeRange(range)}</p>
                                </div>
                            )}
                        </div>
                        <SearchInput icon={Search} value={search} onChange={setSearch} placeholder="Cliente, aparelho, defeito ou nº da O.S." className="w-full lg:w-96" />
                    </div>
                </div>

                {loading ? <LoadingState /> : visible.length === 0 ? (
                    <EmptyState icon={Wrench} title="Nenhuma ordem de serviço" description={orders.length ? "Nenhuma O.S. encontrada com esses filtros." : "Abra uma O.S. quando receber um aparelho para reparo."}
                        action={<Button variant="primary" icon={Plus} onClick={startNew}>Nova O.S.</Button>} />
                ) : (
                    <>
                        <ul className="2xl:hidden divide-y divide-line">
                            {visible.map(o => (
                                <ListRow key={o.id}
                                    leading={<span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle border border-line text-xs font-semibold text-fg-muted">{initials(o.customer_name)}</span>}
                                    title={<>{o.customer_name} <span className="font-normal text-fg-subtle">· {o.device}</span></>}
                                    value={formatBRL(o.value)}
                                    subtitle={<span className="line-clamp-2">nº {o.number} · {o.issue || "Sem descrição"}</span>}
                                    meta={<><Badge tone={SERVICE_STATUS[o.status].tone}>{SERVICE_STATUS[o.status].label}</Badge>{o.paid ? <Badge tone="success" dot>Pago</Badge> : <Badge tone="danger" dot>A receber</Badge>}</>}
                                    actions={rowActions(o)}
                                />
                            ))}
                        </ul>
                        <div className="hidden 2xl:block overflow-x-auto">
                            <table className="ui-table min-w-[1000px]">
                                <thead><tr><th>Nº</th><th>Cliente</th><th>Aparelho</th><th>Defeito</th><th>Status</th><th className="!text-right">Valor</th><th>Pagamento</th><th className="!text-right">Ações</th></tr></thead>
                                <tbody>
                                    {visible.map(o => (
                                        <tr key={o.id}>
                                            <td className="tabular text-fg-subtle">{o.number}</td>
                                            <td><p className="font-medium text-fg">{o.customer_name}</p>{o.customer_phone && <p className="text-xs text-fg-subtle">{formatPhone(o.customer_phone)}</p>}</td>
                                            <td><p className="text-fg">{o.device}</p><p className="text-xs text-fg-subtle">{[o.brand, o.model].filter(Boolean).join(" · ")}</p></td>
                                            <td className="max-w-[220px]"><p className="truncate" title={o.issue || ""}>{o.issue || "—"}</p><p className="text-xs text-fg-subtle">{formatDate(new Date(o.created_at))}</p></td>
                                            <td><Badge tone={SERVICE_STATUS[o.status].tone}>{SERVICE_STATUS[o.status].label}</Badge></td>
                                            <td className="text-right font-semibold text-fg tabular">{formatBRL(o.value)}</td>
                                            <td>{o.paid ? <Badge tone="success" dot>Pago</Badge> : <Badge tone="danger" dot>A receber</Badge>}</td>
                                            <td><div className="flex justify-end gap-0.5">{rowActions(o)}</div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            <Modal open={formOpen} onClose={() => setFormOpen(false)} size="lg" title={editing ? `Editar O.S. nº ${editing.number}` : "Nova ordem de serviço"}
                footer={<>
                    <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
                    {!editing && <Button icon={Printer} loading={saving} onClick={() => save(true)}>Salvar e imprimir</Button>}
                    <Button variant="primary" loading={saving} onClick={() => save(false)}>Salvar</Button>
                </>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Cliente *"><input className="ui-input" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} autoFocus /></Field>
                    <Field label="WhatsApp"><input className="ui-input" inputMode="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="(31) 9..." /></Field>
                    <Field label="Aparelho *"><input className="ui-input" value={form.device} onChange={e => setForm({ ...form, device: e.target.value })} placeholder="Ex.: iPhone 11" /></Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Marca"><input className="ui-input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></Field>
                        <Field label="Modelo"><input className="ui-input" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></Field>
                    </div>
                    <Field label="Defeito relatado" className="sm:col-span-2"><textarea className="ui-input" rows={2} value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} /></Field>
                    <Field label="Valor do serviço"><MoneyInput value={form.value} onChange={v => setForm({ ...form, value: v })} /></Field>
                    <Field label="Custo da peça" hint={parseMoney(form.value) > 0 ? `Lucro: ${formatBRL(parseMoney(form.value) - parseMoney(form.part_cost))}` : undefined}><MoneyInput value={form.part_cost} onChange={v => setForm({ ...form, part_cost: v })} /></Field>
                    <Field label="Observações internas" className="sm:col-span-2"><textarea className="ui-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Senha do aparelho, acessórios deixados, etc." /></Field>
                    {editing && (
                        <Field label="Status" className="sm:col-span-2">
                            <select className="ui-input" value={editing.status} onChange={async e => {
                                const s = e.target.value as ServiceStatus;
                                await api.saveServiceOrder({ id: editing.id, customer_name: editing.customer_name, device: editing.device, status: s });
                                setEditing({ ...editing, status: s }); await reloadOrders();
                            }}>
                                {(Object.keys(SERVICE_STATUS) as ServiceStatus[]).map(s => <option key={s} value={s}>{SERVICE_STATUS[s].label}</option>)}
                            </select>
                        </Field>
                    )}
                </div>
            </Modal>

            <Modal open={!!receiving} onClose={() => setReceiving(null)} size="sm" title="Receber pagamento"
                description={receiving ? `O.S. nº ${receiving.number} · ${formatBRL(receiving.value)}` : undefined}
                footer={<><Button onClick={() => setReceiving(null)}>Cancelar</Button><Button variant="primary" loading={saving} onClick={receive}>Confirmar</Button></>}>
                <div className="grid grid-cols-3 gap-2">
                    {([["pix", "PIX", QrCode], ["cartao", "Cartão", CreditCard], ["dinheiro", "Dinheiro", Banknote]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setMethod(id)} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium ${method === id ? "border-primary bg-primary-soft text-primary-text" : "border-line text-fg-muted hover:bg-hover"}`}>
                            <Icon size={18} /> {label}
                        </button>
                    ))}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle"><Clock size={12} /> O valor entra nas vendas do dia como serviço.</p>
            </Modal>
        </Page>
    );
}
