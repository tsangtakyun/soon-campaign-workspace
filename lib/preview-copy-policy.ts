/** Role budgets fit the published magazine slots, not an invented fallback page. */
export function validPreviewCopy(value:any, index:number, count:number):boolean {
  const cover=index===0,end=!cover&&index===count-1;
  const limit=cover?24:end?45:65;
  const maxParagraphs=cover||end?1:2;
  return typeof value?.headline==='string' && value.headline.trim().length>0
    && Array.from(value.headline).length<=(cover||end?22:18)
    && Array.isArray(value.body) && value.body.length>=1 && value.body.length<=maxParagraphs
    && value.body.every((s:unknown)=>typeof s==='string' && s.trim().length>0 && Array.from(s).length<=limit)
    && typeof value.cta==='string' && Array.from(value.cta).length<=24
    && (end?value.cta.trim().length>0:value.cta==='');
}
