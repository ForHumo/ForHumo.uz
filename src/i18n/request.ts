import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';
import { transliterateMessages, type UzScript } from '@/lib/uz-script';

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Ensure that a valid locale is used
    if (!locale || !routing.locales.includes(locale as any)) {
        locale = routing.defaultLocale;
    }

    let messages = (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;

    // Alifbo almashtirgich: faqat o'zbek tilida. `uz_script` cookie = latn (default,
    // eski lotin — manba) | cyrl (kirill) | latn-new (yangi lotin). Transliteratsiya
    // UI matniga qo'llanadi (e'lonlar/user-matni EMAS — ular API'dan keladi).
    if (locale === 'uz') {
        try {
            const c = await cookies();
            const script = (c.get('uz_script')?.value || 'latn') as UzScript;
            if (script === 'cyrl' || script === 'latn-new') {
                messages = transliterateMessages(messages, script);
            }
        } catch { /* cookie o'qilmasa — default eski lotin */ }
    }

    return { locale, messages };
});
