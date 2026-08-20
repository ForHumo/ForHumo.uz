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
    images: string[];              // barcha rasmlar (Google birinchi 6 ni ishlatadi)
    price: number;                 // so'm (yoki cent USD)
    currency?: "UZS" | "USD";
    availability: "InStock" | "OutOfStock";
    condition?: "New" | "Used" | "Refurbished";
    sku?: string | null;
    category?: string | null;
    shopName?: string | null;
    shopSlug?: string | null;
    allowInspect?: boolean;        // eskrow qaytarish siyosati signali
    ratingAvg?: number | null;
    ratingCount?: number | null;
}) {
    const currency = props.currency ?? "UZS";
    const condition = props.condition ?? "New";

    // Offer — narx 30 kun amal qiladi (Google narx eskirmasin desa mos)
    const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);

    const offer: Record<string, unknown> = {
        "@type": "Offer",
        price: props.price,
        priceCurrency: currency,
        priceValidUntil,
        availability: `https://schema.org/${props.availability}`,
        itemCondition: `https://schema.org/${condition}Condition`,
        url: `${SITE}/p/${props.slug}`,
    };
    if (props.shopName) {
        offer.seller = {
            "@type": "Organization",
            name: props.shopName,
            url: props.shopSlug ? `${SITE}/d/${props.shopSlug}` : undefined,
        };
    }
    // INSPECT (yetkazishda tekshirish) — Google MerchantReturnPolicy signali
    if (props.allowInspect) {
        offer.hasMerchantReturnPolicy = {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "UZ",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 1,   // INSPECT 24 soat
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/FreeReturn",
        };
    }

    const data: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${SITE}/p/${props.slug}#product`,
        name: props.title,
        description: props.description ?? props.title,
        image: props.images.length ? props.images.slice(0, 6) : undefined,
        url: `${SITE}/p/${props.slug}`,
        sku: props.sku ?? props.slug,
        category: props.category ?? undefined,
        brand: props.shopName ? { "@type": "Brand", name: props.shopName } : undefined,
        offers: offer,
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
