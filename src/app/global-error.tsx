"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#f8f5ef", color: "#17221f", fontFamily: "Tahoma, Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <h1 style={{ color: "#153d35" }}>تعذر تحميل ميثاق</h1>
            <p style={{ color: "#555", lineHeight: 1.8 }}>حدث خطأ غير متوقع. لم تتأثر بياناتك.</p>
            <button
              onClick={() => reset()}
              style={{ background: "#153d35", color: "#fff", border: 0, borderRadius: 16, padding: "14px 28px", fontWeight: 700, cursor: "pointer" }}
              type="button"
            >
              إعادة المحاولة
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
