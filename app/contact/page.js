import PageHero from '@/components/PageHero';
import ContactForm from '@/components/contact/ContactForm';

export const metadata = {
  title: 'Contact Contenaissance | Creative Agency in Noida',
  description: "Tell us about your project — we respond within 24 hours. Let's create something extraordinary.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        kicker="Start a mission"
        lines={['Let’s Build', 'Together']}
        text="Tell us about your project — we respond within 24 hours. Let's create something extraordinary."
      />
      <ContactForm />
    </>
  );
}
