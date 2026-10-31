import { useEffect } from 'react'

interface SEOProps {
  title: string
  description: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  noIndex?: boolean
}

const SITE_NAME = 'EchoGrow'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function SEO({ title, description, image = '/logo.png', url, type = 'website', noIndex = false }: SEOProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`

  useEffect(() => {
    document.title = fullTitle
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', image)
    setMeta('name', 'theme-color', '#0e1e37')
    if (url) {
      setMeta('property', 'og:url', url)
      let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.appendChild(canonical)
      }
      canonical.href = url
    }
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')
  }, [fullTitle, description, image, url, type, noIndex])

  return null
}