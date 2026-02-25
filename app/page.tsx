import { SUPPORTED_SLUGS } from '@/src/lib/redirect-config';

export default function HomePage() {
  return (
    <main>
      <section className="card">
        <h1>sonalift-links</h1>
        <p>
          Next.js redirect service for <code>go.sonalift.co</code>.
        </p>
        <p>Configured slugs:</p>
        <ul>
          {SUPPORTED_SLUGS.map((slug) => (
            <li key={slug}>
              <code>/{slug}</code>
            </li>
          ))}
        </ul>
        <p>
          Replace destination URL placeholders in <code>src/lib/redirect-config.ts</code> and set Supabase env vars
          before deploying.
        </p>
      </section>
    </main>
  );
}
