// vault/ (옵시디언 원문) -> src/content (Astro 형식) 변환. GitHub Actions 와 로컬 모두에서 실행됩니다.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const vault = path.join(root, 'vault')
const postsDir = path.join(root, 'src/content/posts')
const specDir = path.join(root, 'src/content/spec')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
}

function parse(text) {
  text = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: text }
  const data = {}
  let lastKey = null
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_가-힣]+):\s*(.*)$/)
    if (kv) {
      data[kv[1]] = kv[2].trim()
      lastKey = kv[1]
      continue
    }
    const item = line.match(/^\s*-\s+(.*)$/) // YAML 블록 목록
    if (item && lastKey) {
      const cur = data[lastKey] ? data[lastKey].replace(/^\[|\]$/g, '') + ', ' : ''
      data[lastKey] = `[${cur}${item[1].trim()}]`
    }
  }
  return { data, body: m[2] }
}

function unquote(v) {
  return (v ?? '').replace(/^["']|["']$/g, '').trim()
}

function list(v) {
  v = unquote(v)
  if (!v) return []
  return v.replace(/^\[|\]$/g, '').split(',').map(s => unquote(s.trim())).filter(Boolean)
}

function convertBody(body) {
  return body
    .split('\n')
    .filter(l => !/!\[\[/.test(l))
    .map((l) => {
      // 콜아웃: > [!tip] 제목  ->  > **제목**
      const c = l.match(/^(\s*>\s*)\[!(\w+)\][+-]?\s*(.*)$/)
      if (c) return `${c[1]}**${c[3] || c[2]}**`
      return l
    })
    .join('\n')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/==([^=\n]+)==/g, '<mark>$1</mark>')
    .replace(/%%[\s\S]*?%%/g, '')
}

function yamlStr(s) {
  return JSON.stringify(s)
}

function clearDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { recursive: true, force: true })
}

clearDir(postsDir)
const files = walk(vault).filter(f => f.endsWith('.md'))
let posts = 0
let about = false

for (const file of files) {
  const rel = path.relative(vault, file)
  const base = path.basename(file, '.md')
  const { data, body } = parse(fs.readFileSync(file, 'utf8'))
  if (/^(true|yes)$/i.test(unquote(data.draft))) continue

  const date = unquote(data.date) || unquote(data.pubDate) || new Date().toISOString().slice(0, 10)
  const title = unquote(data.title) || base
  const out = convertBody(body).trim()

  if (base === '소개') {
    fs.mkdirSync(specDir, { recursive: true })
    fs.writeFileSync(path.join(specDir, 'about.md'),
      `---\ntitle: ${yamlStr(title)}\npubDate: ${date}\n---\n\n${out}\n`)
    about = true
    continue
  }

  let cats = list(data.categories)
  if (!cats.length) cats = list(data.category)
  if (!cats.length) cats = ['기록']
  const desc = unquote(data.description)
  const tags = list(data.tags)
  const cover = unquote(data.cover).replace(/\.[A-Za-z0-9]+$/, '.jpg')
  const name = rel.replace(/\.md$/, '').split(path.sep).join('-')
  const fm = [
    '---',
    `title: ${yamlStr(title)}`,
    `pubDate: ${date}`,
    `categories: ${JSON.stringify(cats)}`,
    desc ? `description: ${yamlStr(desc)}` : null,
    tags.length ? `tags: ${JSON.stringify(tags)}` : null,
    cover ? `cover: ${yamlStr(cover)}` : null,
    '---',
  ].filter(Boolean).join('\n')
  fs.writeFileSync(path.join(postsDir, `${name}.md`), `${fm}\n\n${out}\n`)
  posts++
}

// 사진 앨범: vault/사진/<앨범 이름>/*.jpg -> public/album/<앨범 이름>/
const albumOut = path.join(root, 'public/album')
clearDir(albumOut)
let photos = 0
for (const file of walk(path.join(vault, '사진'))) {
  if (!/\.(jpe?g|png|webp|gif)$/i.test(file)) continue
  const rel = path.relative(path.join(vault, '사진'), file).split(path.sep)
  if (rel.length !== 2) continue // 앨범 폴더 바로 아래 사진만 사용
  const dir = path.join(albumOut, rel[0])
  fs.mkdirSync(dir, { recursive: true })
  fs.copyFileSync(file, path.join(dir, rel[1]))
  photos++
}

if (!about) {
  fs.mkdirSync(specDir, { recursive: true })
  if (!fs.existsSync(path.join(specDir, 'about.md'))) {
    fs.writeFileSync(path.join(specDir, 'about.md'), '---\ntitle: "소개"\npubDate: 2026-01-01\n---\n')
  }
}
console.log(`글 ${posts}편 변환${about ? ', 소개 페이지 갱신' : ''}, 사진 ${photos}장`)
