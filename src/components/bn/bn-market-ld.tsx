// BN bozor (bazaar) JSON-LD komponenti — ShoppingCenter schema.
// schema.org ShoppingCenter LocalBusiness'ning subclass'i — "market/mall"
// tipini semantik ochib beradi (bozor = tenant shopping center).

const SITE = "https://bozornarxida.uz";

interface Props {
    slug: string;
    name: string;
    description: string | null;
    image: string | null;
    address: string | null;
    city: string;
    district: string | null;
    telephone: string | null;
    latitude: number | null;
    longitude: number | null;
    workHours: string | null;
    shopCount: number;
}

export function BnMarketLd(props: Props) {
    const data: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "ShoppingCenter",
        "@id": `${SITE}/m/${props.slug}#market`,
        name: props.name,
        description: props.description ?? undefined,
        image: props.image ?? undefined,
        url: `${SITE}/m/${props.slug}`,
        telephone: props.telephone ?? undefined,
        // ShoppingCenter tenant soni — Google Rich Result uchun signal
        numberOfEmployees: undefined,
        address: {
            "@type": "PostalAddress",
            addressLocality: props.city,
            addressRegion: props.district ?? undefined,
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

    // openingHours — faqat parseable format bo'lsa; erkin matn Google'ni chalkashtiradi.
    // Hozircha tashlab yuboramiz (workHours "Dush-Yak 08:00-18:00" formatida — parse'lash keyingi ish).

    return (
        <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
