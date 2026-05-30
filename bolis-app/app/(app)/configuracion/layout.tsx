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
        className="hidden md:block md:!mb-7"
      />
      <ConfigSubNav />
      {/* Espacio bajo la barra fija de Config en móvil (tabs + hint) */}
      <div className="min-w-0 pt-[5.85rem] md:pt-0">{children}</div>
    </>
  );
}
