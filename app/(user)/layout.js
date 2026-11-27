import "lenis/dist/lenis.css";
import "./user.css";

import Shell from "@/components/Shell";
import Script from "next/script";

// Plus Jakarta Sans for every heading, Roboto for everything else
// (body, links, labels, buttons). Cinzel is only the footer's gold
// CONTENAISSANCE wordmark (it matches the logo's lettering).
import { Plus_Jakarta_Sans, Roboto, Cinzel } from "next/font/google";
import FloatingContact from "@/components/common/FloatingContact";

const heading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"], // the hero's italic line
  variable: "--font-heading",
  display: "swap",
});

const body = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const wordmark = Cinzel({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-wordmark",
  display: "swap",
});


export const metadata = {
  metadataBase: new URL("https://www.contenaissance.com"),
  title: "Contenaissance - The Future of AI Storytelling",
  description:
    "Build, deploy, and scale AI applications with unprecedented speed. Enterprise-grade infrastructure for the next generation of intelligent systems.",
  keywords: [
    "AI",
    "Machine Learning",
    "Storytelling",
    "Enterprise",
    "Contenaissance",
    "GenAI",
  ],
  authors: [{ name: "Contenaissance" }],
  publisher: "Contenaissance",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/assets/fav-icon.png",
    apple: "/assets/fav-icon.png",
  },
  verification: {
    google: "htYldUHQILq96XoaBZjUrlGFbawq3ZgQ9XFj0kcSSeU",
  },
  openGraph: {
    title: "Contenaissance - The Future of AI Storytelling",
    description:
      "Build, deploy, and scale AI applications with unprecedented speed.",
    type: "website",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Contenaissance",
  url: "https://www.contenaissance.com/",
  logo: {
    "@type": "ImageObject",
    url: "https://www.contenaissance.com/images/logo-600.webp",
    width: 600,
    height: 294,
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-9220516777",
    contactType: "customer service",
    areaServed: "IN",
    availableLanguage: ["en", "Hindi"],
  },
  sameAs: [
    "https://www.facebook.com/people/Contenaissance/61579738437856",
    "https://x.com/contenaissance",
    "https://www.instagram.com/contenaissance/",
    "https://www.youtube.com/@Contenaissance",
    "https://www.linkedin.com/company/contenaissance/",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org/",
  "@type": "WebSite",
  name: "Contenaissance",
  url: "https://www.contenaissance.com/",
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://www.contenaissance.com/#localbusiness",
  name: "Contenaissance",
  url: "https://www.contenaissance.com/",
  description:
    "Contenaissance is an AI-powered creative agency offering AI brand films, video production, branding, digital marketing, SEO and website development.",
  telephone: "+91-9220516777",
  email: "info@ritzmediaworld.com",
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "Unit No. 404, 4th Floor, Corporate Park Tower A1, Sector 142",
    addressLocality: "Noida",
    addressRegion: "Uttar Pradesh",
    postalCode: "201305",
    addressCountry: "IN",
  },
};

export const viewport = {
  themeColor: "#0a0908",
};

export default function UserLayout({ children }) {
  return (
    <div
      className={`${heading.variable} ${body.variable} ${wordmark.variable} site-fonts`}
    >
      <link
        rel="dns-prefetch"
        href="https://contenaissance.blob.core.windows.net"
      />

      <link
        rel="preconnect"
        href="https://contenaissance.blob.core.windows.net"
        crossOrigin="anonymous"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />

      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-9KKTHS4QY2"
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-9KKTHS4QY2');
        `}
      </Script>

      <Script id="microsoft-clarity" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);
            t.async=1;
            t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];
            y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "yudfcj2h2e");
        `}
      </Script>

      <Shell>
        {children}
        {/* <VideoModal /> is rendered by <Shell> — a second copy opened two players */}
        <FloatingContact />
        </Shell>
    </div>
  );
}