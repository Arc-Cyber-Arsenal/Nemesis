import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for infinite scroll functionality
 *
 * @param {Function} onLoadMore - Callback function to load more data
 * @param {boolean} hasMore - Whether there is more data to load
 * @param {boolean} loading - Whether data is currently being loaded
 * @param {number} threshold - Distance from bottom (in pixels) to trigger load (default: 300px)
 * @returns {Function} sentryRef - Ref to attach to the sentinel element
 */
export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  loading,
  threshold = 300
}) => {
  const observerRef = useRef(null);
  const sentryRef = useCallback(
    (node) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            onLoadMore();
          }
        },
        {
          rootMargin: `${threshold}px`,
        }
      );

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, onLoadMore, threshold]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return sentryRef;
};

export default useInfiniteScroll;
