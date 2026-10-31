import type { Post } from '~/types'
import { getCollection } from 'astro:content'
import dayjs from 'dayjs'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

export async function getCategories() {
  const posts = await getPosts()
  const categories = new Map<string, Post[]>()

  for (const post of posts) {
    if (post.data.categories) {
      for (const c of post.data.categories) {
        const posts = categories.get(c) || []
        posts.push(post)
        categories.set(c, posts)
      }
    }
  }

  return categories
}

export async function getPosts(isArchivePage = false) {
  const posts = await getCollection('posts')

  posts.sort((a, b) => {
    if (isArchivePage) {
      return dayjs(a.data.pubDate).isBefore(dayjs(b.data.pubDate)) ? 1 : -1
    }

    const aDate = a.data.modDate ? dayjs(a.data.modDate) : dayjs(a.data.pubDate)
    const bDate = b.data.modDate ? dayjs(b.data.modDate) : dayjs(b.data.pubDate)

    return aDate.isBefore(bDate) ? 1 : -1
  })

  if (import.meta.env.PROD) {
    return posts.filter(post => post.data.draft !== true)
  }

  return posts
}

const parser = new MarkdownIt()
export function getPostDescription(post: Post) {
  if (post.data.description) {
    return post.data.description
  }

  const html = parser.render(post.body || '')
  const sanitized = sanitizeHtml(html, { allowedTags: [] })
  return sanitized.slice(0, 400)
}

export function formatDate(date: Date, format: string = 'YYYY-MM-DD') {
  return dayjs(date).format(format)
}

export function getPathFromCategory(
  category: string,
  category_map: { name: string, path: string }[],
) {
  const mappingPath = category_map.find(l => l.name === category)
  return mappingPath ? mappingPath.path : category
}

export function withBase(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path}`
}

export async function getTags() {
  const posts = await getPosts()
  const tags = new Map<string, Post[]>()
  for (const post of posts) {
    for (const tag of post.data.tags ?? []) {
      const list = tags.get(tag) || []
      list.push(post)
      tags.set(tag, list)
    }
  }
  return tags
}

export function getRelatedPosts(post: Post, all: Post[], limit = 3) {
  const tags = new Set(post.data.tags ?? [])
  const cats = new Set(post.data.categories ?? [])
  return all
    .filter(p => p.id !== post.id)
    .map((p) => {
      const score = (p.data.tags ?? []).filter(t => tags.has(t)).length * 2
        + (p.data.categories ?? []).filter(c => cats.has(c)).length
      return { p, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.p)
}

// 한글 기준 분당 약 500자
export function getReadingMinutes(body: string | undefined) {
  const text = (body ?? '').replace(/```[\s\S]*?```/g, '').replace(/[#>*_`|\-\[\]()!]/g, '').replace(/\s+/g, '')
  return Math.max(1, Math.ceil(text.length / 500))
}

export function coverUrl(cover: string | undefined) {
  if (!cover) return undefined
  return withBase(`/album/${cover.split('/').map(encodeURIComponent).join('/')}`)
}
