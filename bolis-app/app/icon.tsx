import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 96,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 200,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -8,
            textShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          B
        </div>
      </div>
    ),
    { ...size },
  );
}
