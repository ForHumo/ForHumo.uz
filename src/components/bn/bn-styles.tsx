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

            /* ── Jonli fon: sekin suzuvchi gradient sharlar ── */
            .bn-aurora {
                position: fixed;
                inset: 0;
                z-index: 0;
                pointer-events: none;
                overflow: hidden;
            }
            .bn-aurora span {
                position: absolute;
                border-radius: 9999px;
                filter: blur(90px);
                will-change: transform;
            }
            .bn-aurora span:nth-child(1) {
                width: 52vw; height: 52vw;
                top: -18vw; left: -12vw;
                background: var(--bn-orb-1);
                animation: bn-float-a 26s ease-in-out infinite;
            }
            .bn-aurora span:nth-child(2) {
                width: 44vw; height: 44vw;
                top: 22vh; right: -14vw;
                background: var(--bn-orb-2);
                animation: bn-float-b 32s ease-in-out infinite;
            }
            .bn-aurora span:nth-child(3) {
                width: 38vw; height: 38vw;
                bottom: -14vw; left: 28vw;
                background: var(--bn-orb-3);
                animation: bn-float-c 38s ease-in-out infinite;
            }

            @keyframes bn-float-a {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33%      { transform: translate(6vw, 5vh) scale(1.12); }
                66%      { transform: translate(-3vw, 9vh) scale(0.94); }
            }
            @keyframes bn-float-b {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50%      { transform: translate(-7vw, -6vh) scale(1.15); }
            }
            @keyframes bn-float-c {
                0%, 100% { transform: translate(0, 0) scale(1); }
                40%      { transform: translate(5vw, -7vh) scale(1.08); }
                75%      { transform: translate(-6vw, -2vh) scale(0.96); }
            }

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
