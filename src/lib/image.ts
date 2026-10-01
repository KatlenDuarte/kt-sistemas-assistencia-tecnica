// src/lib/image.ts

/** Reduz a imagem para no máximo 512px (mantém transparência) para economizar espaço. */
export async function resizeImage(file: File, max = 512): Promise<File> {
    if (file.type === "image/svg+xml") return file;
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = url;
        });
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), "image/png", 0.92));
        return new File([blob], "logo.png", { type: "image/png" });
    } finally {
        URL.revokeObjectURL(url);
    }
}
