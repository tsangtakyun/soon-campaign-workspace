/** Normalized source-image coordinates; x/y are the centre of the protected area. */
export type SubjectFocus = { x: number; y: number; width: number; height: number; sourceWidth?: number; sourceHeight?: number };
export type CropRect = { x: number; y: number; width: number; height: number };
export type FocusAsset = { width?: number; height?: number; subjectFocus?: SubjectFocus | null; position?: string; extensionOriginal?: { url: string }; extensionId?: string; autoExtensionDeclinedUrl?: string; compositionFit?: 'contain' };
const clamp = (v: number, low = 0, high = 1) => Math.max(low, Math.min(high, v));
export function validSubjectFocus(value: unknown): value is SubjectFocus {
  const f = value as SubjectFocus | null;
  return !!f && [f.x, f.y, f.width, f.height].every(v => typeof v === 'number' && Number.isFinite(v))
    && f.x >= 0 && f.x <= 1 && f.y >= 0 && f.y <= 1 && f.width > 0 && f.width <= 1 && f.height > 0 && f.height <= 1;
}
function area(r: CropRect) { return Math.max(0, r.width) * Math.max(0, r.height); }
function intersection(a: CropRect, b: CropRect) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

/** Only translate a cover crop. Never distort, enlarge beyond cover, or invent pixels. */
export function subjectCrop(asset: FocusAsset, frame: CropRect, textZones: CropRect[] = []) {
  const fallback = { position: asset.position || 'center', constrained: false, active: false };
  const f = asset.subjectFocus;
  const sourceWidth = f?.sourceWidth ?? asset.width, sourceHeight = f?.sourceHeight ?? asset.height;
  if (!validSubjectFocus(f) || !Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight)
    || !(sourceWidth! > 0 && sourceHeight! > 0 && frame.width > 0 && frame.height > 0)) return fallback;
  const scale = Math.max(frame.width / sourceWidth!, frame.height / sourceHeight!);
  const w = sourceWidth! * scale, h = sourceHeight! * scale;
  const overflowX = Math.max(0, w - frame.width), overflowY = Math.max(0, h - frame.height);
  const left = clamp(f.x - f.width / 2), top = clamp(f.y - f.height / 2);
  const subject = { x: left * w, y: top * h, width: (clamp(f.x + f.width / 2) - left) * w, height: (clamp(f.y + f.height / 2) - top) * h };
  const total = Math.max(1, area(subject));
  // Reserve a small gutter around actual non-empty text boxes.
  const zones = textZones.map(r => ({ x: r.x - frame.x - 12, y: r.y - frame.y - 12, width: r.width + 24, height: r.height + 24 }));
  const bounds = { x: 0, y: 0, width: frame.width, height: frame.height };
  let best = { score: Infinity, x: .5, y: .5, loss: Infinity, overlap: 0 };
  for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
    const x = overflowX < .01 ? .5 : i / 40, y = overflowY < .01 ? .5 : j / 40;
    const placed = { ...subject, x: subject.x - overflowX * x, y: subject.y - overflowY * y };
    const loss = 1 - intersection(placed, bounds) / total;
    const overlap = Math.min(1, zones.reduce((sum, zone) => sum + intersection(placed, zone), 0) / total);
    const centre = ((placed.x + placed.width / 2) / frame.width - .5) ** 2 + ((placed.y + placed.height / 2) / frame.height - .5) ** 2;
    // Protect the selected subject first; avoid copy second; tie-break towards a balanced crop.
    const score = overlap * 10 + centre * .1 + ((x - .5) ** 2 + (y - .5) ** 2) * .001;
    if (loss < best.loss - 1e-6 || (Math.abs(loss - best.loss) <= 1e-6 && score < best.score)) best = { score, x, y, loss, overlap };
  }
  return { position: `${best.x * 100}% ${best.y * 100}%`, constrained: best.loss > .02 || best.overlap > .02, active: true };
}
