export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      application: "Mithaq",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
