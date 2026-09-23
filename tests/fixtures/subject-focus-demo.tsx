// Isolated interactive test. No production APIs, credentials or project data.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SubjectFocusEditor } from '../../components/content/SubjectFocusEditor';
import { subjectCrop, type SubjectFocus } from '../../lib/subject-crop';
function Demo() {
  const [asset, setAsset] = useState({ id: 'fixture', url: '/photo.png', width: 1080, height: 1800, subjectFocus: null as SubjectFocus | null });
  const crop = subjectCrop(asset, { x: 0, y: 0, width: 320, height: 400 }, [{ x: 0, y: 280, width: 320, height: 120 }]);
  return <main style={{ fontFamily: 'sans-serif', display: 'flex', gap: 28, padding: 24 }}>
    <section style={{ width: 320 }}><h2>焦點互動測試</h2>
      <div style={{ position: 'relative', width: 320, height: 400, overflow: 'hidden' }}>
        <img src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: crop.position }}/>
        <div style={{ position: 'absolute', bottom: 0, height: 120, background: '#000b', color: 'white', width: '100%', padding: 12, boxSizing: 'border-box' }}>文字安全區<br/>測試標題</div>
      </div>
      <output>{crop.active ? crop.constrained ? '空間不足' : '焦點已套用' : '原本定位'} · {crop.position}</output>
      <p>只供測試，儲存於此頁記憶體。</p>
    </section>
    <section style={{ width: 320 }}><SubjectFocusEditor asset={asset} onSave={async (_id, updates) => { setAsset({ ...asset, ...updates }); return true; }}/></section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
