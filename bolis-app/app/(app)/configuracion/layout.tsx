import { ConfigSubNav } from '@/components/configuracion/ConfigSubNav';
import { SECTION_CONTENT_OFFSET_CLASS } from '@/lib/sectionChrome';

export default function ConfiguracionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ConfigSubNav />
      <div className={`min-w-0 ${SECTION_CONTENT_OFFSET_CLASS}`}>
        <div className="card-premium mt-3 min-w-0 max-w-full overflow-x-hidden rounded-2xl p-4 sm:mt-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </>
  );
}
