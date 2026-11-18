export default function Split({ text, lines, by = 'chars', as: Tag = 'span', className, ...rest }) {
  const rows = lines || [text];

  return (
    <Tag className={className} aria-label={rows.join(' ')} {...rest}>
      {rows.map((row, r) => (
        <span className="split-line" key={r} aria-hidden="true">
          {row.split(' ').map((word, w, arr) => (
            <span className="split-word" key={w}>
              {by === 'chars'
                ? [...word].map((ch, c) => (
                    <span className="split-char" key={c}>
                      {ch}
                    </span>
                  ))
                : <span className="w split-char">{word}</span>}
              {w < arr.length - 1 ? '\u00A0' : ''}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
