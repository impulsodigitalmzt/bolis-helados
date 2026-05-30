import { ConfigSubNav } from '@/components/configuracion/ConfigSubNav';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ConfiguracionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Costos por receta · precios e insumos"
        className="!mb-4 md:!mb-7"
      />
      <ConfigSubNav />
      {children}
    </>
  );
}
