export function hasComparisonColumns(copy:{contentRole?:unknown;fields?:Record<string,string>;body?:unknown[]}) {
  if(copy.contentRole==='narrative')return false;
  return Boolean(copy.fields?.left_body?.trim() && copy.fields?.right_body?.trim()) || Boolean(copy.body && copy.body.length>=4 && String(copy.body[2]||'').trim() && String(copy.body[3]||'').trim());
}
