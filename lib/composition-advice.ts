import { subjectCrop, validSubjectFocus, type SubjectFocus, type CropRect } from './subject-crop';
export type CompositionAnalysis = { focus: SubjectFocus | null; label: string; reason: string; cached: boolean;
  background?: { downwardExtension: 'safe' | 'risky' | 'uncertain'; upwardExtension?: 'safe' | 'risky' | 'uncertain'; reason: string } };
export type ExtensionPlacement = { aspectRatio: number; topFraction: number };
export type CompositionAdvice = { action: 'keep' | 'crop' | 'extend' | 'split' | 'review'; title: string; reason: string; placement?: ExtensionPlacement };
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
  const aspectRatio = frame.width / frame.height, extendedHeight = width / aspectRatio;
  const supported = aspectRatio >= .25 && aspectRatio <= 2 && extendedHeight > height + 32 && extendedHeight <= height * 6;
  const candidates = !input.documentary && supported ? [0,.25,.5,.75,1].filter(top =>
    (top === 0 || analysis.background?.upwardExtension === 'safe') && (top === 1 || analysis.background?.downwardExtension === 'safe')
  ).map(topFraction => {
    const y = (focus.y * height + (extendedHeight-height)*topFraction)/extendedHeight;
    const extendedFocus = {...focus,y,height:focus.height*height/extendedHeight,sourceWidth:width,sourceHeight:extendedHeight};
    return {topFraction,y,crop:subjectCrop({width,height:extendedHeight,subjectFocus:extendedFocus},frame,textZones)};
  }).filter(c => !c.crop.constrained).sort((a,b)=>Math.abs(a.y-.45)-Math.abs(b.y-.45)) : [];
  const best = candidates[0];
  if (best) return {action:'extend',placement:{aspectRatio,topFraction:best.topFraction},title:best.topFraction===0?'向下延伸背景':best.topFraction===1?'向上延伸背景':'上下延伸背景',reason:`按此頁圖片框及文字位置，保留完整主體，避免放大裁切。${width < frame.width ? '原圖解像度較低，延伸唔會令原圖變高清。' : ''}`};
  return { action: 'review', title: '此母版構圖需要處理', reason: input.documentary ? '保留原圖，但此圖片未能配合母版安全區；請選擇其他圖片或確認原圖呈現。'
    : !supported ? '現有延伸器未支援此圖片框所需方向；母版保持不變，請換圖或確認保留原圖。'
    : analysis.background?.downwardExtension !== 'safe' ? `背景延伸風險較高或未能確定。${analysis.background?.reason || ''}母版保持不變，請換圖或確認原圖。`
    : '延伸後主體仍與文字重疊；母版保持不變，請換圖或確認原圖。' };
}
