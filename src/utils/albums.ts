import fs from 'node:fs'
import path from 'node:path'

const IMG = /\.(jpe?g|png|webp|gif)$/i

export interface Photo {
  file: string
  title: string
  date: string
  sortKey: string
}

export interface Album {
  name: string
  photos: Photo[]
  cover: Photo
}

function parsePhoto(file: string): Photo {
  const base = file.replace(IMG, '')
  const m = base.match(/^(\d{4})[-.](\d{2})(?:[-.](\d{2}))?[\s_]*(.*)$/)
  if (m) {
    const date = [m[1], m[2], m[3]].filter(Boolean).join('.')
    return { file, title: m[4].trim(), date, sortKey: [m[1], m[2], m[3] ?? '00'].join('') }
  }
  return { file, title: base, date: '', sortKey: '' }
}

export function getAlbums(): Album[] {
  const root = path.join(process.cwd(), 'public/album')
  if (!fs.existsSync(root))
    return []
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map((d) => {
      const photos = fs.readdirSync(path.join(root, d.name))
        .filter(f => IMG.test(f))
        .map(parsePhoto)
        .sort((a, b) => (b.sortKey.localeCompare(a.sortKey)) || a.file.localeCompare(b.file, 'ko'))
      const cover = photos.find(p => p.file.startsWith('대표')) ?? photos[0]
      return { name: d.name, photos, cover }
    })
    .filter(a => a.photos.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export function photoUrl(base: string, album: string, file: string) {
  return `${base}/album/${encodeURIComponent(album)}/${encodeURIComponent(file)}`
}
