import { Article } from '../news.service';

export interface NewsProvider {
  readonly name: string;
  fetchNews(category: string, search: string, sortBy?: 'publishedAt' | 'popularity'): Promise<Article[]>;
}
