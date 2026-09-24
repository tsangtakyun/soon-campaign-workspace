import { DraftStepError } from './draft-generation-step';

const string = { type: 'string' };
const strings = { type: 'array', items: string };
const object = (properties: Record<string, unknown>, required: string[]) => ({type:'object', properties, required, additionalProperties:false});
export const draftOutputSchema = object({
  captionDraft:string, hook:string, durationSeconds:{type:'number'}, shotList:strings,
  pages:{type:'array', minItems:1, items:object({
    page:string, headline:string, subheadline:string, body:{...strings,minItems:1},
    assetId:string, assetIds:strings, role:string, layout:string, templateArtboardId:string,
    // Anthropic rejects maxItems; enforce this constraint after generation.
    contentRole:{type:'string',enum:['narrative','comparison']}, comparisonLabels:{...strings,description:'At most three comparison dimension labels.'}, imageTreatment:string,
    comparisonRows:{type:'array',items:object({label:string,left:string,right:string},['label','left','right']),description:'At most three aligned comparison rows: one shared dimension and both values in each row.'},
    assetStatus:{type:'string',enum:['matched','missing']},
    assetRequest:object({reason:string,suggestions:strings},['reason','suggestions']),
    designDirection:string,
  },['page','headline','subheadline','body','assetId','layout','designDirection'])},
},['captionDraft','pages']);

export class DraftOutputError extends DraftStepError {
  constructor() { super('AI 草稿格式未完整；原有草稿及圖片未被覆蓋。請再按下一步重試草稿，毋須重新生成素材。'); }
}

export function readDraftOutput(response: any, expectedPages?: number) {
  if(response?.stop_reason === 'max_tokens' || response?.stop_reason === 'refusal') throw new DraftOutputError();
  const text=(Array.isArray(response?.content)?response.content:[])
    .filter((part:any)=>part.type==='text').map((part:any)=>part.text||'').join('\n').trim()
    .replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  let value:any;
  try { value=JSON.parse(text); } catch { throw new DraftOutputError(); }
  if(!value || typeof value.captionDraft!=='string' || !Array.isArray(value.pages) || !value.pages.length ||
    (expectedPages!==undefined && value.pages.length!==expectedPages) ||
    value.pages.some((page:any)=>!page || typeof page.headline!=='string' || typeof page.designDirection!=='string' ||
      !Array.isArray(page.body) || !page.body.length || page.body.some((line:any)=>typeof line!=='string') ||
      (page.comparisonLabels !== undefined && (!Array.isArray(page.comparisonLabels) || page.comparisonLabels.length>3 || page.comparisonLabels.some((label:any)=>typeof label!=='string')))))
    throw new DraftOutputError();
  for(const page of value.pages){
    if(page.comparisonRows!==undefined){
      const rows=page.comparisonRows;
      if(!Array.isArray(rows)||rows.length>3||rows.some((r:any)=>!r||['label','left','right'].some(k=>typeof r[k]!=='string')||[r.label,r.left,r.right].some(s=>/[\n；;]/u.test(s))))throw new DraftOutputError();
      if((page.role||page.layout)==='comparison'&&rows.length){
        page.comparisonLabels=rows.map((r:any)=>r.label);
        page.body[2]=rows.map((r:any)=>r.left).join('\n');
        page.body[3]=rows.map((r:any)=>r.right).join('\n');
      }
      // Persist only the canonical editable fields, never a stale second copy.
      delete page.comparisonRows;
    }
  }
  return value;
}

// Each attempt is separately persisted by the caller. Retry only malformed output,
// never authentication, quota, storage, network or lease failures.
export async function withDraftFormatRetry<T>(execute:(attempt:number)=>Promise<T>):Promise<T> {
  for(let attempt=0;attempt<2;attempt++) {
    try { return await execute(attempt); }
    catch(error) { if(!(error instanceof DraftOutputError) || attempt===1) throw error; }
  }
  throw new DraftOutputError();
}
