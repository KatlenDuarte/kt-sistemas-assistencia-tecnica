// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** O sistema funciona em modo demonstração mesmo sem Supabase configurado. */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes("SEU-PROJETO"));

export const supabase: SupabaseClient | null = isSupabaseConfigured
    ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;

/** Traduz mensagens comuns do Supabase para português. */
export function friendlyError(err: unknown): string {
    const msg = (err as { message?: string })?.message || String(err);
    const map: [RegExp, string][] = [
        [/Invalid login credentials/i, "E-mail ou senha inválidos."],
        [/Email not confirmed/i, "Confirme seu e-mail pelo link que enviamos antes de entrar."],
        [/User already registered/i, "Já existe uma conta com este e-mail."],
        [/Password should be at least/i, "A senha precisa ter pelo menos 6 caracteres."],
        [/rate limit/i, "Muitas tentativas seguidas. Aguarde alguns minutos."],
        [/Failed to fetch|NetworkError/i, "Sem conexão com o servidor. Verifique a internet."],
        [/row-level security/i, "Sem permissão. Verifique se a assinatura da loja está ativa."],
        [/duplicate key.*barcode/i, "Já existe um produto com este código de barras."],
    ];
    const found = map.find(([re]) => re.test(msg));
    return found ? found[1] : msg;
}
