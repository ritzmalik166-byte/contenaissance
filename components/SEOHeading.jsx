
export default function SEOHeading({
  children,
  level = 2,
}) {
  const Tag = `h${level}`;

  return (
    <>
      <Tag className="seo-heading">
        {children}
      </Tag>

      <style jsx>{`
        .seo-heading {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </>
  );
}
