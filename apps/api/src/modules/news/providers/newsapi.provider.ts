import { Article } from '../news.service';
import { NewsProvider } from './news-provider.interface';

export class NewsAPIProvider implements NewsProvider {
  readonly name = 'newsapi';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchNews(category: string, search: string, sortBy: 'publishedAt' | 'popularity' = 'publishedAt'): Promise<Article[]> {
    if (!this.apiKey) {
      throw new Error('NewsAPI API key is missing or not configured');
    }

    const query = this.buildNewsQuery(category, search);
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=${sortBy}&pageSize=30&apiKey=${this.apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NewsAPI responded with status: ${response.status}`);
    }

    const json = await response.json() as any;
    if (json.status !== 'ok' || !Array.isArray(json.articles)) {
      throw new Error(`NewsAPI returned error: ${json.message || 'invalid response structure'}`);
    }

    return json.articles.map((art: any) => ({
      title: art.title || 'No Title',
      url: art.url || '',
      source: art.source?.name || 'Unknown',
      imageUrl: art.urlToImage || undefined,
      summary: art.description || undefined,
      publishedAt: art.publishedAt || new Date().toISOString(),
    })).filter((art: Article) => art.url);
  }

  private buildNewsQuery(category: string, search: string): string {
    let q = '';
    switch (category.toLowerCase()) {
      case 'technology':
        q = 'technology OR software OR developer OR coding OR programmer';
        break;
      case 'engineering':
        q = 'engineering OR hardware OR "system design" OR robotics OR mechanical OR electrical';
        break;
      case 'ai':
        q = '"artificial intelligence" OR "machine learning" OR "deep learning" OR "generative AI" OR LLM OR neural';
        break;
      case 'startups':
        q = 'startups OR "venture capital" OR founder OR YCombinator';
        break;
      case 'companies':
        q = '"Google Cloud" OR AWS OR "Microsoft Azure" OR NVIDIA OR Intel OR AMD OR TSMC OR tech companies';
        break;
      case 'placements':
      case 'career':
        q = '"tech career" OR "software engineer jobs" OR "placement trends" OR "hiring trends" OR internship';
        break;
      case 'cloud':
        q = '"cloud computing" OR serverless OR AWS OR Azure OR Google Cloud OR Kubernetes OR Docker';
        break;
      case 'cybersecurity':
        q = 'cybersecurity OR "infosec" OR "network security" OR hacking OR malware OR cryptography';
        break;
      case 'semiconductors':
        q = 'semiconductors OR microchips OR "chip design" OR lithography OR TSMC OR Intel OR Nvidia OR ASML';
        break;
      case 'industry':
      default:
        q = '"tech industry" OR "tech sector" OR "silicon valley" OR tech news OR IT sector';
        break;
    }

    // Append exclusions directly to the NewsAPI query to filter them at the source
    const exclusions = ' -politics -sports -entertainment -celebrity -gossip -movie -fashion -football -soccer -cricket -election -senate -parliament -congress -trump -biden -nfl -nba';
    q = `(${q})${exclusions}`;

    if (search.trim()) {
      q = `(${q}) AND (${search.trim()})`;
    }
    return q;
  }
}
