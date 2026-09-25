import {magazineCopyInstruction,productionCopyIssues} from './magazine-copy-policy';
import {draftOutputSchema,readDraftOutput} from './draft-output';
import {draftAnthropic,runDraftStep,DraftStepError,type DraftScope} from './draft-generation-step';
import {copyFieldTargets,copyCandidateRequest,readCopyCandidates,applyCopyCandidates,rejectedCopyCandidates,type CopyFitFeedback} from './copy-field-candidates';

export async function repairMagazineCopy(scope:DraftScope,apiKey:string,model:string,original:Record<string,any>[],contract:any,attempt='',round=0,previousFeedback:Record<string,CopyFitFeedback[]>={}){
  let pages=original.map(p=>({...p}));
  const feedback={...previousFeedback};
  let processedPage:string|undefined;
  // One paid call per HTTP request; the caller checkpoints before continuing.
  for(let step=0;step<1;step++){
    const invalid=pages.map((page,index)=>({page,index,issues:productionCopyIssues(page,contract)})).filter(p=>p.issues.length).slice(0,1);
    if(!invalid.length)break;
    processedPage=String(invalid[0].page.page);
    const targets=copyFieldTargets(invalid[0].page,contract);
    for(const target of targets){
      const prior=previousFeedback[processedPage]?.find(f=>f.field===target.field&&f.original===target.original&&f.hardLimit===target.hardLimit);
      if(prior)target.previousRejections=prior.rejected;
    }
    const request=targets.length?copyCandidateRequest(model,targets):{model,max_tokens:1800,temperature:0.1,
      output_config:{format:{type:'json_schema',schema:draftOutputSchema}},
      system:magazineCopyInstruction,
      messages:[{role:'user',content:[
        '你是文案精簡編輯。只修正下列頁面的文案問題，保留原有事實、否定、歸因、不確定性、必要數字及品牌名稱；不新增資料，不以截斷、刪掉關鍵限制或省略號充數。',
        '只回傳列出的頁面，page及次序不变，captionDraft留空。合格欄位保持原文。對超限欄位以完整短句改寫，目標為上限的80%，預留換行空間；不得改圖片、版型或角色。',
        `母版额外上限（與system取較小值）：${JSON.stringify(contract?.copy_limits||{headline_chars_zh_max:24,body_chars_zh_max_per_block:72})}`,
        JSON.stringify(invalid),
      ].join('\n')}],
    };
    const savedOutput={fields:targets.flatMap(target=>target.previousRejections?.length?[{field:target.field,candidates:target.previousRejections.map(item=>item.text)}]:[])};
    const savedPage=targets.length&&savedOutput.fields.length?applyCopyCandidates(invalid[0].page,targets,savedOutput):null;
    const canReuse=Boolean(savedPage&&productionCopyIssues(savedPage,contract).length<invalid[0].issues.length);
    let fieldOutput:ReturnType<typeof readCopyCandidates>|undefined;
    let output:{pages:Record<string,any>[]};
    if(canReuse){
      fieldOutput=savedOutput;
      output={pages:[savedPage!]};
    }else{
      const result=await runDraftStep(scope,{kind:'magazine-auto-fit-fields-v4',attempt,round,targets,pages:invalid,limits:contract?.copy_limits},model,async()=>{
        try{
          const response=await draftAnthropic(apiKey,request,75_000);return {response,usage:response.usage};
        }catch(error){
          if(error instanceof DraftStepError&&error.status===504)throw new DraftStepError(`${processedPage} 文案精簡逾時；之前完成的頁面已保存。再按製作會只處理未完成文案，毋須重新上載。`,504);
          throw error;
        }
      },r=>{if(targets.length){readCopyCandidates(r.response);return;}const value=readDraftOutput(r.response,invalid.length);if(value.pages.some((p:any,i:number)=>p.page!==invalid[i].page.page))throw new Error('AI 文案頁碼不符；原稿保留。');});
      fieldOutput=targets.length?readCopyCandidates(result.output.response):undefined;
      output=targets.length?{pages:[applyCopyCandidates(invalid[0].page,targets,fieldOutput!)]}:readDraftOutput(result.output.response,invalid.length);
    }
    if(targets.length)feedback[processedPage]=rejectedCopyCandidates(targets,fieldOutput!);
    for(const [i,item]of invalid.entries()){
      const p=output.pages[i];
      const colloquial=(s:unknown)=>/[唔嘅咁睇揀]|幾時|食緊|識得/.test(String(s||''));
      const candidate:Record<string,any>={...item.page,
        headline:item.issues.some(s=>s.includes('標題'))||colloquial(item.page.headline)?p.headline:item.page.headline,
        subheadline:item.issues.some(s=>s.includes('分類短標'))||colloquial(item.page.subheadline)?p.subheadline||'':item.page.subheadline,
        body:item.issues.includes('正文欄位數目不符')?p.body:item.page.body.map((text:unknown,index:number)=>
          item.issues.some(s=>s.includes(`正文${index+1}超過`)||s.includes(`正文${index+1}最多`)||s.includes(`正文${index+1}第`))||colloquial(text)?p.body[index]??text:text),
        comparisonLabels:item.issues.some(s=>s.includes('維度標籤'))?p.comparisonLabels||[]:item.page.comparisonLabels,
      };
      // Never accept deleting meaningful copy as a way to pass a length gate.
      if(!candidate.headline.trim() || candidate.body.some((s:unknown,index:number)=>String(item.page.body[index]||'').trim()&&!String(s||'').trim()))continue;
      // Old explicit copy overrides must not mask the newly fitted text.
      if(candidate.fields)candidate.fields={...candidate.fields};
      if(candidate.fields){
        if(candidate.headline!==item.page.headline)delete candidate.fields.headline;
        if(candidate.subheadline!==item.page.subheadline){delete candidate.fields.subheadline;delete candidate.fields.eyebrow;}
        const aliases:Record<number,string[]>={0:['option_a','label_left','feature_title_1'],1:['option_b','label_right','question','feature_body_1'],2:['left_body','cta','feature_title_2'],3:['right_body','feature_body_2'],4:['comparison_highlight','highlight','feature_title_3'],5:['comparison_source','feature_body_3']};
        candidate.body.forEach((s:unknown,index:number)=>{
          if(s===item.page.body[index])return;
          delete candidate.fields.body;delete candidate.fields[`body_${index+1}`];
          for(const key of aliases[index]||[])delete candidate.fields[key];
          if(candidate.role==='comparison'||candidate.layout==='comparison'){
            if(index===2||index===3)for(let row=1;row<=3;row++)delete candidate.fields[`${index===2?'left':'right'}_row_${row}`];
          }
          const role=String(candidate.role||candidate.layout);
          if(index===({longform:3,split:3,comparison:5,feature:6} as Record<string,number>)[role])delete candidate.fields.source;
          if(index===2&&['longform','split'].includes(role))delete candidate.fields.highlight;
        });
      }
      // A worse repair must never replace the previous candidate.
      if(productionCopyIssues(candidate,contract).length<=item.issues.length)pages[item.index]=candidate;
    }
  }
  const issues=pages.flatMap((p,index)=>{const issues=productionCopyIssues(p,contract);return issues.length?[{page:p.page||`P.${index+1}`,issues}]:[];});
  for(const p of pages)if(!productionCopyIssues(p,contract).length)delete feedback[String(p.page)];
  return {pages,issues,processedPage,feedback};
}
