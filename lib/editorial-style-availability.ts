import type { ProductionStyle, StyleResult } from './production-style';

// Visual eligibility is not a factual endorsement. Never substitute unpublished
// styles, unsupported renderers, or an invented model recommendation.
export function editorialStyleAvailability(
  result: StyleResult,
  input: { format:string; story:unknown; assets:unknown },
  published: ProductionStyle[],
  supports: (template:ProductionStyle['templates'][number])=>boolean,
):StyleResult {
  if(result.styles.length || input.format!=='instagram_carousel') return result;
  const pages=Array.isArray(input.story)?input.story:[];
  const assets=Array.isArray(input.assets)?input.assets:[];
  if(!pages.length || !pages.every(page=>page && typeof page.headline==='string' &&
    typeof page.copyDirection==='string' && page.copyDirection.trim()) ||
    !assets.some(asset=>asset && typeof asset.url==='string' && asset.url)) return result;
  const style=published.find(style=>style.code==='clear_magazine_carousel' && style.format===input.format);
  if(!style) return result;
  const templates=style.templates.filter(supports);
  if(!templates.length) return result;
  const reason='版面適用性：已確認故事及圖片可使用清晰雜誌排版。這不是資料核實結果；未核實說法須保留來源歸因及不確定性，不可改寫成確定事實。';
  return {...result,emptyReason:'',styles:[{...style,templates,recommendation:{
    source:'layout_eligibility',reason,angle:'按已確認故事整理為雜誌式輪播，不新增事實。',score:0,
    gaps:['發布前核對來源及重要說法；未完成核實的內容不可當作已證實結論。'],
  }}]};
}
