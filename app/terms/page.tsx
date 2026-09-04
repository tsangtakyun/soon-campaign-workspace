import type { Metadata } from 'next'

import { LegalPage } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: '服務條款 | SOON',
  description: '使用 SOON 平台及服務時適用的條款。',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalPage eyebrow="TERMS" title="服務條款" updatedAt="2026 年 9 月 4 日">
      <section><h2>接受條款</h2><p>當你建立帳戶或使用 SOON，即表示你同意本服務條款及私隱政策。如你代表公司使用服務，你確認自己有權代表該公司接受條款。</p></section>
      <section><h2>帳戶責任</h2><p>你須提供準確資料、妥善保管登入權限，並對帳戶及工作空間內的操作負責。如發現未經授權的使用，請立即通知 SOON。</p></section>
      <section><h2>內容與知識產權</h2><p>你保留上載品牌資料及內容的權利，並授權 SOON 在提供服務所需範圍內處理該等資料。你須確保有權使用所提交的文字、圖片、影片、商標及其他素材。</p></section>
      <section><h2>AI 生成內容</h2><p>AI 內容可能不完整或出錯。發布前你須自行核實事實、版權、品牌要求、專業聲明及平台規則。涉及醫療、法律、財務或其他專業範疇時，不應以 AI 輸出取代合資格專業意見。</p></section>
      <section><h2>社交發布與第三方平台</h2><p>排程及發布功能依賴第三方平台的授權、審批及可用性。你須在發布前確認內容、時間及目標帳戶；第三方服務中斷或政策變更可能影響發布。</p></section>
      <section><h2>付款、試用與取消</h2><p>適用的價格、試用期、用量及付款週期會在購買或確認方案前顯示。除非另有說明，訂閱會按週期續期；你可以在下一個收費週期前要求取消。已完成的單次服務及已使用的用量一般不設退款，法律另有要求除外。</p></section>
      <section><h2>禁止行為</h2><p>你不得利用 SOON 違法、侵犯他人權利、散播惡意程式、繞過安全或用量限制，亦不得以未獲授權的方式存取其他帳戶或工作空間。</p></section>
      <section><h2>服務變更及責任</h2><p>我們會努力維持服務穩定，但不保證服務永不中斷或所有輸出均符合特定目的。在法律容許的最大範圍內，SOON 不會對間接、附帶或因錯誤發布引致的損失負責。</p></section>
    </LegalPage>
  )
}
