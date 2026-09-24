import {z} from 'zod';
export const COMPOSITION_POLICY='shared-edges-v6';
const edge=z.object({safe:z.boolean(),subjectTouchesEdge:z.boolean(),environment:z.string().max(400),continuation:z.string().max(600)});
export const boundarySchema=z.object({confidence:z.enum(['high','medium','low']),subjects:z.string().max(400),top:edge,bottom:edge,left:edge,right:edge});
export function backgroundFromBoundaries(value:unknown){
 const parsed=boundarySchema.safeParse(value);
 const risk=(name:'top'|'bottom'|'left'|'right')=>!parsed.success||parsed.data.confidence!=='high'?'uncertain' as const:parsed.data[name].safe&&!parsed.data[name].subjectTouchesEdge&&parsed.data[name].environment.trim()&&parsed.data[name].continuation.trim()?'safe' as const:'risky' as const;
 return {upwardExtension:risk('top'),downwardExtension:risk('bottom'),leftwardExtension:risk('left'),rightwardExtension:risk('right'),reason:'按同一份原圖邊界證據規劃及檢查。'};
}
