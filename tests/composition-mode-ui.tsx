import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CompositionModeChoice} from '../components/content/CompositionModeChoice';
import {CoreMasterPreview} from '../components/content/CoreMasterPreview';
import {setCompositionMode,type CompositionMode} from '../lib/composition-mode';
import contract from './fixtures/clear-magazine-v3.contract.json';
function Fixture(){
 const [mode,setMode]=useState<CompositionMode>('original');
 const pages=[{page:'P.1',role:'cover',headline:'自然觀察',copyDirection:'觀察動物與環境。'}, {page:'P.2',role:'longform',headline:'環境與生存',copyDirection:'以完整圖片說明環境。\n每頁保留清晰的文字層級。'}, {page:'P.6',role:'end',headline:'你會選擇哪一隻？',copyDirection:'認識自然。\n你的選擇？\n留言分享。'}];
 const assets=setCompositionMode(pages.map((p,i)=>({id:String(i),assignedPage:p.page,isCover:i===0,url:'/templates/clear-magazine-carousel-v3/longform-bear-clean.png',width:1080,height:650,sourceType:'upload'})),mode);
 return <main><h1>圖片製作模式 · 互動驗證</h1><CompositionModeChoice mode={mode} busy={false} onChoose={setMode}/><p role="status">目前模式：{mode} · 此測試不呼叫 AI</p><div className="cards">{[1,2,3].map(i=><article key={i}><CoreMasterPreview contract={contract} pages={pages} assets={assets} brandName="TEST"/><h2>風格示範 {i}</h2></article>)}</div></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
