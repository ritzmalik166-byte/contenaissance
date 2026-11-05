
import { notFound } from 'next/navigation';
import { services } from '@/lib/user/content';
import ServiceDetail from '@/components/services/ServiceDetail';

function slugifyService(title = '') {
    return title
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function findService(slug) {
    return services.find(
        (service) => slugifyService(service.title) === slug
    );
}

export function generateStaticParams() {
    return services.map((service) => ({
        slug: slugifyService(service.title),
    }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const service = findService(slug);

    if (!service) {
        return { title: 'Service Not Found | Contenaissance' };
    }

    return {
        title: `${service.title} | Contenaissance`,
        description:
            service.paragraphs?.[0] ||
            `${service.title} services by Contenaissance.`,
    };
}

export default async function ServiceDetailPage({ params }) {
    const { slug } = await params;
    const service = findService(slug);

    if (!service) {
        notFound();
    }

    return (<>
        <section>
            <ServiceDetail service={service} />
        </section>
    </>
    )
}
