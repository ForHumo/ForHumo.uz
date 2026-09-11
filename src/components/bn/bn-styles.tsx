"use client";

// Bozor Narxida — premium dizayn tizimi ("Tilla luxury").
// Yo'nalish: O'zbek milliy tilla (zar) hashamati — logo'dagi antique gold
// gradient (B qora/oq + N tilla) asos qilib olingan.
//
//   Kunduzgi (Ivory & Gold): issiq ivory/parchment fon, boy antique tilla accent.
//   Tungi (Midnight Registan): chuqur issiq charcoal, yorqin shampan tillasi porlaydi.
//
// next-themes `<html class="dark">` qo'yadi; biz shunga bog'lanamiz.
// Komponentlarda hex yozilmaydi — doim BN.* (bn-theme.ts) ishlatiladi.

export function BnStyles() {
    return (
        <style jsx global>{`
            .bn-scope {
                /* ── KUNDUZGI — Ivory & Gold ─────────────────────────────
                   Boy antique tilla (logo o'rta toni), issiq parchment fon. */
                --bn-gold:        #9E7A1E;
                --bn-gold-light:  #C29A2E;
                --bn-gold-dark:   #6E5312;
                --bn-gold-soft:   rgba(158, 122, 30, 0.09);
                --bn-gold-edge:   rgba(158, 122, 30, 0.30);
                --bn-gold-grad:   linear-gradient(135deg, #C9A63C 0%, #A67C1A 48%, #7A5A12 100%);
                --bn-gold-sheen:  linear-gradient(105deg, #B98E24 0%, #E2C766 45%, #A67C1A 100%);

                --bn-bg:          #F7F1E5;
                --bn-surface:     #FFFDF8;
                --bn-surface-up:  #F1E9D7;
                --bn-surface-top: #E8DDC7;

                --bn-border:      rgba(74, 58, 22, 0.12);
                --bn-border-gold: rgba(158, 122, 30, 0.32);

                --bn-text:        #1B1610;
                --bn-text-2:      #5A5041;
                --bn-text-3:      #94886F;
                --bn-on-gold:     #FFFDF8;

                --bn-ok:          #15803D;
                --bn-ok-soft:     rgba(21, 128, 61, 0.10);
                --bn-warn:        #B45309;
                --bn-warn-soft:   rgba(180, 83, 9, 0.10);
                --bn-err:         #B21F1F;
                --bn-err-soft:    rgba(178, 31, 31, 0.10);
                --bn-info:        #1D4ED8;

                --bn-glass:       rgba(255, 253, 246, 0.74);
                --bn-shadow:      0 1px 2px rgba(74, 58, 22, 0.06), 0 10px 34px rgba(74, 58, 22, 0.10);
                --bn-shadow-gold: 0 6px 24px rgba(158, 122, 30, 0.22);

                /* Jonli fon orbitlari (issiq tilla) */
                --bn-orb-1:       rgba(201, 166, 60, 0.16);
                --bn-orb-2:       rgba(180, 140, 50, 0.11);
                --bn-orb-3:       rgba(158, 122, 30, 0.09);

                background: var(--bn-bg);
                color: var(--bn-text);
                color-scheme: light;
                font-family: var(--bn-font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                -webkit-font-smoothing: antialiased;
                text-rendering: optimizeLegibility;
                font-feature-settings: "cv11", "ss01";
            }

            /* ── TUNGI — Midnight Registan ───────────────────────────────
               Chuqur issiq charcoal, yorqin shampan tillasi (logo yuqori toni). */
            .dark .bn-scope {
                --bn-gold:        #E6C56A;
                --bn-gold-light:  #F3DB93;
                --bn-gold-dark:   #B8933B;
                --bn-gold-soft:   rgba(230, 197, 106, 0.10);
                --bn-gold-edge:   rgba(230, 197, 106, 0.26);
                --bn-gold-grad:   linear-gradient(135deg, #F0D585 0%, #D9B450 46%, #A9822B 100%);
                --bn-gold-sheen:  linear-gradient(105deg, #C9A63C 0%, #F4DD8E 45%, #C9A63C 100%);

                --bn-bg:          #15120B;
                --bn-surface:     #1F1B12;
                --bn-surface-up:  #2A2417;
                --bn-surface-top: #362E1E;

                --bn-border:      rgba(230, 197, 106, 0.11);
                --bn-border-gold: rgba(230, 197, 106, 0.28);

                --bn-text:        #F6F0E2;
                --bn-text-2:      #B7AD95;
                --bn-text-3:      #877D68;
                --bn-on-gold:     #1A1409;

                --bn-ok:          #58C87E;
                --bn-ok-soft:     rgba(88, 200, 126, 0.12);
                --bn-warn:        #E5B04A;
                --bn-warn-soft:   rgba(229, 176, 74, 0.12);
                --bn-err:         #EF8B80;
                --bn-err-soft:    rgba(239, 139, 128, 0.12);
                --bn-info:        #78A6F5;

                --bn-glass:       rgba(24, 20, 13, 0.72);
                --bn-shadow:      0 1px 2px rgba(0, 0, 0, 0.40), 0 14px 44px rgba(0, 0, 0, 0.52);
                --bn-shadow-gold: 0 8px 30px rgba(230, 197, 106, 0.18);

                --bn-orb-1:       rgba(230, 197, 106, 0.10);
                --bn-orb-2:       rgba(184, 147, 59, 0.08);
                --bn-orb-3:       rgba(120, 95, 40, 0.09);

                color-scheme: dark;
            }

            /* ── Tipografiya ─────────────────────────────────────────────
               Body: Manrope. Display serif (Playfair): sahifa H1 + .bn-display.
               Funksional UI sarlavhalari (h2/h3) toza sans'da qoladi. */
            .bn-scope h1,
            .bn-scope .bn-display {
                font-family: var(--bn-font-display), "Playfair Display", Georgia, "Times New Roman", serif;
                letter-spacing: -0.01em;
                font-feature-settings: "lnum", "kern";
            }
            .bn-scope .bn-display-sans {
                font-family: var(--bn-font-body), system-ui, sans-serif !important;
            }
            /* Narxlar/raqamlar — tabular, tekis ustunlar */
            .bn-scope .tabular-nums,
            .bn-scope .bn-num {
                font-variant-numeric: tabular-nums lining-nums;
                font-feature-settings: "tnum", "lnum";
            }
            /* Kirill (ru) — display serif'da biroz kengroq oraliq, o'qishga qulay */
            .bn-scope:lang(ru) h1,
            .bn-scope:lang(ru) .bn-display,
            [lang="ru"] .bn-scope h1,
            [lang="ru"] .bn-scope .bn-display {
                letter-spacing: 0.005em;
            }

            /* Tilla gradient matn (logo N kabi) — sarlavha aksenti uchun */
            .bn-gold-text {
                background: var(--bn-gold-sheen);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
            }
            /* Tilla gradient fon (premium tugma/aksent) */
            .bn-gold-grad {
                background: var(--bn-gold-grad);
                color: var(--bn-on-gold);
            }
            /* Nozik tilla porlash chizig'i (kartochka tepasida) */
            .bn-hairline-gold {
                background: linear-gradient(90deg, transparent, var(--bn-gold-edge) 20%, var(--bn-gold) 50%, var(--bn-gold-edge) 80%, transparent);
            }

            /* Matn belgilash (selection) — tilla */
            .bn-scope ::selection {
                background: var(--bn-gold-soft);
                color: var(--bn-gold-dark);
            }
            .dark .bn-scope ::selection {
                color: var(--bn-gold-light);
            }

            /* Fokus halqasi — tilla, refined (klaviatura navigatsiyasi) */
            .bn-scope :focus-visible {
                outline: 2px solid var(--bn-gold);
                outline-offset: 2px;
                border-radius: 6px;
            }

            /* Nozik skrollbar — tilla */
            .bn-scope ::-webkit-scrollbar { width: 10px; height: 10px; }
            .bn-scope ::-webkit-scrollbar-track { background: transparent; }
            .bn-scope ::-webkit-scrollbar-thumb {
                background: var(--bn-gold-edge);
                border-radius: 999px;
                border: 3px solid transparent;
                background-clip: content-box;
            }
            .bn-scope ::-webkit-scrollbar-thumb:hover { background: var(--bn-gold); background-clip: content-box; }

            /* ── Atmosfera — Aurora (GPU-only) ───────────────────────────
               Issiq tilla orbitlar. contain:strict + will-change:transform +
               faqat translate3d → compositor-only, main thread 0% band. */
            .bn-aurora {
                position: fixed;
                inset: 0;
                z-index: 0;
                pointer-events: none;
                overflow: hidden;
                contain: strict;
            }
            .bn-aurora span {
                position: absolute;
                border-radius: 50%;
                filter: blur(64px);
                opacity: 0.9;
                will-change: transform;
                transform: translate3d(0, 0, 0);
                backface-visibility: hidden;
            }
            .bn-aurora span:nth-child(1) {
                width: 46vw; height: 46vw;
                left: -10vw; top: -10vw;
                background: var(--bn-orb-1);
                animation: bn-orb-a 34s ease-in-out infinite alternate;
            }
            .bn-aurora span:nth-child(2) {
                width: 40vw; height: 40vw;
                right: -12vw; top: 12vh;
                background: var(--bn-orb-2);
                animation: bn-orb-b 40s ease-in-out infinite alternate;
            }
            .bn-aurora span:nth-child(3) {
                width: 38vw; height: 38vw;
                left: 18vw; bottom: -14vw;
                background: var(--bn-orb-3);
                animation: bn-orb-c 46s ease-in-out infinite alternate;
            }
            /* Nozik "zar" don teksturasi — juda past opacity, faqat chuqurlik uchun */
            .bn-aurora::after {
                content: "";
                position: absolute;
                inset: 0;
                opacity: 0.025;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
            }
            @keyframes bn-orb-a {
                0%   { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(18vw, 12vh, 0); }
            }
            @keyframes bn-orb-b {
                0%   { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(-14vw, 18vh, 0); }
            }
            @keyframes bn-orb-c {
                0%   { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(12vw, -14vh, 0); }
            }
            @media (prefers-reduced-motion: reduce) {
                .bn-aurora span { animation: none !important; }
            }

            /* ── Umumiy input uslubi — premium fokus ── */
            .bn-input {
                width: 100%;
                height: 46px;
                border-radius: 13px;
                padding: 0 15px;
                font-size: 14px;
                outline: none;
                background: var(--bn-surface-up);
                border: 1px solid var(--bn-border);
                color: var(--bn-text);
                caret-color: var(--bn-gold);
                transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
            }
            .bn-input:focus {
                border-color: var(--bn-gold);
                box-shadow: 0 0 0 3px var(--bn-gold-soft);
                background: var(--bn-surface);
            }
            .bn-input::placeholder { color: var(--bn-text-3); }
            textarea.bn-input { height: auto; }

            /* Premium kartochka ko'tarilishi (hover) */
            .bn-lift {
                transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease;
            }
            .bn-lift:hover {
                transform: translateY(-3px);
                box-shadow: var(--bn-shadow);
            }

            /* Tilla "shimmer" — skeleton/yuklanish holati uchun */
            .bn-shimmer {
                background: linear-gradient(100deg, var(--bn-surface-up) 30%, var(--bn-gold-soft) 50%, var(--bn-surface-up) 70%);
                background-size: 200% 100%;
                animation: bn-shimmer 1.5s ease-in-out infinite;
            }
            @keyframes bn-shimmer {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            /* Sahifa yuklanishida yumshoq ko'tarilib chiqish (staggered reveal) */
            @keyframes bn-rise {
                from { opacity: 0; transform: translateY(10px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .bn-rise { animation: bn-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }

            /* Dropdown/popover ochilishi — yumshoq fade + tepadan sirg'alib chiqish.
               transform-origin tepada, GPU-only (opacity + transform). */
            @keyframes bn-pop {
                from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .bn-pop {
                animation: bn-pop 0.16s cubic-bezier(0.22, 1, 0.36, 1) both;
                transform-origin: top;
            }
            /* Toast — o'ngdan sirg'alib kirish */
            @keyframes bn-toast-in {
                from { opacity: 0; transform: translateX(24px) scale(0.96); }
                to   { opacity: 1; transform: translateX(0) scale(1); }
            }
            .bn-toast-in { animation: bn-toast-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }

            /* ── Modal animatsiyalari ────────────────────────────────────
               Qorong'i fon yumshoq paydo bo'ladi; panel markazda scale+fade
               (dialog) yoki pastdan sirg'aladi (bottom-sheet). GPU-only. */
            @keyframes bn-overlay-in {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            .bn-overlay-in { animation: bn-overlay-in 0.2s ease-out both; }

            @keyframes bn-panel-in {
                from { opacity: 0; transform: translateY(12px) scale(0.97); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .bn-panel-in { animation: bn-panel-in 0.26s cubic-bezier(0.22, 1, 0.36, 1) both; }

            @keyframes bn-sheet-in {
                from { opacity: 0; transform: translateY(28px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .bn-sheet-in { animation: bn-sheet-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }

            /* O'ngdan kiruvchi drawer (boost paneli kabi) */
            @keyframes bn-drawer-in {
                from { opacity: 0; transform: translateX(40px); }
                to   { opacity: 1; transform: translateX(0); }
            }
            .bn-drawer-in { animation: bn-drawer-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }

            @media (prefers-reduced-motion: reduce) {
                .bn-pop, .bn-rise, .bn-toast-in,
                .bn-overlay-in, .bn-panel-in, .bn-sheet-in, .bn-drawer-in { animation: none !important; }
            }

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
                box-shadow: 0 2px 8px rgba(0,0,0,0.28), 0 0 0 1px var(--bn-gold-edge);
                cursor: grab;
                margin-top: -7px;
                transition: transform 0.12s;
            }
            .bn-range::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.12); }
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
                box-shadow: 0 2px 8px rgba(0,0,0,0.28), 0 0 0 1px var(--bn-gold-edge);
                cursor: grab;
            }
            .bn-range::-moz-range-thumb:active { cursor: grabbing; transform: scale(1.12); }
            .bn-range:disabled { opacity: 0.5; cursor: not-allowed; }

            /* ── Mobil + foldable moslashuvi ─────────────────────────────
               iPhone Duo, Galaxy Fold, kichik cover ekranlar. */
            @media (max-width: 359px) {
                .bn-scope .bn-hide-xxs { display: none !important; }
                .bn-scope h1, .bn-scope .bn-h1 { font-size: 22px !important; line-height: 1.15 !important; }
                .bn-scope .text-\\[24px\\], .bn-scope .text-\\[26px\\], .bn-scope .text-\\[28px\\], .bn-scope .text-\\[30px\\], .bn-scope .text-\\[32px\\] {
                    font-size: 21px !important;
                }
                .bn-scope .px-4 { padding-left: 12px !important; padding-right: 12px !important; }
                .bn-scope .gap-3 { gap: 0.5rem !important; }
                .bn-scope .gap-4 { gap: 0.625rem !important; }
            }
            @media (min-width: 720px) and (max-width: 1023px) and (orientation: landscape) {
                .bn-scope .bn-fold-open { max-width: 900px; margin-left: auto; margin-right: auto; }
            }

            /* iPhone/iPad safe-area */
            .bn-scope { padding-top: env(safe-area-inset-top); }

            /* iOS Safari: tap highlight yo'q */
            .bn-scope button, .bn-scope a { -webkit-tap-highlight-color: transparent; }

            /* Uzun bir so'zli sarlavhalar 320px'da sindirilsin */
            .bn-scope h1, .bn-scope h2 { overflow-wrap: break-word; word-break: break-word; }
        `}</style>
    );
}

/** Jonli gradient fon — sahifa ortida sekin harakatlanadi (issiq tilla orbitlar) */
export function BnAurora() {
    return (
        <div className="bn-aurora" aria-hidden="true">
            <span /><span /><span />
        </div>
    );
}
