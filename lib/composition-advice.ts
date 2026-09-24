import { subjectCrop, validSubjectFocus, type SubjectFocus, type CropRect } from './subject-crop';
import {extensionGeometry,type ExtensionPlacement} from './extension-geometry';
export type {ExtensionPlacement} from './extension-geometry';
type Risk='safe'|'risky'|'uncertain';
export type CompositionAnalysis = { focus: SubjectFocus | null; label:string; reason:string; cached:boolean;
 background?:{downwardExtension:Risk;upwardExtension?:Risk;leftwardExtension?:Risk;rightwardExtension?:Risk;reason:string} };
export type CompositionAdvice = { action:'keep'|'crop'|'extend'|'split'|'review';title:string;reason:string;placement?:ExtensionPlacement };
export function compositionAdvice(input:{width:number;height:number;frame:CropRect;textZones:CropRect[];analysis:CompositionAnalysis;documentary:boolean}):CompositionAdvice {
 const {width,height,frame,textZones,analysis}=input;
 const review=(reason:string):CompositionAdvice=>({action:'review',title:'此母版構圖需要處理',reason});
 if(!(width>0&&height>0&&frame.width>0&&frame.height>0)||!validSubjectFocus(analysis.focus))return review('未能可靠判斷主體或尺寸；母版及原圖保留。');
 const focus=analysis.focus;
 const crop=subjectCrop({width,height,subjectFocus:{...focus,sourceWidth:width,sourceHeight:height}},frame,textZones);
 const scale=Math.max(frame.width/width,frame.height/height);
 if(!crop.constrained&&frame.width*frame.height/(width*height*scale*scale)>=.7&&scale/(frame.width/width)<=1.5)
  return {action:'crop',title:'保留原圖，輕微調整裁切',reason:'現有比例可保留主體，文字亦有空間；毋須生成背景。'};
 if(input.documentary)return review('紀實原圖不生成背景；請確認原圖或選擇其他素材，母版不變。');
 const candidates:Array<{placement:ExtensionPlacement;score:number;directions:string[]}>=[];
 for(const expansion of [1,1.25,1.5,1.75,2])for(const topFraction of [0,.25,.5,.75,1])for(const leftFraction of [0,.25,.5,.75,1]){
  const placement={aspectRatio:frame.width/frame.height,topFraction,leftFraction,expansion};
  let g;try{g=extensionGeometry(width,height,placement);}catch{continue;}
  const margins=[g.originalTop,g.height-height-g.originalTop,g.originalLeft,g.width-width-g.originalLeft];
  if(margins.reduce((a,b)=>a+b,0)<32)continue;
  const risks=[analysis.background?.upwardExtension,analysis.background?.downwardExtension,analysis.background?.leftwardExtension,analysis.background?.rightwardExtension];
  if(margins.some((m,i)=>m>.01&&risks[i]!=='safe'))continue;
  const x=frame.x+((focus.x-focus.width/2)*width+g.originalLeft)/g.width*frame.width;
  const y=frame.y+((focus.y-focus.height/2)*height+g.originalTop)/g.height*frame.height;
  const w=focus.width*width/g.width*frame.width,h=focus.height*height/g.height*frame.height;
  if(textZones.some(z=>x<z.x+z.width+12&&x+w>z.x-12&&y<z.y+z.height+12&&y+h>z.y-12))continue;
  const centre=Math.abs((y+h/2-frame.y)/frame.height-.42)+Math.abs((x+w/2-frame.x)/frame.width-.5);
  candidates.push({placement,score:g.width*g.height/(width*height)+centre*.2,directions:['上','下','左','右'].filter((_,i)=>margins[i]>.01)});
 }
 const best=candidates.sort((a,b)=>a.score-b.score)[0];
 if(!best)return review('未找到能保留主體並避開文字的安全延伸方案；母版不變，請確認原圖或換圖。');
 return {action:'extend',placement:best.placement,title:`向${best.directions.join('、')}延伸背景`,reason:`按母版圖片框及文字安全區，只補環境，不改主體。${width<frame.width?'原圖較低解像度，延伸唔會令原圖變高清。':''}`};
}
