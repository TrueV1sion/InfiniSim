import { useState, useEffect, useRef } from 'react';
import { getTrendingPages, TrendingPage } from '../services/cacheService';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface PublishedSite {
  url: string;
  title: string;
  publisherName: string;
  publishedAt: number;
}

interface HomepageData {
  trending: TrendingPage[];
  community: PublishedSite[];
  isLoading: boolean;
}

export function useHomepageData(isVisible: boolean): HomepageData {
  const [trending, setTrending] = useState<TrendingPage[]>([]);
  const [community, setCommunity] = useState<PublishedSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isVisible || hasFetched.current) return;
    hasFetched.current = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [trendingResult, communitySnapshot] = await Promise.all([
          getTrendingPages(8),
          getDocs(query(collection(db, 'published_sites'), orderBy('publishedAt', 'desc'), limit(6))),
        ]);

        setTrending(trendingResult);

        const sites: PublishedSite[] = communitySnapshot.docs.map(d => {
          const data = d.data();
          return {
            url: data.url || '',
            title: data.title || data.url || '',
            publisherName: data.publisherName || 'Anonymous',
            publishedAt: data.publishedAt || 0,
          };
        });
        setCommunity(sites);
      } catch {
        // non-critical - homepage still works with empty data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isVisible]);

  return { trending, community, isLoading };
}
