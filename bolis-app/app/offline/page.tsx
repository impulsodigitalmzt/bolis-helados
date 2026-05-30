export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-lg font-bold text-stone-900">Sin conexión</p>
      <p className="mt-2 max-w-sm text-sm text-stone-600">
        Revisa tu internet e intenta de nuevo. Si abriste la app desde inicio,
        vuelve cuando tengas señal.
      </p>
    </main>
  );
}
