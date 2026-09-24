import React from 'react';
import {createRoot} from 'react-dom/client';
import {CoreCatalogExample} from '../components/content/CoreCatalogExample';
import contract from './fixtures/clear-magazine-v3.contract.json';
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1000,margin:'24px auto',fontFamily:'system-ui'}}><h1>格式及風格</h1><p>Core 已發布母版示範 — 不生成、不換內容</p><div style={{width:320}}><CoreCatalogExample contract={contract}/></div></main>);
