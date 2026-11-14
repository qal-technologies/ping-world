
import type { Metadata } from "next";
import DocsClient from "./DocsClient";
import { toolDocsDb } from "@/lib/general/docs-data";
import {COMPANY} from "@/lib/config/company";

interface DocsParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DocsParams): Promise<Metadata> {
  const { id } = await params;
  const doc = toolDocsDb[id];

  if (doc) {
    const title = `${doc.title} Documentation & Guidelines | ${COMPANY.name}`;
    const description = `Read full details, audience statistics, release versions, and compatible feature breakdowns for ${doc.title}.`;
    return {
      title,
      description,
      alternates: {
        canonical:`/docs/${id}`,
      },
      keywords: [
        `${doc.title} Docs`,
        `${doc.category} Tool`,
        "Ping World Documentation",
      ],
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "Ping World Docs",
        url:`${COMPANY.domain}/docs/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      }
    };
  }

  return {
    title: "Documentation Not Found",
    robots: {
      index: false,
      follow:false,
    },
  };
}

export default async function ToolDocsPage({ params }: DocsParams) {
  const { id } = await params;
  return <DocsClient id={id} />;
}
