// Kennung des aktuellen Builds, beim Bauen festgeschrieben. Die offene App fragt sie ab, um eine neue Version zu erkennen.
export const dynamic = "force-static";

export function GET() {
  return Response.json({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "" });
}
