  const API_BASE_URL =
    process.env.BLOG_API_BASE_URL;

  export const topicRules = [
    { id: 'ai', label: 'AI Films', test: /\bAI\b|brand film/i },
    { id: 'real-estate', label: 'Real Estate', test: /real estate/i },
    { id: 'agency', label: 'Creative Agency', test: /agency|studio/i },
    { id: 'ncr', label: 'Delhi NCR', test: /delhi|noida|ncr/i },
  ];

  export const topics = topicRules.map(({ id, label }) => ({ id, label }));

  /**
   * Convert heading text into an URL-safe anchor slug
   */
  export function slugify(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/['"’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Format ISO or date strings into "23 Oct 2026"
   */
  export function formatDate(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = d.getUTCDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  }

  /**
   * Estimate reading time in minutes based on word count
   */
  export function calculateReadTime(textOrHtml) {
    if (!textOrHtml) return '5 min';
    const plainText = textOrHtml.replace(/<[^>]+>/g, ' ');
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min`;
  }

  /**
   * Clean raw article HTML and generate table of contents (TOC) with matching heading IDs.
   * Strips Google Docs internal wrappers, unreadable inline styles, and dark text colors.
   */
  export function processArticleHtml(rawHtml) {
    if (!rawHtml) return { html: '', toc: [] };

    let html = rawHtml;

    // 1. Remove Google docs internal guid wrapper tags
    let prev;
    do {
      prev = html;
      html = html.replace(/<strong[^>]*id="docs-internal-guid-[^"]*"[^>]*>([\s\S]*?)<\/strong>/gi, '$1');
    } while (html !== prev);
    html = html.replace(/<strong[^>]*>\s*<\/strong>/gi, '');

    // 2. Convert <h1> to <h2> so the page keeps a single primary <h1> in the header
    html = html.replace(/<h1(\b[^>]*)>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');

    // 3. Remove inline styles, dir, role, and aria-level attributes that cause dark text or layout glitches
    html = html.replace(/\s*(?:style|dir|role|aria-level)=(["'])[\s\S]*?\1/gi, '');

    // 4. Transform contenaissance.com absolute links to relative site paths
    html = html.replace(/href=(["'])https?:\/\/(?:www\.)?contenaissance\.com(\/[^"']*)?\1/gi, 'href="$2"');

    // 5. Unwrap decorative/font span tags
    do {
      prev = html;
      html = html.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
    } while (html !== prev);

    // 6. Unwrap redundant <p> inside <li>
    html = html.replace(/<li[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li>$1</li>');

    // 7. Extract TOC and insert clean, unique IDs into <h2> headings
    const toc = [];
    const seenIds = new Set();
    const seenLabels = new Set();

    html = html.replace(/<h2(\b[^>]*)>([\s\S]*?)<\/h2>/gi, (match, attrs, content) => {
      const label = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (!label) return match;

      let baseId = slugify(label);
      if (!baseId) baseId = 'section';

      let uniqueId = baseId;
      let counter = 2;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${baseId}-${counter}`;
        counter++;
      }
      seenIds.add(uniqueId);

      if (!seenLabels.has(label.toLowerCase())) {
        seenLabels.add(label.toLowerCase());
        toc.push({ id: uniqueId, label });
      }

      const cleanAttrs = attrs.replace(/\s*id=(["'])[\s\S]*?\1/gi, '').trim();
      const attrsStr = cleanAttrs ? ` ${cleanAttrs}` : '';
      return `<h2 id="${uniqueId}"${attrsStr}>${content.trim()}</h2>`;
    });

    // 8. Clean empty paragraphs
    html = html.replace(/<p>\s*(?:<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, '').trim();

    return { html, toc };
  }

  /**
   * Normalize a blog post from the API response into the application schema
   */
  export function normalizePost(raw) {
    if (!raw) return null;

    const title = (raw.title || '').trim();
    const slug = (raw.slug || '').trim();
    const rawContent = raw.content || raw.html || '';
    const { html, toc } = processArticleHtml(rawContent);

    const excerpt = (raw.excerpt || raw.blog_meta_description || raw.description || '').trim();
    const description = (raw.blog_meta_description || raw.description || excerpt || title).trim();

    const textForTopics = `${title} ${slug} ${raw.blog_keywords || ''}`;
    const assignedTopics = topicRules
      .filter((r) => r.test.test(textForTopics))
      .map((r) => r.id);

    return {
      id: raw.id,
      slug,
      title,
      excerpt,
      description,
      image: raw.cover_image || raw.image || '/images/logo.png',
      author: raw.author_name || raw.author || 'Contenaissance Team',
      date: formatDate(raw.published_at || raw.created_at || raw.date),
      readTime: raw.readTime || calculateReadTime(rawContent),
      topics: assignedTopics,
      toc: Array.isArray(raw.toc) && raw.toc.length > 0 ? raw.toc : toc,
      html: html,
      status: raw.status || 'published',
      published_at: raw.published_at,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }

  /**
   * Fetch published blogs from GET /blogs?status=published
   * Next.js ISR: Revalidates every 3600 seconds (1 hour)
   */
  export async function fetchPublishedBlogs() {
    try {
      const res = await fetch(`${API_BASE_URL}/blogs?status=published`, {
        next: { revalidate: 3600, tags: ['blogs'] },
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        console.error(`[blog-api] Failed to fetch blogs: ${res.status} ${res.statusText}`);
        return [];
      }

      const json = await res.json();
      const rawList = Array.isArray(json) ? json : json?.data;
      if (!Array.isArray(rawList)) {
        console.error('[blog-api] Expected array in blogs response, got:', typeof json);
        return [];
      }

      const posts = rawList.map(normalizePost).filter(Boolean);

      // Sort by publication date descending
      posts.sort((a, b) => {
        const timeA = new Date(a.published_at || a.created_at || a.date).getTime() || 0;
        const timeB = new Date(b.published_at || b.created_at || b.date).getTime() || 0;
        return timeB - timeA;
      });

      return posts;
    } catch (error) {
      console.error('[blog-api] Error fetching published blogs:', error.message);
      return [];
    }
  }

  /**
   * Fetch individual blog post by slug from GET /blogs/slug/{slug}
   * Next.js ISR: Revalidates every 3600 seconds
   */
  export async function fetchBlogBySlug(slug) {
    if (!slug) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/blogs/slug/${encodeURIComponent(slug)}`, {
        next: { revalidate: 3600, tags: [`blog-${slug}`] },
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status !== 404) {
          console.error(`[blog-api] Failed to fetch blog "${slug}": ${res.status} ${res.statusText}`);
        }
        return null;
      }

      const json = await res.json();
      const rawPost = json?.data || json;
      if (!rawPost || !rawPost.slug) {
        return null;
      }

      return normalizePost(rawPost);
    } catch (error) {
      console.error(`[blog-api] Error fetching blog by slug "${slug}":`, error.message);
      return null;
    }
  }

  /**
   * Get all published posts
   */
  export async function getPosts() {
    return await fetchPublishedBlogs();
  }

  /**
   * Get a single post by slug with fallback to published list
   */
  export async function getPost(slug) {
    if (!slug) return null;

    // Primary: direct slug endpoint
    const direct = await fetchBlogBySlug(slug);
    if (direct) return direct;

    // Fallback: search in published list
    try {
      const all = await fetchPublishedBlogs();
      const match = all.find((p) => p.slug === slug);
      if (match) return match;
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Get next and related posts for a given slug
   */
  export async function getNeighbours(slug) {
    const allPosts = await fetchPublishedBlogs();
    if (!allPosts || allPosts.length === 0) {
      return { next: null, related: [] };
    }

    const i = allPosts.findIndex((p) => p.slug === slug);
    const currentPost = i >= 0 ? allPosts[i] : null;
    const currentTopics = currentPost?.topics || [];

    // Next post in list, looping around if at the end
    let next = null;
    if (allPosts.length > 1) {
      const nextIndex = i >= 0 ? (i + 1) % allPosts.length : 0;
      next = allPosts[nextIndex] || null;
      if (next && next.slug === slug) {
        next = allPosts.find((p) => p.slug !== slug) || null;
      }
    }

    // Related posts: exclude current and next, rank by matching topics
    const candidates = allPosts.filter((p) => p.slug !== slug && (!next || p.slug !== next.slug));
    const related = candidates
      .map((p) => ({
        p,
        score: (p.topics || []).filter((t) => currentTopics.includes(t)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ p }) => p);

    return { next, related };
  }

