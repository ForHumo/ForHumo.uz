"use client";
import { useLocale } from "next-intl";

// Humo eSport i18n — yagona lug'at (uz / ru / en). Komponentlar useEsT() bilan t("kalit") ishlatadi.
// Tartib: [uz, ru, en]
const DICT: Record<string, [string, string, string]> = {
    // ── Navbar ──
    "nav.home": ["Asosiy", "Главная", "Home"],
    "nav.athlete": ["Sportchi", "Игрок", "Athlete"],
    "nav.teams": ["Jamoalar", "Команды", "Teams"],
    "nav.tournaments": ["Turnirlar", "Турниры", "Tournaments"],
    "nav.divisions": ["Divizionlar", "Дивизионы", "Divisions"],
    "nav.transfer": ["Transfer", "Трансфер", "Transfer"],
    "nav.admin": ["Admin", "Админ", "Admin"],
    "nav.notifications": ["Bildirishnomalar", "Уведомления", "Notifications"],
    "nav.noNotif": ["Bildirishnoma yo'q", "Нет уведомлений", "No notifications"],
    "nav.markAll": ["Hammasi o'qildi", "Прочитать всё", "Mark all read"],

    // ── Umumiy ──
    "common.free": ["Erkin", "Свободный", "Free agent"],
    "common.notset": ["Belgilanmagan", "Не указано", "Not set"],
    "common.team": ["jamoa", "команда", "team"],
    "common.add": ["Qo'shish", "Добавить", "Add"],
    "common.publish": ["E'lon qilish", "Опубликовать", "Publish"],
    "common.title": ["Sarlavha", "Заголовок", "Title"],
    "common.text": ["Matn (ixtiyoriy)", "Текст (необязательно)", "Text (optional)"],

    // ── Status ──
    "st.upcoming": ["Tez orada", "Скоро", "Upcoming"],
    "st.registration": ["Ro'yxat ochiq", "Регистрация открыта", "Registration open"],
    "st.live": ["Jonli", "В эфире", "Live"],
    "st.ended": ["Tugagan", "Завершён", "Ended"],

    // ── Asosiy (home) ──
    "home.subtitle": ["Kibersport arenasi — turnirlar, divizionlar, transferlar va jonli efir", "Киберспортивная арена — турниры, дивизионы, трансферы и прямой эфир", "Esports arena — tournaments, divisions, transfers and live broadcast"],
    "home.broadcast": ["Turnir efiri", "Эфир турнира", "Tournament broadcast"],
    "home.news": ["Yangiliklar", "Новости", "News"],
    "home.newsAdd": ["Yangilik qo'shish", "Добавить новость", "Add news"],
    "home.noNews": ["Hozircha yangilik yo'q", "Пока нет новостей", "No news yet"],
    "home.tournaments": ["Turnirlar", "Турниры", "Tournaments"],
    "home.noTournaments": ["Hozircha turnir yo'q", "Пока нет турниров", "No tournaments yet"],
    "home.topTeams": ["Eng kuchli jamoalar", "Сильнейшие команды", "Top teams"],
    "home.noRating": ["Hali reyting yo'q", "Рейтинга пока нет", "No ratings yet"],
    "home.topPlayers": ["Eng kuchli o'yinchilar", "Сильнейшие игроки", "Top players"],
    "home.noPlayers": ["Hali o'yinchi yo'q", "Игроков пока нет", "No players yet"],
    "home.expPlayers": ["Eng qimmat o'yinchilar", "Самые дорогие игроки", "Most valuable players"],
    "home.expTeams": ["Eng qimmat jamoalar", "Самые дорогие команды", "Most valuable teams"],
    "home.noValue": ["Hali narx belgilanmagan", "Цена пока не указана", "No values set"],
    "home.upcoming": ["Bo'lajak o'yinlar", "Предстоящие матчи", "Upcoming matches"],
    "home.results": ["So'nggi natijalar", "Последние результаты", "Recent results"],
    "home.noMatches": ["Hali o'yin o'tkazilmagan", "Матчей пока не было", "No matches yet"],
    "home.newsBadge": ["Yangilik", "Новость", "News"],
    "home.autoBadge": ["Avto", "Авто", "Auto"],
};

export type EsT = (key: string, fallback?: string) => string;

export function useEsT(): EsT {
    const locale = useLocale();
    const i = locale === "ru" ? 1 : locale === "en" ? 2 : 0;
    return (key: string, fallback?: string) => {
        const e = DICT[key];
        return e ? e[i] : (fallback ?? key);
    };
}
