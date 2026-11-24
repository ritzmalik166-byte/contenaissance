import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from '../Icons';
import './Button.css';

/* =====================================================
   BUTTON — the site's one button. Every call-to-action
   uses it, so they all share the same height, padding,
   font (Roboto), text size, radius and hover.

   <Button href="/portfolio">Explore the work</Button>
   <Button variant="ghost" icon="right" href="/services">…</Button>
   <Button onClick={fn} icon={false}>Play</Button>

   props
     variant   'gold' (default) | 'light' | 'ghost'
     icon      'up-right' (default) | 'right' | false
     href      internal → next/link, http(s)/mailto/tel → <a>,
               none → <button type="button">
     external  open an href in a new tab
     className extra classes (positioning only — not sizing)
     ...rest   passed through (onClick, aria-*, data-*, style…)
===================================================== */

const ICONS = { 'up-right': ArrowUpRight, right: ArrowRight };

export default function Button({
  children,
  href,
  variant = 'gold',
  icon = 'up-right',
  external = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const Icon = icon ? ICONS[icon] : null;
  const cls = `cbtn cbtn--${variant}${className ? ` ${className}` : ''}`;
  const inner = (
    <>
      <span className="cbtn__label">{children}</span>
      {Icon && (
        <span className="cbtn__icon" aria-hidden="true">
          <Icon size={14} />
        </span>
      )}
    </>
  );

  if (href) {
    const isExternal = external || /^(https?:|mailto:|tel:)/.test(href);
    if (isExternal) {
      return (
        <a
          href={href}
          className={cls}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...rest}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }

  return (
    // eslint-disable-next-line react/button-has-type
    <button type={type} className={cls} {...rest}>
      {inner}
    </button>
  );
}
