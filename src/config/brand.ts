// src/config/brand.ts — dados da KT Sistemas (empresa que vende o sistema)

export const COMPANY = {
    name: "KT Sistemas",
    tagline: "Gestão completa para lojas de celular e assistência técnica",
    whatsapp: "5531975413394", // com DDI 55
    whatsappDisplay: "(31) 97541-3394",
    email: "katlenduarte.dev@gmail.com",
};

export type PlanId = "mensal" | "anual" | "vitalicio";

export interface Plan {
    id: PlanId;
    name: string;
    price: number;
    period: string;
    description: string;
    highlight?: string;
    durationDays: number | null; // null = sem vencimento
}

export const PLANS: Plan[] = [
    { id: "mensal", name: "Mensal", price: 99.9, period: "/mês", description: "Ideal para começar sem compromisso.", durationDays: 31 },
    { id: "anual", name: "Anual", price: 999.9, period: "/ano", description: "Economize 2 meses em relação ao mensal.", highlight: "Mais escolhido", durationDays: 366 },
    { id: "vitalicio", name: "Vitalício", price: 1999.9, period: "pagamento único", description: "Pague uma vez e use para sempre.", durationDays: null },
];

export const PLAN_FEATURES = [
    "Vendas com PIX, cartão, dinheiro, múltiplos e fiado",
    "Estoque com alerta de reposição e código de barras",
    "Controle de fiado com cobrança por WhatsApp",
    "Ordens de serviço da assistência técnica",
    "Abertura e fechamento de caixa com PDF",
    "Dashboard e relatórios por período",
    "Sua logo e o nome da sua loja no sistema",
    "Funciona no computador e no celular",
];

export const planById = (id?: string | null) => PLANS.find(p => p.id === id);

export const whatsappLink = (message: string) =>
    `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(message)}`;

export const mailtoLink = (subject: string, body: string) =>
    `mailto:${COMPANY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
