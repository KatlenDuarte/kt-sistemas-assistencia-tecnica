// src/data/supabaseApi.ts — implementação da DataApi usando Supabase
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CashMovement, CashSession, DataApi, Product, Sale, ServiceOrder, Store } from "./types";

const num = (v: unknown) => Number(v) || 0;

const toProduct = (r: Record<string, unknown>): Product => ({
    ...(r as unknown as Product),
    stock: num(r.stock),
    min_stock: num(r.min_stock),
    price: num(r.price),
    cost_price: r.cost_price == null ? null : num(r.cost_price),
});

const toSale = (r: Record<string, unknown>): Sale => ({
    ...(r as unknown as Sale),
    items: Array.isArray(r.items) ? (r.items as Sale["items"]) : [],
    payments: (r.payments as Sale["payments"]) || {},
    subtotal: num(r.subtotal),
    discount: num(r.discount),
    total: num(r.total),
    part_cost: num(r.part_cost),
});

const toOrder = (r: Record<string, unknown>): ServiceOrder => ({
    ...(r as unknown as ServiceOrder),
    value: num(r.value),
    part_cost: num(r.part_cost),
});

const toSession = (r: Record<string, unknown>): CashSession => ({
    ...(r as unknown as CashSession),
    opening_balance: num(r.opening_balance),
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
    if (res.error) throw new Error(res.error.message);
    return res.data;
}

export function createSupabaseApi(sb: SupabaseClient, storeId: string): DataApi {
    return {
        async listProducts() {
            const data = check(await sb.from("products").select("*").order("name"));
            return (data as Record<string, unknown>[]).map(toProduct);
        },
        async saveProduct(p) {
            const { id, created_at: _created, ...fields } = p;
            void _created;
            const res = id
                ? await sb.from("products").update(fields).eq("id", id).select().single()
                : await sb.from("products").insert(fields).select().single();
            return toProduct(check(res) as Record<string, unknown>);
        },
        async deleteProduct(id) {
            check(await sb.from("products").delete().eq("id", id));
        },

        async listSales({ from, to }) {
            let q = sb.from("sales").select("*").order("created_at", { ascending: false });
            if (from) q = q.gte("created_at", from.toISOString());
            if (to) q = q.lte("created_at", to.toISOString());
            const data = check(await q.limit(5000));
            return (data as Record<string, unknown>[]).map(toSale);
        },
        async listPendingFiados() {
            const data = check(await sb.from("sales").select("*").eq("status", "fiado_pendente").order("created_at", { ascending: false }));
            return (data as Record<string, unknown>[]).map(toSale);
        },
        async registerSale(sale) {
            const data = check(await sb.rpc("register_sale", { p_sale: sale }));
            return toSale(data as Record<string, unknown>);
        },
        async refundSale(id) {
            const data = check(await sb.rpc("refund_sale", { p_id: id }));
            return toSale(data as Record<string, unknown>);
        },
        async updateSale(id, patch) {
            const data = check(await sb.from("sales").update(patch).eq("id", id).select().single());
            return toSale(data as Record<string, unknown>);
        },

        async listServiceOrders() {
            const data = check(await sb.from("service_orders").select("*").order("created_at", { ascending: false }).limit(2000));
            return (data as Record<string, unknown>[]).map(toOrder);
        },
        async saveServiceOrder(o) {
            const { id, number: _n, created_at: _c, ...fields } = o;
            void _n; void _c;
            const res = id
                ? await sb.from("service_orders").update(fields).eq("id", id).select().single()
                : await sb.from("service_orders").insert(fields).select().single();
            return toOrder(check(res) as Record<string, unknown>);
        },
        async deleteServiceOrder(id) {
            check(await sb.from("service_orders").delete().eq("id", id));
        },

        async getOpenCashSession() {
            const data = check(await sb.from("cash_sessions").select("*").eq("status", "aberto").maybeSingle());
            return data ? toSession(data as Record<string, unknown>) : null;
        },
        async openCashSession(openingBalance) {
            const data = check(await sb.from("cash_sessions").insert({ opening_balance: openingBalance }).select().single());
            return toSession(data as Record<string, unknown>);
        },
        async closeCashSession(id, values) {
            check(await sb.from("cash_sessions").update({ ...values, status: "fechado", closed_at: new Date().toISOString() }).eq("id", id));
        },
        async listCashMovements(sessionId) {
            const data = check(await sb.from("cash_movements").select("*").eq("session_id", sessionId).order("created_at"));
            return (data as CashMovement[]).map(m => ({ ...m, amount: num(m.amount) }));
        },
        async addCashMovement(m) {
            const data = check(await sb.from("cash_movements").insert(m).select().single());
            return { ...(data as CashMovement), amount: num((data as CashMovement).amount) };
        },
        async deleteCashMovement(id) {
            check(await sb.from("cash_movements").delete().eq("id", id));
        },

        async updateStore(patch) {
            const data = check(await sb.from("stores").update(patch).eq("id", storeId).select().single());
            return data as Store;
        },
        async uploadLogo(file) {
            const ext = (file.name.split(".").pop() || "png").toLowerCase();
            const path = `${storeId}/logo-${Date.now()}.${ext}`;
            const up = await sb.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
            if (up.error) throw new Error(up.error.message);
            return sb.storage.from("logos").getPublicUrl(path).data.publicUrl;
        },

        async adminListStores() {
            const data = check(await sb.from("stores").select("*").order("created_at", { ascending: false }));
            return data as Store[];
        },
        async adminUpdateStore(id, patch) {
            const data = check(await sb.from("stores").update(patch).eq("id", id).select().single());
            return data as Store;
        },
    };
}
