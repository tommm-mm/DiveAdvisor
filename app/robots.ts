import type { MetadataRoute } from "next";
import { isProduction, siteUrl } from "@/lib/site";

// Previews must never be indexed; production hides private and form-only pages.
export default function robots(): MetadataRoute.Robots {
  if (!isProduction()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/accedi", "/esci", "/auth/", "/api/", "/rivendica/", "/*/recensione"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
