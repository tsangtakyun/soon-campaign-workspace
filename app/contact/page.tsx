'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

type ContactForm = {
  name: string
  email: string
  website: string
  phone: string
  location: string
  budget: string
  goal: string
  companyFax: string
}

const initialForm: ContactForm = {
  name: '',
  email: '',
  website: '',
  phone: '',
  location: '',
  budget: '',
  goal: '',
  companyFax: '',
}

const locations = ['香港', '台灣', '日本', '韓國', '英國', '美國', '其他地區']
const budgets = ['HK$8,000 以下', 'HK$8,000 - 15,000', 'HK$15,000 - 30,000', 'HK$30,000 - 50,000', 'HK$50,000 以上']

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  function updateField<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || '未能提交資料。')

      setMessage(
        data.emailSent
          ? '已收到你的資料，SOON 專人會盡快聯絡你。'
          : '資料已安全收到。SOON 專人會查看你的需要並盡快跟進。'
      )
      setForm(initialForm)
    } catch (error) {
      console.error(error)
      setMessage('暫時未能提交資料。請稍後再試，或電郵至 hello@sooncreator.network。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="contact-page">
      <section className="contact-shell">
        <div className="contact-copy">
          <p className="eyebrow">SOON 宣傳顧問</p>
          <h1>
            讓我們了解
            <br />
            你的增長目標
          </h1>
          <p className="lead">
            告訴我們你的品牌、現況和希望改善的宣傳問題。SOON 專人會先了解你的需要，再同你傾最適合的內容、創作者合作及執行方式。
          </p>

          <div className="benefits">
            {[
              ['策略先行', '先釐清目標、客群和轉換路徑，再決定內容形式。'],
              ['內容製作', '將宣傳角度變成題材、腳本、拍攝方向和交付清單。'],
              ['數據回饋', '用表現數據修正下一輪內容，避免每次都重新估。'],
              ['專人跟進', '由真人先了解品牌目標，再一齊商量適合的合作方式。'],
            ].map(([title, body]) => (
              <div className="benefit" key={title}>
                <span />
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <h2>聯絡我們</h2>

          <label className="contact-honeypot" aria-hidden="true">
            <span>公司傳真</span>
            <input
              autoComplete="off"
              tabIndex={-1}
              value={form.companyFax}
              onChange={(event) => updateField('companyFax', event.target.value)}
            />
          </label>

          <label>
            <span>姓名</span>
            <input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="你的姓名" />
          </label>

          <label>
            <span>公司電郵</span>
            <input required type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@company.com" />
          </label>

          <label>
            <span>公司網站 / 社交連結</span>
            <input value={form.website} onChange={(event) => updateField('website', event.target.value)} placeholder="company.com / Instagram / YouTube" />
          </label>

          <label>
            <span>電話 / WhatsApp</span>
            <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+852 9123 4567" />
          </label>

          <label>
            <span>公司所在地</span>
            <select value={form.location} onChange={(event) => updateField('location', event.target.value)}>
              <option value="">選擇地區</option>
              {locations.map((location) => (
                <option value={location} key={location}>{location}</option>
              ))}
            </select>
          </label>

          <label>
            <span>每月宣傳預算</span>
            <select value={form.budget} onChange={(event) => updateField('budget', event.target.value)}>
              <option value="">選擇預算</option>
              {budgets.map((budget) => (
                <option value={budget} key={budget}>{budget}</option>
              ))}
            </select>
          </label>

          <label>
            <span>你希望我們怎樣協助增長？</span>
            <textarea required value={form.goal} onChange={(event) => updateField('goal', event.target.value)} placeholder="例如希望增加查詢、改善廣告回報、建立內容方向，或尋找合適創作者。" />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? '提交中...' : '提交'}
          </button>

          {message && <p className="form-message">{message}</p>}
          <p className="privacy-note">
            提交即表示你同意 SOON 使用以上資料回覆查詢。我們不會將聯絡資料出售予第三方。
          </p>
        </form>
      </section>

      <style jsx>{`
        .contact-page {
          min-height: 100vh;
          padding: 108px 6vw 72px;
          background: #07080b;
          color: #f7f8fb;
        }

        .contact-shell {
          max-width: 1260px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(400px, 0.68fr);
          gap: clamp(36px, 5vw, 72px);
          align-items: start;
        }

        .contact-copy {
          padding-top: 30px;
        }

        .eyebrow {
          margin: 0 0 18px;
          color: rgba(255, 216, 77, 0.9);
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        h1 {
          margin: 0;
          font-size: clamp(3.2rem, 6vw, 6.2rem);
          line-height: 0.94;
          letter-spacing: 0;
          font-weight: 620;
          max-width: 900px;
        }

        .lead {
          max-width: 740px;
          margin: 22px 0 32px;
          color: rgba(247, 248, 251, 0.78);
          font-size: clamp(1.08rem, 1.7vw, 1.38rem);
          line-height: 1.75;
        }

        .benefits {
          display: grid;
          gap: 14px;
          max-width: 820px;
        }

        .benefit {
          display: grid;
          grid-template-columns: 26px 1fr;
          gap: 16px;
          align-items: start;
        }

        .benefit > span {
          width: 22px;
          height: 22px;
          margin-top: 3px;
          border-radius: 999px;
          background: #54c746;
          position: relative;
        }

        .benefit > span::after {
          content: "";
          position: absolute;
          left: 7px;
          top: 5px;
          width: 6px;
          height: 10px;
          border: solid #ffffff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .benefit strong {
          display: block;
          margin-bottom: 4px;
          color: #ffffff;
          font-size: 1.08rem;
        }

        .benefit p {
          margin: 0;
          color: rgba(247, 248, 251, 0.72);
          font-size: 1rem;
          line-height: 1.55;
        }

        .contact-form {
          background: #ffffff;
          color: #111111;
          border-radius: 8px;
          padding: clamp(24px, 3vw, 36px);
          display: grid;
          gap: 14px;
          box-shadow: 0 26px 90px rgba(0, 0, 0, 0.34);
        }

        .contact-form h2 {
          margin: 0 0 8px;
          color: #111111;
          font-size: clamp(2rem, 3vw, 2.8rem);
          line-height: 1.05;
          letter-spacing: 0;
        }

        label {
          display: grid;
          gap: 8px;
          color: #1b1b1f;
          font-size: 0.98rem;
          font-weight: 650;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #dedfe4;
          border-radius: 8px;
          background: #ffffff;
          color: #111111;
          font: inherit;
          font-weight: 500;
          padding: 12px 14px;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        input::placeholder,
        textarea::placeholder {
          color: #9b9da5;
        }

        select {
          appearance: auto;
        }

        textarea {
          min-height: 112px;
          resize: vertical;
          line-height: 1.65;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #111111;
          box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
        }

        button {
          margin-top: 6px;
          border: 0;
          border-radius: 6px;
          background: #ef3f2f;
          color: #ffffff;
          padding: 17px 22px;
          font-size: 1.08rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 160ms ease, opacity 160ms ease;
        }

        button:hover {
          transform: translateY(-1px);
        }

        button:disabled {
          cursor: wait;
          opacity: 0.68;
          transform: none;
        }

        .form-message {
          margin: 0;
          border-radius: 8px;
          background: #f7f2d8;
          color: #6b5d1c;
          padding: 13px 15px;
          font-size: 0.95rem;
          line-height: 1.55;
        }

        .contact-honeypot {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          overflow: hidden !important;
          clip: rect(0 0 0 0) !important;
          white-space: nowrap !important;
        }

        .privacy-note {
          margin: -4px 0 0;
          color: #777b84;
          font-size: 0.78rem;
          line-height: 1.5;
        }

        @media (max-width: 980px) {
          .contact-page {
            padding: 96px 20px 64px;
          }

          .contact-shell {
            grid-template-columns: 1fr;
          }

          .contact-copy {
            padding-top: 10px;
          }
        }

        @media (max-width: 560px) {
          h1 {
            font-size: 3.1rem;
          }

          .contact-form {
            padding: 24px 18px;
          }
        }
      `}</style>
    </main>
  )
}
