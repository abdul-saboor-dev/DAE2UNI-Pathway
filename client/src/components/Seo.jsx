import { useEffect } from 'react'

export const SITE_ORIGIN = 'https://dae2uni-pathway.vercel.app'

function safeCanonicalPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value.split(/[?#]/, 1)[0] || '/'
}

function setMeta(selector, attribute, value) {
  let element = document.head.querySelector(selector)
  if (!value) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement('meta')
    const [name, content] = attribute
    element.setAttribute(name, content)
    document.head.append(element)
  }
  element.setAttribute('content', value)
}

function setCanonical(path) {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.append(element)
  }
  element.setAttribute('href', new URL(safeCanonicalPath(path), SITE_ORIGIN).href)
}

function setStructuredData(value) {
  const selector = 'script[data-dae2uni-structured-data]'
  let element = document.head.querySelector(selector)
  if (!value) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement('script')
    element.type = 'application/ld+json'
    element.dataset.dae2uniStructuredData = 'true'
    document.head.append(element)
  }
  element.textContent = JSON.stringify(value)
}

export default function Seo({ title, description, canonicalPath, noIndex = false, structuredData = null }) {
  useEffect(() => {
    const canonicalUrl = new URL(safeCanonicalPath(canonicalPath), SITE_ORIGIN).href
    document.title = title
    setMeta('meta[name="description"]', ['name', 'description'], description)
    setMeta('meta[name="robots"]', ['name', 'robots'], noIndex ? 'noindex, nofollow' : 'index, follow')
    setMeta('meta[property="og:title"]', ['property', 'og:title'], title)
    setMeta('meta[property="og:description"]', ['property', 'og:description'], description)
    setMeta('meta[property="og:type"]', ['property', 'og:type'], 'website')
    setMeta('meta[property="og:url"]', ['property', 'og:url'], canonicalUrl)
    setMeta('meta[property="og:site_name"]', ['property', 'og:site_name'], 'DAE2UNI Pathway')
    setMeta('meta[name="twitter:card"]', ['name', 'twitter:card'], 'summary')
    setMeta('meta[name="twitter:title"]', ['name', 'twitter:title'], title)
    setMeta('meta[name="twitter:description"]', ['name', 'twitter:description'], description)
    setCanonical(canonicalPath)
    setStructuredData(structuredData)
  }, [canonicalPath, description, noIndex, structuredData, title])

  return null
}
