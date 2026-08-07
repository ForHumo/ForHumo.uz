// JSON-LD komponentlar — SEO uchun. Sahifada bir marta render qilinadi.
// Google Rich Results (Product / Store / Breadcrumb / Organization) uchun.

type Json = Record<string, unknown> | Array<unknown>;

function LdScript({ data }: { data: Json }) {
    return (
        <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

const SITE = "https://bozornarxida.uz";

export function BnOrgLd() {
    return (
        <LdScript data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Bozor Narxida",
            alternateName: "BN",
            url: SITE,
            logo: `${SITE}/bn/favicon.png`,
            sameAs: [
                "https://forhumo.uz",
                "https://t.me/forhumo",
                "https://www.instagram.com/forhumo",
                "https://www.youtube.com/@forhumo",
            ],
            parentOrganization: { "@type": "Organization", name: "For Humo", url: "https://forhumo.uz" },
        }} />
    );
}

export function BnBreadcrumbLd({ items }: { items: Array<{ name: string; url: string }> }) {
    return (
        <LdScript data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: items.map((it, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: it.name,
                item: it.url.startsWith("http") ? it.url : `${SITE}${it.url}`,
            })),
        }} />
    );
}

export function BnProductLd(props: {
    slug: string;
    title: string;
    description: string | null;
    image: string | null;
    price: number;                 // so'm
    currency?: "UZS" | "USD";
    availability: "InStock" | "OutOfStock";
    ratingAvg?: number | null;
    ratingCount?: number | null;
    shopName?: string | null;
}) {
    const currency = props.currency ?? "UZS";
    const data: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: props.title,
        description: props.description ?? props.title,
        image: props.image ? [props.image] : undefined,
        url: `${SITE}/p/${props.slug}`,
        brand: props.shopName ? { "@type": "Brand", name: props.shopName } : undefined,
        offers: {
            "@type": "Offer",
            price: props.price,
            priceCurrency: currency,
            availability: `https://schema.org/${props.availability}`,
            url: `${SITE}/p/${props.slug}`,
        },
    };
    if (props.ratingAvg && props.ratingCount && props.ratingCount > 0) {
        data.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: props.ratingAvg,
            reviewCount: props.ratingCount,
        };
    }
    return <LdScript data={data} />;
}

export function BnStoreLd(props: {
    slug: string;
    name: string;
    description: string | null;
    logo: string | null;
    address: string | null;
    city: string;
    ratingAvg?: number | null;
    ratingCount?: number | null;
}) {
    const data: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Store",
        name: props.name,
        description: props.description ?? undefined,
        image: props.logo ?? undefined,
        url: `${SITE}/d/${props.slug}`,
        address: {
            "@type": "PostalAddress",
            addressLocality: props.city,
            streetAddress: props.address ?? undefined,
            addressCountry: "UZ",
        },
    };
    if (props.ratingAvg && props.ratingCount && props.ratingCount > 0) {
        data.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: props.ratingAvg,
            reviewCount: props.ratingCount,
        };
    }
    return <LdScript data={data} />;
}

export function BnWebsiteLd() {
    return (
        <LdScript data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Bozor Narxida",
            url: SITE,
            potentialAction: {
                "@type": "SearchAction",
                target: `${SITE}/qidiruv?q={search_term_string}`,
                "query-input": "required name=search_term_string",
            },
        }} />
    );
}
