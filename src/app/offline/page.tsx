export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <section className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Offline-Modus</h1>
        <p className="mt-3 text-sm text-slate-700">
          Du bist gerade offline. Bereits geladene Seiten und Daten sind weiter verfügbar.
        </p>
      </section>
    </main>
  );
}
