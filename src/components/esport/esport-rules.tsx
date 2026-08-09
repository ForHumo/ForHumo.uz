"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft, ScrollText } from "lucide-react";

type Tri = [string, string, string];
interface Section { title: Tri; items: Tri[] }

// Nizom kodga aniq mos (Elo −16/−4, mukofot 60/25/15, roster lock, e'tiroz, kvartal turnirlar).
const RULES: Section[] = [
    {
        title: ["Umumiy", "Общие положения", "General"],
        items: [
            ["Humo eSport — Humo ID identitetiga qurilgan musobaqa ekotizimi (MLBB va boshqa disiplinalar).", "Humo eSport — соревновательная экосистема на базе Humo ID (MLBB и другие дисциплины).", "Humo eSport is a competitive ecosystem built on Humo ID (MLBB and other titles)."],
            ["Ishtirok faqat haqiqiy Humo ID hisobi bilan; har bir sportchi va jamoa ushbu nizomga rozi bo'ladi.", "Участие только с реальным аккаунтом Humo ID; каждый игрок и команда принимают этот регламент.", "Participation requires a real Humo ID account; every player and team accepts these regulations."],
        ],
    },
    {
        title: ["Sportchi va jamoa", "Игрок и команда", "Player and team"],
        items: [
            ["Bir Humo ID = bitta sportchi profili; tanlangan o'yin o'zgarmaydi.", "Один Humo ID = один профиль игрока; выбранная игра не меняется.", "One Humo ID = one athlete profile; the chosen game is immutable."],
            ["Nickname va o'yin ID raqami noyob bo'lishi shart.", "Никнейм и игровой ID должны быть уникальны.", "Nickname and in-game ID must be unique."],
            ["Bitta odam — bitta jamoa (ega yoki a'zo). Jamoa nomi va tegi noyob.", "Один человек — одна команда (владелец или участник). Название и тег команды уникальны.", "One person — one team (owner or member). Team name and tag are unique."],
        ],
    },
    {
        title: ["Mavsum va turnirlar", "Сезон и турниры", "Season and tournaments"],
        items: [
            ["Yilda 4 ta kvartal turnir: Kuz (16–28 noyabr), Qish (16–28 fevral), Bahor (16–28 may), Yoz (16–28 avgust — Grand Final).", "4 квартальных турнира в год: Осень (16–28 ноя), Зима (16–28 фев), Весна (16–28 мая), Лето (16–28 авг — Гранд-финал).", "Four quarterly tournaments a year: Autumn (Nov 16–28), Winter (Feb 16–28), Spring (May 16–28), Summer (Aug 16–28 — Grand Final)."],
            ["Turnir nomlari tarjima qilinmaydi — barcha tillarda bir xil yoziladi.", "Названия турниров не переводятся — одинаковы на всех языках.", "Tournament names are not translated — identical in all languages."],
        ],
    },
    {
        title: ["Divizionlar", "Дивизионы", "Divisions"],
        items: [
            ["Pro / Division 1 / Division 2 — avtomatik qatnashadi, ro'yxat shart emas.", "Pro / Division 1 / Division 2 — участвуют автоматически, регистрация не требуется.", "Pro / Division 1 / Division 2 — auto-participate, no registration needed."],
            ["Ochiq divizion — har turnirga belgilangan oynada ro'yxatdan o'tiladi.", "Открытый дивизион — регистрация на каждый турнир в установленное окно.", "Open Division — register for each tournament within the set window."],
            ["Mavsum yakunida har divizionдан eng yaxshi 3 jamoa yuqoriga ko'tariladi, eng pastki 3 jamoa tushadi.", "По итогам сезона 3 лучшие команды дивизиона повышаются, 3 худшие понижаются.", "At season end the top 3 teams of each division are promoted and the bottom 3 relegated."],
        ],
    },
    {
        title: ["Tarkib qulfi (roster lock)", "Блокировка состава", "Roster lock"],
        items: [
            ["Turnir setkasi tuzilгач, qatnashayotgan jamoa tarkibi qulflanadi.", "После формирования сетки состав участвующей команды блокируется.", "Once the bracket is generated, a participating team's roster is locked."],
            ["Qulф davrida transfer, jamoaga qo'shilish/chiqish/chiqarish va jamoani o'chirish mumkin emas — turnir tugagач ochiladi.", "Во время блокировки запрещены трансфер, вступление/выход/исключение и удаление команды — открывается после турнира.", "During the lock, transfers, join/leave/kick and team deletion are blocked — reopened after the tournament."],
        ],
    },
    {
        title: ["Reyting (Elo)", "Рейтинг (Elo)", "Rating (Elo)"],
        items: [
            ["Har jamoa 1000 reytingdan boshlaydi; natijalar reytingni avtomatik o'zgartiradi.", "Каждая команда начинает с 1000; результаты автоматически меняют рейтинг.", "Every team starts at 1000; results adjust the rating automatically."],
            ["Teng raqibga mag'lubiyat ~−16, kuchliroq raqibga mag'lubiyat ~−4 (K=32).", "Поражение равному ~−16, более сильному ~−4 (K=32).", "Losing to an equal opponent ~−16, to a stronger one ~−4 (K=32)."],
            ["Turnir setkasi reyting bo'yicha seed qilinadi — kuchlilar finalgача uchrashmaydi.", "Сетка турнира сеется по рейтингу — сильнейшие не встречаются до финала.", "The bracket is seeded by rating — top teams don't meet before the final."],
        ],
    },
    {
        title: ["Setka", "Сетка", "Bracket"],
        items: [
            ["Single-elimination (bir mag'lubiyatда chiqib ketish) + 3-o'rin uchun o'yin.", "Single-elimination (на выбывание) + матч за 3-е место.", "Single-elimination + a third-place match."],
        ],
    },
    {
        title: ["Transfer", "Трансфер", "Transfer"],
        items: [
            ["Futbol modeli: jamoa o'yinchiga oylik taklif yuboradi → o'yinchi qabul qiladi → xaridor jamoa sotuvchi jamoaga haq taklif qiladi → qabul qilinsa For Pay orqali to'lov.", "Футбольная модель: команда предлагает игроку зарплату → игрок принимает → клуб-покупатель предлагает отступные клубу-продавцу → при согласии оплата через For Pay.", "Football model: a team offers the player a salary → player accepts → buying club offers a fee to the selling club → on agreement, payment via For Pay."],
            ["Transfer haqi transfermarket narxidan kam bo'lmaydi; narxni admin/ega belgilaydi.", "Отступные не ниже трансферной стоимости; цену устанавливает админ/владелец.", "The fee is not below the market value; the price is set by an admin/owner."],
            ["Jamoa egasini transfer qilib bo'lmaydi — avval egalik o'tkazilsin yoki jamoa o'chirilsin.", "Владельца команды нельзя трансферить — сначала передать владение или удалить команду.", "A team owner cannot be transferred — first transfer ownership or delete the team."],
        ],
    },
    {
        title: ["Natija va e'tiroz", "Результат и спор", "Result and dispute"],
        items: [
            ["Natijani administrator kiritadi va isbot skrinshotini biriktiradi.", "Результат вносит администратор и прикрепляет скриншот-доказательство.", "Results are entered by an administrator with a proof screenshot attached."],
            ["O'yinda qatnashgan jamoa egasi yakunlangan natijaga e'tiroz bildirishi mumkin (sabab + dalil).", "Владелец участвовавшей команды может оспорить итоговый результат (причина + доказательство).", "A participating team owner may dispute a finalized result (reason + evidence)."],
            ["E'tirozni hakam (administrator/ega) ko'rib chiqadi; hakam qarori yakuniy.", "Спор рассматривает судья (администратор/владелец); решение судьи окончательно.", "A judge (admin/owner) reviews the dispute; the judge's decision is final."],
        ],
    },
    {
        title: ["Mukofot", "Призовые", "Prize"],
        items: [
            ["Yutuq fondi g'oliblarga: 1-o'rin 60%, 2-o'rin 25%, 3-o'rin 15% — For Pay orqali to'lanadi.", "Призовой фонд победителям: 1-е место 60%, 2-е 25%, 3-е 15% — через For Pay.", "Prize pool to winners: 1st 60%, 2nd 25%, 3rd 15% — paid via For Pay."],
        ],
    },
    {
        title: ["Xulq-atvor", "Поведение", "Conduct"],
        items: [
            ["Cheat, smurf (soxta hisob), til biriktirish va haqorat qat'iyan taqiqlanadi.", "Читы, смурфинг, сговор и оскорбления строго запрещены.", "Cheating, smurfing, collusion and abuse are strictly prohibited."],
            ["Buzilganда diskvalifikatsiya yoki boshqa jazo qo'llaniladi.", "За нарушение — дисквалификация или иное наказание.", "Violations lead to disqualification or other penalties."],
        ],
    },
    {
        title: ["Efir", "Трансляция", "Broadcast"],
        items: [
            ["Turnir o'yinlari jonli efirда (sayt ichida) ko'rsatiladi.", "Матчи турнира показываются в прямом эфире (на сайте).", "Tournament matches are shown live (on the site)."],
        ],
    },
];

const HEAD: Tri = ["Turnir nizomi", "Регламент турнира", "Tournament regulations"];
const SUB: Tri = ["Humo eSport rasmiy qoidalari", "Официальные правила Humo eSport", "Official Humo eSport rules"];

export default function EsportRules() {
    const locale = useLocale();
    const i = locale === "ru" ? 1 : locale === "en" ? 2 : 0;
    return (
        <main className="min-h-full">
            <div className="mx-auto w-full max-w-3xl px-5 py-8">
                <div className="mb-4 flex items-center gap-3">
                    <Link href="/esport/tournaments" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}><ArrowLeft className="h-4 w-4 es-fg" /></Link>
                    <span className="text-sm font-bold es-mut">{SUB[i]}</span>
                </div>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl es-accent-bg"><ScrollText className="h-6 w-6 text-white" /></div>
                    <h1 className="text-2xl font-black es-fg">{HEAD[i]}</h1>
                </div>

                <div className="space-y-3">
                    {RULES.map((s, idx) => (
                        <section key={idx} className="rounded-3xl p-5 es-card">
                            <p className="mb-2 flex items-center gap-2 text-sm font-black es-accent-text">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-black text-white es-accent-bg">{idx + 1}</span>
                                {s.title[i]}
                            </p>
                            <ul className="space-y-1.5">
                                {s.items.map((it, j) => (
                                    <li key={j} className="flex gap-2 text-xs leading-relaxed es-mut">
                                        <span className="es-accent-text">•</span><span>{it[i]}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </main>
    );
}
