// jules edit: Import company data to keep domain unified
import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/config/company";

const BASE_URL = COMPANY.domain;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/settings/",
          "/register",
          "/login",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
