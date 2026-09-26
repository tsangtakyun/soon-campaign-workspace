"use client";
import {useEffect,useRef,useState} from 'react';
import {getCoreMasterPageDesign,type CoreMasterRole} from '@/lib/content-templates/core-master-template';

let magazineFontsPromise:Promise<void>|null=null;

function loadMagazineFonts(){
  if(magazineFontsPromise)return magazineFontsPromise;
  const fonts=[['SOON Magazine Serif','/fonts/magazine/Serif-Regular.otf','400'],['SOON Magazine Serif','/fonts/magazine/Serif-Black.otf','900'],['SOON Magazine Sans','/fonts/magazine/Sans-Regular.otf','400'],['SOON Magazine Sans','/fonts/magazine/Sans-Bold.otf','700']];
  magazineFontsPromise=Promise.all(fonts.map(async([family,url,weight])=>{
    const face=new FontFace(family,`url(${url})`,{weight});
    await face.load();
    document.fonts.add(face);
  })).then(()=>undefined).catch((error)=>{magazineFontsPromise=null;throw error;});
  return magazineFontsPromise;
}

/** Display the published example literally: no content binding, AI calls or project mutation. */
export function CoreCatalogExample({contract}:{contract:unknown}) {
  const [role,setRole]=useState<CoreMasterRole>('cover');
  const [error,setError]=useState(false);
  const [loading,setLoading]=useState(true);
  const host=useRef<HTMLDivElement>(null);
  const design=getCoreMasterPageDesign(contract,role);
  useEffect(()=>{
    if(!host.current||!design?.canvasJson){setLoading(false);return;}
    let cancelled=false,canvas:import('fabric').StaticCanvas|undefined;
    const element=document.createElement('canvas');host.current.replaceChildren(element);setError(false);setLoading(true);
    void (async()=>{
      const {StaticCanvas}=await import('fabric');if(cancelled)return;
      await loadMagazineFonts();
      if(cancelled)return;
      canvas=new StaticCanvas(element,{width:design.coordinateWidth||design.canvasWidth||1080,height:design.coordinateHeight||design.canvasHeight||1350,renderOnAddRemove:false});
      const json=JSON.parse(JSON.stringify(design.canvasJson));
      const fix=(objects:any[])=>objects.forEach(o=>{if(typeof o.src==='string'&&o.src.startsWith('/'))o.src=`https://soon-core.vercel.app${o.src}`;if(o.objects)fix(o.objects);});fix(json.objects||[]);
      await canvas.loadFromJSON(json);if(cancelled)return;canvas.renderAll();
      element.style.width='100%';element.style.height='auto';
      setLoading(false);
    })().catch(()=>{if(!cancelled){setError(true);setLoading(false);}});
    return()=>{cancelled=true;void canvas?.dispose();};
  },[design]);
  return <section className="core-catalog-example">
    <div className="core-catalog-canvas">
      <div ref={host} style={{aspectRatio:'4 / 5',overflow:'hidden',background:'#f5f1e9'}}/>
      {loading?<div className="core-catalog-loading" role="status"><i aria-hidden="true"/><span>正在載入版面例子…</span></div>:null}
    </div>
    {error||!design?<p role="status">示範未能載入，請重試。</p>:null}
    <nav aria-label="內容風格示範">{(['cover','longform','end'] as const).filter(r=>getCoreMasterPageDesign(contract,r)).map((r)=><button type="button" key={r} aria-pressed={role===r} onClick={()=>setRole(r)}>{r==='cover'?'封面':r==='end'?'收尾':'內文'}</button>)}</nav>
    <small>以下為版面例子，實際內容及圖片會按你的題材製作。</small>
  </section>;
}
