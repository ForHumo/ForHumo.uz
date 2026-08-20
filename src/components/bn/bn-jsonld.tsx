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
    cover?: string | null;
    address: string | null;
    city: string;
    telephone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    priceRange?: string | null;    // masalan "12000 — 45000 UZS"
    ratingAvg?: number | null;
    ratingCount?: number | null;
}) {
    // "Store" schema.org LocalBusiness'ning subclass'i — Google Local Business
    // Rich Result'ini beradi (telephone/geo/address bilan).
    const images = [props.cover, props.logo].filter(Boolean) as string[];
    const data: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Store",
        "@id": `${SITE}/d/${props.slug}#store`,
        name: props.name,
        description: props.description ?? undefined,
        image: images.length ? images : undefined,
        url: `${SITE}/d/${props.slug}`,
        telephone: props.telephone ?? undefined,
        priceRange: props.priceRange ?? undefined,
        address: {
            "@type": "PostalAddress",
            addressLocality: props.city,
            streetAddress: props.address ?? undefined,
            addressCountry: "UZ",
        },
    };
    if (props.latitude != null && props.longitude != null) {
        data.geo = {
            "@type": "GeoCoordinates",
            latitude: props.latitude,
            longitude: props.longitude,
        };
    }
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
