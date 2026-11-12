/** Midlertidig side for faner, der bygges i et senere trin. */
export function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: '4px 20px' }}>
      <h1 className="t-title-l">{title}</h1>
    </div>
  );
}
