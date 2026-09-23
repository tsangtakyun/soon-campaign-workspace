// Explicit opt-in, one paid model call; test output is retained outside the repository.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto'),sharp=require('sharp');
async function main(){
  if(!process.argv.includes('--run-paid-trial'))throw Error('Explicit --run-paid-trial required');
  require('@next/env').loadEnvConfig('/Users/tommytsang/Desktop/SOON/soon-campaign-workspace');
  const record={id:crypto.randomUUID(),status:'pending',createdAt:new Date().toISOString()};
  const outputPath=`/tmp/soon-ai-subject-trial-${record.id}.json`;
  fs.writeFileSync(outputPath,JSON.stringify(record));
  const box={exports:{},require,AbortSignal,process};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/ai-subject-focus.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
  try{
    const image=await sharp('public/templates/clear-magazine-carousel-v3/longform-bear-clean.png').rotate().resize({width:1024,height:1024,fit:'inside'}).jpeg().toBuffer();
    const result=await box.exports.detectSubject(image);
    const saved={...record,status:'ready',model:box.exports.SUBJECT_MODEL,detection:result.output,focus:box.exports.focusFromDetection(result.output),usage:result.totalUsage};
    fs.writeFileSync(outputPath,JSON.stringify(saved,null,2));console.log(JSON.stringify(saved));
  }catch(error){fs.writeFileSync(outputPath,JSON.stringify({...record,status:'failed',error:error.name},null,2));console.error(error.name, String(error.message).slice(0,500));process.exitCode=1;}
}
main();
