import { Montserrat, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import 'lenis/dist/lenis.css';
import './globals.css';
import Shell from '@/components/Shell';

const display = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-display' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata = {
  metadataBase: new URL('https://www.contenaissance.com'),
  title: 'AI Creative Agency & Digital Marketing Co. | Contenaissance',
  description:
    'AI Story Telling Agency & AI Creative Studio. AI-powered creative solutions for campaigns, content, branding, & digital experiences.',
  icons: { icon: '/images/fav-icon.png' },
  openGraph: {
    title: 'Contenaissance — AI Story Telling Agency & AI Creative Studio',
    description: 'Human stories. Uncharted possibilities.',
    images: ['/images/logo.png'],
  },
};

export const viewport = { themeColor: '#0a0908' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
