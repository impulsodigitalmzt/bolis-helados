import { renderAppIcon } from '@/lib/appIcon';

export const runtime = 'nodejs';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return renderAppIcon(512);
}
