import type { Metadata } from 'next'

import { LegalPage } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: '私隱政策 | SOON',
  description: '了解 SOON 如何收集、使用、保存及保障你的資料。',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="PRIVACY" title="私隱政策" updatedAt="2026 年 9 月 4 日">
      <section><h2>我們收集甚麼資料</h2><p>當你建立帳戶、提交品牌資料、連接社交平台或聯絡我們時，SOON 可能收集你的姓名、電郵、聯絡方法、品牌資料、內容素材、工作空間操作紀錄及你主動授權的平台資料。</p></section>
      <section><h2>我們如何使用資料</h2><p>資料只會用於提供及改善 SOON 服務，包括建立內容策略、生成內容、管理審批與排程、提供客戶支援、保障帳戶安全，以及在你同意下跟進服務需要。</p></section>
      <section><h2>第三方服務</h2><p>SOON 使用受信任的服務供應商處理登入、資料儲存、AI 生成、電郵、付款及社交平台連接。相關資料只會按提供服務所需的範圍傳送，並受各供應商的私隱條款約束。</p></section>
      <section><h2>社交平台權限</h2><p>如你連接 Meta、Instagram、Facebook、Threads、YouTube 或其他平台，SOON 只會使用你明確授權的權限。SOON 不會取得或保存你的社交平台密碼，你亦可以在平台或 SOON 內解除連接。</p></section>
      <section><h2>資料保存與保障</h2><p>我們只會在提供服務、履行法律責任及處理爭議所需期間保存資料，並採用合理的技術及管理措施保護資料。互聯網服務無法保證絕對安全，如發現異常請立即聯絡我們。</p></section>
      <section><h2>你的選擇與權利</h2><p>你可以要求查閱、更正或刪除個人及品牌資料，亦可以撤回非必要的授權。請透過聯絡頁提交要求；我們可能需要先核實帳戶身份。</p></section>
      <section><h2>政策更新</h2><p>我們可能因功能、供應商或法律要求更新本政策。重要變更會在網站或服務內提供通知，頁首會顯示最新更新日期。</p></section>
    </LegalPage>
  )
}
