/* Masked line reveals. Lines rise from behind their baseline when the
   parent gains .is-in (useReveal) or, inside a scene, on --t. */
export function Lines({ lines, as: Tag = 'span', className = '' }) {
  return (
    <Tag className={`m-lines ${className}`}>
      {lines.map((l, i) => (
        <span className="m-line" key={i} style={{ '--i': i }}>
          <span className="m-line__in">{l}</span>
        </span>
      ))}
    </Tag>
  );
}

export function Kicker({ children, className = '', gold = true }) {
  return <p className={`m-kicker${gold ? ' m-kicker--gold' : ''} ${className}`}>{children}</p>;
}
