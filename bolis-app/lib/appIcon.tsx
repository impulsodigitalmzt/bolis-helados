import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Rosa del logo Delicort — rellena el favicon sin esquinas negras. */
const BRAND_PINK = '#f4bdc8';

async function loadLogoSrc() {
  const data = await readFile(join(process.cwd(), 'public/imagenes/LOGO.png'));
  return `data:image/png;base64,${data.toString('base64')}`;
}

export async function renderAppIcon(size: number) {
  const logoSrc = await loadLogoSrc();
  const logoSize = Math.round(size * 0.88);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_PINK,
        }}
      >
        <div
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={logoSrc}
            width={logoSize}
            height={logoSize}
            alt=""
            style={{ objectFit: 'cover' }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
