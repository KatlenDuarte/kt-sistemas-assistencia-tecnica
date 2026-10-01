// src/data/demoApi.ts — DataApi em memória para o modo demonstração.
// Nada sai do navegador; os dados voltam ao estado inicial ao recarregar.

import type {
    CashMovement, CashSession, DataApi, Product, Sale, SaleItem, ServiceOrder, ServiceStatus, Store,
} from "./types";

export const DEMO_STORE: Store = {
    id: "demo-store",
    name: "Loja Demonstração",
    owner_id: "demo-user",
    contact_email: "demo@ktsistemas.com.br",
    contact_phone: "31999999999",
    document: null,
    address: "Rua Exemplo, 123 · Centro",
    logo_url: null,
    brand_color: "#f26419",
    plan: "anual",
    status: "active",
    expires_at: null,
    admin_notes: null,
    created_at: new Date().toISOString(),
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const wait = <T,>(v: T) => new Promise<T>(r => setTimeout(() => r(structuredClone(v)), 120));

function rng(seed: number) {
    return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

const daysAgo = (n: number, h: number, m: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(h, m, 0, 0);
    return d;
};

const PRODUCTS: Omit<Product, "id" | "created_at" | "barcode" | "supplier">[] = [
    { name: "Película 3D iPhone 13", brand: "Apple", model: "iPhone 13", category: "peliculas", price: 35, cost_price: 8, stock: 3, min_stock: 6 },
    { name: "Película 3D iPhone 15", brand: "Apple", model: "iPhone 15", category: "peliculas", price: 40, cost_price: 9, stock: 18, min_stock: 6 },
    { name: "Película privacidade Galaxy S23", brand: "Samsung", model: "Galaxy S23", category: "peliculas", price: 45, cost_price: 12, stock: 9, min_stock: 4 },
    { name: "Película cerâmica Redmi Note 12", brand: "Xiaomi", model: "Redmi Note 12", category: "peliculas", price: 30, cost_price: 7, stock: 0, min_stock: 4 },
    { name: "Capa silicone iPhone 14", brand: "Apple", model: "iPhone 14", category: "capas", price: 59.9, cost_price: 18, stock: 12, min_stock: 4 },
    { name: "Capa anti-impacto Galaxy A54", brand: "Samsung", model: "Galaxy A54", category: "capas", price: 49.9, cost_price: 14, stock: 2, min_stock: 4 },
    { name: "Capa carteira Moto G84", brand: "Motorola", model: "Moto G84", category: "capas", price: 69.9, cost_price: 22, stock: 7, min_stock: 3 },
    { name: "Capa transparente iPhone 15 Pro", brand: "Apple", model: "iPhone 15 Pro", category: "capas", price: 45, cost_price: 11, stock: 15, min_stock: 5 },
    { name: "Cabo USB-C 1m reforçado", brand: "Baseus", model: "USB-C", category: "cabos", price: 39.9, cost_price: 12, stock: 25, min_stock: 8 },
    { name: "Cabo Lightning 2m", brand: "Baseus", model: "Lightning", category: "cabos", price: 49.9, cost_price: 15, stock: 4, min_stock: 6 },
    { name: "Cabo USB-C para USB-C 60W", brand: "Ugreen", model: "60W", category: "cabos", price: 59.9, cost_price: 19, stock: 11, min_stock: 5 },
    { name: "Carregador turbo 20W", brand: "Xiaomi", model: "20W", category: "acessorios", price: 89.9, cost_price: 35, stock: 8, min_stock: 4 },
    { name: "Fone Bluetooth TWS", brand: "QCY", model: "T13", category: "acessorios", price: 129, cost_price: 60, stock: 6, min_stock: 3 },
    { name: "Suporte veicular magnético", brand: "Baseus", model: "Magnético", category: "acessorios", price: 79.9, cost_price: 28, stock: 1, min_stock: 3 },
    { name: "Power bank 10.000 mAh", brand: "Anker", model: "PowerCore", category: "acessorios", price: 159, cost_price: 82, stock: 5, min_stock: 2 },
    { name: "Tela iPhone 11 (incell)", brand: "Apple", model: "iPhone 11", category: "pecas", price: 0, cost_price: 210, stock: 3, min_stock: 1 },
];

const CLIENTS = [
    { name: "Ana Souza", phone: "31987654321" },
    { name: "Bruno Carvalho", phone: "31991234567" },
    { name: "Carla Mendes", phone: "31998887766" },
    { name: "Diego Ramos", phone: "31976543210" },
    { name: "Fernanda Lima", phone: "31993334455" },
];

const REPAIRS = [
    { device: "iPhone 11", brand: "Apple", model: "A2221", issue: "Troca de tela (display trincado)", value: 420, part_cost: 210 },
    { device: "Galaxy A32", brand: "Samsung", model: "SM-A325", issue: "Bateria não segura carga", value: 180, part_cost: 75 },
    { device: "Moto G9 Play", brand: "Motorola", model: "XT2083", issue: "Conector de carga com mau contato", value: 120, part_cost: 30 },
    { device: "Redmi Note 10", brand: "Xiaomi", model: "M2101K7AG", issue: "Câmera traseira desfocada", value: 260, part_cost: 120 },
    { device: "iPhone XR", brand: "Apple", model: "A1984", issue: "Face ID não funciona após queda", value: 350, part_cost: 160 },
    { device: "Galaxy S21", brand: "Samsung", model: "SM-G991", issue: "Tampa traseira quebrada", value: 190, part_cost: 80 },
];

interface DemoDb {
    store: Store;
    products: Product[];
    sales: Sale[];
    orders: ServiceOrder[];
    sessions: CashSession[];
    movements: CashMovement[];
}

function seed(): DemoDb {
    const rand = rng(7);
    const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
    const now = new Date();

    const products: Product[] = PRODUCTS.map((p, i) => ({
        ...p,
        id: `p${i + 1}`,
        barcode: `78910${String(10000 + i * 37)}`,
        supplier: pick(["Distribuidora Sol", "Importadora BH", "Atacado Centro"]),
        created_at: daysAgo(90, 9, 0).toISOString(),
    }));
    const sellable = products.filter(p => p.price > 0);

    const sales: Sale[] = [];
    const base = (over: Partial<Sale>): Sale => ({
        id: uid(), created_at: now.toISOString(), kind: "venda", items: [], subtotal: 0, discount: 0, total: 0,
        payment_method: "pix", payments: {}, status: "concluida", customer_name: null, customer_phone: null,
        note: null, part_cost: 0, paid_at: null, paid_method: null, ...over,
    });

    for (let day = 59; day >= 0; day--) {
        const count = day === 0 ? 6 : 3 + Math.floor(rand() * 6);
        for (let k = 0; k < count; k++) {
            let when = daysAgo(day, 9 + Math.floor(rand() * 10), Math.floor(rand() * 60));
            if (when > now) when = new Date(now.getTime() - (count - k) * 35 * 60000);
            const items: SaleItem[] = Array.from({ length: 1 + Math.floor(rand() * 2) }, () => {
                const p = pick(sellable);
                return { product_id: p.id, name: p.name, price: p.price, qty: rand() < 0.2 ? 2 : 1 };
            });
            const total = Math.round(items.reduce((a, i) => a + i.price * i.qty, 0) * 100) / 100;
            const r = rand();
            const method = r < 0.45 ? "pix" : r < 0.75 ? "cartao" : r < 0.92 ? "dinheiro" : "multiplo";
            const payments = method === "multiplo"
                ? { pix: Math.round(total * 60) / 100, dinheiro: Math.round(total * 40) / 100 }
                : { [method]: total };
            sales.push(base({
                created_at: when.toISOString(), items, subtotal: total, total, payment_method: method, payments,
                status: rand() < 0.03 ? "estornada" : "concluida",
            }));
        }
    }

    REPAIRS.slice(0, 4).forEach((rep, i) => {
        sales.push(base({
            created_at: daysAgo(i * 3, 15, 20).toISOString(), kind: "servico",
            items: [{ product_id: null, name: `${rep.device} · ${rep.issue}`, price: rep.value, qty: 1 }],
            subtotal: rep.value, total: rep.value, part_cost: rep.part_cost,
            payment_method: i % 2 ? "pix" : "cartao", payments: { [i % 2 ? "pix" : "cartao"]: rep.value },
            customer_name: CLIENTS[i].name, customer_phone: CLIENTS[i].phone,
        }));
    });

    [
        { c: 0, d: 2, items: [0, 8], status: "fiado_pendente" as const },
        { c: 1, d: 9, items: [12], status: "fiado_pendente" as const },
        { c: 2, d: 33, items: [5, 9], status: "fiado_pendente" as const },
        { c: 3, d: 35, items: [11], status: "fiado_quitado" as const },
        { c: 4, d: 18, items: [4], status: "fiado_quitado" as const },
    ].forEach(f => {
        const items = f.items.map(i => ({ product_id: products[i].id, name: products[i].name, price: products[i].price, qty: 1 }));
        const total = Math.round(items.reduce((a, i) => a + i.price, 0) * 100) / 100;
        sales.push(base({
            created_at: daysAgo(f.d, 16, 5).toISOString(), items, subtotal: total, total,
            payment_method: "fiado", status: f.status, customer_name: CLIENTS[f.c].name, customer_phone: CLIENTS[f.c].phone,
            note: f.status === "fiado_pendente" ? "Combinou de pagar no dia 10" : null,
            paid_at: f.status === "fiado_quitado" ? daysAgo(Math.max(0, f.d - 7), 11, 40).toISOString() : null,
            paid_method: f.status === "fiado_quitado" ? "pix" : null,
        }));
    });

    const statuses: ServiceStatus[] = ["aguardando", "peca_pedida", "em_reparo", "pronto", "entregue", "em_reparo"];
    const orders: ServiceOrder[] = REPAIRS.map((rep, i) => ({
        id: uid(), number: 1001 + i, created_at: daysAgo(i === 0 ? 0 : i * 2, 10 + i, 15).toISOString(),
        customer_name: CLIENTS[i % CLIENTS.length].name, customer_phone: CLIENTS[i % CLIENTS.length].phone,
        device: rep.device, brand: rep.brand, model: rep.model, issue: rep.issue, notes: null,
        status: statuses[i], value: rep.value, part_cost: rep.part_cost,
        paid: statuses[i] === "entregue" || i === 2, delivered_at: statuses[i] === "entregue" ? daysAgo(1, 17, 0).toISOString() : null,
    }));

    const sessionId = uid();
    return {
        store: { ...DEMO_STORE },
        products,
        sales: sales.sort((a, b) => b.created_at.localeCompare(a.created_at)),
        orders,
        sessions: [{ id: sessionId, opened_at: daysAgo(0, 8, 30).toISOString(), opening_balance: 150, closed_at: null, expected: null, counted: null, difference: null, status: "aberto" }],
        movements: [
            { id: uid(), session_id: sessionId, kind: "entrada", description: "Troco reforçado", amount: 50, created_at: daysAgo(0, 9, 10).toISOString() },
            { id: uid(), session_id: sessionId, kind: "saida", description: "Material de limpeza", amount: 32.5, created_at: daysAgo(0, 12, 45).toISOString() },
        ],
    };
}

let db: DemoDb = seed();
export const resetDemo = () => { db = seed(); };
export const demoStore = () => db.store;

export const demoApi: DataApi = {
    listProducts: () => wait([...db.products].sort((a, b) => a.name.localeCompare(b.name))),
    async saveProduct(p) {
        if (p.barcode && db.products.some(x => x.barcode === p.barcode && x.id !== p.id)) {
            throw new Error("Já existe um produto com este código de barras.");
        }
        if (p.id) {
            const i = db.products.findIndex(x => x.id === p.id);
            db.products[i] = { ...db.products[i], ...p } as Product;
            return wait(db.products[i]);
        }
        const created: Product = {
            id: uid(), created_at: new Date().toISOString(), brand: null, model: null, category: "acessorios",
            barcode: null, supplier: null, stock: 0, min_stock: 5, price: 0, cost_price: null, ...p,
        };
        db.products.push(created);
        return wait(created);
    },
    async deleteProduct(id) { db.products = db.products.filter(p => p.id !== id); await wait(null); },

    listSales: ({ from, to }) => wait(db.sales.filter(s => {
        const d = new Date(s.created_at);
        return (!from || d >= from) && (!to || d <= to);
    })),
    listPendingFiados: () => wait(db.sales.filter(s => s.status === "fiado_pendente")),
    async registerSale(input) {
        if (input.kind !== "servico") {
            for (const it of input.items) {
                if (!it.product_id) continue;
                const p = db.products.find(x => x.id === it.product_id);
                if (!p) throw new Error(`Produto não encontrado: ${it.name}`);
                if (p.stock < it.qty) throw new Error(`Estoque insuficiente para "${p.name}": disponível ${p.stock}, solicitado ${it.qty}`);
            }
            input.items.forEach(it => {
                const p = db.products.find(x => x.id === it.product_id);
                if (p) p.stock -= it.qty;
            });
        }
        const sale: Sale = { ...input, id: uid(), created_at: new Date().toISOString(), paid_at: null, paid_method: null };
        db.sales.unshift(sale);
        return wait(sale);
    },
    async refundSale(id) {
        const s = db.sales.find(x => x.id === id);
        if (!s) throw new Error("Venda não encontrada");
        if (s.status === "estornada" || s.status === "cancelada") throw new Error("Esta venda já foi estornada ou cancelada");
        if (s.kind !== "servico") s.items.forEach(it => {
            const p = db.products.find(x => x.id === it.product_id);
            if (p) p.stock += it.qty;
        });
        s.status = s.status === "fiado_pendente" ? "cancelada" : "estornada";
        return wait(s);
    },
    async updateSale(id, patch) {
        const s = db.sales.find(x => x.id === id);
        if (!s) throw new Error("Venda não encontrada");
        Object.assign(s, patch);
        return wait(s);
    },

    listServiceOrders: () => wait([...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at))),
    async saveServiceOrder(o) {
        if (o.id) {
            const i = db.orders.findIndex(x => x.id === o.id);
            db.orders[i] = { ...db.orders[i], ...o } as ServiceOrder;
            return wait(db.orders[i]);
        }
        const created: ServiceOrder = {
            id: uid(), number: Math.max(1000, ...db.orders.map(x => x.number)) + 1, created_at: new Date().toISOString(),
            customer_phone: null, brand: null, model: null, issue: null, notes: null, status: "aguardando",
            value: 0, part_cost: 0, paid: false, delivered_at: null, ...o,
        };
        db.orders.unshift(created);
        return wait(created);
    },
    async deleteServiceOrder(id) { db.orders = db.orders.filter(o => o.id !== id); await wait(null); },

    getOpenCashSession: () => wait(db.sessions.find(s => s.status === "aberto") ?? null),
    async openCashSession(openingBalance) {
        if (db.sessions.some(s => s.status === "aberto")) throw new Error("Já existe um caixa aberto.");
        const s: CashSession = { id: uid(), opened_at: new Date().toISOString(), opening_balance: openingBalance, closed_at: null, expected: null, counted: null, difference: null, status: "aberto" };
        db.sessions.push(s);
        return wait(s);
    },
    async closeCashSession(id, values) {
        const s = db.sessions.find(x => x.id === id);
        if (s) Object.assign(s, values, { status: "fechado", closed_at: new Date().toISOString() });
        await wait(null);
    },
    listCashMovements: (sessionId) => wait(db.movements.filter(m => m.session_id === sessionId)),
    async addCashMovement(m) {
        const created: CashMovement = { ...m, id: uid(), created_at: new Date().toISOString() };
        db.movements.push(created);
        return wait(created);
    },
    async deleteCashMovement(id) { db.movements = db.movements.filter(m => m.id !== id); await wait(null); },

    async updateStore(patch) { db.store = { ...db.store, ...patch }; return wait(db.store); },
    uploadLogo: (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        reader.readAsDataURL(file);
    }),

    adminListStores: () => wait([db.store]),
    async adminUpdateStore(_id, patch) { db.store = { ...db.store, ...patch }; return wait(db.store); },
};
