import { subjectCrop, validSubjectFocus, type SubjectFocus, type CropRect } from './subject-crop';
export type CompositionAnalysis = { focus: SubjectFocus | null; label: string; reason: string; cached: boolean;
  background?: { downwardExtension: 'safe' | 'risky' | 'uncertain'; reason: string } };
export type CompositionAdvice = { action: 'keep' | 'crop' | 'extend' | 'split' | 'review'; title: string; reason: string };
export function compositionAdvice(input: { width: number; height: number; frame: CropRect; textZones: CropRect[]; analysis: CompositionAnalysis; documentary: boolean }): CompositionAdvice {
  const { width, height, frame, textZones, analysis } = input;
  if (!(width > 0 && height > 0 && frame.width > 0 && frame.height > 0) || !validSubjectFocus(analysis.focus))
    return { action: 'review', title: '需要確認主體', reason: 'AI 未能可靠判斷主體或圖片尺寸；先保留原圖，唔自動建議生成。' };
  const focus = analysis.focus;
  const crop = subjectCrop({ width, height, subjectFocus: { ...focus, sourceWidth: width, sourceHeight: height } }, frame, textZones);
  const scale = Math.max(frame.width / width, frame.height / height);
  const retainedArea = frame.width * frame.height / (width * height * scale * scale);
  const zoomOverWidth = scale / (frame.width / width);
  const needsChange = crop.constrained || retainedArea < .7 || zoomOverWidth > 1.5;
  if (!needsChange) return { action: 'crop', title: '保留原圖，輕微調整裁切', reason: '現有比例可保留主體，文字亦有空間；毋須生成背景。' };
  // This release can only generate a full-bleed 4:5 cover, anchored at its top edge.
  const supported = Math.abs(frame.width / frame.height - .8) < .025 && height / width < 1.2;
  const extendedHeight = width * 1.25;
  const extendedFocus = { ...focus, y: focus.y * height / extendedHeight, height: focus.height * height / extendedHeight, sourceWidth: width, sourceHeight: extendedHeight };
  const extendedCrop = subjectCrop({ width, height: extendedHeight, subjectFocus: extendedFocus }, frame, textZones);
  if (!input.documentary && supported && analysis.background?.downwardExtension === 'safe' && !extendedCrop.constrained) return {
    action: 'extend', title: '向下延伸背景', reason: `${crop.constrained ? '現有裁切令主體與文字空間不足' : '橫圖填滿直幅會裁走太多畫面'}；延伸可保留整張原圖、為文字留位。${width < frame.width ? '原圖解像度較低，延伸唔會令原圖變高清。' : ''}`,
  };
  return { action: 'split', title: '改用圖文分區', reason: input.documentary ? '你選擇保留原始紀實畫面；建議圖片完整顯示，文字另放，唔生成背景。'
    : !supported ? '此圖片框不適用向下延伸，建議圖片與文字分開。'
    : analysis.background?.downwardExtension !== 'safe' ? `背景延伸風險較高或未能確定。${analysis.background?.reason || ''}建議圖片與文字分開。`
    : '向下延伸後主體仍會與文字重疊，建議圖片與文字分開。' };
}
