export const MIN_BP_SCALE = 0.25;
export const MAX_BP_SCALE = 4;

export const clampScale = (n: number) =>
  Math.min(MAX_BP_SCALE, Math.max(MIN_BP_SCALE, Math.round(n * 100) / 100));

export const clampOffset = (n: number) =>
  Math.min(300, Math.max(-300, Math.round(n * 10) / 10));

/** Downscale/compress large uploads so they fit comfortably in localStorage. */
export function downscaleImageFile(file: File, maxDim = 1920): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-error'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('decode-error'));
      img.onload = () => {
        const maxSide = Math.max(img.width, img.height) || 1;
        const ratio = Math.min(1, maxDim / maxSide);
        if (ratio === 1 && file.size < 1_500_000) {
          resolve(dataUrl);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
