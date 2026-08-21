'use client'

import { useEffect, useMemo, useState } from 'react'

type AdAccount = { id: string; name?: string; account_status?: number; currency?: string }
type MetaPage = { id: string; name?: string; instagram_business_account?: { id?: string; username?: string } }
type CandidatePost = { id: string; title?: string | null; body?: string | null; image_url?: string | null }
type SetupData = {
  connected: boolean
  appLive?: boolean
  brandName?: string
  selectedAdAccountId?: string | null
  adAccounts?: AdAccount[]
  pages?: MetaPage[]
  posts?: CandidatePost[]
  permissions?: Array<{ permission?: string; status?: string }>
}
type LaunchBlocker = {
  code?: string
  createdCampaignId?: string | null
  createdAdSetId?: string | null
  creativeIds?: string[]
  adIds?: string[]
  partial?: boolean
}
type LaunchResult = {
  campaignId?: string
  adSetId?: string
  creativeIds?: string[]
  adIds?: string[]
  message?: string
}

const steps = ['連接', '目標', '主題', '素材', '檢查', '投放設定']
const objectiveOptions = [
  { value: 'awareness', label: '品牌知名度', description: '將廣告展示給最有可能記住品牌的人' },
  { value: 'traffic', label: '網站流量', description: '引導受眾前往網站、商店或登記頁面' },
  { value: 'engagement', label: '互動', description: '獲取更多讚好、留言及內容互動' },
  { value: 'leads', label: '潛在客戶', description: '透過表格或登記頁面收集客戶資料' },
] as const

export function MetaAdsWizard({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [result, setResult] = useState<LaunchResult | null>(null)
  const [launchBlocker, setLaunchBlocker] = useState<LaunchBlocker | null>(null)
  const [launchAttemptId] = useState(() => crypto.randomUUID())
  const [adAccountId, setAdAccountId] = useState('')
  const [pageId, setPageId] = useState('')
  const [instagramAccountId, setInstagramAccountId] = useState('')
  const [objective, setObjective] = useState<'awareness' | 'traffic' | 'engagement' | 'leads'>('awareness')
  const [targetLink, setTargetLink] = useState('https://sooncreator.network/')
  const [topic, setTopic] = useState('')
  const [headline, setHeadline] = useState('將好內容，推到對的人面前')
  const [caption, setCaption] = useState('每一篇內容都值得被更多人看見。SOON 將內容策略、創作、排程與成效分析整合於同一工作台，讓品牌更快建立持續、有方向的內容。立即了解 SOON，開始把內容變成可累積的品牌資產。')
  const [callToAction, setCallToAction] = useState('LEARN_MORE')
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [dailyBudget, setDailyBudget] = useState(80)
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(65)
  const [country, setCountry] = useState('HK')
  const [confirmed, setConfirmed] = useState(false)

  async function loadSetup() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/meta-ads/setup?workspace_id=${workspaceId}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '未能讀取 Meta Ads 連接')
      setSetup(data)
      const accounts = (data.adAccounts || []) as AdAccount[]
      const selectedAccount = accounts.find((account) => account.id === data.selectedAdAccountId) || accounts.find((account) => account.account_status === 1)
      if (selectedAccount) setAdAccountId(selectedAccount.id)
      const page = (data.pages || [])[0] as MetaPage | undefined
      if (page) {
        setPageId(page.id)
        setInstagramAccountId(page.instagram_business_account?.id || '')
      }
      const brandName = data.brandName || 'SOON'
      setCampaignName(`${brandName} — ${new Date().toLocaleDateString('zh-HK')}`)
      setTopic(`推廣 ${brandName} 的品牌內容及服務`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未能讀取 Meta Ads 連接')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadSetup() }, [workspaceId])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !launching) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [launching, onClose])

  const selectedPage = useMemo(() => setup?.pages?.find((page) => page.id === pageId), [pageId, setup?.pages])
  const missingPermission = Boolean(setup?.connected) && !(
    setup?.permissions?.some((item) => item.permission === 'ads_management' && item.status === 'granted')
    && setup?.permissions?.some((item) => item.permission === 'ads_read' && item.status === 'granted')
  )
  const currency = setup?.adAccounts?.find((account) => account.id === adAccountId)?.currency || '帳戶貨幣'
  const adAccountNumber = adAccountId.replace(/^act_/, '')
  const adsManagerUrl = result?.campaignId && adAccountNumber
    ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(adAccountNumber)}&selected_campaign_ids=${encodeURIComponent(result.campaignId)}`
    : ''

  function next() {
    setError('')
    if (step === 0 && (!adAccountId || !pageId)) return setError('請選擇可用 Ad Account 及 Facebook Page')
    if (step === 1 && !targetLink.trim()) return setError('請輸入推廣網址')
    if (step === 2 && !topic.trim()) return setError('請輸入 Campaign 主題')
    if (step === 3 && !selectedPostIds.length) return setError('請至少選擇一個素材')
    setStep((value) => Math.min(5, value + 1))
  }

  async function launch() {
    if (!confirmed) return setError('請先確認 Campaign 會真實建立到 Meta')
    setLaunching(true)
    setError('')
    setLaunchBlocker(null)
    try {
      const response = await fetch('/api/meta-ads/launch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspaceId, adAccountId, pageId, instagramAccountId, objective, targetLink,
          topic, headline, caption, callToAction, postIds: selectedPostIds, campaignName,
          dailyBudget, ageMin, ageMax, countries: [country], launchAttemptId,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setLaunchBlocker(data)
        throw new Error(data.error || '未能建立 Meta Campaign')
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未能建立 Meta Campaign')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="maw-overlay" role="dialog" aria-modal="true" aria-label="建立 Meta Campaign">
      <div className="maw-modal">
        <header className="maw-header">
          <strong>Meta Ad Campaign</strong>
          <div className="maw-progress">{steps.map((label, index) => <span className={index <= step ? 'active' : ''} key={label}>{index + 1} {label}</span>)}</div>
          <button className="maw-close" type="button" onClick={onClose} disabled={launching} aria-label="關閉 Meta Ad Campaign 設定">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="maw-body">
          {!loading && error && step !== 5 ? <div className="maw-error">{error}</div> : null}
          {loading ? (
            <div className="maw-loading" role="status" aria-live="polite">
              <span className="maw-spinner" aria-hidden="true" />
              <strong>正在檢查 Meta 連接…</strong>
              <small>正在讀取 Ad Account、Facebook Page 及 Instagram Account</small>
            </div>
          ) : result ? (
            <section className="maw-success">
              <h2>Campaign 已建立到 Meta</h2>
              <p>{result.message}</p>
              <div className="maw-result-ids">
                <strong>Campaign ID：{result.campaignId || '—'}</strong>
                <strong>Ad Set ID：{result.adSetId || '—'}</strong>
                <strong>Creative ID：{result.creativeIds?.join('、') || '—'}</strong>
                <strong>Ad ID：{result.adIds?.join('、') || '—'}</strong>
              </div>
              <p>目前狀態為 PAUSED，不會投放或產生廣告費。請到 Meta Ads Manager 檢查付款方式、受眾、版位、預算及素材，確認無誤後才開啟 Campaign。</p>
              {adsManagerUrl ? <a className="maw-ads-manager-link" href={adsManagerUrl} target="_blank" rel="noreferrer">前往 Meta Ads Manager 檢查並啟用</a> : null}
            </section>
          ) : step === 0 ? (
            <section>
              <h2>連接 Meta Ads 帳戶</h2>
              {!setup?.connected || missingPermission ? (
                <div className="maw-connect-warning">
                  <p>{setup?.connected ? '目前連接未有 ads_management 權限，需要重新授權一次。' : '尚未連接 Meta Ads。'}</p>
                  <button
                    type="button"
                    onClick={() => window.location.assign(`/api/auth/facebook?workspaceId=${encodeURIComponent(workspaceId)}`)}
                  >
                    重新連接 Meta Ads
                  </button>
                </div>
              ) : null}
              <label>Ad Account<select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}><option value="">請選擇</option>{setup?.adAccounts?.map((account) => <option disabled={account.account_status !== 1} value={account.id} key={account.id}>{account.name || account.id} · {account.currency || ''}</option>)}</select></label>
              <label>Facebook Page<select value={pageId} onChange={(e) => { const id = e.target.value; setPageId(id); setInstagramAccountId(setup?.pages?.find((page) => page.id === id)?.instagram_business_account?.id || '') }}><option value="">請選擇</option>{setup?.pages?.map((page) => <option value={page.id} key={page.id}>{page.name || page.id}</option>)}</select></label>
              <label>Instagram Account<input readOnly value={selectedPage?.instagram_business_account?.username || instagramAccountId || '此 Page 未連接 Instagram Business'} /></label>
            </section>
          ) : step === 1 ? (
            <section><h2>設定目的與目標</h2><div className="maw-options">{objectiveOptions.map((option) => <button className={objective === option.value ? 'selected' : ''} onClick={() => setObjective(option.value)} type="button" key={option.value}><strong>{option.label}</strong><span>{option.description}</span></button>)}</div><label>推廣網址<input value={targetLink} onChange={(e) => setTargetLink(e.target.value)} /></label></section>
          ) : step === 2 ? (
            <section><h2>設定 Campaign 主題</h2><label>Campaign 關於甚麼？<textarea rows={6} value={topic} onChange={(e) => setTopic(e.target.value)} /></label></section>
          ) : step === 3 ? (
            <section><h2>選擇廣告素材</h2><p>最多選擇五個已審批內容；Meta 會收到真正圖片素材。</p><label>廣告標題<input value={headline} onChange={(e) => setHeadline(e.target.value)} /></label><label>廣告文字<textarea rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} /></label><label>行動按鈕<select value={callToAction} onChange={(e) => setCallToAction(e.target.value)}><option value="LEARN_MORE">了解更多</option><option value="SHOP_NOW">立即購買</option><option value="CONTACT_US">聯絡我們</option><option value="SIGN_UP">立即登記</option></select></label><div className="maw-creatives">{setup?.posts?.map((post) => { const selected = selectedPostIds.includes(post.id); return <button type="button" aria-pressed={selected} className={selected ? 'selected' : ''} key={post.id} onClick={() => setSelectedPostIds((ids) => selected ? ids.filter((id) => id !== post.id) : ids.length < 5 ? [...ids, post.id] : ids)}>{post.image_url ? <img src={post.image_url} alt="" /> : null}<span>{post.title || '未命名內容'}</span></button> })}</div></section>
          ) : step === 4 ? (
            <section><h2>檢查 Campaign</h2><label>Campaign 名稱<input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} /></label><div className="maw-review"><p><strong>目標：</strong>{objective}</p><p><strong>網址：</strong>{targetLink}</p><p><strong>主題：</strong>{topic}</p><p><strong>素材：</strong>{selectedPostIds.length} 個</p></div></section>
          ) : (
            <section><h2>投放設定</h2><div className="maw-grid"><label>最低年齡<input type="number" min="18" max="65" value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} /></label><label>最高年齡<input type="number" min="18" max="65" value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} /></label><label>地區<select value={country} onChange={(e) => setCountry(e.target.value)}><option value="HK">香港</option><option value="GB">英國</option><option value="US">美國</option><option value="CA">加拿大</option><option value="AU">澳洲</option></select></label><label>每日預算（{currency}）<input type="number" min="1" value={dailyBudget} onChange={(e) => setDailyBudget(Number(e.target.value))} /><small>貨幣由所選 Meta Ad Account 決定，無法在 Campaign 內轉換。</small></label></div><div className="maw-safety"><strong>真實 Meta API 建立</strong><p>按下按鈕後會在 Meta 建立 Campaign、Ad Set、Creative 及 Ads，但全部保持 PAUSED；啟用前不會投放或產生廣告費。</p><label><input type="checkbox" checked={confirmed} disabled={setup?.appLive !== true} onChange={(e) => { setConfirmed(e.target.checked); if (e.target.checked) setError('') }} /> 我確認以上資料正確並建立到 Meta</label>{error === '請先確認 Campaign 會真實建立到 Meta' ? <span className="maw-inline-error">請先剔選以上確認方格。</span> : null}</div>{setup?.appLive !== true || launchBlocker?.code === 'META_APP_DEVELOPMENT_MODE' ? <div className="maw-app-blocker"><strong>Meta App 尚未公開，暫時無法建立廣告創意</strong><p>{error || '請先完成 Meta 商家驗證、App Review／Advanced Access，並將 App 切換為 Live。上線後將 production 環境的 META_APP_LIVE 設為 true。'}</p>{launchBlocker?.partial ? <small>已建立的 Campaign／Ad Set 已保存並保持 PAUSED；再次嘗試時會沿用現有 ID，不會重複建立。</small> : null}<div className="maw-app-links"><a href="https://developers.facebook.com/apps/1514755840050990/" target="_blank" rel="noreferrer">前往 Meta for Developers</a><a href="https://developers.facebook.com/apps/1514755840050990/app-review/" target="_blank" rel="noreferrer">前往 App Review</a></div></div> : launchBlocker?.code === 'META_PERMISSION_REQUIRED' ? <div className="maw-app-blocker"><strong>Meta 廣告權限尚未批核</strong><p>{error}</p>{launchBlocker.partial ? <small>已建立項目保持 PAUSED，重試會沿用現有 ID。</small> : null}</div> : null}</section>
          )}
        </div>

        {!loading && !result ? <footer className="maw-footer"><button type="button" disabled={step === 0 || launching} onClick={() => setStep((value) => Math.max(0, value - 1))}>返回</button>{step === 5 && error && !['META_APP_DEVELOPMENT_MODE', 'META_PERMISSION_REQUIRED'].includes(launchBlocker?.code || '') ? <div className="maw-footer-error" role="alert">{error}</div> : null}{step < 5 ? <button className="primary" type="button" onClick={next}>繼續</button> : <button className="primary" type="button" disabled={launching || setup?.appLive !== true || launchBlocker?.code === 'META_APP_DEVELOPMENT_MODE'} onClick={() => void launch()}>{launching ? '正在建立…' : '建立到 Meta'}</button>}</footer> : !loading && result ? <footer className="maw-footer"><button className="primary" type="button" onClick={onClose}>完成</button></footer> : null}
      </div>
      <style>{`
        .maw-overlay{position:fixed;inset:0;z-index:5000;background:rgba(10,10,12,.58);backdrop-filter:blur(8px);padding:28px;display:grid;place-items:center;overflow:hidden}.maw-modal{width:min(1180px,100%);height:calc(100dvh - 56px);min-height:0;margin:auto;background:#fff;color:#202126;border-radius:22px;display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.3)}.maw-header{padding:20px 28px;border-bottom:1px solid #e7e8eb;display:flex;align-items:center;gap:22px}.maw-header>strong{font-size:18px;font-weight:700}.maw-footer button{border:0;background:transparent;font:inherit;font-weight:500;padding:12px 18px;border-radius:10px;cursor:pointer}.maw-close{margin-left:auto;flex:0 0 40px;width:40px;height:40px;padding:0;border:1px solid #dfe1e6;border-radius:50%;background:#fff;color:#202126;display:grid;place-items:center;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease}.maw-close span{font-size:28px;font-weight:300;line-height:1;transform:translateY(-1px)}.maw-close:hover{background:#f3f4f6;border-color:#c9ccd2}.maw-close:active{transform:scale(.96)}.maw-close:focus-visible{outline:3px solid #8bc4ff;outline-offset:2px}.maw-close:disabled{opacity:.45;cursor:not-allowed}.maw-progress{display:flex;gap:13px;flex-wrap:wrap;color:#9a9da5;font-size:14px;font-weight:400}.maw-progress .active{color:#111;font-weight:650}.maw-body{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:44px clamp(24px,6vw,72px) 56px;scrollbar-gutter:stable}.maw-body section{display:grid;gap:22px}.maw-body h2{font-size:clamp(30px,3vw,40px);font-weight:700;margin:0 0 10px;letter-spacing:-.025em}.maw-body label{display:grid;gap:8px;font-weight:600}.maw-body label small{color:#737780;font-size:13px;font-weight:400}.maw-body input,.maw-body select,.maw-body textarea{width:100%;border:1px solid #dfe1e6;border-radius:10px;background:#fff;color:#202126;padding:14px;font:inherit;font-weight:400}.maw-body select{cursor:pointer}.maw-error,.maw-connect-warning{padding:14px 16px;border-radius:10px;background:#fff2ef;color:#9b2c1e;margin-bottom:20px}.maw-connect-warning>button{display:inline-flex;border:0;background:#111;color:#fff;padding:12px 16px;border-radius:9px;font:inherit;font-weight:500;cursor:pointer}.maw-options{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.maw-options button{min-height:112px;border:1px solid #dfe1e6;background:#fff;color:#202126;padding:20px;border-radius:12px;font:inherit;font-weight:400;text-align:left;display:grid;align-content:center;gap:7px;cursor:pointer}.maw-options button strong{font-size:18px;font-weight:650}.maw-options button span{color:#737780;font-size:14px;line-height:1.45}.maw-options .selected,.maw-creatives .selected{border:2px solid #111}.maw-creatives{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding-bottom:4px}.maw-creatives button{padding:0;border:1px solid #dfe1e6;border-radius:12px;background:#fff;color:#202126;overflow:hidden;text-align:left;cursor:pointer}.maw-creatives img{width:100%;aspect-ratio:1;object-fit:cover}.maw-creatives span{display:block;padding:12px;font-weight:500}.maw-review,.maw-safety{padding:20px;border-radius:14px;background:#f5f6f8}.maw-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.maw-safety{border:1px solid #f0c9a9;background:#fff8ef}.maw-safety label{display:flex;align-items:center;gap:12px;cursor:pointer}.maw-safety input[type=checkbox]{appearance:none;-webkit-appearance:none;flex:0 0 24px;width:24px;height:24px;padding:0;border:2px solid #4c4f55;border-radius:5px;background:#fff;cursor:pointer;display:grid;place-items:center}.maw-safety input[type=checkbox]:checked{background:#151515;border-color:#151515}.maw-safety input[type=checkbox]:checked::after{content:'✓';color:#fff;font-size:17px;font-weight:800;line-height:1}.maw-safety input[type=checkbox]:focus-visible{outline:3px solid #8bc4ff;outline-offset:2px}.maw-inline-error{color:#a52b1d;font-size:14px;font-weight:600}.maw-app-blocker{display:grid;gap:9px;padding:18px;border-radius:14px;background:#fff2ef;border:1px solid #efb8af;color:#8f281d}.maw-app-blocker p{margin:0;line-height:1.55}.maw-app-blocker small{color:#6d514d}.maw-app-blocker a{justify-self:start;margin-top:3px;padding:11px 15px;border-radius:9px;background:#151515;color:#fff;text-decoration:none;font-weight:600}.maw-footer{position:relative;z-index:1;padding:16px 28px;border-top:1px solid #e7e8eb;background:#fff;display:flex;align-items:center;gap:16px;justify-content:space-between;border-radius:0 0 22px 22px;box-shadow:0 -10px 24px rgba(20,22,26,.035)}.maw-footer-error{max-width:650px;margin-left:auto;padding:10px 12px;border-radius:8px;background:#fff2ef;color:#9b2c1e;font-size:14px;line-height:1.35}.maw-footer .primary,.maw-ads-manager-link{margin-left:auto;background:#151515;color:#fff}.maw-footer button:disabled{opacity:.45;cursor:not-allowed}.maw-success{padding:50px;background:#effbf2;border:1px solid #bfe8c7;border-radius:18px}.maw-ads-manager-link{justify-self:start;margin:4px 0 0;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:600}.maw-loading{min-height:100%;display:grid;place-content:center;justify-items:center;gap:10px;text-align:center;color:#202126}.maw-loading strong{font-size:18px;font-weight:600}.maw-loading small{color:#737780;font-size:14px}.maw-spinner{width:32px;height:32px;border:3px solid #e1e3e7;border-top-color:#151515;border-radius:50%;animation:maw-spin .8s linear infinite}@keyframes maw-spin{to{transform:rotate(360deg)}}@media(max-width:760px){.maw-overlay{padding:0}.maw-modal{height:100dvh;border-radius:0}.maw-header{align-items:flex-start}.maw-progress{display:none}.maw-body{padding:28px 18px 44px}.maw-options,.maw-creatives,.maw-grid{grid-template-columns:1fr}.maw-footer-error{font-size:12px}}
        .maw-result-ids{display:grid;gap:8px;padding:16px;border-radius:10px;background:rgba(255,255,255,.7)}.maw-app-links{display:flex;flex-wrap:wrap;gap:10px}.maw-safety input[type=checkbox]:disabled{opacity:.45;cursor:not-allowed}
      `}</style>
    </div>
  )
}
