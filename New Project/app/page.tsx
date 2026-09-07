export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Next.js starter</p>
        <h1 id="page-title">Your new project starts here.</h1>
        <p className="intro">
          Build something useful, fast, and distinctly yours.
        </p>
        <div className="actions">
          <a className="primary" href="https://nextjs.org/docs" target="_blank" rel="noreferrer">
            Read the docs
          </a>
          <a className="secondary" href="https://github.com/vercel/next.js" target="_blank" rel="noreferrer">
            View Next.js on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}
