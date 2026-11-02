export {
  topicRules,
  topics,
  slugify,
  formatDate,
  calculateReadTime,
  processArticleHtml,
  normalizePost,
  fetchPublishedBlogs,
  fetchBlogBySlug,
  getPosts,
  getPost,
  getNeighbours,
} from './blog-api';

// For backwards compatibility
export const posts = [];
