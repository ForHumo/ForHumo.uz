"use client";

// BN rang tizimi — Kunduzgi / Tungi / Tizim.
// next-themes `<html class="dark">` qo'yadi; biz shunga bog'lanamiz.
//
// Kunduzgi: och bejiviy / molochniy (foydalanuvchi so'rovi)
// Tungi:    qora emas — sezilib turadigan to'q kulrang (foydalanuvchi so'rovi)

export function BnStyles() {
    return (
        <style jsx global>{`
            .bn-scope {
                /* ── KUNDUZGI (och bejiviy / molochniy) ── */
                --bn-gold:        #B8860B;
                --bn-gold-light:  #E0A800;
                --bn-gold-dark:   #8A6508;
                --bn-gold-soft:   rgba(184, 134, 11, 0.10);
                --bn-gold-edge:   rgba(184, 134, 11, 0.28);

                --bn-bg:          #FAF6EE;
                --bn-surface:     #FFFFFF;
                --bn-surface-up:  #F4EFE3;
                --bn-surface-top: #EBE4D4;

                --bn-border:      rgba(60, 50, 30, 0.11);
                --bn-border-gold: rgba(184, 134, 11, 0.30);

                --bn-text:        #1C1913;
                --bn-text-2:      #5F594C;
                --bn-text-3:      #918A7B;
                --bn-on-gold:     #FFFFFF;

                --bn-ok:          #15803D;
                --bn-ok-soft:     rgba(21, 128, 61, 0.10);
                --bn-warn:        #B45309;
                --bn-warn-soft:   rgba(180, 83, 9, 0.10);
                --bn-err:         #B91C1C;
                --bn-err-soft:    rgba(185, 28, 28, 0.10);
                --bn-info:        #1D4ED8;

                --bn-glass:       rgba(255, 253, 248, 0.72);
                --bn-shadow:      0 8px 32px rgba(60, 45, 15, 0.10);

                /* Jonli fon (och) */
                --bn-orb-1:       rgba(224, 168, 0, 0.16);
                --bn-orb-2:       rgba(200, 150, 80, 0.13);
                --bn-orb-3:       rgba(180, 140, 40, 0.10);

                background: var(--bn-bg);
                color: var(--bn-text);
                color-scheme: light;
            }

            /* ── TUNGI (to'q kulrang, qora emas) ── */
            .dark .bn-scope {
                --bn-gold:        #F5B301;
                --bn-gold-light:  #FFCE3D;
                --bn-gold-dark:   #C98F00;
                --bn-gold-soft:   rgba(245, 179, 1, 0.11);
                --bn-gold-edge:   rgba(245, 179, 1, 0.24);

                --bn-bg:          #17171B;
                --bn-surface:     #1F1F25;
                --bn-surface-up:  #28282F;
                --bn-surface-top: #32323A;

                --bn-border:      rgba(255, 255, 255, 0.09);
                --bn-border-gold: rgba(245, 179, 1, 0.24);

                --bn-text:        #F6F4F0;
                --bn-text-2:      #A9A296;
                --bn-text-3:      #7C7568;
                --bn-on-gold:     #17171B;

                --bn-ok:          #4ADE80;
                --bn-ok-soft:     rgba(74, 222, 128, 0.12);
                --bn-warn:        #FBBF24;
                --bn-warn-soft:   rgba(251, 191, 36, 0.12);
                --bn-err:         #F87171;
                --bn-err-soft:    rgba(248, 113, 113, 0.12);
                --bn-info:        #60A5FA;

                --bn-glass:       rgba(28, 28, 33, 0.72);
                --bn-shadow:      0 8px 32px rgba(0, 0, 0, 0.45);

                --bn-orb-1:       rgba(245, 179, 1, 0.11);
                --bn-orb-2:       rgba(201, 143, 0, 0.09);
                --bn-orb-3:       rgba(120, 100, 60, 0.10);

                color-scheme: dark;
            }

            /* ── Statik fon gradient — animatsiyasiz (GPU/CPU tejash) ──
               Eski animatsiyali "aurora" har freymda 3 katta blur qayta hisoblanardi;
               scroll qilishda ham qayta paint bo'lardi — mobil'da qotib qolishga sabab.
               Endi yagona radial gradient — bir marta paint, 0 CPU ishlatadi. */
            .bn-aurora {
                position: fixed;
                inset: 0;
                z-index: 0;
                pointer-events: none;
                overflow: hidden;
                background:
                    radial-gradient(ellipse 60vw 45vh at 15% 10%, var(--bn-orb-1), transparent 60%),
                    radial-gradient(ellipse 50vw 40vh at 85% 30%, var(--bn-orb-2), transparent 60%),
                    radial-gradient(ellipse 45vw 35vh at 50% 90%, var(--bn-orb-3), transparent 60%);
            }
            .bn-aurora span { display: none; }   /* eski span'lar keraksiz */

            @media (prefers-reduced-motion: reduce) {
                .bn-aurora span { animation: none !important; }
            }

            /* ── Umumiy input uslubi ── */
            .bn-input {
                width: 100%;
                height: 46px;
                border-radius: 12px;
                padding: 0 14px;
                font-size: 14px;
                outline: none;
                background: var(--bn-surface-up);
                border: 1px solid var(--bn-border);
                color: var(--bn-text);
                caret-color: var(--bn-gold);
                transition: border-color 0.15s;
            }
            .bn-input:focus { border-color: var(--bn-gold-edge); }
            .bn-input::placeholder { color: var(--bn-text-3); }
            textarea.bn-input { height: auto; }

            /* Skrollbarni yashirish (gorizontal qatorlar uchun) */
            .bn-noscroll { scrollbar-width: none; -ms-overflow-style: none; }
            .bn-noscroll::-webkit-scrollbar { display: none; }

            /* BN range slider — barcha browserlarda bir xil chiroyli ko'rinish */
            .bn-range {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 6px;
                background: transparent;
                cursor: pointer;
                outline: none;
            }
            /* WebKit (Chrome/Safari/Edge) — track */
            .bn-range::-webkit-slider-runnable-track {
                height: 6px;
                border-radius: 999px;
                background: linear-gradient(
                    to right,
                    var(--bn-gold) 0%,
                    var(--bn-gold) var(--bn-range-pct, 50%),
                    var(--bn-surface-up) var(--bn-range-pct, 50%),
                    var(--bn-surface-up) 100%
                );
            }
            .bn-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--bn-gold);
                border: 3px solid var(--bn-surface);
                box-shadow: 0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px var(--bn-gold-edge);
                cursor: grab;
                margin-top: -7px;
                transition: transform 0.12s;
            }
            .bn-range::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.1); }
            /* Firefox */
            .bn-range::-moz-range-track {
                height: 6px;
                border-radius: 999px;
                background: var(--bn-surface-up);
            }
            .bn-range::-moz-range-progress {
                height: 6px;
                border-radius: 999px;
                background: var(--bn-gold);
            }
            .bn-range::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--bn-gold);
                border: 3px solid var(--bn-surface);
                box-shadow: 0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px var(--bn-gold-edge);
                cursor: grab;
            }
            .bn-range::-moz-range-thumb:active { cursor: grabbing; transform: scale(1.1); }
            .bn-range:disabled { opacity: 0.5; cursor: not-allowed; }

            /* ── Mobil + foldable moslashuvi ─────────────────────────────
               iPhone Duo, Galaxy Fold, kichik cover ekranlarga xush kelibsiz.
               Juda tor (≤ 380px) va foldable "flex" pozitsiyalari uchun. */

            /* Ultra tor (iPhone Duo cover, kichkina foldable — < 360px) */
            @media (max-width: 359px) {
                .bn-scope .bn-hide-xxs { display: none !important; }
                .bn-scope h1, .bn-scope .bn-h1 { font-size: 20px !important; line-height: 1.2 !important; }
                .bn-scope .text-\[24px\], .bn-scope .text-\[26px\], .bn-scope .text-\[28px\], .bn-scope .text-\[30px\], .bn-scope .text-\[32px\] {
                    font-size: 20px !important;
                }
                .bn-scope .px-4 { padding-left: 12px !important; padding-right: 12px !important; }
                .bn-scope .gap-3 { gap: 0.5rem !important; }
                .bn-scope .gap-4 { gap: 0.625rem !important; }
            }

            /* Foldable landscape/inner (kengaytirilgan ekran — tablet o'lchami) —
               desktop grid'lar buzilmasin, faqat qulay padding qo'llash. */
            @media (min-width: 720px) and (max-width: 1023px) and (orientation: landscape) {
                .bn-scope .bn-fold-open { max-width: 900px; margin-left: auto; margin-right: auto; }
            }

            /* iPhone/iPad safe-area — bottom navbar va ortga tugmasi uchun */
            .bn-scope { padding-top: env(safe-area-inset-top); }

            /* iOS Safari: rangli tugmalar clickda tebranib qolmasligi */
            .bn-scope button, .bn-scope a { -webkit-tap-highlight-color: transparent; }

            /* Juda uzun bir so'zli matnlarni sindirish (sarlavhalar 320px'da mos tushishi) */
            .bn-scope h1, .bn-scope h2 { overflow-wrap: break-word; word-break: break-word; }
        `}</style>
    );
}

/** Jonli gradient fon — sahifa ortida sekin harakatlanadi */
export function BnAurora() {
    return (
        <div className="bn-aurora" aria-hidden="true">
            <span /><span /><span />
        </div>
    );
}
