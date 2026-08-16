export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl animate-pulse px-4 py-10 sm:px-6 lg:px-8"
      aria-label="Loading"
    >
      <div className="h-11 w-52 rounded-full bg-muted" />
      <div className="mt-6 h-16 max-w-xl rounded-2xl bg-muted" />
      <div className="mt-4 h-8 max-w-md rounded-xl bg-muted" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-48 rounded-2xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
