import { SoonIcon } from '@/components/ui/SoonIcon'

type SoonLoadingProps = {
  title: string
  description: string
  steps?: string[]
  compact?: boolean
}

export function SoonLoading({ title, description, steps = [], compact = false }: SoonLoadingProps) {
  return <section className={`soon-loading ${compact ? 'compact' : ''}`} role="status" aria-live="polite" aria-busy="true">
    <div className="soon-loading-mark" aria-hidden="true"><SoonIcon name="spark" size={22} /></div>
    <small>SOON 正在處理</small>
    <h2>{title}</h2>
    <p>{description}</p>
    {steps.length ? <div className="soon-loading-steps" aria-hidden="true">{steps.map((step, index) => <span key={step} style={{ animationDelay: `${index * .32}s` }}><i />{step}</span>)}</div> : null}
    <style dangerouslySetInnerHTML={{ __html: `
      .soon-loading{box-sizing:border-box;width:min(100%,760px);min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:auto;border:1px solid var(--soon-line,#ded5cd);border-radius:22px;background:#fff;color:var(--soon-ink,#202126);padding:38px;text-align:center}.soon-loading.compact{min-height:220px}.soon-loading-mark{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;background:var(--soon-oxblood,#6b2c30);color:var(--soon-chartreuse,#c7e63a);box-shadow:5px 5px 0 #d9bbb5;animation:soon-loading-float 1.8s ease-in-out infinite}.soon-loading>small{margin-top:18px;color:var(--soon-oxblood,#6b2c30);font-size:10px;font-weight:900;letter-spacing:.12em}.soon-loading h2{margin:7px 0 5px;font-size:clamp(1.25rem,3vw,1.75rem);letter-spacing:-.025em}.soon-loading p{max-width:520px;margin:0;color:var(--soon-muted,#6f737d);font-size:12px;line-height:1.6}.soon-loading-steps{width:min(100%,520px);display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:25px}.soon-loading-steps span{display:flex;align-items:center;gap:7px;border:1px solid var(--soon-line,#ded5cd);border-radius:10px;background:var(--soon-ivory,#f6f2eb);padding:10px;color:var(--soon-muted,#6f737d);font-size:10px;font-weight:750;animation:soon-loading-step 1.5s ease-in-out infinite}.soon-loading-steps i{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:var(--soon-clay,#b46a61)}@keyframes soon-loading-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes soon-loading-step{0%,100%{opacity:.55}50%{opacity:1}}@media(max-width:620px){.soon-loading{min-height:300px;padding:28px 18px}.soon-loading-steps{grid-template-columns:1fr}.soon-loading-steps span{justify-content:center}}@media(prefers-reduced-motion:reduce){.soon-loading-mark,.soon-loading-steps span{animation:none}}
    ` }} />
  </section>
}
