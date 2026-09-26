import { SoonIcon } from '@/components/ui/SoonIcon'

export type SoonLoadingStep = string | {
  label: string
  status?: 'pending' | 'active' | 'done'
}

type SoonLoadingProps = {
  title: string
  description: string
  steps?: SoonLoadingStep[]
  compact?: boolean
}

export function SoonLoading({ title, description, steps = [], compact = false }: SoonLoadingProps) {
  return <section className={`soon-loading ${compact ? 'compact' : ''}`} role="status" aria-live="polite" aria-busy="true">
    <div className="soon-loading-mark" aria-hidden="true"><SoonIcon name="spark" size={22} /></div>
    <small>SOON 正在處理</small>
    <h2>{title}</h2>
    <p>{description}</p>
    {steps.length ? <div className="soon-loading-steps" aria-label="處理進度">{steps.map((step, index) => {
      const normalized = typeof step === 'string' ? { label: step, status: 'pulse' as const } : { label: step.label, status: step.status || 'pending' as const }
      return <span key={normalized.label} className={normalized.status} style={normalized.status === 'pulse' ? { animationDelay: `${index * .32}s` } : undefined}>
        <i aria-hidden="true">{normalized.status === 'done' ? '✓' : normalized.status === 'active' ? index + 1 : ''}</i>
        {normalized.label}
      </span>
    })}</div> : null}
    <style dangerouslySetInnerHTML={{ __html: `
      .soon-loading{box-sizing:border-box;width:min(100%,760px);min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:auto;border:1px solid var(--soon-line,#ded5cd);border-radius:22px;background:#fff;color:var(--soon-ink,#202126);padding:38px;text-align:center}.soon-loading.compact{min-height:220px}.soon-loading-mark{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;background:var(--soon-oxblood,#6b2c30);color:var(--soon-chartreuse,#c7e63a);box-shadow:5px 5px 0 #d9bbb5;animation:soon-loading-float 1.8s ease-in-out infinite}.soon-loading>small{margin-top:18px;color:var(--soon-oxblood,#6b2c30);font-size:10px;font-weight:900;letter-spacing:.12em}.soon-loading h2{margin:7px 0 5px;font-size:clamp(1.25rem,3vw,1.75rem);letter-spacing:-.025em}.soon-loading p{max-width:520px;margin:0;color:var(--soon-muted,#6f737d);font-size:12px;line-height:1.6}.soon-loading-steps{width:min(100%,520px);display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:25px}.soon-loading-steps span{display:flex;align-items:center;gap:7px;border:1px solid var(--soon-line,#ded5cd);border-radius:10px;background:var(--soon-ivory,#f6f2eb);padding:10px;color:var(--soon-muted,#6f737d);font-size:10px;font-weight:750}.soon-loading-steps span.pulse{animation:soon-loading-step 1.5s ease-in-out infinite}.soon-loading-steps i{display:grid;place-items:center;width:18px;height:18px;flex:0 0 18px;border-radius:50%;background:#e6ddd4;color:var(--soon-muted,#6f737d);font-size:9px;font-style:normal;font-weight:900}.soon-loading-steps span.done{border-color:#d8e6ae;color:#52691a}.soon-loading-steps span.done i{background:#edf6d4;color:#52691a}.soon-loading-steps span.active{border-color:#c9aaa5;background:#f7eee9;color:var(--soon-oxblood,#6b2c30)}.soon-loading-steps span.active i{background:var(--soon-oxblood,#6b2c30);color:#fff;animation:soon-loading-active 1.15s ease-in-out infinite}@keyframes soon-loading-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes soon-loading-step{0%,100%{opacity:.55}50%{opacity:1}}@keyframes soon-loading-active{0%,100%{box-shadow:0 0 0 0 rgba(107,44,48,.2)}50%{box-shadow:0 0 0 5px rgba(107,44,48,.08)}}@media(max-width:620px){.soon-loading{min-height:300px;padding:28px 18px}.soon-loading-steps{grid-template-columns:1fr}.soon-loading-steps span{justify-content:flex-start}}@media(prefers-reduced-motion:reduce){.soon-loading-mark,.soon-loading-steps span,.soon-loading-steps span.active i{animation:none}}
    ` }} />
  </section>
}
