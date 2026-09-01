'use client';

import { useState, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? createPortal(children, document.body) : null;
}
import {
  Newspaper,
  Search,
  Bookmark,
  ExternalLink,
  Loader2,
  Sparkles,
  BookOpen,
  TrendingUp,
  Brain,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Article {
  title: string;
  url: string;
  source: string;
  imageUrl?: string;
  summary?: string;
  publishedAt: string;
  category?: string;
  cachedAt?: string;
  relevanceScore?: number;
}

interface SavedArticle {
  id: string;
  title: string;
  url: string;
  source?: string;
  imageUrl?: string;
  summary?: string;
  category: string;
  publishedAt?: string;
  savedAt?: string;
}

const CATEGORIES = [
  { value: 'ai', label: '🧠 AI' },
  { value: 'engineering', label: '⚙️ Engineering' },
  { value: 'programming', label: '💻 Programming' },
  { value: 'technology', label: '🌐 Technology' },
  { value: 'cloud', label: '☁️ Cloud' },
  { value: 'cybersecurity', label: '🛡️ Cybersecurity' },
  { value: 'startups', label: '🚀 Startups' },
  { value: 'industry', label: '📊 Industry' },
  { value: 'companies', label: '🏢 Company News' },
  { value: 'careers', label: '💼 Hiring & Careers' },
];

const STOP_WORDS = new Set([
  'the', 'and', 'a', 'of', 'to', 'in', 'is', 'that', 'it', 'on', 'for', 'with', 'as', 'at', 'by', 'an', 'be', 'this',
  'are', 'from', 'or', 'about', 'how', 'why', 'what', 'new', 'latest', 'tech', 'technology', 'using', 'over',
  'shows', 'reaches', 'unveils', 'launches', 'announces', 'reveals', 'first', 'into', 'top', 'more'
]);

export default function NewsHubPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'feed' | 'for-you' | 'ai-watch' | 'bookmarks'>('feed');
  const [activeCategory, setActiveCategory] = useState('technology');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [summaryModalArticle, setSummaryModalArticle] = useState<Article | null>(null);
  const [freshnessTicker, setFreshnessTicker] = useState('Just Now');

  // Fetch general news feed
  const { data: articles = [], isLoading: loadingNews } = useQuery<Article[]>({
    queryKey: ['news', activeCategory, debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Article[] }>('/news', {
        params: { category: activeCategory, search: debouncedSearch },
      });
      return res.data.data;
    },
    enabled: activeTab === 'feed',
    refetchInterval: 60000,
  });

  // Fetch personalized "For You" feed
  const { data: forYouArticles = [], isLoading: loadingForYou } = useQuery<Article[]>({
    queryKey: ['news-for-you'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Article[] }>('/news/for-you');
      return res.data.data;
    },
    enabled: activeTab === 'for-you',
    refetchInterval: 60000,
  });

  // Fetch AI Industry Watch feed
  const { data: aiWatchArticles = [], isLoading: loadingAIWatch } = useQuery<Article[]>({
    queryKey: ['news-ai-watch'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Article[] }>('/news/ai-watch');
      return res.data.data;
    },
    enabled: activeTab === 'ai-watch',
    refetchInterval: 60000,
  });

  // Fetch saved articles (bookmarks)
  const { data: savedArticles = [], isLoading: loadingSaved } = useQuery<SavedArticle[]>({
    queryKey: ['saved-news'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: SavedArticle[] }>('/news/saved');
      return res.data.data;
    },
    enabled: true,
  });

  // Fetch trending articles (popularity sorted)
  const { data: trendingArticles = [], isLoading: loadingTrending } = useQuery<Article[]>({
    queryKey: ['news-trending'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Article[] }>('/news/trending');
      return res.data.data;
    },
  });

  // Save article mutation
  const saveArticleMutation = useMutation({
    mutationFn: async (art: Article) => {
      const res = await apiClient.post('/news/saved', {
        title: art.title,
        url: art.url,
        source: art.source,
        imageUrl: art.imageUrl,
        summary: art.summary,
        category: art.category || activeCategory,
        publishedAt: art.publishedAt,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-news'] });
      toast({ title: 'Article bookmarked', description: 'Saved to your reading list.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Error bookmarking',
        description: err.response?.data?.message || 'Could not bookmark article.',
        variant: 'destructive',
      });
    },
  });

  // Unsave article mutation
  const unsaveArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/news/saved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-news'] });
      toast({ title: 'Article removed', description: 'Removed from your reading list.' });
    },
  });

  // Summarize with MIKE mutation
  const summarizeMutation = useMutation({
    mutationFn: async (art: Article) => {
      const res = await apiClient.post<{ data: { summary: string } }>('/news/summarize', {
        title: art.title,
        url: art.url,
        summary: art.summary,
      });
      return res.data.data;
    },
  });

  const isArticleSaved = (url: string) => {
    return savedArticles.some((sa) => sa.url === url);
  };

  const getSavedId = (url: string) => {
    return savedArticles.find((sa) => sa.url === url)?.id;
  };

  const handleSaveToggle = (art: Article) => {
    if (isArticleSaved(art.url)) {
      const id = getSavedId(art.url);
      if (id) unsaveArticleMutation.mutate(id);
    } else {
      saveArticleMutation.mutate(art);
    }
  };

  const getReadTime = (title: string, summary?: string) => {
    const text = `${title} ${summary || ''}`;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const getArticleAge = (publishedAt: string) => {
    const now = new Date();
    const pub = new Date(publishedAt);
    const diffMs = now.getTime() - pub.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

    if (diffMins < 15) return 'Just Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (pub.toDateString() === now.toDateString()) {
      return 'Today';
    }
    if (pub.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return pub.toLocaleDateString();
  };

  // Compute feed freshness elapsed time
  useEffect(() => {
    const targetArticles =
      activeTab === 'feed' ? articles : activeTab === 'for-you' ? forYouArticles : aiWatchArticles;
    const cachedTime = targetArticles[0]?.cachedAt;
    if (!cachedTime) {
      setFreshnessTicker('Just Now');
      return;
    }

    const updateTicker = () => {
      const diffMs = Date.now() - new Date(cachedTime).getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) {
        setFreshnessTicker('Just Now');
      } else {
        setFreshnessTicker(`${diffMins} minutes ago`);
      }
    };

    updateTicker();
    const interval = setInterval(updateTicker, 60000);
    return () => clearInterval(interval);
  }, [articles, forYouArticles, aiWatchArticles, activeTab]);

  // Lock body scroll when summary modal is open
  useEffect(() => {
    if (summaryModalArticle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [summaryModalArticle]);

  const getDisplayedArticles = (): Article[] => {
    switch (activeTab) {
      case 'for-you':
        return forYouArticles;
      case 'ai-watch':
        return aiWatchArticles;
      case 'bookmarks':
        return savedArticles.map((sa) => ({
          title: sa.title,
          url: sa.url,
          source: sa.source || 'Saved',
          imageUrl: sa.imageUrl,
          summary: sa.summary,
          publishedAt: sa.publishedAt || new Date().toISOString(),
          category: sa.category,
        }));
      case 'feed':
      default:
        return articles;
    }
  };

  const displayedArticles = getDisplayedArticles();

  const getTrendingTopics = (): string[] => {
    const titles = articles.map((a) => a.title);
    const frequencies: Record<string, number> = {};

    titles.forEach((title) => {
      const words = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/);
      words.forEach((w) => {
        if (w.length > 3 && !STOP_WORDS.has(w)) {
          frequencies[w] = (frequencies[w] || 0) + 1;
        }
      });
    });

    return Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };

  const trendingTopics = getTrendingTopics();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const executeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(searchQuery);
  };

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic);
    setDebouncedSearch(topic);
    setActiveTab('feed');
  };

  const handleSummarize = (art: Article) => {
    setSummaryModalArticle(art);
    summarizeMutation.mutate(art);
  };

  return (
    <>
      <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-fade-in select-none">
      {/* Header and Ticker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Newspaper className="h-8 w-8 text-primary" /> Informative Hub
          </h2>
          <p className="text-base text-muted-foreground mt-1.5 leading-relaxed">
            Curated CS & engineering articles, technical announcements, and lab updates monitored by MIKE.
          </p>
        </div>

        {activeTab !== 'bookmarks' && (
          <div className="bg-secondary border border-border px-3.5 py-2 rounded-lg flex items-center gap-2 select-none w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="text-xs text-muted-foreground font-semibold">
              Live News Feed <span className="text-border mx-1">|</span> Last Updated: <span className="font-bold text-foreground">{freshnessTicker}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Tab Bar & Search Panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-border/60 pb-4">
        {/* Navigation Tabs */}
        <div className="flex p-0.5 bg-secondary border border-border rounded-lg w-full sm:w-[480px] text-xs font-bold">
          {(['feed', 'for-you', 'ai-watch', 'bookmarks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors focus:outline-none ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'feed' && '📰 Feed'}
              {tab === 'for-you' && '✨ For You'}
              {tab === 'ai-watch' && '🤖 AI Watch'}
              {tab === 'bookmarks' && '🔖 Bookmarks'}
            </button>
          ))}
        </div>

        {/* Search Panel (only visible for Feed) */}
        {activeTab === 'feed' && (
          <form onSubmit={executeSearch} className="flex gap-2 w-full sm:w-80">
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search articles..."
              className="bg-background border-input text-foreground text-xs rounded-lg focus:border-primary h-9 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
            <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 font-semibold px-4">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>

      {/* Core Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Feed Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'feed' && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => {
                    setActiveCategory(cat.value);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0 focus:outline-none ${
                    activeCategory === cat.value
                      ? 'bg-primary/10 border-primary/30 text-primary font-extrabold'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Skeletons and Empty States */}
          {((activeTab === 'feed' && loadingNews) ||
          (activeTab === 'for-you' && loadingForYou) ||
          (activeTab === 'ai-watch' && loadingAIWatch) ||
          (activeTab === 'bookmarks' && loadingSaved)) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="rounded-lg border border-border bg-card p-5 space-y-4 h-[350px] select-none shadow-sm">
                  <div className="h-40 w-full rounded bg-secondary shimmer" />
                  <div className="h-6 w-2/3 rounded bg-secondary shimmer" />
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-secondary shimmer" />
                    <div className="h-4 w-5/6 rounded bg-secondary shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedArticles.length === 0 ? (
            activeTab === 'bookmarks' ? (
              <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground bg-secondary/15 shadow-sm">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-60" />
                <h4 className="text-xl font-bold text-foreground mb-1.5">No bookmarked articles yet</h4>
                <p className="text-base text-muted-foreground max-w-sm mx-auto mb-6">
                  Bookmark interesting tech and engineering news from the Feed. MIKE uses your saved articles to personalize your study suggestions.
                </p>
                <Button onClick={() => setActiveTab('feed')} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs py-5 px-6 shadow-sm">
                  Explore News Feed
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground bg-secondary/15 shadow-sm">
                <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-60" />
                <h4 className="text-xl font-bold text-foreground mb-1.5">No articles match your criteria</h4>
                <p className="text-base text-muted-foreground max-w-sm mx-auto mb-6">
                  Try adjusting your category selection, removing search terms, or exploring other tabs.
                </p>
                <Button onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs py-5 px-6 shadow-sm">
                  Reset Search filter
                </Button>
              </div>
            )
          ) : (
            /* Densified 2-Column Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedArticles.map((art, idx) => {
                const isSaved = isArticleSaved(art.url);
                const defaultImage =
                  'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=500&auto=format&fit=crop&q=60';
                return (
                  <div
                    key={art.url + idx}
                    className="pro-card group flex flex-col justify-between overflow-hidden relative"
                  >
                    <div>
                      {/* Image & Save */}
                      <div className="relative h-40 w-full overflow-hidden bg-secondary border-b border-border">
                        <img
                          src={art.imageUrl || defaultImage}
                          alt={art.title}
                          className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                        <div className="absolute top-3 right-3 flex gap-1.5">
                          <button
                            onClick={() => handleSaveToggle(art)}
                            className={`p-1.5 rounded-lg border backdrop-blur-md transition-colors ${
                              isSaved
                                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                : 'bg-background/80 border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Bookmark className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Header details */}
                      <div className="pt-4 px-1 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                          <span className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-primary font-bold">
                            {art.source}
                          </span>
                          <span className="bg-secondary border border-border px-2 py-0.5 rounded text-foreground capitalize">
                            {art.category || activeCategory}
                          </span>
                          <span className="flex items-center gap-1 ml-auto text-muted-foreground text-[11px]">
                            <Clock className="h-3 w-3" /> {getReadTime(art.title, art.summary)}
                          </span>
                        </div>

                        {/* Title & Age */}
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-foreground text-xl leading-snug group-hover:text-primary transition-colors flex-1 line-clamp-2">
                            {art.title}
                          </h4>
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded flex-shrink-0 font-bold mt-1">
                            {getArticleAge(art.publishedAt)}
                          </span>
                        </div>

                        {/* Summary */}
                        {art.summary && (
                          <p className="text-base text-muted-foreground leading-relaxed line-clamp-3">
                            {art.summary}
                          </p>
                        )}

                        {/* Saved On label for Bookmarks */}
                        {activeTab === 'bookmarks' && (
                          <div className="text-xs text-primary font-semibold mt-1">
                            Saved on: {new Date(savedArticles.find((sa) => sa.url === art.url)?.savedAt || new Date()).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-border mt-4 flex items-center justify-between px-1">
                      {art.relevanceScore !== undefined && (
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1 select-none">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {art.relevanceScore}% Match
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleSummarize(art)}
                          className="text-xs text-primary hover:text-primary/95 hover:bg-primary/10 gap-1 rounded-lg font-bold"
                        >
                          <Brain className="h-3.5 w-3.5" /> Summarize
                        </Button>
                        <a href={art.url} target="_blank" rel="noopener noreferrer">
                          <Button size="xs" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground rounded-lg font-semibold">
                            Read <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        <div className="space-y-6">
          {/* Dynamic Trending Tech Topics Cloud */}
          {activeTab === 'feed' && trendingTopics.length > 0 && (
            <div className="pro-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-1.5 border-b border-border pb-2.5">
                <TrendingUp className="h-4 w-4 text-primary" /> Trending Topics
              </h3>
              <div className="flex flex-wrap gap-2 pt-1.5">
                {trendingTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleTopicClick(topic)}
                    className="text-xs font-bold text-foreground bg-secondary border border-border px-3 py-1 rounded-full hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all focus:outline-none"
                  >
                    #{topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Today Sidebar Block */}
          <div className="pro-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-1.5 border-b border-border pb-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> Trending Today
            </h3>
            <div className="space-y-4 pt-1.5">
              {loadingTrending ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
              ) : trendingArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No trending stories.</p>
              ) : (
                trendingArticles.map((t, i) => (
                  <a key={i} href={t.url} target="_blank" rel="noopener noreferrer" className="block group border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                        <span className="text-primary font-bold uppercase">{t.source}</span>
                        <span>{getArticleAge(t.publishedAt)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary leading-snug transition-colors line-clamp-2">
                        {t.title}
                      </h4>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Static Hub Info */}
          <div className="pro-card bg-secondary/15 text-xs text-muted-foreground leading-relaxed space-y-2 shadow-sm">
            <h4 className="font-extrabold text-foreground flex items-center gap-1.5 text-sm uppercase">
              <BookOpen className="h-4 w-4 text-primary" /> Informative Hub
            </h4>
            <p className="text-xs">
              Stay updated with placement preparation, engineering blogs, and AI advancements. Saved bookmarks are automatically analyzed in your dashboard context to optimize study suggestions.
            </p>
          </div>
        </div>
      </div>
    </div>

      {/* MIKE AI summary overlay modal */}
      <Portal>
        <AnimatePresence>
          {summaryModalArticle && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative max-w-2xl w-full max-h-[85vh] overflow-y-auto bg-card border border-border rounded-lg p-6 md:p-8 space-y-5 custom-scrollbar text-foreground shadow-2xl"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSummaryModalArticle(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <X className="h-4.5 w-4.5" />
                </button>

                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest select-none">
                  <Brain className="h-5 w-5 text-primary" /> MIKE News Insights
                </div>

                {summarizeMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-semibold">MIKE is generating takeaways and study steps...</p>
                  </div>
                ) : summarizeMutation.isError ? (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-sm text-red-500 font-semibold">Failed to generate summary.</p>
                    <Button size="sm" onClick={() => summarizeMutation.mutate(summaryModalArticle)} className="bg-primary text-primary-foreground font-semibold">
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="prose-custom max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ ...props }) => <h1 className="text-base font-extrabold text-foreground border-b border-border/60 pb-2 mb-3 mt-4" {...props} />,
                        h2: ({ ...props }) => <h2 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-1.5 mb-1.5 mt-3 text-primary" {...props} />,
                        ul: ({ ...props }) => <ul className="list-disc pl-5 space-y-1 mb-3 text-muted-foreground text-xs leading-relaxed" {...props} />,
                        li: ({ ...props }) => <li className="marker:text-primary font-medium" {...props} />,
                        p: ({ ...props }) => <p className="text-xs text-muted-foreground leading-relaxed mb-2" {...props} />,
                        strong: ({ ...props }) => <strong className="font-extrabold text-foreground" {...props} />
                      }}
                    >
                      {summarizeMutation.data?.summary || ''}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Modal Footer */}
                {!summarizeMutation.isPending && (
                  <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-6">
                    <a href={summaryModalArticle.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex items-center gap-1.5 rounded-lg shadow-sm">
                        <ExternalLink className="h-4 w-4" /> Read Full Article
                      </Button>
                    </a>
                    <Button size="sm" variant="outline" onClick={() => setSummaryModalArticle(null)} className="rounded-lg text-foreground border-border hover:bg-secondary font-semibold">
                      Close Summary
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
