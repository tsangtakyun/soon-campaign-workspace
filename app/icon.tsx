import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #050605 0%, #171816 58%, #22231f 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-9px',
            width: '22px',
            height: '18px',
            borderRadius: '999px',
            background: 'rgba(0,0,0,0.38)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '-6px',
            width: '16px',
            height: '18px',
            borderRadius: '999px',
            background: 'rgba(0,0,0,0.28)',
          }}
        />
        <div
          style={{
            color: '#fff7f1',
            fontSize: '13px',
            fontWeight: '900',
            letterSpacing: '-1px',
            fontStyle: 'italic',
            fontFamily: 'Arial Black, Impact, sans-serif',
            textShadow: '1px 0 #ef4444, -1px 0 #ef4444, 0 1px #ef4444, 0 -1px #ef4444, 2px 2px 0 rgba(239,68,68,0.6)',
            transform: 'rotate(-4deg) skewX(-8deg)',
          }}
        >
          SOON
        </div>
      </div>
    ),
    { ...size }
  )
}
