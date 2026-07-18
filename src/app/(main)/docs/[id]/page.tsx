// jules edit: Created Server-side page route wrapper to support dynamic SEO, Open Graph & Twitter Card metadata loading for the Documentation page
import type { Metadata } from "next";
import DocsClient from "./DocsClient";
import { toolDocsDb } from "@/lib/general/docs-data";

interface DocsParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DocsParams): Promise<Metadata> {
  const { id } = await params;
  const doc = toolDocsDb[id];

  if (doc) {
    const title = `${doc.title} Documentation & Guidelines | Ping World`;
    const description = `Read full details, audience statistics, release versions, and compatible feature breakdowns for ${doc.title}. Provided by Qal Technologies.`;
    return {
      title,
      description,
      keywords: [
        `${doc.title} Docs`,
        `${doc.category} Tool`,
        "Ping World Documentation",
        "Qal Technologies",
        "Pascodez"
      ],
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "Ping World Docs",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      }
    };
  }

  return {
    title: "Tool Documentation | Ping World",
    description: "Read step-by-step features guidelines and version histories for Ping World tools suite.",
  };
}

export default async function ToolDocsPage({ params }: DocsParams) {
  const { id } = await params;
  return <DocsClient id={id} />;
}
