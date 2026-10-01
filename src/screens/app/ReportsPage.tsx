// src/screens/app/ReportsPage.tsx — relatórios por período

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, DollarSign, ShoppingCart, TrendingUp, Percent, Search, Calendar } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Page, PageHeader, Card, StatCard, Button, Badge, SearchInput, EmptyState, LoadingState, ListRow, Segmented } from "../../components/ui";
import { useApi, useSession } from "../../contexts/SessionContext";
import { useStoreData } from "../../contexts/StoreDataContext";
import { formatBRL, formatDate, formatTime } from "../../lib/format";
import { PAYMENT_LABEL, SALE_STATUS, describeItems, isRevenue, paymentBreakdown } from "../../lib/domain";
import type { Sale } from "../../data/types";

type Preset = "month" | "last_month" | "30d" | "year" | "custom";

const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presetRange(p: Preset): [string, string] {
    const now = new Date();
    if (p === "month") return [toInput(new Date(now.getFullYear(), now.getMonth(), 1)), toInput(now)];
    if (p === "last_month") return [toInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)), toInput(new Date(now.getFullYear(), now.getMonth(), 0))];
    if (p === "30d") return [toInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), toInput(now)];
    return [toInput(new Date(now.getFullYear(), 0, 1)), toInput(now)];
}

export default function ReportsPage() {
    const api = useApi();
    const { store } = useSession();
    const { products } = useStoreData();
    const [preset, setPreset] = useState<Preset>("month");
    const [[from, to], setRange] = useState<[string, string]>(() => presetRange("month"));
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [method, setMethod] = useState("all");

    const load = useCallback(async () => {
        setLoading(true);
        const [fy, fm, fd] = from.split("-").map(Number);
        const [ty, tm, td] = to.split("-").map(Number);
        try { setSales(await api.listSales({ from: new Date(fy, fm - 1, fd), to: new Date(ty, tm - 1, td, 23, 59, 59) })); }
        finally { setLoading(false); }
    }, [api, from, to]);

    useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

    const costOf = useMemo(() => new Map(products.map(p => [p.id, p.cost_price || 0])), [products]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sales.filter(s => {
            if (method !== "all" && paymentBreakdown(s)[method as "pix"] <= 0 && s.payment_method !== method) return false;
            return !q || describeItems(s).toLowerCase().includes(q) || (s.customer_name || "").toLowerCase().includes(q);
        });
    }, [sales, search, method]);

    const m = useMemo(() => {
        const valid = filtered.filter(isRevenue);
        const revenue = valid.reduce((a, s) => a + s.total, 0);
        const cost = valid.reduce((a, s) => a + (s.kind === "servico" ? s.part_cost : s.items.reduce((c, i) => c + (i.product_id ? (costOf.get(i.product_id) || 0) * i.qty : 0), 0)), 0);
        const losses = filtered.filter(s => s.kind === "perda").reduce((a, s) => a + s.total, 0);
        const mix = { pix: 0, cartao: 0, dinheiro: 0, fiado: 0 };
        valid.forEach(s => { const b = paymentBreakdown(s); mix.pix += b.pix; mix.cartao += b.cartao; mix.dinheiro += b.dinheiro; mix.fiado += b.fiado; });
        return { revenue, count: valid.length, ticket: valid.length ? revenue / valid.length : 0, profit: revenue - cost - losses, losses, mix };
    }, [filtered, costOf]);

    const label = `${formatDate(new Date(from + "T12:00"))} a ${formatDate(new Date(to + "T12:00"))}`;

    const exportPdf = () => {
        const pdf = new jsPDF();
        pdf.setFontSize(15);
        pdf.text(`${store?.name || "Loja"} · Relatório de vendas`, 14, 18);
        pdf.setFontSize(9); pdf.setTextColor(90);
        pdf.text(`Período: ${label} · Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 24);
        autoTable(pdf, {
            startY: 30,
            head: [["Faturamento", "Vendas", "Ticket médio", "Lucro estimado", "PIX", "Cartão", "Dinheiro", "Fiado"]],
            body: [[formatBRL(m.revenue), String(m.count), formatBRL(m.ticket), formatBRL(m.profit), formatBRL(m.mix.pix), formatBRL(m.mix.cartao), formatBRL(m.mix.dinheiro), formatBRL(m.mix.fiado)]],
            headStyles: { fillColor: [242, 100, 25] }, styles: { fontSize: 8 },
        });
        autoTable(pdf, {
            startY: (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
            head: [["Data", "Itens", "Pagamento", "Status", "Valor"]],
            body: filtered.map(s => [`${formatDate(new Date(s.created_at))} ${formatTime(new Date(s.created_at))}`, describeItems(s), PAYMENT_LABEL[s.payment_method], SALE_STATUS[s.status].label, formatBRL(s.total)]),
            headStyles: { fillColor: [40, 44, 52] }, styles: { fontSize: 7.5 }, columnStyles: { 4: { halign: "right" } },
        });
        pdf.save(`relatorio_${from}_a_${to}.pdf`);
    };

    return (
        <Page>
            <PageHeader title="Relatórios" description="Analise qualquer período e exporte em PDF."
                meta={<Badge><Calendar size={12} /> {label}</Badge>}
                actions={<Button variant="primary" icon={Download} onClick={exportPdf} disabled={!filtered.length}>Exportar PDF</Button>} />

            <Card>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="ui-label">Período</p>
                        <Segmented value={preset} onChange={p => { setPreset(p); if (p !== "custom") setRange(presetRange(p)); }} options={[
                            { value: "month", label: "Este mês" }, { value: "last_month", label: "Mês passado" },
                            { value: "30d", label: "30 dias" }, { value: "year", label: "Ano" }, { value: "custom", label: "Personalizado" },
                        ]} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="date" className="ui-input" value={from} max={to} onChange={e => { setPreset("custom"); setRange([e.target.value, to]); }} aria-label="De" />
                        <span className="text-xs text-fg-subtle">até</span>
                        <input type="date" className="ui-input" value={to} min={from} onChange={e => { setPreset("custom"); setRange([from, e.target.value]); }} aria-label="Até" />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Faturamento" value={formatBRL(m.revenue)} icon={DollarSign} tone="primary" hint={`PIX ${formatBRL(m.mix.pix)} · Cartão ${formatBRL(m.mix.cartao)}`} />
                <StatCard label="Vendas" value={m.count} icon={ShoppingCart} tone="info" hint={`Dinheiro ${formatBRL(m.mix.dinheiro)}`} />
                <StatCard label="Ticket médio" value={formatBRL(m.ticket)} icon={Percent} />
                <StatCard label="Lucro bruto estimado" value={formatBRL(m.profit)} icon={TrendingUp} tone="success" hint={m.losses ? `Já descontadas perdas de ${formatBRL(m.losses)}` : "Faturamento − custo dos produtos"} />
            </div>

            <Card padded={false} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
                    <SearchInput icon={Search} value={search} onChange={setSearch} placeholder="Buscar item ou cliente..." className="w-full md:w-80" />
                    <select className="ui-input md:w-56" value={method} onChange={e => setMethod(e.target.value)}>
                        <option value="all">Todas as formas</option>
                        {(["pix", "cartao", "dinheiro", "fiado"] as const).map(k => <option key={k} value={k}>{PAYMENT_LABEL[k]}</option>)}
                    </select>
                </div>
                {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon={ShoppingCart} title="Nenhuma venda no período" description="Escolha outro período ou ajuste os filtros." /> : (
                    <>
                        <ul className="md:hidden divide-y divide-line">
                            {filtered.map(s => (
                                <ListRow key={s.id} title={<span className="line-clamp-2">{describeItems(s)}</span>} value={formatBRL(s.total)}
                                    subtitle={`${formatDate(new Date(s.created_at))} · ${formatTime(new Date(s.created_at))}`}
                                    meta={<><Badge tone={SALE_STATUS[s.status].tone} dot>{SALE_STATUS[s.status].label}</Badge><Badge>{PAYMENT_LABEL[s.payment_method]}</Badge></>} />
                            ))}
                        </ul>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="ui-table min-w-[760px]">
                                <thead><tr><th>Data</th><th>Itens</th><th>Pagamento</th><th>Status</th><th className="!text-right">Valor</th></tr></thead>
                                <tbody>
                                    {filtered.map(s => (
                                        <tr key={s.id}>
                                            <td className="tabular whitespace-nowrap"><span className="text-fg">{formatDate(new Date(s.created_at))}</span> <span className="text-xs text-fg-subtle">{formatTime(new Date(s.created_at))}</span></td>
                                            <td className="max-w-[420px]"><p className="truncate text-fg">{describeItems(s)}</p>{s.customer_name && <p className="text-xs text-fg-subtle">{s.customer_name}</p>}</td>
                                            <td><Badge>{PAYMENT_LABEL[s.payment_method]}</Badge></td>
                                            <td><Badge tone={SALE_STATUS[s.status].tone} dot>{SALE_STATUS[s.status].label}</Badge></td>
                                            <td className="text-right font-semibold text-fg tabular">{formatBRL(s.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>
        </Page>
    );
}
