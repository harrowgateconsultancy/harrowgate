import { useEffect } from "react";

interface PageSEOOptions {
  title: string;
  description?: string;
  canonical?: string;
}

export function usePageSEO({ title, description, canonical }: PageSEOOptions) {
  useEffect(() => {
    document.title = title;

    if (description) {
      let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (tag) tag.content = description;
    }

    if (canonical) {
      let tag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (tag) tag.href = canonical;
    }

    return () => {
      document.title = "Harrowgate Consultancy — Hong Kong Student Visa Service";
    };
  }, [title, description, canonical]);
}
