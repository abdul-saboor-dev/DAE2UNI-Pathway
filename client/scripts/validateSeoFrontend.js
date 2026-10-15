import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const files = Object.fromEntries(await Promise.all([
  'index.html',
  'public/robots.txt',
  'src/components/Seo.jsx',
  'src/components/RouteSeo.jsx',
  'scripts/generateSeoAssets.js',
  'vercel.json',
].map(async (file) => [file, await readFile(new URL(`../${file}`, import.meta.url), 'utf8')])))

const vercelConfig = JSON.parse(files['vercel.json'])

assert.match(files['index.html'], /rel="canonical" href="https:\/\/dae2uni-pathway\.vercel\.app\/"/)
assert.match(files['index.html'], /property="og:title"/)
assert.match(files['public/robots.txt'], /Sitemap: https:\/\/dae2uni-pathway\.vercel\.app\/sitemap\.xml/)
for (const privatePath of ['/admin', '/dashboard', '/profile', '/login', '/register']) assert.ok(files['public/robots.txt'].includes(`Disallow: ${privatePath}`))
assert.doesNotMatch(files['src/components/Seo.jsx'], /dangerouslySetInnerHTML/)
assert.match(files['src/components/Seo.jsx'], /textContent = JSON\.stringify/)
assert.match(files['src/components/RouteSeo.jsx'], /noIndex/)
assert.match(files['scripts/generateSeoAssets.js'], /data\?\.\[resource\]/)
assert.match(files['scripts/generateSeoAssets.js'], /source-verified/)
assert.match(files['scripts/generateSeoAssets.js'], /renderStaticBody/)
assert.doesNotMatch(files['scripts/generateSeoAssets.js'], /Authorization|Bearer/)
assert.equal(vercelConfig.cleanUrls, true)
assert.ok(vercelConfig.headers.some(({ source, headers }) => source.includes('admin') && headers.some(({ key, value }) => key === 'X-Robots-Tag' && value === 'noindex, nofollow')))
assert.deepEqual(vercelConfig.rewrites, [{ source: '/(.*)', destination: '/' }])

console.log('SEO frontend safeguard passed: 17 assertions.')
