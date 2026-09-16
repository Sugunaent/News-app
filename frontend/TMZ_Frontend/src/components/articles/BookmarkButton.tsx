import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isBookmarked, addBookmark, removeBookmark } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useNavigate } from 'react-router-dom';

interface BookmarkButtonProps {
  articleId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'toggle';
}

export function BookmarkButton({ articleId, size = 'md', variant = 'icon' }: BookmarkButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    isBookmarked(user.id, articleId).then(setBookmarked).catch(() => {});
  }, [user, articleId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      navigate('/auth', { state: { redirect: window.location.pathname } });
      return;
    }

    setLoading(true);
    try {
      if (bookmarked) {
        await removeBookmark(user.id, articleId);
        setBookmarked(false);
        showToast('Removed from bookmarks', 'info');
      } else {
        await addBookmark(user.id, articleId);
        setBookmarked(true);
        showToast('Saved to bookmarks', 'success');
      }
    } catch {
      showToast('Could not update bookmark', 'error');
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const btnSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';

  if (variant === 'toggle') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${bookmarked ? 'bg-brand-primary text-white' : 'btn-secondary'}`}
      >
        {bookmarked ? <BookmarkCheck className={iconSize} /> : <Bookmark className={iconSize} />}
        <span className="text-sm">{bookmarked ? 'Saved' : 'Save'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${btnSize} rounded-full glass flex items-center justify-center transition-all hover:scale-110 ${bookmarked ? 'text-brand-primary' : 'text-secondary'}`}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {bookmarked ? <BookmarkCheck className={iconSize} /> : <Bookmark className={iconSize} />}
    </button>
  );
}
