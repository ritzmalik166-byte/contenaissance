import PageHero from '@/components/PageHero';
import ContactForm from '@/components/contact/ContactForm';

export const metadata = {
  title: "Contact Contenaissance | Start Your Creative Project",
  description:
    "Get in touch with Contenaissance for AI video production, creative services, branding, digital content and marketing projects. Let's build something extraordinary.",
    keywords: [
      "contact Contenaissance", " AI creative agency", " AI video production", " creative agency India", " AI content creation", " branding services", " digital marketing agency", " creative production agency", " brand films", " creative collaboration"
    ],
  alternates: {
    canonical: "https://www.contenaissance.com/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      {/* <PageHero
        kicker="Get in Touch"
        lines={['Let’s Build', 'Together']}
        text="Tell us about your project — we respond within 24 hours. Let's create something extraordinary."
      /> */}
      <ContactForm />
    </>
  );
}
