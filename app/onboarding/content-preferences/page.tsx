'use client'

import { useEffect, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import {
  isBechillWorkspace,
  isEggWorkspace,
  resolveActiveWorkspace,
  WORKSPACE_CHANGED_EVENT,
} from '@/lib/workspace-client'

const bunchillLearnedPreferences = [
  {
    title: '內容方向',
    items: [
      '主力圍繞人與寵物之間的陪伴、等待、日常誤解與溫柔互動。',
      'Bunchill 不是單純搞笑角色，而是用「舒服一點」的邏輯回應生活壓力。',
      '內容感覺應輕鬆、可愛、生活化，帶少少自嘲，但不嘲笑真實人物或外貌。',
    ],
  },
  {
    title: '語氣偏好',
    items: [
      '自然香港廣東話、短句、輕輕幽默，不過分可愛。',
      '不使用說教、心靈導師、企業雞湯或硬煽情語氣。',
      'Bunchill 可以陪伴觀眾，但不是心理治療師，不把嚴重情緒問題簡化成一句安慰。',
    ],
  },
  {
    title: '視覺偏好',
    items: [
      '2D 圖像優先跟 20260809/02_F.jpg：暖白底、大量留白、幼細手繪線、柔淡上色。',
      '畫面需要生活化道具和具體場景，例如門口、鞋、書包、床邊、杯、風扇、毛巾等。',
      '避免粗啡色漫畫框、厚重 3D、公仔寫實質感、過度上色、複雜背景或海報式插畫。',
      'AI 插畫素材不放後製文字、對白框、IG 介面、額外 Logo 或 watermark，保留空間供 Photoshop 加字。',
    ],
  },
  {
    title: '角色一致性',
    items: [
      'Bunchill 通常一隻眼被長瀏海遮住，不加眼眉或眉毛。',
      '同一組圖要保持眼睛大小、眼睛位置、鼻、嘴巴和臉部比例穩定。',
      '藍白直間睡衣胸前口袋的 chill 布章必須清楚保留，不可被道具、手、桌面或裁切遮住。',
      'Carousel 需要表情和姿勢節奏，不可每張都完全同一個合眼淡定樣。',
    ],
  },
  {
    title: '製作流程',
    items: [
      'Meme 通常做 1-3 張主圖，可加第 4 張 soft landing，不拖成長篇故事。',
      '金句故事卡可做 4-8 格，每格只講一個瞬間，最後安靜收結。',
      '如用 Elkie 與 Bunchill 真實照片作收結，必須由客戶提供或確認；AI 不偽造真實照片。',
      '每次製作內容時，都會沿用已確認的偏好，確保角色、語氣與畫面方向保持一致。',
    ],
  },
]

const eggSoonLearnedPreferences = [
  {
    title: '內容方向',
    items: [
      '主力製作新聞、城市熱話、文化現象、品牌空間、影視娛樂、動物趣聞及生活觀察類 Carousel。',
      '每個題材都要有清楚反差或驗證問題，例如「這不是雪」、「35 歲不是人生結算」、「為甚麼 H&M 門口有巨大頭像」。',
      '內容不是純轉載新聞，而是拆開事件背後的視覺錯覺、社會情緒、文化背景或消費行為。',
    ],
  },
  {
    title: '資料核查',
    items: [
      '每次先分清已確認事實、官方資料、當事人自述、媒體報道、網上轉載及未確認說法。',
      '優先使用官方來源、原始影片、當事人公開資料、可信媒體及專家資料；社交留言只作線索。',
      '涉及健康、法律、犯罪、未成年人、死亡、人物關係或醫學風險時，要用保守語氣，不可將推測寫成定論。',
    ],
  },
  {
    title: '寫作語氣',
    items: [
      'Carousel 用繁體中文書面語，語氣可以好奇、有少少幽默，但要克制、準確，不製造恐慌或道德審判。',
      'Reel 用自然香港廣東話口語，短句、有節奏、保留主持人真實反應和主觀判斷，不硬 sell。',
      '避免空泛形容，例如「好正」、「好好食」、「爆紅到全世界都知」；要講具體感官、背景或判斷原因。',
    ],
  },
  {
    title: 'Carousel 結構',
    items: [
      '預設 8-10 頁，通常以 9 頁處理；每頁只講一個重點。',
      'P.1 用強 hook 或反差問題；中段交代背景、第一次反轉、核心知識、數字或證據；最後用安靜收結或互動問題。',
      '未得到確認前，只做資料核查與 P.1-P.N 故事結構；正式生成圖片前要逐頁確認素材和視覺方向。',
    ],
  },
  {
    title: '視覺偏好',
    items: [
      '整體走 editorial news carousel：4:5 直向、手機上快速讀到大標題、留白清楚、資訊層次明確。',
      '封面根據題材選擇黑底緊急新聞、白底情緒人物、米白權威新聞或黃色好奇知識型，不同題材不可套同一個模板。',
      '如未有授權真實圖片，要用示意圖、資料圖、剪影、地圖感或概念視覺，不可把 AI 圖包裝成真實新聞照片。',
    ],
  },
  {
    title: 'Eggy 角色使用',
    items: [
      'Eggy 是固定品牌角色，只作情緒輔助或觀眾視角，不需要每頁出現。',
      '使用 Eggy 時要跟角色設定與表情庫，保持蛋白輪廓、蛋黃五官、手腳比例和整體質感一致。',
      '寧可不用 Eggy，也不可使用走樣角色；不可讓 Eggy 遮擋新聞主體、人物面部、重要文字或證據相片。',
    ],
  },
  {
    title: '不可誇大',
    items: [
      '不可把打卡、爆紅、全城熱話、最高排名、最多人去等說法寫成定論，除非有可靠數據。',
      '不可直接使用未授權媒體圖、社交平台截圖或真實人物圖片作最終素材；需要先確認來源和使用限制。',
      '不可用 AI 生成真人演員、真實新聞現場、動物園事件或品牌合作現場，令觀眾誤以為是真實照片。',
    ],
  },
]

type WorkspacePreferenceMode = 'loading' | 'bechill' | 'egg' | 'empty'

export default function ContentPreferencesPage() {
  const [preferenceMode, setPreferenceMode] = useState<WorkspacePreferenceMode>('loading')

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      if (!cancelled) setPreferenceMode('loading')
      try {
        const { activeWorkspace } = await resolveActiveWorkspace()
        if (!cancelled) {
          setPreferenceMode(
            isBechillWorkspace(activeWorkspace) ? 'bechill' : isEggWorkspace(activeWorkspace) ? 'egg' : 'empty'
          )
        }
      } catch {
        if (!cancelled) setPreferenceMode('empty')
      }
    }

    void loadWorkspace()

    function handleWorkspaceChanged() {
      void loadWorkspace()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="內容偏好" />

      <section className="home-shell">
        <header className="home-topbar">
          <div>
            <h1>內容偏好</h1>
          </div>
        </header>

        <div className="content-prefs-body">
          <section className="cp-section">
            <div className="cp-learned-head">
              <div>
                <h2>SOON 已記住的內容偏好</h2>
              </div>
              {preferenceMode !== 'empty' && preferenceMode !== 'loading' ? <span>更新：2026年8月13日</span> : null}
            </div>
            {preferenceMode === 'loading' ? (
              <div className="cp-loading-panel" aria-busy="true">
                <strong>正在載入工作台內容偏好</strong>
                <span>SOON 正在讀取目前工作台的設定。</span>
                <div className="cp-skeleton-grid">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ) : preferenceMode !== 'empty' ? (
              <div className="cp-preference-grid">
                {(preferenceMode === 'egg' ? eggSoonLearnedPreferences : bunchillLearnedPreferences).map((group) => (
                  <article className="cp-preference-card" key={group.title}>
                    <h3>{group.title}</h3>
                    <ul>
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cp-empty-panel">
                <strong>內容偏好尚未整理</strong>
                <span>之後完成第一輪 prompt、製圖或客戶 feedback 後，這裡會只顯示目前工作台的偏好。</span>
              </div>
            )}
          </section>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

const styles = `
  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .home-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .home-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 20px;
  }

  .home-topbar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  .content-prefs-body {
    padding: 28px 20px;
    max-width: 920px;
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .cp-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .cp-empty-panel {
    min-height: 180px;
    border: 1px dashed #d9dbe1;
    border-radius: 12px;
    background: #fbfbfc;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 24px;
  }

  .cp-empty-panel strong {
    color: #202126;
    font-size: 16px;
  }

  .cp-empty-panel span {
    color: #6f737d;
    font-size: 14px;
    line-height: 1.6;
  }

  .cp-loading-panel {
    border: 1px solid #e4e5e9;
    border-radius: 12px;
    background: #ffffff;
    display: grid;
    gap: 8px;
    padding: 24px;
    min-height: 220px;
  }

  .cp-loading-panel strong {
    color: #202126;
    font-size: 16px;
  }

  .cp-loading-panel span {
    color: #6f737d;
    font-size: 14px;
  }

  .cp-skeleton-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 14px;
  }

  .cp-skeleton-grid i {
    min-height: 78px;
    border-radius: 10px;
    background: linear-gradient(90deg, #f3f4f6 0%, #fafafa 45%, #f3f4f6 100%);
    background-size: 220% 100%;
    animation: cpSkeleton 1.2s ease-in-out infinite;
  }

  @keyframes cpSkeleton {
    0% { background-position: 120% 0; }
    100% { background-position: -120% 0; }
  }

  .cp-section h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
    padding-bottom: 10px;
    border-bottom: 1px solid #e8e9ec;
  }

  .cp-desc {
    margin: 0;
    font-size: 13px;
    color: #6f737d;
    line-height: 1.5;
  }

  .cp-learned-head {
    align-items: flex-start;
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  .cp-learned-head h2 {
    margin-bottom: 6px;
  }

  .cp-learned-head > span {
    background: #f4f4f5;
    border: 1px solid #e2e3e7;
    border-radius: 999px;
    color: #6f737d;
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 9px;
  }

  .cp-preference-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cp-preference-card {
    background: #ffffff;
    border: 1px solid #e4e5e9;
    border-radius: 12px;
    padding: 14px 16px;
  }

  .cp-preference-card h3 {
    color: #202126;
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 10px;
  }

  .cp-preference-card ul {
    display: grid;
    gap: 7px;
    margin: 0;
    padding-left: 18px;
  }

  .cp-preference-card li {
    color: #5f636b;
    font-size: 13px;
    line-height: 1.5;
  }

  @media (max-width: 760px) {
    .cp-learned-head {
      flex-direction: column;
    }

    .cp-preference-grid {
      grid-template-columns: 1fr;
    }
  }
`
