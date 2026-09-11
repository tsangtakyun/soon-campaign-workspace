import { SoonIcon } from '@/components/ui/SoonIcon'

const steps = [
  { label: '製作計劃', icon: 'calendar' },
  { label: '生成素材', icon: 'create' },
  { label: '審批內容', icon: 'check' },
  { label: '排程發布', icon: 'publish' },
] as const

export function ProductionProgress({ current }: { current: 1 | 2 | 3 | 4 }) {
  return <ol className="production-progress" aria-label={`內容製作進度：第 ${current} 步，共 4 步`}>
    {steps.map((step, index) => <li className={index + 1 === current ? 'active' : index + 1 < current ? 'complete' : ''} key={step.label} aria-current={index + 1 === current ? 'step' : undefined}>
      <span><SoonIcon name={index + 1 < current ? 'check' : step.icon} size={16}/></span><strong>{step.label}</strong>
    </li>)}
  </ol>
}
