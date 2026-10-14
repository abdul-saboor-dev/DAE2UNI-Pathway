import { useLocation } from 'react-router-dom'
import Seo, { SITE_ORIGIN } from './Seo.jsx'

const publicMetadata = {
  '/': {
    title: 'DAE2UNI Pathway | DAE to University Guidance in Pakistan',
    description: 'Explore published, source-verified university and computing program records for DAE CIT students researching undergraduate pathways in Punjab and Islamabad, Pakistan.',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'DAE2UNI Pathway',
      url: SITE_ORIGIN,
      description: 'Academic pathway research for DAE CIT students in Pakistan.',
    },
  },
  '/universities': {
    title: 'Punjab University Catalogue for DAE Students | DAE2UNI',
    description: 'Browse published, source-verified university and campus records across Punjab and Islamabad while researching pathways after DAE CIT.',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'DAE2UNI University Catalogue',
      url: `${SITE_ORIGIN}/universities`,
    },
  },
  '/programs': {
    title: 'Computing Programs After DAE | DAE2UNI Pathway',
    description: 'Browse published, source-verified undergraduate computing program records while researching DAE to BS Computer Science, Data Science, AI and related pathways.',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'DAE2UNI Program Catalogue',
      url: `${SITE_ORIGIN}/programs`,
    },
  },
}

const indexableDetail = /^\/(universities|programs)\/[^/]+$/

export default function RouteSeo() {
  const { pathname } = useLocation()
  const metadata = publicMetadata[pathname]

  if (metadata) return <Seo {...metadata} canonicalPath={pathname} />
  if (indexableDetail.test(pathname)) {
    return <Seo title="Catalogue record | DAE2UNI Pathway" description="Source-verified university and programme catalogue information for DAE students in Pakistan." canonicalPath={pathname} />
  }
  return <Seo title="DAE2UNI Pathway" description="DAE to university pathway guidance for students in Pakistan." canonicalPath={pathname} noIndex />
}
