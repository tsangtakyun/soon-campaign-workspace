import React from 'react';
import {createRoot} from 'react-dom/client';
import {CoreCatalogExample} from '../components/content/CoreCatalogExample';
import {createCoreMasterCanvas} from '../lib/content-templates/core-master-template';
import source from './fixtures/clear-magazine-v3.contract.json';
const design=source.master_designs.comparison;
const canvas=createCoreMasterCanvas({design:design as any,copy:{headline:'兩款產品如何比較',comparisonLabels:['原料','製法'],body:['甲產品','乙產品','原料甲\n製法甲','原料乙\n製法乙','請查看產品標籤','']},page:'04',primary:{url:'/templates/clear-magazine-carousel-v3/cover-bear-clean.png'},secondary:{url:'/templates/clear-magazine-carousel-v3/end-bear-clean.png'},branding:{name:'TEST'},fonts:{family:'SOON Magazine Sans',editorialFamily:'SOON Magazine Serif'}});
const contract={master_designs:{cover:{...design,canvasJson:canvas,coordinateWidth:1080,coordinateHeight:1350}}};
createRoot(document.getElementById('root')!).render(<main style={{width:432,margin:'20px auto'}}><h2>比較欄位綁定測試</h2><CoreCatalogExample contract={contract}/></main>);
