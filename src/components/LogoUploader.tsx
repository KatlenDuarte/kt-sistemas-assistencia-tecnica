// src/components/LogoUploader.tsx — envio de logo com prévia e redimensionamento

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { resizeImage } from "../lib/image";

export default function LogoUploader({ value, onChange, storeName }: {
    value: string | null;            // URL ou dataURL atual
    onChange: (file: File | null, preview: string | null) => void;
    storeName?: string;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [error, setError] = useState("");

    const pick = async (file?: File) => {
        setError("");
        if (!file) return;
        if (!file.type.startsWith("image/")) { setError("Envie uma imagem (PNG, JPG, SVG ou WEBP)."); return; }
        if (file.size > 5 * 1024 * 1024) { setError("A imagem deve ter no máximo 5 MB."); return; }
        const resized = await resizeImage(file);
        onChange(resized, URL.createObjectURL(resized));
    };

    return (
        <div className="flex items-center gap-4">
            <button
                type="button"
                onClick={() => input.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
                className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-subtle transition-colors hover:border-primary"
                aria-label="Escolher logo"
            >
                {value
                    ? <img src={value} alt="Logo" className="h-full w-full object-contain p-2" />
                    : <span className="flex flex-col items-center gap-1 text-xs text-fg-subtle group-hover:text-primary-text">
                        <ImagePlus className="h-6 w-6" /> Logo
                    </span>}
            </button>
            <div className="min-w-0 text-sm">
                <p className="font-medium text-fg">{value ? "Logo da loja" : "Envie a logo da sua loja"}</p>
                <p className="mt-0.5 text-xs text-fg-subtle">PNG com fundo transparente fica melhor. Ela aparece no sistema e nos cupons{storeName ? ` da ${storeName}` : ""}.</p>
                <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => input.current?.click()} className="text-xs font-semibold text-primary-text hover:underline">{value ? "Trocar imagem" : "Escolher imagem"}</button>
                    {value && <button type="button" onClick={() => onChange(null, null)} className="inline-flex items-center gap-1 text-xs font-medium text-fg-subtle hover:text-danger"><Trash2 size={12} /> Remover</button>}
                </div>
                {error && <p className="mt-1 text-xs text-danger">{error}</p>}
            </div>
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
    );
}
