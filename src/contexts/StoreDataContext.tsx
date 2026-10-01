// src/contexts/StoreDataContext.tsx
// Dados compartilhados entre as telas (produtos, vendas recentes e ordens de serviço).
// Carregados uma vez por sessão e atualizados após cada ação, ao voltar para a aba
// e periodicamente — sem reler tudo a cada troca de tela.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useApi } from "./SessionContext";
import type { Product, Sale, ServiceOrder } from "../data/types";

/** Janela de vendas carregada para Dashboard/Vendas (relatórios buscam o período que precisarem). */
export const SALES_WINDOW_DAYS = 120;

interface StoreDataValue {
    products: Product[];
    sales: Sale[];
    orders: ServiceOrder[];
    loading: boolean;
    reloadProducts: () => Promise<void>;
    reloadSales: () => Promise<void>;
    reloadOrders: () => Promise<void>;
    reloadAll: () => Promise<void>;
}

const StoreDataContext = createContext<StoreDataValue | null>(null);

export function StoreDataProvider({ children }: { children: ReactNode }) {
    const api = useApi();
    const [products, setProducts] = useState<Product[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const lastLoad = useRef(0);

    const reloadProducts = useCallback(async () => { setProducts(await api.listProducts()); }, [api]);

    const reloadSales = useCallback(async () => {
        const from = new Date();
        from.setDate(from.getDate() - SALES_WINDOW_DAYS);
        const [recent, fiados] = await Promise.all([api.listSales({ from }), api.listPendingFiados()]);
        const byId = new Map(recent.map(s => [s.id, s]));
        fiados.forEach(f => byId.set(f.id, f)); // fiados antigos continuam visíveis
        setSales([...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }, [api]);

    const reloadOrders = useCallback(async () => { setOrders(await api.listServiceOrders()); }, [api]);

    const reloadAll = useCallback(async () => {
        lastLoad.current = Date.now();
        try {
            await Promise.all([reloadProducts(), reloadSales(), reloadOrders()]);
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
        } finally {
            setLoading(false);
        }
    }, [reloadProducts, reloadSales, reloadOrders]);

    useEffect(() => {
        // Carga inicial assíncrona (os setState acontecem após o await)
        const t = setTimeout(reloadAll, 0);
        const onFocus = () => { if (Date.now() - lastLoad.current > 60_000) reloadAll(); };
        window.addEventListener("focus", onFocus);
        const interval = setInterval(() => { if (document.visibilityState === "visible") reloadAll(); }, 5 * 60_000);
        return () => { clearTimeout(t); window.removeEventListener("focus", onFocus); clearInterval(interval); };
    }, [reloadAll]);

    return (
        <StoreDataContext.Provider value={{ products, sales, orders, loading, reloadProducts, reloadSales, reloadOrders, reloadAll }}>
            {children}
        </StoreDataContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStoreData() {
    const ctx = useContext(StoreDataContext);
    if (!ctx) throw new Error("useStoreData fora do StoreDataProvider");
    return ctx;
}
