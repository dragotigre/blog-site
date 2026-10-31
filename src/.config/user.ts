import type { UserConfig } from '~/types'

export const userConfig: Partial<UserConfig> = {
  site: {
    title: '정용범의 기록',
    subtitle: 'Rehabilitation',
    author: '정용범',
    description: '재활 임상과 교육, 방문재활에 대한 기록',
    website: 'https://dragotigre.github.io',
    pageSize: 6,
    socialLinks: [
      { name: 'github', href: 'https://github.com/dragotigre' },
      { name: 'rss', href: '/atom.xml' },
    ],
    navLinks: [
      { name: 'Posts', href: '/' },
      { name: 'Archive', href: '/archive' },
      { name: 'Categories', href: '/categories' },
      { name: 'Tags', href: '/tags' },
      { name: 'Album', href: '/album' },
      { name: 'Search', href: '/search' },
      { name: 'About', href: '/about' },
    ],
    categoryMap: [],
    footer: [
      '© %year <a target="_blank" href="%website">%author</a>',
    ],
  },
  appearance: {
    theme: 'light',
    locale: 'ko-kr',
    colorsLight: { primary: '#5a4636', background: '#fbf8f3' },
    colorsDark: { primary: '#efe6d8', background: '#1f1d1a' },
    fonts: {
      header: '"Noto Serif KR","Nanum Myeongjo","Batang",serif',
      ui: '"Noto Sans KR","Pretendard","Malgun Gothic","Apple SD Gothic Neo",sans-serif',
    },
  },
  seo: {
    twitter: '',
    meta: [],
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@700;900&display=swap' },
    ],
  },
}
