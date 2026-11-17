export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center px-5" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="grid size-14 animate-pulse place-items-center rounded-2xl bg-[#153d35] text-xl font-black text-white">م</div>
        <p className="text-sm font-bold text-black/45">جاري التحميل…</p>
      </div>
    </main>
  );
}
