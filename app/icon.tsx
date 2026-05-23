import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            color: '#ef4444',
            fontSize: '14px',
            fontWeight: '900',
            letterSpacing: '-1px',
            fontFamily: 'sans-serif',
          }}
        >
          SOON
        </div>
      </div>
    ),
    { ...size }
  )
}
