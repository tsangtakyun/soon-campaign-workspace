'use client'

import { useState } from 'react'

type Claim = {
  id: string
  perk_id: string
  egg_creator_username: string | null
  preferred_date: string | null
  preferred_time: string | null
  party_size: number | null
  delivery_name: string | null
  delivery_phone: string | null
  delivery_district: string | null
  delivery_address: string | null
  status: string | null
  brand_notes: string | null
  claimed_at: string | null
  created_at?: string | null
}

type PerkType = 'service' | 'product'

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: '待處理', className: 'status-pending' },
  confirmed: { label: '已確認', className: 'status-confirmed' },
  in_progress: { label: '進行中', className: 'status-progress' },
  completed: { label: '已完成', className: 'status-completed' },
  rejected: { label: '已婉拒', className: 'status-rejected' },
}

export function ClaimRow({ claim, perkType }: { claim: Claim; perkType: PerkType }) {
  const [status, setStatus] = useState(claim.status || 'pending')
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState(claim.brand_notes || '')
  const [showNotes, setShowNotes] = useState(false)

  async function updateStatus(newStatus: string) {
    setLoading(true)
    const res = await fetch('/api/perks/update-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_id: claim.id,
        perk_id: claim.perk_id,
        status: newStatus,
        brand_notes: notes,
        creator_username: claim.egg_creator_username,
      }),
    })
    const data = await res.json().catch(() => null)
    if (data?.success) setStatus(newStatus)
    else alert(data?.error || '更新失敗，請重試')
    setLoading(false)
  }

  const badge = statusLabels[status] ?? statusLabels.pending
  const claimedAt = claim.claimed_at || claim.created_at

  return (
    <div className="claims-row">
      <div>
        <strong>{claim.egg_creator_username || '未命名創作者'}</strong>
        {claim.egg_creator_username ? (
          <a href={`https://egg.sooncreator.network/${claim.egg_creator_username}/mediakit`} target="_blank" className="mediakit-link">
            Media Kit ↗
          </a>
        ) : null}
      </div>

      <div className="claim-details">
        {perkType === 'service' ? (
          <>
            {claim.preferred_date ? <span>日期：{claim.preferred_date}</span> : null}
            {claim.preferred_time ? <span>時間：{claim.preferred_time}</span> : null}
            {claim.party_size && claim.party_size > 1 ? <span>人數：{claim.party_size} 人</span> : null}
          </>
        ) : (
          <>
            {claim.delivery_name ? <span>收件人：{claim.delivery_name}</span> : null}
            {claim.delivery_phone ? <span>電話：{claim.delivery_phone}</span> : null}
            {claim.delivery_district ? <span>地區：{claim.delivery_district}</span> : null}
            {claim.delivery_address ? <span className="address">{claim.delivery_address}</span> : null}
          </>
        )}
      </div>

      <span className="claim-time">{claimedAt ? new Date(claimedAt).toLocaleDateString('zh-HK') : '-'}</span>
      <span className={`status-badge ${badge.className}`}>{badge.label}</span>

      <div className="claim-actions">
        {status === 'pending' ? (
          <>
            <button onClick={() => updateStatus('confirmed')} disabled={loading} className="btn-confirm" type="button">
              確認
            </button>
            <button onClick={() => updateStatus('rejected')} disabled={loading} className="btn-reject" type="button">
              婉拒
            </button>
          </>
        ) : null}
        {status === 'confirmed' ? (
          <button onClick={() => updateStatus('in_progress')} disabled={loading} className="btn-progress" type="button">
            {perkType === 'service' ? '標記進行中' : '已寄出'}
          </button>
        ) : null}
        {status === 'in_progress' ? (
          <button onClick={() => updateStatus('completed')} disabled={loading} className="btn-complete" type="button">
            標記完成
          </button>
        ) : null}
        {status === 'completed' || status === 'rejected' ? (
          <span className="done-label">{status === 'completed' ? '✓ 完成' : '✗ 已婉拒'}</span>
        ) : null}
        <button className="btn-notes" onClick={() => setShowNotes((current) => !current)} type="button">
          備注
        </button>
        {showNotes ? (
          <div className="notes-editor">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="內部備注" rows={2} />
            <button onClick={() => updateStatus(status)} disabled={loading} type="button">
              儲存
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
