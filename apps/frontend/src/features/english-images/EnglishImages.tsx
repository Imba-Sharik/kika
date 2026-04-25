'use client'

import { useEffect, useMemo, useState } from 'react'
import { extractMediaRequests } from '@/shared/yukai/persona'

type ImageHit = {
  word: string
  url: string | null
  author?: string
  authorUrl?: string
}

const cache = new Map<string, ImageHit>()

async function fetchImage(word: string): Promise<ImageHit> {
  const key = word.toLowerCase().trim()
  const cached = cache.get(key)
  if (cached) return cached

  try {
    const res = await fetch(`/api/unsplash?q=${encodeURIComponent(key)}&per_page=1`)
    if (!res.ok) {
      const miss: ImageHit = { word: key, url: null }
      cache.set(key, miss)
      return miss
    }
    const json = (await res.json()) as {
      photos: { url: string; author: string; authorUrl: string }[]
    }
    const first = json.photos[0]
    const hit: ImageHit = first
      ? { word: key, url: first.url, author: first.author, authorUrl: first.authorUrl }
      : { word: key, url: null }
    cache.set(key, hit)
    return hit
  } catch {
    const miss: ImageHit = { word: key, url: null }
    cache.set(key, miss)
    return miss
  }
}

export function EnglishImages({ content }: { content: string }) {
  const queries = useMemo(
    () =>
      extractMediaRequests(content)
        .filter((r) => r.type === 'img')
        .map((r) => r.query.toLowerCase().trim())
        .filter((q, i, arr) => q && arr.indexOf(q) === i),
    [content],
  )
  const queriesKey = queries.join('|')

  const [hitsByKey, setHitsByKey] = useState<Record<string, ImageHit[]>>({})

  useEffect(() => {
    if (queries.length === 0) return
    let cancelled = false
    Promise.all(queries.map(fetchImage)).then((results) => {
      if (!cancelled) {
        setHitsByKey((prev) => ({ ...prev, [queriesKey]: results }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [queriesKey, queries])

  if (queries.length === 0) return null
  const visible = (hitsByKey[queriesKey] ?? []).filter((h) => h.url)
  if (visible.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {visible.map((hit) => (
        <figure
          key={hit.word}
          className="flex w-32 flex-col gap-1 rounded border p-1 text-xs"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hit.url!}
            alt={hit.word}
            className="h-24 w-full rounded object-cover"
            loading="lazy"
          />
          <figcaption className="truncate font-semibold">{hit.word}</figcaption>
          {hit.author && hit.authorUrl && (
            <a
              href={hit.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[10px] text-gray-500 hover:underline"
            >
              © {hit.author}
            </a>
          )}
        </figure>
      ))}
    </div>
  )
}
