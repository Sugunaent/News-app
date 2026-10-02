import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="relative z-10 mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary">404</p>
      <h1 className="font-display text-3xl text-primary sm:text-4xl">Page not found</h1>
      <p className="mt-4 max-w-xl text-secondary">
        This page may have moved, or the address may be incorrect. Explore the latest stories or return to the homepage.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary px-5 py-3">Home</Link>
        <Link to="/latest" className="btn-secondary px-5 py-3">Latest stories</Link>
      </div>
    </section>
  );
}
