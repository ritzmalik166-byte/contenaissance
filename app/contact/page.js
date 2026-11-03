import PageHero from '@/components/PageHero';
import ContactForm from '@/components/contact/ContactForm';

export const metadata = {
  title: "Contact Contenaissance | Creative Agency in Noida",
  description:
    "Contact Contenaissance, a creative agency in Noida, to discuss AI video production, branding, digital marketing and creative solutions for your business.",
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
