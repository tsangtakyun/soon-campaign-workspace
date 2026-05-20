import { redirect } from 'next/navigation'

type ClaimPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ClaimPage({ searchParams }: ClaimPageProps) {
  const params = await searchParams
  const nextParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item))
      return
    }

    if (typeof value === 'string') {
      nextParams.set(key, value)
    }
  })

  if (!nextParams.has('onboarding')) {
    nextParams.set('onboarding', '1')
  }

  redirect(`/signup?${nextParams.toString()}`)
}
