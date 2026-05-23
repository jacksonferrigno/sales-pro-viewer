import Link from "next/link";

export default function CallNotFound() {
  return (
    <main
      style={{
        padding: 40,
        fontFamily: "system-ui, sans-serif",
        color: "var(--text-primary)",
      }}
    >
      <h1 style={{ fontSize: 18 }}>Call not found</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
        Oops, couldn&apos;t find that call.
      </p>
      <p style={{ marginTop: 20 }}>
        <Link
          href="/"
          style={{
            color: "var(--text-primary)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          ← Back to dashboard
        </Link>
      </p>
    </main>
  );
}
