'use client'

import { useState } from 'react'
import { Edit3, ImageIcon, Trash2 } from 'lucide-react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

type ProductTab = 'library' | 'sales'

const products = [
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

export default function MyProductsPage() {
  const [activeTab, setActiveTab] = useState<ProductTab>('library')

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="我的產品" />

      <section className="products-shell">
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
                        <button aria-label="編輯產品" type="button">
                          <Edit3 aria-hidden="true" size={16} />
                        </button>
                        <button aria-label="刪除產品" type="button">
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
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
          )}
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

const styles = `
.products-shell {
  min-height: 100vh;
  margin-left: 280px;
  background: #f7f7fb;
  color: #0a0a0a;
  padding: 32px;
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

.primary-button {
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
.table-card {
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

@media (max-width: 1040px) {
  .products-shell {
    margin-left: 0;
    padding: 24px;
  }

  .product-grid,
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .products-shell {
    padding: 18px;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .product-grid,
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .table-card {
    overflow-x: auto;
  }

  table {
    min-width: 760px;
  }
}
`
