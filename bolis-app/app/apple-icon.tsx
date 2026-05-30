import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #fb923c 0%, #ea580c 55%, #c2410c 100%)',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -4,
            textShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          B
        </div>
      </div>
    ),
    { ...size },
  );
}
