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

const statusOptions = [
  { value: 'pending', label: '待處理' },
  { value: 'confirmed', label: '已確認' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '已完成' },
  { value: 'rejected', label: '已婉拒' },
]

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
    else alert(data?.error || '更新失敗，請稍後再試')
    setLoading(false)
  }

  async function saveNotes() {
    await updateStatus(status)
    setShowNotes(false)
  }

  const badge = statusLabels[status] ?? statusLabels.pending
  const claimedAt = claim.claimed_at || claim.created_at

  return (
    <div className="claims-row">
      <div>
        <strong>{claim.egg_creator_username || '未知創作者'}</strong>
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
        <select
          value={status}
          onChange={(event) => updateStatus(event.target.value)}
          disabled={loading}
          className="status-select"
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            color: '#111',
          }}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="btn-notes" onClick={() => setShowNotes((current) => !current)} type="button">
          備注
        </button>
      </div>

      {showNotes ? (
        <div className="notes-inline">
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="內部備注..." rows={3} />
          <button onClick={saveNotes} disabled={loading} type="button">
            儲存備注
          </button>
          <button onClick={() => setShowNotes(false)} type="button">
            關閉
          </button>
        </div>
      ) : null}
    </div>
  )
}
