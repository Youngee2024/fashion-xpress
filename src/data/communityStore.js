import { COMMUNITY_CATEGORIES, PAGE_SIZE, validateDiscussion, validateReply, validateReport, hasValidationErrors } from './communityRules.js'

const demoAuthors = [
  { id: 'seed-artist', handle: 'digitaldesigner', display_name: 'Digital Designer', avatar_id: 'violet', identity: 'Creator' },
  { id: 'seed-maker', handle: 'materialstudy', display_name: 'Material Study', avatar_id: 'ember', identity: 'Community Member' },
]

const seed = [
  { id: 'demo-1', author_id: 'seed-artist', title: 'How do I price a first digital collection?', body: 'I am weighing release tiers, craft, and the time behind each piece. What has helped you explain value to digital wearers?', category: 'Marketplace', created_at: '2026-08-10T12:00:00.000Z' },
  { id: 'demo-2', author_id: 'seed-maker', title: 'Materials that move between worlds', body: 'I am exploring how textiles can feel expressive in both physical and digital spaces. What tools have helped your workflow?', category: 'Tools', created_at: '2026-08-11T12:00:00.000Z' },
]

function failure(message) { throw new Error(message) }
function sortItems(items, sort) {
  const key = sort === 'liked' ? 'like_count' : sort === 'active' ? 'last_activity_at' : 'created_at'
  return [...items].sort((a, b) => key === 'like_count' ? b.like_count - a.like_count || b.created_at.localeCompare(a.created_at) : String(b[key]).localeCompare(String(a[key])))
}

export function createDemoCommunityStore(demoProfile) {
  let discussions = seed.map((item) => ({ ...item, status: 'published', updated_at: item.created_at, last_activity_at: item.created_at, edited_at: null }))
  let replies = []
  let likes = new Set()
  let reports = []
  let profile = demoProfile
  const authorFor = (id) => id === profile.id ? profile : demoAuthors.find((author) => author.id === id) ?? null
  const decorate = (item) => ({ ...item, author: authorFor(item.author_id), reply_count: replies.filter((reply) => reply.discussion_id === item.id).length, like_count: [...likes].filter((key) => key.endsWith(`:${item.id}`)).length, liked: likes.has(`${profile.id}:${item.id}`) })
  const owner = (item, userId) => { if (!item || item.author_id !== userId) failure('You can change only your own content.') }
  const now = () => new Date().toISOString()

  return {
    reset() { discussions = seed.map((item) => ({ ...item, status: 'published', updated_at: item.created_at, last_activity_at: item.created_at, edited_at: null })); replies = []; likes = new Set(); reports = []; profile = demoProfile },
    setProfile(next) { profile = next },
    async list({ search = '', category = '', sort = 'newest', page = 0 } = {}) {
      const text = search.trim().toLowerCase()
      const items = sortItems(discussions.filter((item) => item.status === 'published' && (!category || item.category === category) && (!text || `${item.title} ${item.body}`.toLowerCase().includes(text))).map(decorate), sort)
      return { items: items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), total: items.length, hasMore: (page + 1) * PAGE_SIZE < items.length }
    },
    async get(id) {
      const item = discussions.find((discussion) => discussion.id === id && discussion.status === 'published')
      return item ? { ...decorate(item), replies: replies.filter((reply) => reply.discussion_id === id).map((reply) => ({ ...reply, author: authorFor(reply.author_id) })) } : null
    },
    async profileByHandle(handle) { return [profile, ...demoAuthors].find((item) => item.handle === handle) ?? null },
    async activity(userId) { return { discussions: discussions.filter((item) => item.author_id === userId && item.status === 'published').map(decorate), replies: replies.filter((item) => item.author_id === userId) } },
    async createDiscussion(value, userId) {
      if (hasValidationErrors(validateDiscussion(value))) failure('Check the discussion fields before posting.')
      const time = now()
      const item = { id: crypto.randomUUID(), author_id: userId, title: value.title.trim(), body: value.body.trim(), category: value.category, status: 'published', created_at: time, updated_at: time, last_activity_at: time, edited_at: null }
      discussions = [item, ...discussions]
      return decorate(item)
    },
    async updateDiscussion(id, value, userId) {
      if (hasValidationErrors(validateDiscussion(value))) failure('Check the discussion fields before saving.')
      const item = discussions.find((discussion) => discussion.id === id)
      owner(item, userId)
      Object.assign(item, { title: value.title.trim(), body: value.body.trim(), category: value.category, updated_at: now(), edited_at: now() })
      return decorate(item)
    },
    async deleteDiscussion(id, userId) {
      owner(discussions.find((item) => item.id === id), userId)
      discussions = discussions.filter((item) => item.id !== id)
      replies = replies.filter((item) => item.discussion_id !== id)
      likes = new Set([...likes].filter((key) => !key.endsWith(`:${id}`)))
    },
    async createReply(discussionId, body, userId) {
      if (validateReply(body)) failure('Check the reply before posting.')
      const discussion = discussions.find((item) => item.id === discussionId && item.status === 'published')
      if (!discussion) failure('This discussion is unavailable.')
      const time = now()
      const reply = { id: crypto.randomUUID(), discussion_id: discussionId, author_id: userId, body: body.trim(), status: 'published', created_at: time, updated_at: time, edited_at: null }
      replies = [...replies, reply]
      discussion.last_activity_at = time
      return { ...reply, author: authorFor(userId) }
    },
    async updateReply(id, body, userId) {
      if (validateReply(body)) failure('Check the reply before saving.')
      const reply = replies.find((item) => item.id === id)
      owner(reply, userId)
      Object.assign(reply, { body: body.trim(), updated_at: now(), edited_at: now() })
      return { ...reply, author: authorFor(userId) }
    },
    async deleteReply(id, userId) { owner(replies.find((item) => item.id === id), userId); replies = replies.filter((item) => item.id !== id) },
    async toggleLike(id, userId) {
      if (!discussions.some((item) => item.id === id && item.status === 'published')) failure('This discussion is unavailable.')
      const key = `${userId}:${id}`
      if (likes.has(key)) likes.delete(key); else likes.add(key)
      return likes.has(key)
    },
    async report(value, userId) {
      if (hasValidationErrors(validateReport(value))) failure('Check the report fields.')
      reports = [...reports, { ...value, reporter_id: userId }]
      return { acknowledged: true, published: false }
    },
    getPrivateReportCount() { return reports.length },
    categories: COMMUNITY_CATEGORIES,
  }
}

const DISCUSSION_SELECT = 'id,author_id,title,body,category,status,created_at,updated_at,edited_at,last_activity_at,reply_count,like_count,author:community_profiles!community_discussions_author_id_fkey(handle,display_name,avatar_id,identity)'
const REPLY_SELECT = 'id,discussion_id,author_id,body,status,created_at,updated_at,edited_at,author:community_profiles!community_replies_author_id_fkey(handle,display_name,avatar_id)'

function resultOrThrow(result) { if (result.error) throw result.error; return result.data }

export function createLiveCommunityStore(client, getUser) {
  const userId = () => getUser()?.id ?? failure('Sign in before taking this action.')
  const likedIds = async (ids) => {
    if (!getUser() || ids.length === 0) return new Set()
    const rows = resultOrThrow(await client.from('community_likes').select('discussion_id').eq('user_id', getUser().id).in('discussion_id', ids))
    return new Set(rows.map((row) => row.discussion_id))
  }
  return {
    async list({ search = '', category = '', sort = 'newest', page = 0 } = {}) {
      let query = client.from('community_discussions').select(DISCUSSION_SELECT, { count: 'exact' }).eq('status', 'published')
      if (category && COMMUNITY_CATEGORIES.includes(category)) query = query.eq('category', category)
      const cleanSearch = search.trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80)
      if (cleanSearch) query = query.or(`title.ilike.%${cleanSearch}%,body.ilike.%${cleanSearch}%`)
      const order = sort === 'liked' ? 'like_count' : sort === 'active' ? 'last_activity_at' : 'created_at'
      const { data, error, count } = await query.order(order, { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) throw error
      const liked = await likedIds(data.map((item) => item.id))
      return { items: data.map((item) => ({ ...item, liked: liked.has(item.id) })), total: count ?? data.length, hasMore: (page + 1) * PAGE_SIZE < (count ?? 0) }
    },
    async get(id) {
      const { data, error } = await client.from('community_discussions').select(DISCUSSION_SELECT).eq('id', id).eq('status', 'published').maybeSingle()
      if (error) throw error
      if (!data) return null
      const replies = resultOrThrow(await client.from('community_replies').select(REPLY_SELECT).eq('discussion_id', id).eq('status', 'published').order('created_at', { ascending: true }))
      const liked = await likedIds([id])
      return { ...data, liked: liked.has(id), replies }
    },
    async profileByHandle(handle) { return resultOrThrow(await client.from('community_profiles').select('id,handle,display_name,bio,location,identity,avatar_id,created_at,updated_at').eq('handle', handle).maybeSingle()) },
    async activity(id) {
      const discussions = resultOrThrow(await client.from('community_discussions').select(DISCUSSION_SELECT).eq('author_id', id).eq('status', 'published').order('created_at', { ascending: false }).limit(20))
      const replies = resultOrThrow(await client.from('community_replies').select(REPLY_SELECT).eq('author_id', id).eq('status', 'published').order('created_at', { ascending: false }).limit(20))
      return { discussions, replies }
    },
    async createDiscussion(value) { return resultOrThrow(await client.from('community_discussions').insert({ author_id: userId(), title: value.title.trim(), body: value.body.trim(), category: value.category }).select(DISCUSSION_SELECT).single()) },
    async updateDiscussion(id, value) { return resultOrThrow(await client.from('community_discussions').update({ title: value.title.trim(), body: value.body.trim(), category: value.category }).eq('id', id).eq('author_id', userId()).select(DISCUSSION_SELECT).single()) },
    async deleteDiscussion(id) { return resultOrThrow(await client.from('community_discussions').delete().eq('id', id).eq('author_id', userId()).select('id').single()) },
    async createReply(discussionId, body) { return resultOrThrow(await client.from('community_replies').insert({ discussion_id: discussionId, author_id: userId(), body: body.trim() }).select(REPLY_SELECT).single()) },
    async updateReply(id, body) { return resultOrThrow(await client.from('community_replies').update({ body: body.trim() }).eq('id', id).eq('author_id', userId()).select(REPLY_SELECT).single()) },
    async deleteReply(id) { return resultOrThrow(await client.from('community_replies').delete().eq('id', id).eq('author_id', userId()).select('id').single()) },
    async toggleLike(id, _, currentlyLiked) {
      if (currentlyLiked) resultOrThrow(await client.from('community_likes').delete().eq('discussion_id', id).eq('user_id', userId()))
      else resultOrThrow(await client.from('community_likes').insert({ discussion_id: id, user_id: userId() }))
      return !currentlyLiked
    },
    async report(value) { resultOrThrow(await client.from('community_reports').insert({ reporter_id: userId(), discussion_id: value.discussion_id ?? null, reply_id: value.reply_id ?? null, reason: value.reason, explanation: value.explanation.trim() })); return { acknowledged: true, published: false } },
    categories: COMMUNITY_CATEGORIES,
  }
}
