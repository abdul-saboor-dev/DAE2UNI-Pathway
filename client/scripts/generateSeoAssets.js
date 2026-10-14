import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const siteOrigin = 'https://dae2uni-pathway.vercel.app'
const apiBase = (process.env.VITE_API_URL || 'https://dae2uni.alwaysdata.net/api').replace(/\/$/, '')
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.resolve(scriptDirectory, '../dist')

const staticRoutes = [
  { path: '/', heading: 'DAE to university pathways in Pakistan', title: 'DAE2UNI Pathway | DAE to University Guidance in Pakistan', description: 'Explore published, source-verified university and computing program records for DAE CIT students researching undergraduate pathways in Punjab and Islamabad, Pakistan.', structuredData: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'DAE2UNI Pathway', url: siteOrigin } },
  { path: '/universities', heading: 'University catalogue', title: 'Punjab University Catalogue for DAE Students | DAE2UNI', description: 'Browse published, source-verified university and campus records across Punjab and Islamabad while researching pathways after DAE CIT.', structuredData: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'DAE2UNI University Catalogue', url: `${siteOrigin}/universities` } },
  { path: '/programs', heading: 'Computing program catalogue', title: 'Computing Programs After DAE | DAE2UNI Pathway', description: 'Browse published, source-verified undergraduate computing program records while researching DAE to BS Computer Science, Data Science, AI and related pathways.', structuredData: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'DAE2UNI Program Catalogue', url: `${siteOrigin}/programs` } },
]

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function safePathSegment(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.includes('/') || text.includes('\\') || text === '.' || text === '..') return null
  return encodeURIComponent(text)
}

function routeFile(routePath) {
  if (routePath === '/') return path.join(distDirectory, 'index.html')
  return path.join(distDirectory, `${routePath.slice(1)}.html`)
}

function renderHead(template, route) {
  const canonical = new URL(route.path, siteOrigin).href
  const jsonLd = JSON.stringify(route.structuredData).replaceAll('<', '\\u003c')
  const tags = [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}">`,
    '<meta name="robots" content="index, follow">',
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:title" content="${escapeHtml(route.title)}">`,
    `<meta property="og:description" content="${escapeHtml(route.description)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    '<meta property="og:site_name" content="DAE2UNI Pathway">',
    '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${escapeHtml(route.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}">`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ')
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '')
    .replace('</head>', `    ${tags}\n  </head>`)
}

function renderStaticBody(template, route) {
  const links = route.links?.length
    ? `<ul>${route.links.map((link) => `<li><a href="${escapeHtml(link.path)}">${escapeHtml(link.label)}</a></li>`).join('')}</ul>`
    : ''
  const content = `<main><h1>${escapeHtml(route.heading)}</h1><p>${escapeHtml(route.description)}</p>${links}</main>`
  return template.replace('<div id="root"></div>', `<div id="root">${content}</div>`)
}

async function fetchPage(resource, page) {
  const url = new URL(`${apiBase}/${resource}`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', '100')
  url.searchParams.set('sort', 'name')
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`Public ${resource} request failed with HTTP ${response.status}.`)
  const payload = await response.json()
  const records = payload?.data?.[resource]
  const pagination = payload?.data?.pagination
  if (!Array.isArray(records) || !Number.isInteger(pagination?.totalPages) || pagination.totalPages > 100) throw new Error(`Public ${resource} response is not safe to prerender.`)
  return { records, totalPages: pagination.totalPages }
}

async function fetchAll(resource) {
  const first = await fetchPage(resource, 1)
  const records = [...first.records]
  for (let page = 2; page <= first.totalPages; page += 1) records.push(...(await fetchPage(resource, page)).records)
  return records
}

function universityRoute(university) {
  const identifier = safePathSegment(university?.slug || university?.id)
  if (!identifier || typeof university?.name !== 'string') return null
  const routePath = `/universities/${identifier}`
  return { path: routePath, heading: university.name, title: `${university.name} | DAE2UNI Pathway`, description: `${university.name}: published, source-verified university and campus information for students researching pathways after DAE in Pakistan.`, structuredData: { '@context': 'https://schema.org', '@type': 'CollegeOrUniversity', name: university.name, url: `${siteOrigin}${routePath}` } }
}

function programRoute(program) {
  const identifier = safePathSegment(program?.id)
  const universityName = program?.university?.name
  if (!identifier || typeof program?.name !== 'string' || typeof universityName !== 'string') return null
  const routePath = `/programs/${identifier}`
  return { path: routePath, heading: `${program.name} at ${universityName}`, title: `${program.name} at ${universityName} | DAE2UNI`, description: `${program.name} at ${universityName}: published, source-verified programme and campus information. Eligibility and admission are not guaranteed.`, structuredData: { '@context': 'https://schema.org', '@type': 'EducationalOccupationalProgram', name: program.name, url: `${siteOrigin}${routePath}`, provider: { '@type': 'CollegeOrUniversity', name: universityName } } }
}

async function main() {
  const template = await readFile(path.join(distDirectory, 'index.html'), 'utf8')
  const [universities, programs] = await Promise.all([fetchAll('universities'), fetchAll('programs')])
  const universityRoutes = universities.map(universityRoute).filter(Boolean)
  const programRoutes = programs.map(programRoute).filter(Boolean)
  const routes = [
    { ...staticRoutes[0], links: [{ path: '/universities', label: 'Explore universities' }, { path: '/programs', label: 'Explore computing programs' }] },
    { ...staticRoutes[1], links: universityRoutes.map((route) => ({ path: route.path, label: route.heading })) },
    { ...staticRoutes[2], links: programRoutes.map((route) => ({ path: route.path, label: route.heading })) },
    ...universityRoutes,
    ...programRoutes,
  ]
  const uniqueRoutes = [...new Map(routes.map((route) => [route.path, route])).values()]
  for (const route of uniqueRoutes) {
    const filePath = routeFile(route.path)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, renderStaticBody(renderHead(template, route), route), 'utf8')
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniqueRoutes.map((route) => `  <url><loc>${escapeHtml(new URL(route.path, siteOrigin).href)}</loc></url>`).join('\n')}\n</urlset>\n`
  await writeFile(path.join(distDirectory, 'sitemap.xml'), sitemap, 'utf8')
  console.log(`SEO prerender complete: ${uniqueRoutes.length} canonical public routes.`)
}

main().catch((error) => {
  console.error(`SEO prerender failed: ${error.message}`)
  process.exitCode = 1
})
