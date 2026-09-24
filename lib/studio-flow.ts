export type StudioStep = 'brief'|'format'|'structure'|'assets'|'style'|'drafts'|'carousel';
export const imageStudioSteps: Array<{id:StudioStep;label:string}> = [
  {id:'brief',label:'Brief'},{id:'format',label:'格式及風格'},
  {id:'structure',label:'內容及配圖'},{id:'carousel',label:'成品及編輯'},
];
export function imageStep(step:StudioStep):StudioStep {
  return step==='style'?'format':step==='assets'||step==='drafts'?'structure':step;
}
export function imageLatestStep(project:{stage:string;selected_format?:string|null;format_decision?:Record<string,unknown>;production?:Record<string,unknown>}):StudioStep {
  if(project.stage==='brief')return 'brief';
  if(!project.selected_format||project.stage==='format'||!project.format_decision?.templateCode)return 'format';
  return ['drafts_confirmed','images_ready','package_ready'].includes(String(project.production?.productionStatus))?'carousel':'structure';
}
