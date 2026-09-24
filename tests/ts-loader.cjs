const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function resolveImport(name,file,deps={}) {
  if(deps[name])return deps[name];
  if(name.startsWith('.')||name.startsWith('@/')) {
    const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);
    const target=['.ts','.tsx','.cjs','.js',''].map(ext=>base+ext).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
    if(target&&/\.tsx?$/.test(target))return load(target,deps);
    if(target)return require(target);
  }
  return require(name);
}
function load(file,deps={}) {
  const box={exports:{},Buffer,AbortSignal,URL,process,fetch,console,setTimeout,clearTimeout,require:name=>resolveImport(name,file,deps)};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,box);
  return box.exports;
}
module.exports={load,resolveImport};
