// src/lib/router.ts — rotas simples por hash (#/entrar, #/cadastro?plano=anual)
// Funciona em qualquer hospedagem estática sem configuração extra.

import { useEffect, useState } from "react";

export interface Route { path: string; params: URLSearchParams }

const parse = (): Route => {
    const raw = window.location.hash.replace(/^#/, "") || "/";
    const [path, query = ""] = raw.split("?");
    return { path: path || "/", params: new URLSearchParams(query) };
};

export function navigate(path: string) {
    window.location.hash = path;
    window.scrollTo({ top: 0 });
}

export function useRoute(): Route {
    const [route, setRoute] = useState<Route>(parse);
    useEffect(() => {
        const on = () => setRoute(parse());
        window.addEventListener("hashchange", on);
        return () => window.removeEventListener("hashchange", on);
    }, []);
    return route;
}
