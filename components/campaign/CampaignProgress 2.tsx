import { SoonIcon } from '@/components/ui/SoonIcon'

const steps = ['提供資料', '產品理解', '市場情報', '宣傳方向']

export function CampaignProgress({ current }: { current: 1 | 2 | 3 | 4 }) {
  return <ol className="campaign-progress" aria-label={`建立宣傳包進度：第 ${current} 步，共 4 步`}>
    {steps.map((label, index) => {
      const number = index + 1
      const complete = number < current
      return <li className={number === current ? 'active' : complete ? 'complete' : ''} key={label} aria-current={number === current ? 'step' : undefined}>
        <span>{complete ? <SoonIcon name="check" size={14}/> : number}</span><strong>{label}</strong>
      </li>
    })}
  </ol>
}
