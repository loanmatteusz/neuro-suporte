import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/s3";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { itemId } = await params;
  const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { pdfKey: true, pdfName: true } });
  if (!item?.pdfKey) return new NextResponse("Arquivo não encontrado.", { status: 404 });
  const url = await createDownloadUrl(item.pdfKey, {
    fileName: item.pdfName ?? "material.pdf",
    download: request.nextUrl.searchParams.get("download") === "1",
  });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
