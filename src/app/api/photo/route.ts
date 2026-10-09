import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/s3";

export async function GET() {
  const s = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { photoKey: true } });
  if (!s?.photoKey) return new NextResponse(null, { status: 404 });
  const url = await createDownloadUrl(s.photoKey, { fileName: "foto" });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "public, max-age=120" } });
}
