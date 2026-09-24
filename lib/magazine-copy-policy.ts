/** Copy constraints are independent of the immutable master geometry. */
export const magazineCopyInstruction = [
  '以下欄位規則優先於一般品牌口吻及示範文案。全套圖片使用繁體中文書面語（包括封面、標題、提問）；保留品牌名稱，不使用食、揀、唔、嘅、睇、咁、幾時等口語。',
  '標題最多18字；封面及收尾在完整短語之間加入一個換行，每行最多10字，絕不拆開詞語。Eyebrow最多10字。',
  'cover body=[一句副文]，最多28字；longform/split body=[段落一,段落二,重點句,來源]，兩段各最多65字且長度接近，重點句最多24字，來源最多40字。split不是三個平行論點清單，不可把第三論點塞到重點句欄。',
  'comparison body=[左標籤,右標籤,左內容,右內容,結論,來源]；標籤最多18字，左右內容各最多90字、依相同次序分成最多三行，結論最多32字。另回傳comparisonLabels陣列，最多三個與本題材相關的共同比較維度，每項最多8字；維度和左右每行一一對應。不沿用示範的進食、活動、能量來源。缺資料不捏造，沒有內容的列留空。',
  'feature body=[標題一,說明一,標題二,說明二,標題三,說明三,來源]；標題各最多10字，不加重點一等重複前綴；說明各最多48字；來源最多40字。',
  'end body=[總結,提問,行動提示]，上限分別40、18、18字。提問與行動提示不放長篇論述。',
  '所有未核實說法在各頁均須保留歸因及不確定性，不能在封面或中段改寫成已證實因果／效果。來源只有原帖時，不可寫成已查證原始研究。不得新增事實。',
].join('\n');
const length=(v:unknown)=>Array.from(String(v||'').replace(/\s/g,'')).length;
export function magazineCopyIssues(page:Record<string,any>):string[] {
  const role=String(page.role||page.layout||''),body=Array.isArray(page.body)?page.body:[],issues:string[]=[];
  if(length(page.headline)>18)issues.push('標題超過18字');
  if(length(page.subheadline)>10)issues.push('分類短標超過10字');
  const limits:Record<string,number[]>={cover:[28],longform:[65,65,24,40],split:[65,65,24,40],comparison:[18,18,90,90,32,40],feature:[10,48,10,48,10,48,40],end:[40,18,18]};
  const budget=limits[role];
  if(budget){if(body.length>budget.length)issues.push('正文欄位數目不符');body.forEach((s:any,i:number)=>{if(length(s)>(budget[i]??0))issues.push(`正文${i+1}超過${budget[i]??0}字`);});}
  if(/[唔嘅咁睇揀]|幾時|食緊|識得/.test([page.headline,page.subheadline,...body].join('\n')))issues.push('仍有廣東話口語，請用書面語');
  if(role==='comparison'&&page.contentRole!=='narrative'){
    const count=Math.min(3,Math.max(...[body[2],body[3]].map(s=>String(s||'').split(/\n|[；;]/u).filter(Boolean).length)));
    if(!Array.isArray(page.comparisonLabels)||page.comparisonLabels.filter((s:any)=>typeof s==='string'&&s.trim()).length<count)issues.push('缺少與比較內容對應的維度標籤');
  }
  return issues;
}

/** The same gate is used before rendering and when validating AI repairs. */
export function productionCopyIssues(page:Record<string,any>, contract:any):string[] {
  const issues=magazineCopyIssues(page);
  const headline=Number(contract?.copy_limits?.headline_chars_zh_max||24);
  const body=Number(contract?.copy_limits?.body_chars_zh_max_per_block||72);
  if(length(page.headline)>headline)issues.push(`母版標題最多${headline}字`);
  (Array.isArray(page.body)?page.body:[]).forEach((s:unknown,i:number)=>{
    if(Array.from(String(s||'')).length>body)issues.push(`母版正文${i+1}最多${body}字（包括空格及換行）`);
  });
  return issues;
}
