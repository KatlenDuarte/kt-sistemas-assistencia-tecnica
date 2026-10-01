// src/screens/app/SalesPage.tsx — movimento de vendas

import { useMemo, useState } from "react";
import { Plus, Search, Smartphone, CreditCard, DollarSign, TrendingUp, Eye, EyeOff, Printer, Undo2, Receipt, Wrench, ShoppingBag, PackageX } from "lucide-react";
import { Page, PageHeader, Card, StatCard, Button, IconButton, Badge, Segmented, SearchInput, EmptyState, LoadingState, ListRow } from "../../components/ui";
import { useStoreData } from "../../contexts/StoreDataContext";
import { useSession, useApi } from "../../contexts/SessionContext";
import { useToast } from "../../contexts/ToastContext";
import { formatBRL, formatDate, formatTime } from "../../lib/format";
import { PAYMENT_LABEL, SALE_STATUS, describeItems, isRevenue, paymentBreakdown, printSaleReceipt, startOfDay } from "../../lib/domain";
import type { Sale } from "../../data/types";

type Filter = "today" | "week" | "month" | "custom";
type MethodFilter = "pix" | "cartao" | "dinheiro" | null;

export default function SalesPage({ onNewSale }: { onNewSale: () => void }) {
    const api = useApi();
    const { store } = useSession();
    const { sales, loading, reloadSales, reloadProducts } = useStoreData();
    const { toast, confirm } = useToast();

    const [filter, setFilter] = useState<Filter>("today");
    const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [methodFilter, setMethodFilter] = useState<MethodFilter>(null);
    const [search, setSearch] = useState("");
    const [hide, setHide] = useState(false);

    const money = (v: number) => (hide ? "R$ ••••" : formatBRL(v));

    const inPeriod = useMemo(() => {
        const now = new Date();
        return sales.filter(s => {
            const d = new Date(s.created_at);
            if (filter === "today") return d >= startOfDay(now);
            if (filter === "week") return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
            if (filter === "month") return d >= new Date(now.getFullYear(), now.getMonth(), 1);
            const [y, m, day] = customDate.split("-").map(Number);
            return d >= new Date(y, m - 1, day) && d < new Date(y, m - 1, day + 1);
        });
    }, [sales, filter, customDate]);

    const stats = useMemo(() => {
        const acc = { total: 0, pix: 0, cartao: 0, dinheiro: 0, losses: 0 };
        inPeriod.forEach(s => {
            if (s.kind === "perda") { acc.losses += s.total; return; }
            if (!isRevenue(s)) return;
            const b = paymentBreakdown(s);
            acc.pix += b.pix; acc.cartao += b.cartao; acc.dinheiro += b.dinheiro;
            acc.total += s.total;
        });
        return acc;
    }, [inPeriod]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return inPeriod.filter(s => {
            if (methodFilter && paymentBreakdown(s)[methodFilter] <= 0) return false;
            if (!q) return true;
            return describeItems(s).toLowerCase().includes(q) || (s.customer_name || "").toLowerCase().includes(q);
        });
    }, [inPeriod, methodFilter, search]);

    const grouped = useMemo(() => {
        const map = new Map<string, Sale[]>();
        visible.forEach(s => {
            const key = formatDate(new Date(s.created_at));
            map.set(key, [...(map.get(key) || []), s]);
        });
        return [...map.entries()];
    }, [visible]);

    const periodLabel = filter === "today" ? "hoje" : filter === "week" ? "nos últimos 7 dias" : filter === "month" ? "neste mês" : "na data";
    const pct = (v: number) => (stats.total ? `${Math.round((v / stats.total) * 100)}% do total` : "—");
    const todayKey = formatDate(new Date());

    const refund = async (s: Sale) => {
        const ok = await confirm({
            title: s.status === "fiado_pendente" ? "Cancelar fiado?" : "Estornar venda?",
            message: <>A venda de <b>{formatBRL(s.total)}</b> será marcada como {s.status === "fiado_pendente" ? "cancelada" : "estornada"}{s.kind !== "servico" ? " e os itens voltam para o estoque" : ""}.</>,
            confirmLabel: "Estornar",
            danger: true,
        });
        if (!ok) return;
        try {
            await api.refundSale(s.id);
            await Promise.all([reloadSales(), reloadProducts()]);
            toast("Venda estornada.");
        } catch (e) { toast((e as Error).message, "error"); }
    };

    const kindIcon = (s: Sale) => s.kind === "servico" ? Wrench : s.kind === "perda" ? PackageX : ShoppingBag;
    const kindTone = (s: Sale) => s.kind === "servico" ? "bg-info-soft text-info" : s.kind === "perda" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-text";

    const actions = (s: Sale) => {
        const inactive = s.status === "estornada" || s.status === "cancelada";
        if (inactive) return null;
        return (
            <>
                {s.kind !== "perda" && store && <IconButton icon={Printer} label="Imprimir cupom" onClick={() => printSaleReceipt(store, s)} />}
                <IconButton icon={Undo2} label="Estornar" tone="danger" onClick={() => refund(s)} />
            </>
        );
    };

    return (
        <Page>
            <PageHeader
                title="Vendas"
                description="Acompanhe o caixa do dia, filtre por forma de pagamento e gerencie cada operação."
                actions={<>
                    <Button icon={hide ? EyeOff : Eye} onClick={() => setHide(!hide)}>{hide ? "Mostrar valores" : "Ocultar valores"}</Button>
                    <Button variant="primary" icon={Plus} onClick={onNewSale}>Nova venda</Button>
                </>}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Faturamento" value={money(stats.total)} icon={TrendingUp} tone="primary" active={methodFilter === null} onClick={() => setMethodFilter(null)}
                    hint={stats.losses > 0 ? `${money(stats.losses)} em perdas` : `${inPeriod.length} operações ${periodLabel}`} />
                <StatCard label="PIX" value={money(stats.pix)} icon={Smartphone} tone="success" active={methodFilter === "pix"} onClick={() => setMethodFilter(m => m === "pix" ? null : "pix")} hint={pct(stats.pix)} />
                <StatCard label="Cartão" value={money(stats.cartao)} icon={CreditCard} tone="info" active={methodFilter === "cartao"} onClick={() => setMethodFilter(m => m === "cartao" ? null : "cartao")} hint={pct(stats.cartao)} />
                <StatCard label="Dinheiro" value={money(stats.dinheiro)} icon={DollarSign} tone="warning" active={methodFilter === "dinheiro"} onClick={() => setMethodFilter(m => m === "dinheiro" ? null : "dinheiro")} hint={pct(stats.dinheiro)} />
            </div>

            <Card padded={false} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Segmented value={filter} onChange={setFilter} options={[
                            { value: "today", label: "Hoje" }, { value: "week", label: "7 dias" },
                            { value: "month", label: "Mês" }, { value: "custom", label: "Data" },
                        ]} />
                        {filter === "custom" && <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="ui-input w-[170px]" />}
                    </div>
                    <SearchInput icon={Search} value={search} onChange={setSearch} placeholder="Buscar item ou cliente..." className="w-full lg:w-72" />
                </div>

                {loading ? <LoadingState label="Carregando vendas..." /> : visible.length === 0 ? (
                    <EmptyState icon={Receipt} title="Nenhuma venda encontrada"
                        description={search || methodFilter ? "Ajuste a busca ou os filtros." : `Não há operações registradas ${periodLabel}.`}
                        action={<Button variant="primary" icon={Plus} onClick={onNewSale}>Registrar venda</Button>} />
                ) : (
                    <>
                        {/* Celular */}
                        <div className="md:hidden">
                            {grouped.map(([day, list]) => (
                                <section key={day}>
                                    <div className="flex items-center justify-between bg-subtle px-4 py-2 text-xs border-y border-line">
                                        <span className="font-semibold text-fg">{day === todayKey ? "Hoje" : day}</span>
                                        <span className="text-fg-subtle">{list.length} {list.length === 1 ? "operação" : "operações"}</span>
                                    </div>
                                    <ul className="divide-y divide-line">
                                        {list.map(s => {
                                            const Icon = kindIcon(s);
                                            const inactive = s.status === "estornada" || s.status === "cancelada";
                                            return (
                                                <ListRow key={s.id} className={inactive ? "opacity-60" : ""}
                                                    leading={<span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kindTone(s)}`}><Icon size={18} /></span>}
                                                    title={<span className={`line-clamp-2 ${inactive ? "line-through" : ""}`}>{describeItems(s)}</span>}
                                                    value={<span className={s.kind === "perda" ? "text-danger" : ""}>{s.kind === "perda" ? "− " : ""}{money(s.total)}</span>}
                                                    subtitle={<>{formatTime(new Date(s.created_at))}{s.customer_name ? ` · ${s.customer_name}` : ""}</>}
                                                    meta={<><Badge tone={SALE_STATUS[s.status].tone} dot>{SALE_STATUS[s.status].label}</Badge>{s.kind !== "perda" && <Badge>{PAYMENT_LABEL[s.payment_method]}</Badge>}</>}
                                                    actions={actions(s)}
                                                />
                                            );
                                        })}
                                    </ul>
                                </section>
                            ))}
                        </div>

                        {/* Computador */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="ui-table min-w-[820px]">
                                <thead><tr><th className="w-20">Hora</th><th>Itens</th><th>Pagamento</th><th>Status</th><th className="!text-right">Valor</th><th className="w-24 !text-right">Ações</th></tr></thead>
                                {grouped.map(([day, list]) => {
                                    const dayTotal = list.filter(isRevenue).reduce((a, s) => a + s.total, 0);
                                    return (
                                        <tbody key={day}>
                                            <tr><td colSpan={6} className="!py-2 bg-subtle">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-fg">{day === todayKey ? `Hoje · ${day}` : day}</span>
                                                    <span className="text-fg-subtle">{list.length} operações · <span className="font-medium text-fg tabular">{money(dayTotal)}</span></span>
                                                </div>
                                            </td></tr>
                                            {list.map(s => {
                                                const Icon = kindIcon(s);
                                                const inactive = s.status === "estornada" || s.status === "cancelada";
                                                return (
                                                    <tr key={s.id} className={inactive ? "opacity-60" : ""}>
                                                        <td className="tabular text-fg-subtle">{formatTime(new Date(s.created_at))}</td>
                                                        <td className="max-w-[420px]">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${kindTone(s)}`}><Icon size={14} /></span>
                                                                <p className={`truncate ${inactive ? "line-through" : "text-fg"}`}>{describeItems(s)}</p>
                                                            </div>
                                                            {(s.customer_name || s.kind === "servico") && (
                                                                <p className="mt-0.5 pl-9 text-xs text-fg-subtle">
                                                                    {s.customer_name}{s.kind === "servico" && ` · peça ${formatBRL(s.part_cost)} · lucro ${formatBRL(s.total - s.part_cost)}`}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {s.payment_method === "multiplo"
                                                                ? <div className="flex flex-wrap gap-1">{(["pix", "cartao", "dinheiro"] as const).filter(k => Number(s.payments[k]) > 0).map(k => <Badge key={k}>{PAYMENT_LABEL[k]} {hide ? "" : formatBRL(Number(s.payments[k]))}</Badge>)}</div>
                                                                : s.kind === "perda" ? <span className="text-fg-faint">—</span> : <Badge>{PAYMENT_LABEL[s.payment_method]}</Badge>}
                                                        </td>
                                                        <td><Badge tone={SALE_STATUS[s.status].tone} dot>{SALE_STATUS[s.status].label}</Badge></td>
                                                        <td className={`text-right font-semibold tabular whitespace-nowrap ${s.kind === "perda" ? "text-danger" : inactive ? "line-through" : "text-fg"}`}>{s.kind === "perda" ? "− " : ""}{money(s.total)}</td>
                                                        <td><div className="flex justify-end gap-0.5">{actions(s)}</div></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    );
                                })}
                            </table>
                        </div>
                    </>
                )}
            </Card>
        </Page>
    );
}
