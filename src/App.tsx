import { lazy, Suspense, useEffect } from 'react';
import { findChapter } from './site/chapters';
import { ErrorBoundary } from './site/ErrorBoundary';
import { Layout } from './site/Layout';
import { About } from './site/pages/About';
import { ChapterPage } from './site/pages/ChapterPage';
import { NotFound } from './site/pages/ComingSoon';
import { Landing } from './site/pages/Landing';
import { useRoute } from './site/router';

const SITE = 'Beyond Dijkstra';
const Playground = lazy(() => import('./playground/Playground').then((m) => ({ default: m.Playground })));

export function App() {
  const { page, section } = useRoute();
  const chapter = findChapter(page);

  let content;
  let title: string;
  if (page === '') {
    content = <Landing />;
    title = `${SITE}: shortest paths, 2022–2025`;
  } else if (chapter) {
    content = <ChapterPage key={chapter.slug} chapter={chapter} section={section} />;
    title = `${chapter.title} · ${SITE}`;
  } else if (page === 'about') {
    content = <About />;
    title = `About · ${SITE}`;
  } else if (page === 'playground') {
    content = (
      <Suspense fallback={<p style={{ padding: 32 }}>Loading the playground…</p>}>
        <Playground />
      </Suspense>
    );
    title = `Playground · ${SITE}`;
  } else {
    content = <NotFound />;
    title = `Not found · ${SITE}`;
  }

  useEffect(() => {
    document.title = title;
  }, [title]);

  // New page: start at the top (chapters handle their own #section scrolling) and
  // move keyboard / screen-reader focus to the new content.
  useEffect(() => {
    if (!chapter) window.scrollTo({ top: 0 });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [page, chapter]);

  return (
    <Layout>
      <ErrorBoundary key={page} what="this page">
        {content}
      </ErrorBoundary>
    </Layout>
  );
}
