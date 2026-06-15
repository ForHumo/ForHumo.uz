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

    // ── Jamoalar ──
    "team.create": ["Jamoa yaratish", "Создать команду", "Create team"],
    "team.byCode": ["Kod bilan", "По коду", "With code"],
    "team.new": ["Yangi jamoa", "Новая команда", "New team"],
    "team.namePh": ["Jamoa nomi", "Название команды", "Team name"],
    "team.tagPh": ["Teg (masalan RMC)", "Тег (напр. RMC)", "Tag (e.g. RMC)"],
    "team.bioPh": ["Qisqa tavsif (ixtiyoriy)", "Краткое описание (необязательно)", "Short bio (optional)"],
    "team.createBtn": ["Yaratish", "Создать", "Create"],
    "team.joinTitle": ["Taklif-kod bilan qo'shilish", "Присоединиться по коду", "Join with invite code"],
    "team.codePh": ["KOD", "КОД", "CODE"],
    "team.joinBtn": ["Qo'shilish", "Присоединиться", "Join"],
    "team.none": ["Hali jamoa yo'q", "Команд пока нет", "No teams yet"],
    "team.mine": ["Mening jamoam", "Моя команда", "My team"],
    "team.members": ["a'zo", "участн.", "members"],
    "team.noRoster": ["Tarkib yo'q", "Нет состава", "No roster"],
    "team.nameMin": ["Jamoa nomi kamida 2 belgi", "Название минимум 2 символа", "Name min 2 characters"],
    "team.tagRule": ["Teg 2-5 ta lotin harf/raqam", "Тег 2-5 латинских букв/цифр", "Tag 2-5 latin chars/digits"],
    "team.codeReq": ["Kod kiriting", "Введите код", "Enter code"],

    // ── Turnirlar ──
    "tour.none": ["Hali turnir yo'q", "Турниров пока нет", "No tournaments yet"],
    "tour.soon": ["Tez orada birinchi turnir e'lon qilinadi.", "Скоро будет объявлен первый турнир.", "First tournament announced soon."],
    "tour.reg": ["Ro'yxat", "Регистрация", "Registration"],
    "tour.auto": ["Avtomatik qatnashuv (ro'yxatsiz)", "Автоматическое участие (без регистрации)", "Auto participation (no registration)"],
    "tour.archive": ["Arxiv — o'tgan turnirlar", "Архив — прошедшие турниры", "Archive — past tournaments"],
    "tour.watch": ["Tomosha", "Смотреть", "Watch"],

    // ── Divizionlar (jadval) ──
    "stand.active": ["faol", "активный", "active"],
    "stand.none": ["Hali jadval yo'q", "Таблицы пока нет", "No standings yet"],
    "stand.noneHint": ["Mavsum boshlanganda divizionlar bu yerda ko'rinadi.", "Дивизионы появятся с началом сезона.", "Divisions appear when the season starts."],
    "stand.colTeam": ["Jamoa", "Команда", "Team"],
    "stand.colP": ["O", "И", "P"],
    "stand.colW": ["G", "В", "W"],
    "stand.colL": ["M", "П", "L"],
    "stand.colPts": ["Ochko", "Очки", "Pts"],
    "stand.divEmpty": ["Bu divizionda jamoa yo'q", "В этом дивизионе нет команд", "No teams in this division"],
    "stand.promo": ["ko'tariladi", "повышение", "promotion"],
    "stand.releg": ["tushadi", "понижение", "relegation"],
    "stand.stay": ["qoladi", "остаётся", "stays"],

    // ── Transfer ──
    "tr.title": ["Transfer bozori", "Трансферный рынок", "Transfer market"],
    "tr.sub": ["Barcha kibersportchilar — kartani bosib to'liq ma'lumot", "Все киберспортсмены — нажмите для подробностей", "All athletes — tap a card for details"],
    "tr.search": ["Nickname yoki jamoa bo'yicha qidirish", "Поиск по нику или команде", "Search by nickname or team"],
    "tr.notFound": ["Hech narsa topilmadi", "Ничего не найдено", "Nothing found"],
    "tr.empty": ["Hali kibersportchi yo'q", "Киберспортсменов пока нет", "No athletes yet"],
    "tr.offers": ["Transfer takliflari", "Трансферные предложения", "Transfer offers"],
    "tr.accept": ["Qabul", "Принять", "Accept"],
    "tr.reject": ["Rad", "Отклонить", "Reject"],
    "tr.cancel": ["Bekor", "Отмена", "Cancel"],
    "tr.send": ["Yuborish", "Отправить", "Send"],
    "tr.sell": ["Sotish", "Продать", "Sell"],

    // ── O'yinchi kartasi (athlete-profile) ──
    "ap.card": ["Sportchi kartasi", "Карта игрока", "Player card"],
    "ap.notFound": ["Sportchi topilmadi", "Игрок не найден", "Player not found"],
    "ap.curElo": ["Joriy Elo", "Текущий Elo", "Current Elo"],
    "ap.maxElo": ["Maksimal Elo", "Максимальный Elo", "Peak Elo"],
    "ap.minElo": ["Minimal Elo", "Минимальный Elo", "Lowest Elo"],
    "ap.wins": ["G'alaba", "Победы", "Wins"],
    "ap.losses": ["Mag'lubiyat", "Поражения", "Losses"],
    "ap.games": ["O'yinlar", "Матчи", "Matches"],
    "ap.inEsport": ["eSportda", "в киберспорте", "in esports"],
    "ap.offerBtn": ["Transfer taklifi yuborish", "Отправить предложение", "Send transfer offer"],
    "ap.offerTitle": ["O'yinchiga taklif", "Предложение игроку", "Offer to player"],
    "ap.salaryPh": ["Oylik maosh (so'm)", "Зарплата в месяц (сум)", "Monthly salary (UZS)"],
    "ap.monthsPh": ["Shartnoma muddati (oy)", "Срок контракта (мес.)", "Contract length (months)"],
    "ap.condPh": ["Qo'shimcha shartlar (ixtiyoriy)", "Доп. условия (необязательно)", "Extra conditions (optional)"],
    "ap.sent": ["Taklif o'yinchiga yuborildi", "Предложение отправлено игроку", "Offer sent to player"],
    "ap.pickTeam": ["Jamoa tanlang", "Выберите команду", "Select a team"],
    "ap.freeAthlete": ["Erkin sportchi (jamoasiz)", "Свободный игрок (без команды)", "Free agent (no team)"],
    "ap.ingameId": ["In-game ID", "Игровой ID", "In-game ID"],
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
