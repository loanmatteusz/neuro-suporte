import { PrismaPg } from "@prisma/adapter-pg";
import { S3Client } from "@aws-sdk/client-s3";
import type { JSONContent } from "@tiptap/core";
import { PrismaClient } from "../../src/generated/prisma/client";

export function createScriptPrisma(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export function createScriptS3(): { client: S3Client; bucket: string } {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return { client, bucket: process.env.S3_BUCKET! };
}

export function doc(...paragraphs: string[]): JSONContent {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
  };
}
