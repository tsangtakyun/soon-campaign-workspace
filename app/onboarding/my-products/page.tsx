'use client'

import { useEffect, useRef, useState } from 'react'
import { Edit3, Gift, ImageIcon, Trash2 } from 'lucide-react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { resolveActiveWorkspace } from '@/lib/workspace-client'

type ProductTab = 'library' | 'pr' | 'sales'
type Product = { description: string; id: string; imageUrl?: string; name: string; price: string }
type ImagePickerTab = 'library' | 'upload'
type BrandAsset = { asset_type: string; filename: string | null; id: string; url: string }

const platforms = ['IG Story', 'IG Post', 'Reels', 'TikTok', '小紅書', 'YouTube Short']

const initialProducts: Product[] = [
  { id: 'hyaluronic-serum', name: '玻尿酸精華液', price: 'HK$288', description: '高效補水精華，適合日常保濕護理。' },
  { id: 'truffle-mask', name: '白松露煥白面膜', price: 'HK$198', description: '提亮暗沉膚色，打造透亮光澤感。' },
  { id: 'collagen-eye-cream', name: '膠原蛋白眼霜', price: 'HK$328', description: '淡化眼周乾紋，提升緊緻感。' },
  { id: 'camellia-cream', name: '山茶花修護乳霜', price: 'HK$368', description: '滋潤修護屏障，適合晚間護膚。' },
  { id: 'vitamin-c-ampoule', name: '維他命 C 亮白安瓶', price: 'HK$258', description: '集中亮白護理，改善暗啞膚況。' },
  { id: 'aqua-sunscreen', name: '水光保濕防曬霜', price: 'HK$238', description: '清爽防曬，同時保濕提亮。' },
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

function normalizeProductImageUrl(value: string) {
  try {
    const url = new URL(value)
    if (/(^|\.)supabase\.co$/i.test(url.hostname)) return value
    if (/(^|\.)wixstatic\.com$/i.test(url.hostname)) return value
    return `/api/logo-image?url=${encodeURIComponent(value)}`
  } catch {
    return value
  }
}

export default function MyProductsPage() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [activeTab, setActiveTab] = useState<ProductTab>('library')
  const [productItems, setProductItems] = useState<Product[]>(initialProducts)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [imagePickerProduct, setImagePickerProduct] = useState<Product | null>(null)
  const [imagePickerTab, setImagePickerTab] = useState<ImagePickerTab>('library')
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['IG Story', 'Reels'])
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({ 'serum-pr': true })
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const filteredBrandAssets = brandAssets.filter((asset) => {
    const query = assetSearch.trim().toLowerCase()
    if (!query) return true
    return `${asset.filename || ''} ${asset.asset_type}`.toLowerCase().includes(query)
  })

  useEffect(() => {
    if (!imagePickerProduct) return

    let cancelled = false

    async function loadBrandAssets() {
      setAssetsLoading(true)
      try {
        const { workspaceId } = await resolveActiveWorkspace()
        if (!workspaceId) {
          if (!cancelled) setBrandAssets([])
          return
        }

        const response = await fetch(`/api/brand-kit-data?workspace_id=${encodeURIComponent(workspaceId)}`)
        const payload = await response.json().catch(() => null)
        if (!cancelled && Array.isArray(payload?.assets)) {
          setBrandAssets(payload.assets as BrandAsset[])
        }
      } catch {
        if (!cancelled) setBrandAssets([])
      } finally {
        if (!cancelled) setAssetsLoading(false)
      }
    }

    void loadBrandAssets()

    return () => {
      cancelled = true
    }
  }, [imagePickerProduct])

  function showMessage(message: string) {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 4200)
  }

  function togglePlatform(platform: string) {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    )
  }

  function publishPrCampaign() {
    setSelectedProduct(null)
    setActiveTab('pr')
    showMessage('✓ PR Gift Campaign 已上架！KOL 將可在 SOON Creator Network 看到並申請。')
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setEditName(product.name)
    setEditPrice(product.price.replace(/[^0-9.]/g, ''))
    setEditDescription(product.description)
    setEditImageUrl(product.imageUrl || '')
  }

  function openImagePicker(product: Product) {
    setImagePickerProduct(product)
    setImagePickerTab('library')
    setAssetSearch('')
    setSelectedImageUrl(product.imageUrl || null)
    setUploadPreviewUrl(null)
  }

  function closeImagePicker() {
    setImagePickerProduct(null)
    setSelectedImageUrl(null)
    setUploadPreviewUrl(null)
  }

  function applyProductImage() {
    if (!imagePickerProduct) return
    const imageUrl = uploadPreviewUrl || selectedImageUrl
    if (!imageUrl) return
    setProductItems((current) =>
      current.map((product) => (product.id === imagePickerProduct.id ? { ...product, imageUrl } : product))
    )
    closeImagePicker()
    showMessage('✓ 產品圖片已更新')
  }

  function handleUploadPreview(file: File | undefined) {
    if (!file) return
    if (uploadPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(uploadPreviewUrl)
    const previewUrl = URL.createObjectURL(file)
    setUploadPreviewUrl(previewUrl)
    setSelectedImageUrl(null)
  }

  function saveProductEdits() {
    if (!editingProduct) return
    const nextPrice = editPrice.trim() ? `HK$${editPrice.trim()}` : editingProduct.price
    setProductItems((current) =>
      current.map((product) =>
        product.id === editingProduct.id
          ? {
              ...product,
              description: editDescription.trim(),
              imageUrl: editImageUrl.trim() || undefined,
              name: editName.trim() || product.name,
              price: nextPrice,
            }
          : product
      )
    )
    setEditingProduct(null)
    showMessage('✓ 產品已更新')
  }

  function confirmDeleteProduct() {
    if (!deleteProduct) return
    setProductItems((current) => current.filter((product) => product.id !== deleteProduct.id))
    setDeleteProduct(null)
    showMessage('已刪除產品')
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="我的產品" />

      <section className="products-shell">
        {toastMessage ? (
          <div className="success-toast">{toastMessage}</div>
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
                {productItems.map((product) => (
                  <article className="product-card" key={product.id}>
                    <button
                      aria-label="選擇產品圖片"
                      className="product-image"
                      onClick={() => openImagePicker(product)}
                      title="選擇產品圖片"
                      type="button"
                    >
                      {product.imageUrl ? (
                        <img src={normalizeProductImageUrl(product.imageUrl)} alt={product.name} />
                      ) : (
                        <ImageIcon aria-hidden="true" size={34} strokeWidth={1.7} />
                      )}
                      <span className="image-hover-overlay">
                        <ImageIcon aria-hidden="true" size={18} />
                        選擇產品圖片
                      </span>
                    </button>
                    <div className="product-info">
                      <div>
                        <h2>{product.name}</h2>
                        <strong>{product.price}</strong>
                        <p>
                          <span>SOON 商店</span>
                          透過 SOON Creator Network 銷售
                        </p>
                      </div>
                      <div className="icon-actions" aria-label={`${product.name} 操作`}>
                        <button aria-label="編輯產品" onClick={() => openEditModal(product)} title="編輯產品" type="button">
                          <Edit3 aria-hidden="true" size={16} />
                        </button>
                        <button aria-label="刪除產品" onClick={() => setDeleteProduct(product)} title="刪除產品" type="button">
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

      {imagePickerProduct ? (
        <div className="modal-backdrop" onClick={closeImagePicker}>
          <section className="image-picker-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <h2>選擇產品圖片</h2>
                <p>從品牌素材庫選擇，或上傳新的產品圖片。</p>
              </div>
              <button aria-label="關閉" onClick={closeImagePicker} type="button">
                ×
              </button>
            </header>

            <div className="picker-tabs" role="tablist" aria-label="產品圖片來源">
              <button
                aria-selected={imagePickerTab === 'library'}
                className={imagePickerTab === 'library' ? 'active' : ''}
                onClick={() => setImagePickerTab('library')}
                role="tab"
                type="button"
              >
                素材庫
              </button>
              <button
                aria-selected={imagePickerTab === 'upload'}
                className={imagePickerTab === 'upload' ? 'active' : ''}
                onClick={() => setImagePickerTab('upload')}
                role="tab"
                type="button"
              >
                上傳新圖片
              </button>
            </div>

            <div className="image-picker-body">
              {imagePickerTab === 'library' ? (
                <>
                  <input
                    className="asset-search"
                    onChange={(event) => setAssetSearch(event.target.value)}
                    placeholder="搜尋素材..."
                    value={assetSearch}
                  />
                  {assetsLoading ? (
                    <div className="picker-loading">載入素材中...</div>
                  ) : filteredBrandAssets.length === 0 ? (
                    <div className="picker-empty">暫時未有符合條件的素材。</div>
                  ) : (
                    <div className="asset-picker-grid">
                      {filteredBrandAssets.map((asset) => {
                        const imageUrl = normalizeProductImageUrl(asset.url)
                        return (
                        <button
                          className={selectedImageUrl === imageUrl ? 'selected' : ''}
                          key={asset.id}
                          onClick={() => {
                            setSelectedImageUrl(imageUrl)
                            setUploadPreviewUrl(null)
                          }}
                          type="button"
                        >
                          <img src={imageUrl} alt={asset.filename || asset.asset_type} />
                          {selectedImageUrl === imageUrl ? <span>✓</span> : null}
                        </button>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="upload-picker-pane">
                  <input
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => handleUploadPreview(event.target.files?.[0])}
                    ref={uploadInputRef}
                    type="file"
                    hidden
                  />
                  <button
                    className="upload-dropzone"
                    onClick={() => uploadInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      handleUploadPreview(event.dataTransfer.files?.[0])
                    }}
                    type="button"
                  >
                    {uploadPreviewUrl ? (
                      <img src={uploadPreviewUrl} alt="已選圖片預覽" />
                    ) : (
                      <>
                        <ImageIcon aria-hidden="true" size={34} />
                        <strong>拖放圖片到這裡</strong>
                        <span>或點擊瀏覽檔案，支援 jpg、png、webp、gif</span>
                      </>
                    )}
                  </button>
                  {uploadPreviewUrl ? (
                    <button className="inline-purple-button" onClick={applyProductImage} type="button">
                      使用此圖片
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <footer className="modal-actions">
              <button className="cancel-button" onClick={closeImagePicker} type="button">
                取消
              </button>
              <button
                className="publish-button"
                disabled={!selectedImageUrl && !uploadPreviewUrl}
                onClick={applyProductImage}
                type="button"
              >
                使用選取的圖片
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {editingProduct ? (
        <div className="modal-backdrop" onClick={() => setEditingProduct(null)}>
          <section className="pr-modal edit-product-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <h2>編輯產品</h2>
                <p>更新 SOON 商店內的產品資訊，方便 Creator Network 使用。</p>
              </div>
              <button aria-label="關閉" onClick={() => setEditingProduct(null)} type="button">
                ×
              </button>
            </header>

            <div className="modal-section">
              <label>
                <span>產品名稱</span>
                <input value={editName} onChange={(event) => setEditName(event.target.value)} />
              </label>
              <label>
                <span>價格 HK$</span>
                <input
                  min={0}
                  type="number"
                  value={editPrice}
                  onChange={(event) => setEditPrice(event.target.value)}
                />
              </label>
              <label>
                <span>產品描述</span>
                <textarea
                  onChange={(event) => setEditDescription(event.target.value)}
                  placeholder="簡單描述產品賣點、適合膚質或使用方法..."
                  rows={4}
                  value={editDescription}
                />
              </label>
              <label>
                <span>產品圖片</span>
                <div className="edit-upload-area">
                  <ImageIcon aria-hidden="true" size={22} />
                  <strong>拖放圖片到這裡，或貼上圖片 URL</strong>
                  <input
                    placeholder="https://..."
                    value={editImageUrl}
                    onChange={(event) => setEditImageUrl(event.target.value)}
                  />
                </div>
              </label>
            </div>

            <footer className="modal-actions">
              <button className="cancel-button" onClick={() => setEditingProduct(null)} type="button">
                取消
              </button>
              <button className="publish-button" onClick={saveProductEdits} type="button">
                儲存變更
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {deleteProduct ? (
        <div className="modal-backdrop" onClick={() => setDeleteProduct(null)}>
          <section className="confirm-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <h2>刪除產品</h2>
            <p>確定要刪除「{deleteProduct.name}」？此動作不可還原。</p>
            <div className="confirm-actions">
              <button className="cancel-button" onClick={() => setDeleteProduct(null)} type="button">
                取消
              </button>
              <button className="delete-confirm-button" onClick={confirmDeleteProduct} type="button">
                確定刪除
              </button>
            </div>
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

.publish-button:disabled {
  background: #e5e7eb;
  box-shadow: none;
  color: #9ca3af;
  cursor: not-allowed;
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
  width: 100%;
  border: 0;
  background: linear-gradient(135deg, #eeeeF4, #dedee8);
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, .58);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 900;
  opacity: 0;
  transition: opacity 160ms ease;
}

.product-image:hover .image-hover-overlay,
.product-image:focus-visible .image-hover-overlay {
  opacity: 1;
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
  line-height: 1.45;
}

.product-info p span {
  display: block;
  color: #6b7280;
  font-weight: 800;
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

.image-picker-modal {
  width: min(80vw, 920px);
  max-height: 70vh;
  border-radius: 16px;
  background: #ffffff;
  color: #111827;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 28px 80px rgba(0, 0, 0, .32);
}

.picker-tabs {
  display: flex;
  gap: 8px;
  padding: 14px 24px 0;
  background: #ffffff;
}

.picker-tabs button {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  padding: 8px 13px;
}

.picker-tabs button.active {
  border-color: #111827;
  background: #111827;
  color: #ffffff;
}

.image-picker-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 24px;
}

.asset-search {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  font: inherit;
  margin-bottom: 14px;
  padding: 11px 13px;
}

.asset-search::placeholder {
  color: #9ca3af;
}

.asset-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.asset-picker-grid button {
  aspect-ratio: 1;
  border: 3px solid transparent;
  border-radius: 12px;
  background: #f3f4f6;
  cursor: pointer;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.asset-picker-grid button:hover {
  border-color: #c4b5fd;
}

.asset-picker-grid button.selected {
  border-color: #7c3aed;
}

.asset-picker-grid img,
.upload-dropzone img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.asset-picker-grid button > span {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #7c3aed;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  position: absolute;
  right: 8px;
  top: 8px;
}

.picker-loading,
.picker-empty {
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  color: #6b7280;
  font-size: 14px;
  padding: 42px 20px;
  text-align: center;
}

.upload-picker-pane {
  display: grid;
  gap: 14px;
}

.upload-dropzone {
  min-height: 310px;
  border: 1px dashed #c4b5fd;
  border-radius: 14px;
  background: #faf7ff;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  overflow: hidden;
  padding: 20px;
}

.upload-dropzone > svg {
  color: #7c3aed;
}

.upload-dropzone strong {
  color: #111827;
  font-size: 16px;
}

.upload-dropzone span {
  font-size: 13px;
}

.inline-purple-button {
  justify-self: end;
  border: 0;
  border-radius: 10px;
  background: #7c3aed;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  padding: 10px 16px;
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

.edit-upload-area {
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  color: #6b7280;
  display: grid;
  gap: 10px;
  padding: 16px;
}

.edit-upload-area > svg {
  color: #7c3aed;
}

.edit-upload-area strong {
  color: #111827;
  font-size: 13px;
}

.confirm-modal {
  width: min(420px, 100%);
  border-radius: 16px;
  background: #ffffff;
  color: #111827;
  padding: 22px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, .32);
}

.confirm-modal h2 {
  margin: 0 0 10px;
  font-size: 20px;
}

.confirm-modal p {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.delete-confirm-button {
  border: 1px solid #dc2626;
  border-radius: 10px;
  background: #dc2626;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  padding: 11px 18px;
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
