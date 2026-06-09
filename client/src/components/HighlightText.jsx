export default function HighlightText({ text, highlight }) {
  if (!text) return null;
  if (!highlight || !highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} style={{ backgroundColor: 'rgba(79, 142, 247, 0.3)', color: 'var(--accent-blue)', padding: '0 2px', borderRadius: '2px', background: 'transparent' }}>{part}</mark>
        ) : (part)
      )}
    </span>
  );
}
