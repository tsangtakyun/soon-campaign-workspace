'use client'

import { useState } from 'react'
import { Edit3, Gift, ImageIcon, Trash2 } from 'lucide-react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

type ProductTab = 'library' | 'pr' | 'sales'
type Product = { name: string; price: string; link: string }

const platforms = ['IG Story', 'IG Post', 'Reels', 'TikTok', '小紅書', 'YouTube Short']

const products: Product[] = [
  { name: '玻尿酸精華液', price: 'HK$288', link: 'shopline.com/hyaluronic-serum' },
  { name: '白松露煥白面膜', price: 'HK$198', link: 'shopline.com/truffle-mask' },
  { name: '膠原蛋白眼霜', price: 'HK$328', link: 'shopline.com/collagen-eye-cream' },
  { name: '山茶花修護乳霜', price: 'HK$368', link: 'shopline.com/camellia-cream' },
  { name: '維他命 C 亮白安瓶', price: 'HK$258', link: 'shopline.com/vitamin-c-ampoule' },
  { name: '水光保濕防曬霜', price: 'HK$238', link: 'shopline.com/aqua-sunscreen' },
]

const salesRows = [
  { title: '水光肌急救：夏天必備保濕精華', platform: 'Instagram', date: '2026-05-18', clicks: '742', conversions: '38' },
  { title: '白松露面膜 7 日煥亮挑戰', platform: '小紅書', date: '2026-05-16', clicks: '618', conversions: '31' },
  { title: '眼周細紋護理：膠原蛋白眼霜實測', platform: 'TikTok', date: '2026-05-14', clicks: '504', conversions: '25' },
  { title: '通勤女生的山茶花修護晚霜', platform: 'Instagram', date: '2026-05-12', clicks: '489', conversions: '22' },
  { title: '維他命 C 安瓶：暗沉肌亮白攻略', platform: 'Facebook', date: '2026-05-10', clicks: '494', conversions: '27' },
]

const prCampaigns = [
  {
    id: 'serum-pr',
    product: '玻尿酸精華液',
    publishedAt: '2026-05-20',
    deadline: '2026-06-05',
    tag: '@ginkgobeauty',
    quantity: 8,
    platforms: ['IG Story', 'Reels', '小紅書'],
    applicants: [
      { handle: '@beautyby.mia', platforms: ['IG', '小紅書'], fans: '28.4K', date: '2026-06-01', idea: '早晚保濕實測，展示上面前後膚況' },
      { handle: '@glow.with.yan', platforms: ['TikTok', 'IG'], fans: '64.1K', date: '2026-06-02', idea: '拍攝水光肌妝前護膚短片' },
      { handle: '@skincare.iris', platforms: ['小紅書'], fans: '9.8K', date: '2026-06-04', idea: '敏感肌使用心得圖文筆記' },
      { handle: '@dailyglow.k', platforms: ['IG'], fans: '17.2K', date: '2026-06-03', idea: '保濕空瓶推薦合集' },
    ],
  },
  {
    id: 'mask-pr',
    product: '白松露煥白面膜',
    publishedAt: '2026-05-18',
    deadline: '2026-06-01',
    tag: '@ginkgobeauty',
    quantity: 5,
    platforms: ['IG Post', 'TikTok'],
    applicants: [
      { handle: '@maskdiary.hk', platforms: ['IG', 'TikTok'], fans: '42.8K', date: '2026-05-29', idea: '連續 3 日面膜挑戰，拍攝亮白效果' },
      { handle: '@chicbeauty.zoe', platforms: ['IG'], fans: '36.5K', date: '2026-05-30', idea: '週末急救護膚 routine' },
      { handle: '@littlebeautybook', platforms: ['小紅書'], fans: '22.1K', date: '2026-05-31', idea: '成分分析加真人試用圖' },
    ],
  },
]

export default function MyProductsPage() {
  const [activeTab, setActiveTab] = useState<ProductTab>('library')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['IG Story', 'Reels'])
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({ 'serum-pr': true })
  const [showToast, setShowToast] = useState(false)

  function togglePlatform(platform: string) {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    )
  }

  function publishPrCampaign() {
    setSelectedProduct(null)
    setActiveTab('pr')
    setShowToast(true)
    window.setTimeout(() => setShowToast(false), 4200)
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="我的產品" />

      <section className="products-shell">
        {showToast ? (
          <div className="success-toast">✓ PR Gift Campaign 已上架！KOL 將可在 SOON Creator Network 看到並申請。</div>
        ) : null}

        <div className="products-panel">
          <div className="tab-row" role="tablist" aria-label="我的產品分頁">
            <button
              aria-selected={activeTab === 'library'}
              className={activeTab === 'library' ? 'active' : ''}
              onClick={() => setActiveTab('library')}
              role="tab"
              type="button"
            >
              產品庫
            </button>
            <button
              aria-selected={activeTab === 'pr'}
              className={activeTab === 'pr' ? 'active' : ''}
              onClick={() => setActiveTab('pr')}
              role="tab"
              type="button"
            >
              PR Campaign
            </button>
            <button
              aria-selected={activeTab === 'sales'}
              className={activeTab === 'sales' ? 'active' : ''}
              onClick={() => setActiveTab('sales')}
              role="tab"
              type="button"
            >
              賣貨情況
            </button>
          </div>

          {activeTab === 'library' ? (
            <>
              <header className="section-header">
                <div>
                  <p>Product Library</p>
                  <h1>我的產品</h1>
                </div>
                <button className="primary-button" type="button">
                  ＋ 新增產品
                </button>
              </header>

              <div className="product-grid">
                {products.map((product) => (
                  <article className="product-card" key={product.name}>
                    <div className="product-image">
                      <ImageIcon aria-hidden="true" size={34} strokeWidth={1.7} />
                    </div>
                    <div className="product-info">
                      <div>
                        <h2>{product.name}</h2>
                        <strong>{product.price}</strong>
                        <p>{product.link}</p>
                      </div>
                      <div className="icon-actions" aria-label={`${product.name} 操作`}>
                        <button aria-label="編輯產品" title="編輯產品" type="button">
                          <Edit3 aria-hidden="true" size={16} />
                        </button>
                        <button aria-label="刪除產品" title="刪除產品" type="button">
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                        <button
                          aria-label="送出 PR Gift"
                          className="gift-button"
                          onClick={() => setSelectedProduct(product)}
                          title="送出 PR Gift"
                          type="button"
                        >
                          <Gift aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {activeTab === 'pr' ? (
            <>
              <header className="section-header">
                <div>
                  <p>PR Gift Campaign</p>
                  <h1>PR Campaign</h1>
                </div>
              </header>

              <div className="stat-grid">
                <article>
                  <span>進行中 Campaign</span>
                  <strong>3</strong>
                </article>
                <article>
                  <span>收到申請</span>
                  <strong>12</strong>
                </article>
                <article>
                  <span>待確認</span>
                  <strong>5</strong>
                </article>
              </div>

              <div className="campaign-stack">
                {prCampaigns.map((campaign) => (
                  <article className="campaign-card" key={campaign.id}>
                    <div className="campaign-header">
                      <div className="campaign-product">
                        <div className="campaign-image">
                          <ImageIcon aria-hidden="true" size={24} />
                        </div>
                        <div>
                          <h2>{campaign.product}</h2>
                          <p>發布日期 {campaign.publishedAt} / 截止日期 {campaign.deadline}</p>
                        </div>
                      </div>
                      <button
                        className="outline-button"
                        onClick={() =>
                          setExpandedCampaigns((current) => ({ ...current, [campaign.id]: !current[campaign.id] }))
                        }
                        type="button"
                      >
                        查看申請 ({campaign.applicants.length})
                      </button>
                    </div>

                    <div className="campaign-requirements">
                      <span>要求：</span>
                      {campaign.platforms.map((platform) => (
                        <em key={platform}>{platform}</em>
                      ))}
                      <strong>{campaign.tag}</strong>
                      <strong>數量 {campaign.quantity}</strong>
                    </div>

                    {expandedCampaigns[campaign.id] ? (
                      <div className="applicant-list">
                        {campaign.applicants.map((applicant) => (
                          <div className="applicant-row" key={applicant.handle}>
                            <div className="applicant-profile">
                              <div className="mini-avatar">{applicant.handle.replace('@', '').charAt(0).toUpperCase()}</div>
                              <strong>{applicant.handle}</strong>
                            </div>
                            <div className="badge-row">
                              {applicant.platforms.map((platform) => (
                                <span key={platform}>{platform}</span>
                              ))}
                            </div>
                            <p>{applicant.fans}</p>
                            <p>{applicant.date}</p>
                            <p>{applicant.idea}</p>
                            <div className="approval-actions">
                              <button className="approve-button" type="button">
                                批准 ✓
                              </button>
                              <button className="reject-button" type="button">
                                拒絕 ✗
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {activeTab === 'sales' ? (
            <>
              <header className="section-header">
                <div>
                  <p>Sales Performance</p>
                  <h1>賣貨情況</h1>
                </div>
              </header>

              <div className="stat-grid">
                <article>
                  <span>總點擊數</span>
                  <strong>2,847</strong>
                </article>
                <article>
                  <span>估計轉換</span>
                  <strong>143</strong>
                </article>
                <article>
                  <span>社媒帶動銷售</span>
                  <strong>HK$41,230</strong>
                </article>
              </div>

              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>帖文</th>
                      <th>平台</th>
                      <th>發布日期</th>
                      <th>點擊數</th>
                      <th>估計轉換</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesRows.map((row) => (
                      <tr key={row.title}>
                        <td>{row.title}</td>
                        <td>{row.platform}</td>
                        <td>{row.date}</td>
                        <td>{row.clicks}</td>
                        <td>{row.conversions}</td>
                        <td>
                          <a href="/onboarding/scheduled-posts">查看帖文</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {selectedProduct ? (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <section className="pr-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <h2>發布 PR Gift Campaign</h2>
                <p>上架到 SOON Creator Network，讓 KOL 主動申請</p>
              </div>
              <button aria-label="關閉" onClick={() => setSelectedProduct(null)} type="button">
                ×
              </button>
            </header>

            <div className="modal-section">
              <h3>產品資訊</h3>
              <div className="readonly-product">
                <div className="readonly-product-image" aria-hidden="true">
                  {selectedProduct.name.charAt(0)}
                </div>
                <div>
                  <strong>{selectedProduct.name}</strong>
                  <span>{selectedProduct.price}</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>品牌要求</h3>
              <label>
                <span>Required platforms</span>
                <div className="chip-grid">
                  {platforms.map((platform) => (
                    <button
                      className={selectedPlatforms.includes(platform) ? 'selected' : ''}
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      type="button"
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                <span>必須 Tag</span>
                <input defaultValue="@" placeholder="@yourbrand" />
              </label>
              <label>
                <span>KOL 需於此日期前發布</span>
                <input type="date" />
              </label>
              <label>
                <span>其他要求</span>
                <textarea placeholder="例：需展示產品使用過程、正面評價為主..." rows={4} />
              </label>
              <label>
                <span>可送出數量</span>
                <input defaultValue={5} min={1} type="number" />
              </label>
            </div>

            <div className="modal-section">
              <h3>KOL 申請時需提供</h3>
              <ul className="check-list">
                <li>✓ 確認有興趣接受此 PR Gift</li>
                <li>✓ 承諾發布平台</li>
                <li>✓ 承諾發布日期</li>
                <li>✓ 預計內容方向（選填）</li>
                <li>✓ 送貨地址</li>
              </ul>
            </div>

            <footer className="modal-actions">
              <button className="cancel-button" onClick={() => setSelectedProduct(null)} type="button">
                取消
              </button>
              <button className="publish-button" onClick={publishPrCampaign} type="button">
                一鍵發布至 SOON Creator Network →
              </button>
            </footer>
          </section>
        </div>
      ) : null}

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

.products-shell {
  min-height: 100vh;
  background: #f7f7fb;
  color: #0a0a0a;
  padding: 32px;
  min-width: 0;
  position: relative;
}

.products-panel {
  max-width: 1180px;
  margin: 0 auto;
}

.tab-row {
  display: inline-flex;
  padding: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  margin-bottom: 24px;
}

.tab-row button {
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  padding: 9px 18px;
  border-radius: 8px;
}

.tab-row button.active {
  background: #0a0a0a;
  color: #ffffff;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.section-header p {
  margin: 0 0 6px;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.section-header h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
}

.primary-button,
.publish-button {
  border: 0;
  border-radius: 10px;
  background: #7c3aed;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  padding: 11px 18px;
  box-shadow: 0 12px 24px rgba(124, 58, 237, .24);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.product-card,
.stat-grid article,
.table-card,
.campaign-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, .06);
}

.product-card {
  overflow: hidden;
}

.product-image {
  aspect-ratio: 1;
  background: linear-gradient(135deg, #eeeeF4, #dedee8);
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-info {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
}

.product-info h2 {
  margin: 0 0 8px;
  font-size: 16px;
}

.product-info strong {
  display: block;
  color: #111827;
  font-size: 15px;
  margin-bottom: 8px;
}

.product-info p {
  margin: 0;
  color: #8b8f9b;
  font-size: 12px;
  word-break: break-all;
}

.icon-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.icon-actions button {
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-actions .gift-button {
  border-color: rgba(124, 58, 237, .26);
  background: rgba(124, 58, 237, .1);
  color: #7c3aed;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.stat-grid article {
  padding: 20px;
}

.stat-grid span {
  display: block;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 8px;
}

.stat-grid strong {
  color: #0a0a0a;
  font-size: 28px;
  line-height: 1.1;
}

.campaign-stack {
  display: grid;
  gap: 16px;
}

.campaign-card {
  padding: 18px;
}

.campaign-header,
.campaign-product,
.campaign-requirements,
.applicant-profile,
.badge-row,
.approval-actions,
.modal-actions {
  display: flex;
  align-items: center;
}

.campaign-header {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.campaign-product {
  gap: 12px;
}

.campaign-image,
.mini-avatar {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #f0edf8;
  color: #7c3aed;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.campaign-product h2 {
  margin: 0 0 5px;
  font-size: 17px;
}

.campaign-product p {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.outline-button {
  border: 1px solid #d8c9ff;
  border-radius: 9px;
  background: #ffffff;
  color: #7c3aed;
  cursor: pointer;
  font-weight: 800;
  padding: 9px 13px;
}

.campaign-requirements {
  flex-wrap: wrap;
  gap: 8px;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 14px;
}

.campaign-requirements em,
.badge-row span {
  border-radius: 999px;
  background: rgba(124, 58, 237, .1);
  color: #6d28d9;
  font-style: normal;
  font-weight: 800;
  padding: 5px 9px;
}

.campaign-requirements strong {
  border-radius: 999px;
  background: #f4f4f5;
  color: #52525b;
  padding: 5px 9px;
}

.applicant-list {
  border-top: 1px solid #eef0f4;
  padding-top: 12px;
}

.applicant-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr .7fr .9fr 1.5fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f2f5;
}

.applicant-row:last-child {
  border-bottom: 0;
}

.applicant-profile {
  gap: 10px;
}

.mini-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}

.applicant-row p {
  margin: 0;
  color: #52525b;
  font-size: 13px;
}

.badge-row {
  gap: 6px;
  flex-wrap: wrap;
}

.badge-row span {
  font-size: 11px;
  padding: 4px 7px;
}

.approval-actions {
  gap: 8px;
  justify-content: flex-end;
}

.approve-button,
.reject-button {
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  padding: 8px 10px;
  white-space: nowrap;
}

.approve-button {
  border: 1px solid #16a34a;
  background: #16a34a;
  color: #ffffff;
}

.reject-button {
  border: 1px solid #fecaca;
  background: #ffffff;
  color: #dc2626;
}

.table-card {
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 15px 16px;
  text-align: left;
  border-bottom: 1px solid #eef0f4;
  font-size: 14px;
}

th {
  background: #fafafa;
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
}

td:first-child {
  font-weight: 700;
}

td a {
  color: #7c3aed;
  font-weight: 800;
  text-decoration: none;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(10, 10, 10, .58);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.pr-modal {
  width: min(680px, 100%);
  max-height: 88vh;
  overflow: auto;
  border-radius: 16px;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 28px 80px rgba(0, 0, 0, .32);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 22px;
}

.modal-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.modal-header button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: #f9fafb;
  color: #111827;
  cursor: pointer;
  font-size: 22px;
}

.modal-section {
  padding: 18px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
}

.modal-section h3 {
  margin: 0 0 12px;
  color: #111827;
  font-size: 14px;
}

.readonly-product {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #111827;
  padding: 12px;
}

.readonly-product-image {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 900;
}

.readonly-product strong,
.readonly-product span {
  display: block;
}

.readonly-product strong {
  color: #111827;
}

.readonly-product span {
  color: #6b7280;
  font-size: 13px;
  margin-top: 4px;
}

.modal-section label {
  display: grid;
  gap: 7px;
  margin-bottom: 13px;
}

.modal-section label:last-child {
  margin-bottom: 0;
}

.modal-section label > span {
  color: #111827;
  font-size: 13px;
  font-weight: 800;
}

.modal-section input,
.modal-section textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  background: #ffffff;
  color: #111827;
  font: inherit;
  padding: 10px 12px;
}

.modal-section input::placeholder,
.modal-section textarea::placeholder {
  color: #9ca3af;
}

.chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip-grid button {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f9fafb;
  color: #111827;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  padding: 8px 12px;
}

.chip-grid button.selected {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #ffffff;
}

.check-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: #111827;
  font-size: 14px;
}

.modal-actions {
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 22px;
  background: #ffffff;
}

.cancel-button {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  padding: 11px 18px;
}

.success-toast {
  position: sticky;
  top: 18px;
  z-index: 20;
  max-width: 1180px;
  margin: 0 auto 16px;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 14px;
  font-weight: 800;
  padding: 12px 16px;
  box-shadow: 0 10px 24px rgba(22, 163, 74, .12);
}

@media (max-width: 1040px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .products-shell {
    padding: 24px;
  }

  .product-grid,
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .applicant-row {
    grid-template-columns: 1fr;
  }

  .approval-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 680px) {
  .products-shell {
    padding: 18px;
  }

  .section-header,
  .campaign-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .product-grid,
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .tab-row {
    width: 100%;
    overflow-x: auto;
  }

  .table-card {
    overflow-x: auto;
  }

  table {
    min-width: 760px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions button {
    width: 100%;
  }
}
`
