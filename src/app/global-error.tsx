'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: '#020617',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ fontSize: '2.5rem' }}>😕</div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Something went wrong</h1>
        {error.message && (
          <pre
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.75rem',
              padding: '1rem',
              fontSize: '0.75rem',
              color: '#fca5a5',
              maxWidth: '480px',
              width: '100%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
            {error.digest ? `\n\nDigest: ${error.digest}` : ''}
          </pre>
        )}
        <button
          onClick={reset}
          style={{
            background: 'linear-gradient(to right, #22d3ee, #2dd4bf)',
            color: '#020617',
            border: 'none',
            borderRadius: '1rem',
            padding: '0.75rem 1.5rem',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
