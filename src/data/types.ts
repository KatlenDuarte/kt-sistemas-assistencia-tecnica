// src/data/types.ts — tipos do domínio (espelham as tabelas do Supabase)

import type { PlanId } from "../config/brand";

export type StoreStatus = "pending" | "active" | "blocked";

export interface Store {
    id: string;
    name: string;
    owner_id: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    document: string | null;
    address: string | null;
    logo_url: string | null;
    brand_color: string;
    plan: PlanId;
    status: StoreStatus;
    expires_at: string | null;
    admin_notes: string | null;
    created_at: string;
}

export interface Profile {
    id: string;
    store_id: string | null;
    full_name: string | null;
    role: "owner" | "staff";
    is_super_admin: boolean;
}

export type ProductCategory = "peliculas" | "capas" | "cabos" | "acessorios" | "pecas" | "aparelhos";

export interface Product {
    id: string;
    name: string;
    brand: string | null;
    model: string | null;
    category: ProductCategory | string;
    barcode: string | null;
    supplier: string | null;
    stock: number;
    min_stock: number;
    price: number;
    cost_price: number | null;
    created_at: string;
}

export interface SaleItem {
    product_id: string | null;
    name: string;
    qty: number;
    price: number;
}

export type SaleKind = "venda" | "servico" | "perda";
export type PaymentMethod = "pix" | "cartao" | "dinheiro" | "multiplo" | "fiado" | "nenhum";
export type SaleStatus = "concluida" | "fiado_pendente" | "fiado_quitado" | "estornada" | "cancelada" | "perda";

export interface Payments {
    pix?: number;
    cartao?: number;
    dinheiro?: number;
}

export interface Sale {
    id: string;
    created_at: string;
    kind: SaleKind;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    total: number;
    payment_method: PaymentMethod;
    payments: Payments;
    status: SaleStatus;
    customer_name: string | null;
    customer_phone: string | null;
    note: string | null;
    part_cost: number;
    paid_at: string | null;
    paid_method: string | null;
}

export type NewSale = Omit<Sale, "id" | "created_at" | "paid_at" | "paid_method">;

export type ServiceStatus = "aguardando" | "peca_pedida" | "em_reparo" | "pronto" | "entregue" | "cancelado";

export interface ServiceOrder {
    id: string;
    number: number;
    created_at: string;
    customer_name: string;
    customer_phone: string | null;
    device: string;
    brand: string | null;
    model: string | null;
    issue: string | null;
    notes: string | null;
    status: ServiceStatus;
    value: number;
    part_cost: number;
    paid: boolean;
    delivered_at: string | null;
}

export interface CashSession {
    id: string;
    opened_at: string;
    opening_balance: number;
    closed_at: string | null;
    expected: number | null;
    counted: number | null;
    difference: number | null;
    status: "aberto" | "fechado";
}

export interface CashMovement {
    id: string;
    session_id: string;
    kind: "entrada" | "saida";
    description: string;
    amount: number;
    created_at: string;
}

/** Contrato único de acesso a dados. Implementado pelo Supabase e pela demonstração. */
export interface DataApi {
    // Produtos
    listProducts(): Promise<Product[]>;
    saveProduct(p: Partial<Product> & { name: string }): Promise<Product>;
    deleteProduct(id: string): Promise<void>;

    // Vendas
    listSales(range: { from?: Date; to?: Date }): Promise<Sale[]>;
    listPendingFiados(): Promise<Sale[]>;
    registerSale(sale: NewSale): Promise<Sale>;
    refundSale(id: string): Promise<Sale>;
    updateSale(id: string, patch: Partial<Sale>): Promise<Sale>;

    // Ordens de serviço
    listServiceOrders(): Promise<ServiceOrder[]>;
    saveServiceOrder(o: Partial<ServiceOrder> & { customer_name: string; device: string }): Promise<ServiceOrder>;
    deleteServiceOrder(id: string): Promise<void>;

    // Caixa
    getOpenCashSession(): Promise<CashSession | null>;
    openCashSession(openingBalance: number): Promise<CashSession>;
    closeCashSession(id: string, values: { expected: number; counted: number; difference: number }): Promise<void>;
    listCashMovements(sessionId: string): Promise<CashMovement[]>;
    addCashMovement(m: Omit<CashMovement, "id" | "created_at">): Promise<CashMovement>;
    deleteCashMovement(id: string): Promise<void>;

    // Loja (white label)
    updateStore(patch: Partial<Pick<Store, "name" | "logo_url" | "brand_color" | "contact_phone" | "document" | "address">>): Promise<Store>;
    uploadLogo(file: File): Promise<string>;

    // Super admin (KT Sistemas)
    adminListStores(): Promise<Store[]>;
    adminUpdateStore(id: string, patch: Partial<Store>): Promise<Store>;
}
