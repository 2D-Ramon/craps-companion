import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-help">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-gold">Off the felt</h1>
      <p className="text-muted mt-3">That page is not in this pit.</p>
      <Link href="/" className="inline-block mt-4">
        Back to Table
      </Link>
    </div>
  );
}
