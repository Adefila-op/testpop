/**
 * SEO Head Component
 * Location: src/components/seo/SEOHead.tsx
 * Purpose: Reusable component for setting up SEO meta tags and schema
 * 
 * Usage:
 * <SEOHead 
 *   meta={generateArtistProfileSeo(artist)}
 *   schema={generateArtistSchema(artist)}
 *   breadcrumbs={breadcrumbs}
 * />
 */

import { useEffect } from 'react';
import type { SeoMetaTags } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/seo';

interface SEOHeadProps {
  meta: SeoMetaTags;
  schema?: Record<string, any> | Record<string, any>[];
  breadcrumbs?: Array<{ label: string; url: string }>;
  children?: React.ReactNode;
}

/**
 * SEOHead Component - Sets up all necessary meta tags and structured data
 */
export function SEOHead({ meta, schema, breadcrumbs, children }: SEOHeadProps) {
  const canonicalUrl = getCanonicalUrl(meta.url.replace('https://testpop-one.vercel.app', ''));

  useEffect(() => {
    // Set title
    document.title = meta.title;

    // Helper function to set meta tag
    const setMetaTag = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        if (property) {
          element.setAttribute('property', name);
        } else {
          element.setAttribute('name', name);
        }
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // Basic Meta Tags
    setMetaTag('description', meta.description);
    setMetaTag('keywords', meta.keywords);
    setMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Open Graph Tags
    setMetaTag('og:title', meta.title, true);
    setMetaTag('og:description', meta.description, true);
    setMetaTag('og:image', meta.image, true);
    setMetaTag('og:url', meta.url, true);
    setMetaTag('og:type', meta.type, true);
    setMetaTag('og:site_name', 'POPUP', true);

    // Twitter Card Tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', meta.title);
    setMetaTag('twitter:description', meta.description);
    setMetaTag('twitter:image', meta.image);
    setMetaTag('twitter:site', '@popupnft');

    // Author & Publishing Info
    if (meta.author) setMetaTag('author', meta.author);
    if (meta.publishDate) setMetaTag('article:published_time', meta.publishDate, true);
    if (meta.updatedDate) setMetaTag('article:modified_time', meta.updatedDate, true);

    // Additional SEO Meta Tags
    setMetaTag('robots', 'index, follow');
    setMetaTag('googlebot', 'index, follow');

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // JSON-LD Structured Data
    if (schema) {
      const schemaData = Array.isArray(schema) 
        ? {
            '@context': 'https://schema.org',
            '@graph': schema
          }
        : schema;

      let scriptElement = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.textContent = JSON.stringify(schemaData);
    }
  }, [meta, schema, canonicalUrl]);

  return <>{children}</>;
}

/**
 * Simple meta tag component for basic SEO
 * Use when full SEOHead is overkill
 */
export function SimpleMetaTags({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  useEffect(() => {
    document.title = title;
    const descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (descMeta) {
      descMeta.content = description;
    }
  }, [title, description]);

  return null;
}

/**
 * Product Page Meta Tags & Schema
 */
export function ProductSEOHead({
  title,
  description,
  image,
  price,
  currency = 'ETH',
  availability = 'InStock'
}: {
  title: string;
  description: string;
  image: string;
  price?: string;
  currency?: string;
  availability?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description,
    image,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`
    }
  };

  useEffect(() => {
    document.title = title;
    const descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (descMeta) descMeta.content = description;

    const schemaScript = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    if (schemaScript) {
      schemaScript.textContent = JSON.stringify(schema);
    }
  }, [title, description, schema]);

  return null;
}

/**
 * Article Page Meta Tags & Schema
 */
export function ArticleSEOHead({
  title,
  description,
  image,
  author,
  publishDate,
  modifiedDate
}: {
  title: string;
  description: string;
  image: string;
  author: string;
  publishDate: string;
  modifiedDate?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image,
    author: {
      '@type': 'Person',
      name: author
    },
    datePublished: publishDate,
    dateModified: modifiedDate || publishDate
  };

  useEffect(() => {
    document.title = title;
    const descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (descMeta) descMeta.content = description;
  }, [title, description, schema]);

  return null;
}
