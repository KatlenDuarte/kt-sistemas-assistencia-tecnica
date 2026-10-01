// src/screens/app/DashboardPage.tsx — visão geral da loja

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Wallet, Receipt, BookOpenText, PackageX, TrendingUp, ShoppingBag, Wrench, PackageCheck, Users } from "lucide-react";
import { Page, PageHeader, Card, CardHeader, StatCard, Segmented, EmptyState, LoadingState, Badge, Meter } from "../../components/ui";
import { useStoreData } from "../../contexts/StoreDataContext";
import { useSession } from "../../contexts/SessionContext";
import { formatBRL, formatDate, formatTime, initials } from "../../lib/format";
import { PAYMENT_LABEL, PERIOD_LABEL, SERVICE_STATUS, describeItems, isRevenue, paymentBreakdown, periodStart, type Period } from "../../lib/domain";

export default function DashboardPage({ go }: { go: (page: string) => void }) {
    const { sales, products, orders, loading } = useStoreData();
    const { profile } = useSession();
    const [period, setPeriod] = useState<Period>("today");

    const stats = useMemo(() => {
        const start = periodStart(period);
        const inPeriod = sales.filter(s => !start || new Date(s.created_at) >= start);
        const valid = inPeriod.filter(s => isRevenue(s));
        const revenue = valid.reduce((a, s) => a + s.total, 0);
        const mix = { pix: 0, cartao: 0, dinheiro: 0, fiado: 0 };
        valid.forEach(s => { const b = paymentBreakdown(s); mix.pix += b.pix; mix.cartao += b.cartao; mix.dinheiro += b.dinheiro; mix.fiado += b.fiado; });
        const byProduct = new Map<string, { qty: number; total: number }>();
        valid.filter(s => s.kind === "venda").forEach(s => s.items.forEach(i => {
            const cur = byProduct.get(i.name) || { qty: 0, total: 0 };
            byProduct.set(i.name, { qty: cur.qty + i.qty, total: cur.total + i.qty * i.price });
        }));
        const pending = sales.filter(s => s.status === "fiado_pendente");
        return {
            revenue, count: valid.length, ticket: valid.length ? revenue / valid.length : 0, mix,
            top: [...byProduct.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty).slice(0, 5),
            recent: valid.slice(0, 6),
            pending, pendingTotal: pending.reduce((a, s) => a + s.total, 0),
            low: products.filter(p => p.stock <= p.min_stock).sort((a, b) => a.stock - b.stock),
        };
    }, [sales, products, period]);

    const chart = useMemo(() => {
        const days = Array.from({ length: 14 }, (_, i) => {
            const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i));
            return { key: d.toDateString(), label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), total: 0 };
        });
        const idx = new Map(days.map((d, i) => [d.key, i]));
        sales.forEach(s => {
            if (!isRevenue(s)) return;
            const d = new Date(s.created_at); d.setHours(0, 0, 0, 0);
            const i = idx.get(d.toDateString());
            if (i !== undefined) days[i].total += s.total;
        });
        return days;
    }, [sales]);

    const openOrders = orders.filter(o => !["entregue", "cancelado"].includes(o.status));
    const mixTotal = stats.mix.pix + stats.mix.cartao + stats.mix.dinheiro + stats.mix.fiado;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    const firstName = (profile?.full_name || "").split(" ")[0];

    if (loading) return <LoadingState label="Carregando indicadores..." />;

    return (
        <Page>
            <PageHeader
                title={`${greeting}${firstName ? `, ${firstName}` : ""}!`}
                description={`Desempenho da loja ${PERIOD_LABEL[period]}.`}
                actions={<Segmented value={period} onChange={setPeriod} options={[
                    { value: "today", label: "Hoje" }, { value: "7d", label: "7 dias" }, { value: "month", label: "Mês" }, { value: "all", label: "120 dias" },
                ]} />}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Faturamento" value={formatBRL(stats.revenue)} icon={Wallet} tone="primary" hint={`${stats.count} ${stats.count === 1 ? "venda" : "vendas"}`} onClick={() => go("sales")} />
                <StatCard label="Ticket médio" value={formatBRL(stats.ticket)} icon={Receipt} tone="info" hint="Valor médio por venda" />
                <StatCard label="Fiado a receber" value={formatBRL(stats.pendingTotal)} icon={BookOpenText} tone="danger" hint={`${stats.pending.length} em aberto`} onClick={() => go("fiado")} />
                <StatCard label="Estoque baixo" value={stats.low.length} icon={PackageX} tone="warning" hint={stats.low.length ? "Produtos para repor" : "Tudo em dia"} onClick={() => go("products")} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card padded={false} className="xl:col-span-2">
                    <CardHeader title="Faturamento diário" description="Últimos 14 dias" icon={TrendingUp}
                        action={<span className="text-sm font-semibold text-fg tabular">{formatBRL(chart.reduce((a, d) => a + d.total, 0))}</span>} />
                    <div className="h-[260px] px-2 pt-4 pb-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
                                <CartesianGrid vertical={false} stroke="var(--ui-line)" />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--ui-fg-subtle)", fontSize: 11 }} interval="preserveStartEnd" />
                                <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: "var(--ui-fg-subtle)", fontSize: 11 }}
                                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : String(v)} />
                                <Tooltip cursor={{ fill: "var(--ui-hover)" }}
                                    contentStyle={{ background: "var(--ui-surface)", border: "1px solid var(--ui-line)", borderRadius: 12, fontSize: 12 }}
                                    labelStyle={{ color: "var(--ui-fg-subtle)" }} itemStyle={{ color: "var(--ui-fg)" }}
                                    formatter={v => [formatBRL(Number(v)), "Faturamento"]} />
                                <Bar dataKey="total" fill="var(--ui-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card padded={false}>
                    <CardHeader title="Formas de pagamento" description={`Recebido ${PERIOD_LABEL[period]}`} icon={Wallet} />
                    <div className="space-y-4 p-5 sm:p-6">
                        {mixTotal === 0 ? <EmptyState icon={Wallet} title="Sem recebimentos" className="py-6" /> :
                            (["pix", "cartao", "dinheiro", "fiado"] as const).map(k => (
                                <div key={k} className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-fg-muted">{PAYMENT_LABEL[k]}</span>
                                        <span className="font-medium text-fg tabular">{formatBRL(stats.mix[k])}<span className="ml-2 text-xs font-normal text-fg-subtle">{Math.round((stats.mix[k] / mixTotal) * 100)}%</span></span>
                                    </div>
                                    <Meter value={stats.mix[k]} max={mixTotal} tone={k === "fiado" ? "danger" : "primary"} />
                                </div>
                            ))}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card padded={false}>
                    <CardHeader title="Mais vendidos" description={`Por quantidade ${PERIOD_LABEL[period]}`} icon={ShoppingBag} />
                    {stats.top.length === 0 ? <EmptyState icon={ShoppingBag} title="Nenhum produto vendido" className="py-10" /> : (
                        <ul className="divide-y divide-line">
                            {stats.top.map((p, i) => (
                                <li key={p.name} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                                    <span className="w-5 text-xs font-semibold text-fg-faint tabular">{i + 1}</span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-fg">{p.name}</span>
                                    <span className="text-xs text-fg-subtle tabular">{p.qty} un</span>
                                    <span className="w-24 text-right text-sm font-semibold text-fg tabular">{formatBRL(p.total)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card padded={false}>
                    <CardHeader title="Últimas vendas" description="Registros mais recentes" icon={Receipt} />
                    {stats.recent.length === 0 ? <EmptyState icon={Receipt} title="Nenhuma venda no período" className="py-10" /> : (
                        <ul className="divide-y divide-line">
                            {stats.recent.map(s => (
                                <li key={s.id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm text-fg">{describeItems(s)}</p>
                                        <p className="text-xs text-fg-subtle">{formatDate(new Date(s.created_at))} · {formatTime(new Date(s.created_at))}</p>
                                    </div>
                                    <Badge>{PAYMENT_LABEL[s.payment_method]}</Badge>
                                    <span className="w-24 text-right text-sm font-semibold text-fg tabular">{formatBRL(s.total)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card padded={false}>
                    <CardHeader title="Fiados em aberto" description="Clientes com valor a receber" icon={Users} />
                    {stats.pending.length === 0 ? <EmptyState icon={BookOpenText} title="Ninguém devendo" className="py-10" /> : (
                        <ul className="divide-y divide-line max-h-80 overflow-y-auto">
                            {stats.pending.map(s => (
                                <li key={s.id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-subtle border border-line text-xs font-semibold text-fg-muted">{initials(s.customer_name)}</span>
                                    <div className="min-w-0 flex-1"><p className="truncate text-sm text-fg">{s.customer_name}</p><p className="text-xs text-fg-subtle">desde {formatDate(new Date(s.created_at))}</p></div>
                                    <span className="text-sm font-semibold text-danger tabular">{formatBRL(s.total)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card padded={false}>
                    <CardHeader title="Ordens de serviço" description={`${openOrders.length} em andamento`} icon={Wrench} />
                    {openOrders.length === 0 ? <EmptyState icon={Wrench} title="Nenhuma O.S. em aberto" className="py-10" /> : (
                        <ul className="divide-y divide-line max-h-80 overflow-y-auto">
                            {openOrders.slice(0, 8).map(o => (
                                <li key={o.id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                                    <div className="min-w-0 flex-1"><p className="truncate text-sm text-fg">{o.device} · {o.customer_name}</p><p className="truncate text-xs text-fg-subtle">nº {o.number} · {o.issue}</p></div>
                                    <Badge tone={SERVICE_STATUS[o.status].tone}>{SERVICE_STATUS[o.status].label}</Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card padded={false}>
                    <CardHeader title="Reposição" description="Produtos no estoque mínimo" icon={PackageX} />
                    {stats.low.length === 0 ? <EmptyState icon={PackageCheck} title="Estoque em dia" className="py-10" /> : (
                        <ul className="divide-y divide-line max-h-80 overflow-y-auto">
                            {stats.low.slice(0, 10).map(p => (
                                <li key={p.id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                                    <div className="min-w-0 flex-1"><p className="truncate text-sm text-fg">{p.name}</p><p className="text-xs text-fg-subtle">mínimo {p.min_stock}</p></div>
                                    <Badge tone={p.stock <= 0 ? "danger" : "warning"}>{p.stock <= 0 ? "Esgotado" : `${p.stock} un`}</Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </Page>
    );
}
