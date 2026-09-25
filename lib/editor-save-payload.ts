/** Keep binary media out of the JSON API request. Walk groups, clip paths and
 * custom image metadata too; never mutate the live editable canvas. */
export async function externalizeEditorMedia<T>(document: T, upload: (blob: Blob) => Promise<string>): Promise<T> {
  const media = new Map<string, Promise<string>>();
  async function visit(value: unknown): Promise<unknown> {
    if (typeof value === 'string' && /^(data:image\/|blob:)/i.test(value)) {
      let pending = media.get(value);
      if (!pending) {
        pending = (async () => {
          const response = await fetch(value);
          if (!response.ok) throw new Error('未能讀取畫布圖片，請重新選取該圖片。');
          const blob = await response.blob();
          if (!blob.type.startsWith('image/')) throw new Error('畫布素材不是有效圖片。');
          return upload(blob);
        })();
        media.set(value, pending);
      }
      return pending;
    }
    if (Array.isArray(value)) {
      const result = [];
      for (const item of value) result.push(await visit(item));
      return result;
    }
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) result[key] = await visit(item);
      return result;
    }
    return value;
  }
  return await visit(document) as T;
}

export function editorSaveError(status: number, result: { detail?: string; error?: string }) {
  if (status === 413) return '畫布資料超出儲存上限；修改仍在編輯器內，請勿重新載入。';
  if (status === 401) return '登入已過期，請在另一分頁重新登入，再返回此頁儲存。';
  return result.detail || result.error || `儲存未完成（HTTP ${status}），修改仍在編輯器內。`;
}
