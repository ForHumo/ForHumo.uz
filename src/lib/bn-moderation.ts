// BN uchun kuchaytirilgan moderatsiya.
// 2 bosqich:
//   1) Kalit-so'z tekshirishi (tez, aniq) — sinonim + transliteratsiya
//   2) AI (Gemini vision+text) — BN uchun aniqroq prompt bilan
//
// Qoidalar:
//   - O'zbekiston Respublikasi qonunlarini buzmasin
//   - Islom diniga zid mahsulot bo'lmasin (cho'chqa go'shti/yog'i,
//     tarkibida cho'chqa yog'i bo'lgan shokoladlar va h.k.)
//   - Boykot qilingan brendlar taqiqlangan
//   - Alkogol, giyohvand, qurol, sigareta, dori-darmon — taqiqlangan

import { aiAvailable, aiVisionJSON } from "@/lib/ai";
import type { ModResult, ModVerdict } from "@/lib/ai-moderate";

/**
 * Har toifada ko'p variantlar — o'zbek/rus/lotin/kirill/emoji almashtirishlari.
 * Sotuvchilar aylanib o'tishga harakat qilsa ham topa oladigan qilib yozilgan.
 */
const FORBIDDEN: Array<{ category: string; label: string; patterns: RegExp[]; severity?: number }> = [
    {
        category: "haram_pork",
        label: "Cho'chqa mahsuloti",
        severity: 0.95,
        patterns: [
            /\bcho['`ʻʼ]chqa\b/iu,
            /\bcho4qa\b/iu,             // aylanib o'tish
            /\bcho\.chqa\b/iu,
            /\bчочка\b/iu,
            /\bchochka\b/iu,
            /\bсвинин[аеы]\b/iu,
            /\bсвинья\b/iu,
            /\bсало\b/iu,               // cho'chqa yog'i
            /\bpork\b/iu,
            /\bbekon\b/iu,
            /\bbacon\b/iu,
            /\bветчин[аы]\b/iu,
            /\bxam\b\s*(pork|svin)/iu,
        ],
    },
    {
        category: "haram_alcohol",
        label: "Alkogol",
        severity: 0.9,
        patterns: [
            // O'zbekcha
            /\baroq\b/iu, /\barok\b/iu, /\barak\b/iu,
            /\bmusalas\b/iu, /\bмусаллас/iu,      // musalas — uzum vinosi
            /\bpivo\b/iu, /\bпиво/iu,
            /\bkonyak\b/iu, /\bконьяк/iu,
            /\bshampan/iu, /\bшампан/iu,
            /\bspirt\b/iu, /\bспирт/iu,
            /\balkogol/iu, /\bалкоголь/iu,
            /\bmartini\b/iu, /\bмартини/iu,
            /\bjigulyov/iu, /\bжигулёвск/iu,       // pivo brendi
            /\bbaltika\b/iu, /\bбалтика/iu,        // pivo brendi
            /\bqoraqizil\s+vino/iu,                // qora qizil vino (mahsulot nomi)
            /\bqizil\s+vino/iu,
            /\boq\s+vino/iu,
            // Ruscha
            /\bвино\b/iu, /\bвиски/iu,
            /\bром\b/iu, /\bтекила/iu, /\bджин\b/iu,
            /\bликер/iu, /\bликёр/iu,
            /\bсамогон/iu,
            /\bслабоалкогольн/iu,
            // Inglizcha
            /\bvodka\b/iu, /\bviski\b/iu, /\bwhiskey\b/iu,
            /\bwine\b/iu, /\bvino\b/iu,
            /\bbeer\b/iu, /\bale\b/iu, /\blager\b/iu,
            /\btequila\b/iu, /\brum\b/iu, /\bgin\b/iu,
            /\bcocktail\b/iu, /\bkokteyl/iu, /\bкоктейль/iu,
            /\bchampagne/iu, /\bprosecco/iu,
            /\bliqueur/iu, /\bliquor/iu,
        ],
    },
    {
        category: "illegal_drug",
        label: "Giyohvand modda / dori-darmon",
        severity: 0.98,
        patterns: [
            /\bgeroin\b/iu, /\bheroin\b/iu,
            /\bkokain\b/iu, /\bcocaine\b/iu,
            /\bmarihuan/iu, /\bмарихуан/iu, /\bmarijuana\b/iu,
            /\bkanabis\b/iu, /\bcannabis\b/iu,
            /\bhashish\b/iu, /\bгашиш\b/iu,
            /\bамфетамин/iu, /\bamfetamin/iu,
            /\bekstazi\b/iu, /\bэкстази\b/iu,
            /\bLSD\b/i,
            /\btramadol\b/iu, /\bтрамадол/iu,
            /\bnarkotik/iu, /\bнаркотик/iu,
        ],
    },
    {
        category: "weapon",
        label: "Qurol",
        severity: 0.9,
        patterns: [
            /\bpistolet\b/iu, /\bпистолет/iu,
            /\bavtomat\b/iu,
            /\bpulemyot/iu, /\bпулемёт/iu,
            /\bgranata\b/iu, /\bграната/iu,
            /\btropovnik/iu,
            /\bkalashnikov/iu, /\bкалашников/iu,
            /\bAK-?47\b/i,
            /\bglock\b/iu, /\bглок\b/iu,
            /\bpatron\b\s*(9|7\.62|5\.45)/iu,
        ],
    },
    {
        category: "cigarette",
        label: "Tamaki mahsuloti",
        severity: 0.75,
        patterns: [
            /\bsigaret/iu, /\bсигарет/iu,
            /\bmarlboro\b/iu,
            /\bkent\b/iu,
            /\bparliament/iu, /\bпарламент/iu,
            /\bvape\b/iu, /\bвейп/iu,
            /\bэлектронн[аоы][ея]?\s*сигарет/iu,
            /\belectronic\s*cigarette/iu,
            /\biqos\b/iu,
        ],
    },
    {
        category: "boycott_brand",
        label: "Boykot qilingan brend",
        severity: 0.85,
        // NOTE: aniq ro'yxat foydalanuvchi + Jalol bilan uchrashib to'ldiriladi.
        // Hozircha yagona misol — kelasi kengaytiriladi.
        patterns: [
            // Bo'sh — MODERATOR panel orqali dinamik qo'shiladi (kelajakda)
        ],
    },
    {
        // MUHIM: bu "diniga zid" 18+ (pornografik). Oddiy ichki kiyim EMAS —
        // ular BnProduct.isMature=true bilan xiralashtirib ko'rsatiladi.
        category: "haram_adult",
        label: "Diniga zid 18+ mahsulot",
        severity: 0.95,
        patterns: [
            /\bporn/iu, /\bпорн/iu,
            /\berotik\s*(film|klip|jurnal)/iu, /\bэротическ/iu,
            /\bseks-?igrushk/iu, /\bsex\s*toy/iu, /\bсекс-?игрушк/iu,
            /\bBDSM\b/i,
            /\bfetish/iu, /\bфетиш/iu,
            /\bstriptiz/iu, /\bстрип/iu,
            /\bmastur/iu, /\bмастур/iu,
        ],
    },
    {
        // Barcha dori-darmon TAQIQ (foydalanuvchi so'zi — halol/qonuniy bo'lsa ham)
        category: "medicine",
        label: "Dori-darmon (barcha tur)",
        severity: 0.95,
        patterns: [
            /\banalgin\b/iu, /\banalgin\b/iu,
            /\bcitramon\b/iu, /\bцитрамон/iu,
            /\baspirin\b/iu, /\bаспирин/iu,
            /\bnurofen/iu, /\bнурофен/iu,
            /\bparacetamol/iu, /\bпарацетамол/iu, /\bпaraцетамол/iu,
            /\bibuprofen/iu, /\bибупрофен/iu,
            /\bantibiotik/iu, /\bантибиотик/iu,
            /\bamoksitsillin/iu, /\bамоксициллин/iu,
            /\bcefixim/iu, /\bцефиксим/iu,
            /\bvitamin\s*(a|b|c|d|e|k|b12)/iu, /\bвитамин/iu,
            /\bdori\b/iu, /\bлекарство/iu, /\bmedikament/iu,
            /\btabletka\b/iu, /\bтаблетк/iu,
            /\bkapsula\b/iu, /\bкапсул/iu,
            /\bin.?ektsiy/iu, /\bинъекц/iu, /\buko1?l\b/iu, /\bукол\b/iu,
            /\bpreparat\b/iu, /\bпрепарат/iu,
            /\bsyrup\b/iu, /\bсироп\b/iu,
            /\bmaz(?:i|')/iu, /\bмазь\b/iu, /\bkrem\s+(dermato|antibiotik|gormonal)/iu,
            /\bpsixotrop/iu, /\bпсихотроп/iu,
        ],
    },
    {
        // Qalbaki brend / kontrafakt
        category: "counterfeit",
        label: "Qalbaki brend (kontrafakt)",
        severity: 0.85,
        patterns: [
            /\breplica\b/iu, /\brepligkasi/iu, /\breplika\b/iu, /\bреплик/iu,
            /\bko'chirma\b/iu, /\bkochirma\b/iu, /\bnusxa\s+(apple|samsung|nike|adidas)/iu,
            /\bfake\b\s*(apple|iphone|nike|adidas|gucci|louis)/iu,
            /\b1:1\s*(kachestvo|copy|nusxa)/iu,
            /\bAA-?class\b/iu, /\bAAA\+?\s*kachest/iu,
        ],
    },
    {
        // O'g'irlangan tovar — telefon IMEI'siz, avto qismi VIN'siz
        category: "stolen",
        label: "O'g'irlangan tovar (IMEI/VIN yo'q)",
        severity: 0.85,
        patterns: [
            /\bIMEI\s*yo['`ʻ]?q\b/iu,
            /\bIMEI\s*chists?iz\b/iu,
            /\bчистый\s*IMEI/iu,
            /\bo['`ʻ]?g['`ʻ]?irl(a|ang)/iu, /\bкраденн?ый/iu, /\bcrown\b/iu,
            /\bhujjatsiz\s*(telefon|avto|mashina)/iu,
            /\bдокумент\s*(нет|отсутствует)/iu,
        ],
    },
    {
        // Qalbaki hujjatlar
        category: "fake_documents",
        label: "Qalbaki hujjatlar",
        severity: 0.98,
        patterns: [
            /\b(qalbaki|soxta|поддельн)\s*(pasport|hujjat|diplom|litsenziya|guvohnoma|prava|документ)/iu,
            /\bfake\s*(passport|diploma|license|ID)/iu,
            /\bпoddelka\s+прав/iu,
            /\bдиплом\s+куплю?/iu,
        ],
    },
    {
        // Davlat mulki, armiya
        category: "state_property",
        label: "Davlat mulki / armiya",
        severity: 0.9,
        patterns: [
            /\barmiya\s+forma/iu, /\bвоенная\s+форма/iu, /\bmilitary\s+uniform/iu,
            /\bmilitsiya\s+forma/iu, /\bполицейская\s+форма/iu,
            /\bpolitsiya\s+badge/iu, /\bбейдж\s+полиц/iu,
            /\bdavlat\s+organi\s+belgi/iu, /\bгерб\s+РУ/iu,
        ],
    },
    {
        // Qimor jihozlari
        category: "gambling",
        label: "Qimor jihozlari",
        severity: 0.85,
        patterns: [
            /\bruletka\b/iu, /\bрулетка/iu,
            /\bqimor\s+(karta|apparat)/iu, /\bигральн(ые|ые)\s+карт/iu,
            /\bpoker\s+chip/iu, /\bпокерн/iu,
            /\bslot\s+machine/iu, /\bслот\s+машин/iu,
            /\bbukmeker/iu, /\bбукмекер/iu,
        ],
    },
    {
        // Palma folbin, tumor, sehrgar
        category: "occult",
        label: "Folbin/sehr/tumor (dinga zid)",
        severity: 0.85,
        patterns: [
            /\bfolbin/iu, /\bгадани/iu,
            /\btumor\b/iu, /\bамулет/iu, /\bталисман/iu,
            /\bsehr(gar|li)/iu, /\bколдун/iu, /\bмагия/iu, /\bmagik/iu,
            /\btaro\b/iu, /\bтаро\b/iu,
            /\bruna\b/iu, /\bруны\b/iu,
            /\bko'z\s*tegishi\s+himoya/iu, /\bот\s*сглаза/iu,
        ],
    },
    {
        // E-qo'shimchalar (cho'chqa jelatin, kochenil)
        category: "haram_additive",
        label: "Haram E-qo'shimcha (E441 jelatin, E120 kochenil)",
        severity: 0.7,
        patterns: [
            /\bE-?441\b/iu, /\bE-?120\b/iu, /\bE-?913\b/iu,
            /\bжелатин\s+(свинн|свиной)/iu,
            /\bcho['`ʻ]?chqa\s+jelatin/iu,
            /\bpork\s+gelatin/iu,
            /\bkochenil/iu, /\bкошениль/iu,
        ],
    },
    {
        // Radioaktiv/kimyoviy xavfli
        category: "hazardous",
        label: "Radioaktiv / kimyoviy xavfli",
        severity: 0.95,
        patterns: [
            /\bpestisid/iu, /\bпестицид/iu,
            /\bradioaktiv/iu, /\bрадиоактив/iu,
            /\bnitrat\s*kislota/iu, /\bазотная\s*кислота/iu,
            /\bsulfat\s*kislota/iu, /\bсерн\s*кислот/iu,
            /\bxlorid\s*kislota/iu, /\bсоляная\s*кислот/iu,
            /\bstrixnin/iu, /\bстрихнин/iu,
        ],
    },
    {
        // Yovvoyi hayvon (Red Book)
        category: "wildlife",
        label: "Yovvoyi hayvon (Qizil kitob)",
        severity: 0.9,
        patterns: [
            /\bburgut\s*terisi/iu, /\bбуркут\s*кожа/iu,
            /\btulki\s*terisi\s*(yovvoyi|dikoy)/iu,
            /\bqizil\s*kitob/iu, /\bкрасная\s*книга/iu,
            /\bслоновая\s*кость/iu, /\bivory\b/iu,
            /\bnosorog\s*shox/iu, /\brhino\s*horn/iu,
        ],
    },
    {
        // Sog'liq da'vosi (murakkab, aslida REVIEW)
        category: "health_claim",
        label: "Sog'liq da'vosi (\"saraton davolaydi\")",
        severity: 0.6,
        patterns: [
            /\bsaraton\s*davo/iu, /\brak\s+(лечит|исцеляет)/iu,
            /\bXBP\s*davo/iu, /\bAIDS\s+cure/iu,
            /\bhamma\s*kasal(lik)?ni\s*davo/iu,
            /\bmo['`ʻ]jizali\s*(vosita|preparat|dori)/iu,
        ],
    },
];

export interface BnModResult extends ModResult {
    /** Kalit-so'z asosli bloklandimi (AI'ga bormasdan) */
    keywordHit?: { category: string; label: string } | null;
    /** AI 18+ tovar deb topgan bo'lsa (ichki kiyim, kondom, ...) */
    isMature?: boolean;
}

/**
 * Matnda taqiqlangan kalit so'z bormi tekshirish.
 * Return: ({category, label, severity}) yoki null.
 */
export function checkForbiddenKeywords(text: string): { category: string; label: string; severity: number } | null {
    const t = (text || "").toLowerCase();
    if (!t.trim()) return null;
    for (const rule of FORBIDDEN) {
        for (const re of rule.patterns) {
            if (re.test(t)) {
                return { category: rule.category, label: rule.label, severity: rule.severity ?? 0.9 };
            }
        }
    }
    return null;
}

/** BN'ga xos qat'iyroq system prompt (rasm+matn birga). */
const BN_SYSTEM = `Sen "Bozor Narxida" (BN) marketplace uchun kontent moderatorisan.
Auditoriya: O'zbekiston (Islom asosli, O'zbekiston qonuni). Mahsulotni tasdiqlash oldidan sinchkovlik bilan tekshir.

QAT'IY TAQIQLANGAN — BLOCK (Islom + O'zbekiston qonuni):
1) Cho'chqa mahsuloti: go'sht, yog', jelatin (E441), ichak, terisi. Tarkibida cho'chqa yog'i bor shokolad/pechene/chips.
2) Alkogol: aroq, vino, pivo, konyak, viski, shampan, spirt (sanoat spirti ham).
3) Barcha dori-darmon: analgin, sitramon, aspirin, nurofen, antibiotik, vitamin, tabletka, kapsula, mazi, siroplar — QONUNIY VA HALOL BO'LSA HAM. Faqat licenziyalangan apteka sotadi, BN'da EMAS.
4) Sigareta/tamaki: sigaret, vape, IQOS, elektron sigareta.
5) Qurol va o'q-dorilar (o'yinchoq/dekorativ istisno — aniq belgilangan).
6) Giyohvand modda va psixotrop dorilar.
7) Qalbaki brend (kontrafakt): "replika", "1:1 nusxa", "AAA class copy", asl brend nomi bilan sotilgan qalbaki.
8) O'g'irlangan tovar: IMEI yo'q telefon, hujjatsiz mashina, "chistiy IMEI" da'vosi.
9) Qalbaki hujjatlar: pasport, diplom, litsenziya, guvohnoma.
10) Davlat mulki: armiya/politsiya forma, davlat organi belgisi/gerb.
11) Diniga zid 18+: porn, erotik film/jurnal, seks o'yinchoq, BDSM.
12) Qimor jihozlari: ruletka, poker chip, slot mashina.
13) Folbin/sehr/tumor: dinga zid — folbin, sehrgar buyum, tumor, taro karta.
14) Kimyoviy xavfli: pestisid, azot/sulfat kislota, strixnin.
15) Yovvoyi hayvon (Qizil kitob): burgut terisi, nosorog shox, ivory.
16) Firibgarlik yoki soxta sotuv.

REVIEW (admin ko'rsin, avto BLOCK emas):
- Halol status shubhali oziq-ovqat — rasmda tarkib ko'rinmasa
- Sog'liq da'vosi ("saraton davolaydi", "mo'jizali dori")
- Iqtisodiy bosim ("kredit qaytarmasa uy olib qo'yamiz")
- Brend haqiqiyligi shubhali (rasm+matn muvofiq emas)
- Politik/diniy tashviqot yozuvlari

18+ TOVAR (SOTILISHI MUMKIN — LEKIN OK+isMature=true):
Bularni OK deb bering, JSON'ga qo'shimcha "isMature": true qo'shing:
- Ichki kiyim (erkak/ayol)
- Kondom, kontratseptiv (halol foydalanish)
- Balog'atga yetganlar uchun sog'liq buyumi
- Turmush shifokorlik buyumi

Bular pornografik EMAS — diniga zid emas. Faqat xiralashtiriladi, ko'rish uchun tasdiq.

KO'ZDAN QOCHIRMA (aylanib o'tishga urinishlar):
- Sotuvchi kalit so'zni yashirishi ("vodka" o'rniga "v0dk4", "cho.chqa", "cho4qa")
- Rasm va matn mos kelmasligi (matn "shokolad" — rasm arogli)
- Chet til bilan yashirish (uzuz-ru-en)
- Emoji bilan yashirish (🍺 = pivo)
- "Xodimlar uchun" degan yashirin qonuniy chetlab o'tish

Ruxsat OK (isMature=false):
- Halol oziq-ovqat (tarkib ko'ringan)
- Kiyim (18+ bo'lmagan), poyabzal
- Elektronika, ehtiyot qismlar
- Milliy taomlar, kitob, gilam, sovg'a, sport, bolalar buyumi

verdict: "OK" | "REVIEW" | "BLOCK". severity: 0.0..1.0.
JSON: {"verdict":"...","categories":["..."],"severity":0.0,"reason":"o'zbekcha qisqa","isMature":false}
isMature — faqat OK verdict'da true bo'lishi mumkin (18+ mahsulot ichki kiyim/kondom kabi).`;

/**
 * BN uchun mahsulotni moderatsiya qilish.
 * Avval kalit-so'zlar orqali tez tekshiruv (BLOCK yoki OK-quick).
 * Keyin AI (agar mavjud bo'lsa).
 */
export async function moderateBnProduct(input: {
    title: string;
    description?: string | null;
    imageUrl?: string | null;
}): Promise<BnModResult | null> {
    // 1) Kalit-so'z tekshiruvi (rus/uz/lotin/kirill sinonimlar bilan)
    const combined = [input.title, input.description ?? ""].join(" \n ");
    const hit = checkForbiddenKeywords(combined);
    if (hit) {
        return {
            verdict: "BLOCK",
            categories: [hit.category],
            severity: hit.severity,
            reason: `Taqiqlangan kalit so'z aniqlandi: ${hit.label}`,
            keywordHit: { category: hit.category, label: hit.label },
        };
    }

    // 2) AI tekshiruvi (rasm+matn birga)
    if (!aiAvailable()) {
        // AI yo'q bo'lsa OK deb qaytaramiz (fail-open)
        return { verdict: "OK", categories: [], severity: 0, reason: "" };
    }

    const prompt = `Mahsulot nomi: ${input.title.slice(0, 200)}
Tavsifi: ${(input.description ?? "").slice(0, 1500) || "(tavsif yo'q)"}
${input.imageUrl ? "Rasmni ham tahlil qil: matn va rasm mos keladimi, taqiqlangan mahsulot emasmi." : "Rasm yo'q."}`;

    try {
        const out = await aiVisionJSON<Partial<ModResult>>(prompt, input.imageUrl || null, {
            system: BN_SYSTEM,
            temperature: 0,
        });
        if (!out || !out.verdict) return null;

        const verdict = (["OK", "REVIEW", "BLOCK"].includes(out.verdict as string)
            ? out.verdict
            : "OK") as ModVerdict;

        const severity = typeof out.severity === "number"
            ? Math.max(0, Math.min(1, out.severity))
            : (verdict === "BLOCK" ? 0.85 : verdict === "REVIEW" ? 0.5 : 0);

        return {
            verdict,
            categories: Array.isArray(out.categories) ? out.categories.slice(0, 6).map(String) : [],
            severity,
            reason: typeof out.reason === "string" ? out.reason.slice(0, 300) : "",
            keywordHit: null,
            isMature: verdict === "OK" && (out as { isMature?: boolean }).isMature === true,
        };
    } catch {
        return null;
    }
}
