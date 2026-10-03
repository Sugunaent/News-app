import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Twitter, Instagram } from 'lucide-react';
import { TMSLogo } from '@/components/brand/TMSLogo';
import { useAuth } from '@/lib/useAuth';
import { fetchCategories } from '@/lib/api';
import type { Category } from '@/types';

export function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const scrollToContact = () => {
    navigate('/about');
    setTimeout(() => {
      const el = document.getElementById('contact');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo(0, 0);
      }
    }, 300);
  };

  return (
    <footer
      className="relative z-10 mt-12"
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <TMSLogo size="md" />
            </div>
            <p className="text-sm text-muted max-w-sm leading-relaxed">
              A premium editorial platform for modern thinkers. Read, learn, and grow with interactive articles, quizzes, and more.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://twitter.com/TheModernStories" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full glass flex items-center justify-center text-secondary hover:text-brand-primary transition-colors" aria-label="The Modern Stories on X">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://www.instagram.com/TheModernStories" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full glass flex items-center justify-center text-secondary hover:text-brand-primary transition-colors" aria-label="The Modern Stories on Instagram">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-4">Navigation</h3>
            <ul className="space-y-2.5">
              <li><Link to="/" onClick={() => window.scrollTo(0, 0)} className="text-sm text-muted hover:text-brand-primary transition-colors">Home</Link></li>
              <li><Link to="/about" onClick={() => window.scrollTo(0, 0)} className="text-sm text-muted hover:text-brand-primary transition-colors">About</Link></li>
              <li><button onClick={scrollToContact} className="text-sm text-muted hover:text-brand-primary transition-colors">Contact</button></li>
              {user ? (
                <li><Link to="/profile" onClick={() => window.scrollTo(0, 0)} className="text-sm text-muted hover:text-brand-primary transition-colors">Profile</Link></li>
              ) : (
                <li><Link to="/auth" onClick={() => window.scrollTo(0, 0)} className="text-sm text-muted hover:text-brand-primary transition-colors">Login</Link></li>
              )}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-4">Explore</h3>
            <ul className="space-y-2.5">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link to={`/category/${category.slug}`} onClick={() => window.scrollTo(0, 0)} className="text-sm text-muted hover:text-brand-primary transition-colors">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-4">Legal</h3>
            <ul className="space-y-2.5">
              <li><Link to="/privacy" onClick={() => window.scrollTo(0, 0)} className="text-sm text-muted hover:text-brand-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal" onClick={() => window.scrollTo(0, 0)} className="text-sm text-muted hover:text-brand-primary transition-colors">Terms &amp; Legal</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-subtle flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">&copy; 2026 The Modern Stories, Powered by Suguna Entertainments. All rights reserved.</p>
          <p className="text-xs text-muted">Crafted for modern thinkers.</p>
        </div>
      </div>
    </footer>
  );
}
