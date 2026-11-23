import {
  initialUsers,
  initialAuthors,
  initialCategories,
  initialArticles,
  initialVideos,
  initialAdPlacements,
  initialSettings,
  initialSocialLinks,
  initialAuthorSettings,
  initialAdminDashboard,
  initialAuthorDashboard,
  initialAdminAnalytics,
  initialAuthorAnalytics,
} from './demoData'

const STORAGE_KEYS = {
  USERS: 'demo_mock_users',
  AUTHORS: 'demo_mock_authors',
  CATEGORIES: 'demo_mock_categories',
  ARTICLES: 'demo_mock_articles',
  VIDEOS: 'demo_mock_videos',
  ADS: 'demo_mock_ads',
  SETTINGS: 'demo_mock_settings',
  SOCIAL_LINKS: 'demo_mock_social_links',
  AUTHOR_SETTINGS: 'demo_mock_author_settings',
}

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function loadAndMergeStorage(key, fallback, keyField = 'slug') {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      saveStorage(key, fallback)
      return fallback
    }
    const stored = JSON.parse(raw)
    if (!Array.isArray(stored)) return fallback
    const existing = new Set(stored.map((item) => String(item[keyField] || item.id || '')))
    const missing = fallback.filter((item) => !existing.has(String(item[keyField] || item.id || '')))
    if (missing.length > 0) {
      const merged = [...stored, ...missing]
      saveStorage(key, merged)
      return merged
    }
    return stored
  } catch {
    return fallback
  }
}

function saveStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn(`[MockApi] Failed to save key ${key}:`, e)
  }
}

// In-memory / localStorage state
let users = loadAndMergeStorage(STORAGE_KEYS.USERS, initialUsers, 'email')
let authors = loadAndMergeStorage(STORAGE_KEYS.AUTHORS, initialAuthors, 'email')
let categories = loadAndMergeStorage(STORAGE_KEYS.CATEGORIES, initialCategories, 'slug')
let articles = loadAndMergeStorage(STORAGE_KEYS.ARTICLES, initialArticles, 'slug')
let videos = loadAndMergeStorage(STORAGE_KEYS.VIDEOS, initialVideos, 'slug')
let adPlacements = loadAndMergeStorage(STORAGE_KEYS.ADS, initialAdPlacements, 'id')
let settings = loadStorage(STORAGE_KEYS.SETTINGS, initialSettings)
let socialLinks = loadAndMergeStorage(STORAGE_KEYS.SOCIAL_LINKS, initialSocialLinks, 'id')
let authorSettings = loadStorage(STORAGE_KEYS.AUTHOR_SETTINGS, initialAuthorSettings)

function createJsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function createErrorResponse(message, status = 400) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function parseBody(init) {
  if (!init || !init.body) return {}
  if (init.body instanceof FormData) {
    const obj = {}
    for (const [key, val] of init.body.entries()) {
      obj[key] = val
    }
    return obj
  }
  if (typeof init.body === 'string') {
    try {
      return JSON.parse(init.body)
    } catch {
      return {}
    }
  }
  return init.body
}

// Global Fetch Interceptor
const originalFetch = window.fetch

window.fetch = async function (input, init = {}) {
  const urlString = typeof input === 'string' ? input : input?.url || ''
  const method = (init.method || 'GET').toUpperCase()

  // Match /api endpoints
  if (urlString.includes('/api/') || urlString.startsWith('/api') || /^(https?:)?\/\/[^/]+\/api(\/|$)/i.test(urlString)) {
    try {
      let url
      try {
        url = new URL(urlString, window.location.origin)
      } catch {
        url = new URL(`http://localhost${urlString.startsWith('/') ? '' : '/'}${urlString}`)
      }

      const pathname = url.pathname.replace(/\/$/, '')
      const searchParams = url.searchParams
      const body = await parseBody(init)

      // Add a slight delay for realistic API simulation
      await new Promise((r) => setTimeout(r, 60))

      // ==========================================
      // 🔐 AUTHENTICATION (/api/auth)
      // ==========================================
      if (pathname === '/api/auth/login' && method === 'POST') {
        const { email = '', password = '' } = body
        const normalizedEmail = email.trim().toLowerCase()

        let user = users.find((u) => u.email.toLowerCase() === normalizedEmail)
        if (!user) {
          // If credentials don't match existing, create a default user profile on the fly
          const name = normalizedEmail.split('@')[0] || 'User'
          user = {
            id: Date.now(),
            first_name: name.charAt(0).toUpperCase() + name.slice(1),
            last_name: 'Member',
            name: `${name} Member`,
            email: normalizedEmail,
            role: normalizedEmail.includes('admin') ? 'admin' : normalizedEmail.includes('author') ? 'author' : 'user',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          }
          users.push(user)
          saveStorage(STORAGE_KEYS.USERS, users)
        }

        const token = `mock_token_${user.id}_${Date.now()}`
        return createJsonResponse({ user, token, message: 'Logged in successfully' })
      }

      if (pathname === '/api/auth/signup' && method === 'POST') {
        const { first_name = '', last_name = '', email = '', role = 'user' } = body
        const normalizedEmail = email.trim().toLowerCase()

        let user = users.find((u) => u.email.toLowerCase() === normalizedEmail)
        if (!user) {
          user = {
            id: Date.now(),
            first_name: first_name || 'New',
            last_name: last_name || 'Member',
            name: `${first_name} ${last_name}`.trim() || 'New Member',
            email: normalizedEmail,
            role: role || 'user',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
          }
          users.push(user)
          saveStorage(STORAGE_KEYS.USERS, users)
        }

        const token = `mock_token_${user.id}_${Date.now()}`
        return createJsonResponse({ user, token, message: 'Account created successfully' })
      }

      if (pathname === '/api/auth/forgot-password' && method === 'POST') {
        return createJsonResponse({ message: 'Password reset link sent to your email', token: 'mock-reset-token-123' })
      }

      if (pathname === '/api/auth/reset-password' && method === 'POST') {
        return createJsonResponse({ message: 'Password updated successfully' })
      }

      if (pathname === '/api/auth/change-password' && method === 'POST') {
        return createJsonResponse({ message: 'Password changed successfully' })
      }

      if (pathname === '/api/auth/authors' && method === 'GET') {
        return createJsonResponse({ authors })
      }

      if (pathname === '/api/auth/managed-accounts' && method === 'POST') {
        const newAuthor = {
          id: Date.now(),
          first_name: body.first_name || 'Author',
          last_name: body.last_name || '',
          name: `${body.first_name || ''} ${body.last_name || ''}`.trim(),
          email: body.email || `author_${Date.now()}@example.com`,
          role: body.role || 'author',
          articles_count: 0,
          status: 'Active',
        }
        authors.unshift(newAuthor)
        saveStorage(STORAGE_KEYS.AUTHORS, authors)

        // Also add to users list
        users.push(newAuthor)
        saveStorage(STORAGE_KEYS.USERS, users)

        return createJsonResponse({ user: newAuthor })
      }

      if (pathname.startsWith('/api/auth/managed-accounts/') && method === 'DELETE') {
        const id = pathname.split('/').pop()
        authors = authors.filter((a) => String(a.id) !== String(id))
        saveStorage(STORAGE_KEYS.AUTHORS, authors)
        return createJsonResponse({ message: 'Author deleted successfully' })
      }

      // ==========================================
      // 🏷️ CATEGORIES (/api/categories)
      // ==========================================
      if (pathname === '/api/categories' && method === 'GET') {
        const publicCats = categories.filter((c) => c.is_public !== false && c.is_active !== false)
        return createJsonResponse(publicCats)
      }

      if (pathname === '/api/categories/admin' && method === 'GET') {
        const search = (searchParams.get('search') || '').toLowerCase().trim()
        const page = parseInt(searchParams.get('page') || '1', 10)
        const limit = parseInt(searchParams.get('limit') || '10', 10)

        let filtered = categories
        if (search) {
          filtered = filtered.filter(
            (c) =>
              (c.name || '').toLowerCase().includes(search) ||
              (c.slug || '').toLowerCase().includes(search)
          )
        }

        const total = filtered.length
        const total_pages = Math.ceil(total / limit) || 1
        const start = (page - 1) * limit
        const paged = filtered.slice(start, start + limit)

        const activeCount = categories.filter((c) => c.is_active).length

        return createJsonResponse({
          categories: paged,
          stats: {
            total_categories: categories.length,
            active_categories: activeCount,
            total_articles: articles.length,
            orphaned_tags: 0,
          },
          pagination: {
            total_categories: total,
            total_pages,
            current_page: page,
            limit,
          },
        })
      }

      if (pathname === '/api/categories' && method === 'POST') {
        const newCat = {
          id: Date.now(),
          name: body.name || 'New Category',
          slug: body.slug || `category-${Date.now()}`,
          description: body.description || '',
          color: body.color || 'bg-blue-600',
          is_featured: Boolean(body.is_featured),
          is_public: body.is_public !== false,
          is_active: body.is_active !== false,
          articles_count: 0,
        }
        categories.unshift(newCat)
        saveStorage(STORAGE_KEYS.CATEGORIES, categories)
        return createJsonResponse({ category: newCat })
      }

      if (pathname.startsWith('/api/categories/') && pathname.endsWith('/toggle-status') && method === 'PATCH') {
        const id = pathname.split('/')[3]
        const cat = categories.find((c) => String(c.id) === String(id))
        if (cat) {
          cat.is_active = !cat.is_active
          saveStorage(STORAGE_KEYS.CATEGORIES, categories)
          return createJsonResponse({ category: cat })
        }
        return createErrorResponse('Category not found', 404)
      }

      if (pathname.startsWith('/api/categories/') && method === 'PUT') {
        const id = pathname.split('/').pop()
        const index = categories.findIndex((c) => String(c.id) === String(id))
        if (index !== -1) {
          categories[index] = { ...categories[index], ...body }
          saveStorage(STORAGE_KEYS.CATEGORIES, categories)
          return createJsonResponse({ category: categories[index] })
        }
        return createErrorResponse('Category not found', 404)
      }

      if (pathname.startsWith('/api/categories/') && method === 'DELETE') {
        const id = pathname.split('/').pop()
        categories = categories.filter((c) => String(c.id) !== String(id))
        saveStorage(STORAGE_KEYS.CATEGORIES, categories)
        return createJsonResponse({ message: 'Category deleted', id })
      }

      // ==========================================
      // 📰 ARTICLES (/api/articles)
      // ==========================================
      if (pathname === '/api/articles/saved' && method === 'GET') {
        const saved = articles.filter((a) => a.is_saved)
        return createJsonResponse({ articles: saved })
      }

      if (pathname === '/api/articles/upload-image' && method === 'POST') {
        let imageUrl = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80'
        if (body.heroImage instanceof File || body.image instanceof File) {
          const file = body.heroImage || body.image
          try {
            imageUrl = URL.createObjectURL(file)
          } catch {
            // Keep default unsplash URL
          }
        }
        return createJsonResponse({ url: imageUrl, imageUrl, image_url: imageUrl })
      }

      if (pathname.startsWith('/api/articles/id/') && method === 'GET') {
        const id = pathname.split('/').pop()
        const article = articles.find((a) => String(a.id) === String(id))
        if (article) return createJsonResponse({ article })
        return createErrorResponse('Article not found', 404)
      }

      if (pathname.startsWith('/api/articles/') && pathname.endsWith('/like')) {
        const parts = pathname.split('/')
        const id = parts[3]
        const article = articles.find((a) => String(a.id) === String(id))
        if (article) {
          if (method === 'POST') {
            article.is_liked = true
            article.likes_count = (article.likes_count || 0) + 1
          } else if (method === 'DELETE') {
            article.is_liked = false
            article.likes_count = Math.max(0, (article.likes_count || 1) - 1)
          }
          saveStorage(STORAGE_KEYS.ARTICLES, articles)
          return createJsonResponse({
            id: article.id,
            likes_count: article.likes_count,
            is_liked: article.is_liked,
            article,
          })
        }
        return createErrorResponse('Article not found', 404)
      }

      if (pathname.startsWith('/api/articles/') && pathname.endsWith('/save')) {
        const parts = pathname.split('/')
        const id = parts[3]
        const article = articles.find((a) => String(a.id) === String(id))
        if (article) {
          article.is_saved = method === 'POST'
          saveStorage(STORAGE_KEYS.ARTICLES, articles)
          return createJsonResponse({ id: article.id, is_saved: article.is_saved, article })
        }
        return createErrorResponse('Article not found', 404)
      }

      if (pathname === '/api/articles' && method === 'GET') {
        const page = parseInt(searchParams.get('page') || '1', 10)
        const limit = parseInt(searchParams.get('limit') || '10', 10)
        const category = searchParams.get('category')
        const search = (searchParams.get('search') || '').toLowerCase().trim()

        let filtered = articles
        if (category && category !== 'all' && category !== 'latest') {
          filtered = filtered.filter(
            (a) => (a.category || '').toLowerCase() === category.toLowerCase()
          )
        }
        if (search) {
          filtered = filtered.filter(
            (a) =>
              (a.title || '').toLowerCase().includes(search) ||
              (a.author || '').toLowerCase().includes(search)
          )
        }

        const total_articles = filtered.length
        const total_pages = Math.ceil(total_articles / limit) || 1
        const start = (page - 1) * limit
        const paged = filtered.slice(start, start + limit)

        return createJsonResponse({
          articles: paged,
          pagination: {
            total_articles,
            total_pages,
            current_page: page,
            limit,
          },
        })
      }

      if (pathname === '/api/articles' && method === 'POST') {
        const newArticle = {
          id: Date.now(),
          title: body.title || 'Untitled Article',
          slug: body.slug || (body.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          category: body.category || 'News',
          author: body.author || 'Alex River',
          author_id: body.author_id || 2,
          created_by: body.created_by || 2,
          authorimage: body.authorimage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWWvt_WLO4A-0kPEGq79kescFJTjGgUMEyH7p420fAIvtu8eTuJVjdBj9qamtFv2QUzH3KMbxwQwvmWcvnnlnelUWqMwqfQxKd0-ozg3qmvsexItH0-enn2OFe6YqLKYMfVdjkJVMdycKZnYdJHQmeUACJ2wq2AGF48liDQfOmppAqAp5YgpSd4wAz-3tZf4SEZhxg4RIH-LkOheEOtqTloNEQEWu3j0poebIAF8mKOZ8J5Nal-1XC5sCzyKgUVc6kaLrmwX1FEBQ',
          publish_date: body.publish_date || new Date().toISOString().split('T')[0],
          read_time: body.read_time || '5 min',
          status: body.status || 'Draft',
          likes_count: 0,
          is_liked: false,
          is_saved: false,
          views_count: 0,
          hero_image: body.hero_image || body.heroImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
          image_credit: body.image_credit || 'Digital Observer',
          tags: Array.isArray(body.tags) ? body.tags : (body.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
          content_blocks: Array.isArray(body.content_blocks) ? body.content_blocks : [
            { type: 'paragraph', content: body.summary || 'Article content draft.', bold: false },
          ],
        }
        articles.unshift(newArticle)
        saveStorage(STORAGE_KEYS.ARTICLES, articles)
        return createJsonResponse({ article: newArticle })
      }

      // Single article by slug or ID
      if (pathname.startsWith('/api/articles/') && method === 'GET') {
        const slug = pathname.replace('/api/articles/', '')
        const article = articles.find((a) => a.slug === slug || String(a.id) === String(slug))
        if (article) return createJsonResponse({ article })
        return createErrorResponse('Article not found', 404)
      }

      if (pathname.startsWith('/api/articles/') && method === 'PUT') {
        const id = pathname.split('/').pop()
        const index = articles.findIndex((a) => String(a.id) === String(id) || a.slug === id)
        if (index !== -1) {
          articles[index] = { ...articles[index], ...body }
          saveStorage(STORAGE_KEYS.ARTICLES, articles)
          return createJsonResponse({ article: articles[index] })
        }
        return createErrorResponse('Article not found', 404)
      }

      if (pathname.startsWith('/api/articles/') && method === 'DELETE') {
        const id = pathname.split('/').pop()
        articles = articles.filter((a) => String(a.id) !== String(id) && a.slug !== id)
        saveStorage(STORAGE_KEYS.ARTICLES, articles)
        return createJsonResponse({ message: 'Article deleted', id })
      }

      // ==========================================
      // 🎬 VIDEOS (/api/videos)
      // ==========================================
      if (pathname === '/api/videos' && method === 'GET') {
        const page = parseInt(searchParams.get('page') || '1', 10)
        const limit = parseInt(searchParams.get('limit') || '12', 10)
        const total = videos.length
        const total_pages = Math.ceil(total / limit) || 1
        const start = (page - 1) * limit
        const paged = videos.slice(start, start + limit)

        return createJsonResponse({
          videos: paged,
          pagination: {
            total_videos: total,
            total_pages,
            current_page: page,
            limit,
          },
        })
      }

      if (pathname === '/api/videos' && method === 'POST') {
        const newVideo = {
          id: Date.now(),
          slug: body.slug || (body.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          title: body.title || 'Untitled Video',
          description: body.description || '',
          category: body.category || 'News',
          category_slug: (body.category || 'news').toLowerCase(),
          video_url: body.video_url || body.videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoUrl: body.video_url || body.videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnail: body.thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
          duration: body.duration || '5:00',
          views: '1K',
          views_count: 1000,
          likes_count: 0,
          is_liked: false,
          is_saved: false,
          author: body.author || 'Editorial Video Desk',
          created_at: new Date().toISOString(),
        }
        videos.unshift(newVideo)
        saveStorage(STORAGE_KEYS.VIDEOS, videos)
        return createJsonResponse({ video: newVideo })
      }

      if (pathname.startsWith('/api/videos/') && pathname.endsWith('/like')) {
        const id = pathname.split('/')[3]
        const vid = videos.find((v) => String(v.id) === String(id) || v.slug === id)
        if (vid) {
          if (method === 'POST') {
            vid.is_liked = true
            vid.likes_count = (vid.likes_count || 0) + 1
          } else if (method === 'DELETE') {
            vid.is_liked = false
            vid.likes_count = Math.max(0, (vid.likes_count || 1) - 1)
          }
          saveStorage(STORAGE_KEYS.VIDEOS, videos)
          return createJsonResponse({ id: vid.id, likes_count: vid.likes_count, is_liked: vid.is_liked, video: vid })
        }
        return createErrorResponse('Video not found', 404)
      }

      if (pathname.startsWith('/api/videos/') && pathname.endsWith('/save')) {
        const id = pathname.split('/')[3]
        const vid = videos.find((v) => String(v.id) === String(id) || v.slug === id)
        if (vid) {
          vid.is_saved = method === 'POST'
          saveStorage(STORAGE_KEYS.VIDEOS, videos)
          return createJsonResponse({ id: vid.id, is_saved: vid.is_saved, video: vid })
        }
        return createErrorResponse('Video not found', 404)
      }

      if (pathname.startsWith('/api/videos/') && method === 'GET') {
        const slug = pathname.replace('/api/videos/', '')
        const video = videos.find((v) => v.slug === slug || String(v.id) === String(slug))
        if (video) return createJsonResponse({ video })
        return createErrorResponse('Video not found', 404)
      }

      if (pathname.startsWith('/api/videos/') && method === 'PUT') {
        const id = pathname.split('/').pop()
        const index = videos.findIndex((v) => String(v.id) === String(id) || v.slug === id)
        if (index !== -1) {
          videos[index] = { ...videos[index], ...body }
          saveStorage(STORAGE_KEYS.VIDEOS, videos)
          return createJsonResponse({ video: videos[index] })
        }
        return createErrorResponse('Video not found', 404)
      }

      if (pathname.startsWith('/api/videos/') && method === 'DELETE') {
        const id = pathname.split('/').pop()
        videos = videos.filter((v) => String(v.id) !== String(id) && v.slug !== id)
        saveStorage(STORAGE_KEYS.VIDEOS, videos)
        return createJsonResponse({ id })
      }

      // ==========================================
      // 📢 ADVERTISING (/api/advertising)
      // ==========================================
      if (pathname === '/api/advertising' && method === 'GET') {
        return createJsonResponse({ placements: adPlacements.filter((p) => p.enabled) })
      }

      if (pathname === '/api/advertising/admin' && method === 'GET') {
        return createJsonResponse({ placements: adPlacements })
      }

      if (pathname.startsWith('/api/advertising/') && method === 'PUT') {
        const id = pathname.split('/').pop()
        const index = adPlacements.findIndex((p) => String(p.id) === String(id))
        if (index !== -1) {
          adPlacements[index] = { ...adPlacements[index], ...body }
          saveStorage(STORAGE_KEYS.ADS, adPlacements)
          return createJsonResponse({ placement: adPlacements[index] })
        }
        return createErrorResponse('Ad placement not found', 404)
      }

      // ==========================================
      // ⚙️ SETTINGS & SOCIAL LINKS (/api/settings)
      // ==========================================
      if (pathname === '/api/settings' && method === 'GET') {
        return createJsonResponse({ settings, social_links: socialLinks })
      }

      if (pathname === '/api/settings' && method === 'PUT') {
        settings = { ...settings, ...body }
        saveStorage(STORAGE_KEYS.SETTINGS, settings)
        return createJsonResponse({ settings })
      }

      if (pathname === '/api/settings/social-links' && method === 'POST') {
        const newLink = {
          id: Date.now(),
          platform: body.platform || 'Social',
          url: body.url || '#',
          icon: body.icon || 'link',
        }
        socialLinks.push(newLink)
        saveStorage(STORAGE_KEYS.SOCIAL_LINKS, socialLinks)
        return createJsonResponse({ social_link: newLink })
      }

      if (pathname.startsWith('/api/settings/social-links/') && method === 'PUT') {
        const id = pathname.split('/').pop()
        const idx = socialLinks.findIndex((l) => String(l.id) === String(id))
        if (idx !== -1) {
          socialLinks[idx] = { ...socialLinks[idx], ...body }
          saveStorage(STORAGE_KEYS.SOCIAL_LINKS, socialLinks)
          return createJsonResponse({ social_link: socialLinks[idx] })
        }
        return createErrorResponse('Link not found', 404)
      }

      if (pathname.startsWith('/api/settings/social-links/') && method === 'DELETE') {
        const id = pathname.split('/').pop()
        socialLinks = socialLinks.filter((l) => String(l.id) !== String(id))
        saveStorage(STORAGE_KEYS.SOCIAL_LINKS, socialLinks)
        return createJsonResponse({ id })
      }

      // ==========================================
      // ✍️ AUTHOR SETTINGS (/api/author-settings)
      // ==========================================
      if (pathname === '/api/author-settings' && method === 'GET') {
        return createJsonResponse({
          author: authorSettings.author,
          settings: authorSettings.settings,
          social_links: authorSettings.social_links,
        })
      }

      if (pathname === '/api/author-settings' && method === 'PUT') {
        authorSettings = {
          ...authorSettings,
          settings: { ...authorSettings.settings, ...body },
          author: { ...authorSettings.author, ...body },
        }
        saveStorage(STORAGE_KEYS.AUTHOR_SETTINGS, authorSettings)
        return createJsonResponse({ settings: authorSettings.settings, author: authorSettings.author })
      }

      if (pathname === '/api/author-settings/social-links' && method === 'POST') {
        const newLink = {
          id: Date.now(),
          platform: body.platform || 'Social',
          url: body.url || '#',
          icon: body.icon || 'link',
        }
        authorSettings.social_links = [...(authorSettings.social_links || []), newLink]
        saveStorage(STORAGE_KEYS.AUTHOR_SETTINGS, authorSettings)
        return createJsonResponse({ social_link: newLink })
      }

      if (pathname.startsWith('/api/author-settings/social-links/') && method === 'PUT') {
        const id = pathname.split('/').pop()
        const idx = (authorSettings.social_links || []).findIndex((l) => String(l.id) === String(id))
        if (idx !== -1) {
          authorSettings.social_links[idx] = { ...authorSettings.social_links[idx], ...body }
          saveStorage(STORAGE_KEYS.AUTHOR_SETTINGS, authorSettings)
          return createJsonResponse({ social_link: authorSettings.social_links[idx] })
        }
        return createErrorResponse('Link not found', 404)
      }

      if (pathname.startsWith('/api/author-settings/social-links/') && method === 'DELETE') {
        const id = pathname.split('/').pop()
        authorSettings.social_links = (authorSettings.social_links || []).filter((l) => String(l.id) !== String(id))
        saveStorage(STORAGE_KEYS.AUTHOR_SETTINGS, authorSettings)
        return createJsonResponse({ id })
      }

      // ==========================================
      // 📊 DASHBOARDS & ANALYTICS
      // ==========================================
      if (pathname === '/api/admin-dashboard' && method === 'GET') {
        return createJsonResponse(initialAdminDashboard)
      }

      if (pathname === '/api/author-dashboard' && method === 'GET') {
        return createJsonResponse(initialAuthorDashboard)
      }

      if (pathname === '/api/admin-analytics' && method === 'GET') {
        return createJsonResponse(initialAdminAnalytics)
      }

      if (pathname === '/api/author-analytics' && method === 'GET') {
        return createJsonResponse(initialAuthorAnalytics)
      }

      if (pathname === '/api/analytics-events' && method === 'POST') {
        return createJsonResponse({ success: true, event: body })
      }

      // Fallback for unmatched /api requests
      console.warn(`[MockApi] Unhandled API route: ${method} ${pathname}`)
      return createJsonResponse({ success: true, data: [] })
    } catch (err) {
      console.error('[MockApi] Error processing request:', err)
      return createErrorResponse(err.message || 'Mock server error', 500)
    }
  }

  // Not an /api request: delegate to real browser fetch (Vite static assets, external images, etc.)
  return originalFetch.apply(this, arguments)
}

console.log('✅ Demo API mock server initialized with in-memory & localStorage persistence.')
export default window.fetch
