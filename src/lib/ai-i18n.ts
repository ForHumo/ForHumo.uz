// Humo AI moduli uchun til lug'ati (uz/ru/en).
// AI chat sahifasi next-intl'dan alohida — o'z aiLang holati bilan ishlaydi (javob tili + UI).
// Yangi UI matni qo'shsang shu yerga 3 tilda yoz va aiT(lang, key) bilan chaqir.
// {n} kabi o'rin egalari uchun aiTn(lang, key, n) ishlat.

export type AiLang = "uz" | "ru" | "en";

const DICT: Record<string, Record<AiLang, string>> = {
    // Badge'lar
    "badge.new":  { uz: "Yangi",     ru: "Новый",     en: "New" },
    "badge.soon": { uz: "Tez orada", ru: "Скоро",     en: "Soon" },
    "badge.free": { uz: "Bepul",     ru: "Бесплатно", en: "Free" },

    // Model tanlagich
    "model.title":       { uz: "AI model", ru: "ИИ-модель", en: "AI model" },
    "theme.light": { uz: "Tongi rejim", ru: "Светлая тема", en: "Light mode" },
    "theme.dark":  { uz: "Tungi rejim", ru: "Тёмная тема",  en: "Dark mode" },

    // Sozlamalar paneli
    "set.title":    { uz: "Sozlamalar", ru: "Настройки", en: "Settings" },
    "set.general":  { uz: "Umumiy",     ru: "Общие",     en: "General" },
    "set.theme":    { uz: "Mavzu",      ru: "Тема",      en: "Appearance" },
    "set.themeSystem": { uz: "Tizim",   ru: "Системная", en: "System" },
    "set.themeLight":  { uz: "Yorug'",  ru: "Светлая",   en: "Light" },
    "set.themeDark":   { uz: "Tungi",   ru: "Тёмная",    en: "Dark" },
    "set.language": { uz: "Til",        ru: "Язык",      en: "Language" },
    "set.voiceSec": { uz: "Ovoz",       ru: "Голос",     en: "Voice" },
    "set.ttsRead":  { uz: "Javobni ovozda o'qish", ru: "Озвучивать ответы", en: "Read answers aloud" },
    "set.voiceInput": { uz: "Mikrofon bilan kiritish", ru: "Голосовой ввод", en: "Voice input" },
    "set.data":     { uz: "Ma'lumotlar", ru: "Данные",   en: "Data" },
    "set.deleteChats":        { uz: "Barcha suhbatni o'chirish", ru: "Удалить все чаты", en: "Delete all chats" },
    "set.deleteChatsConfirm": { uz: "Barcha suhbatlaringiz butunlay o'chiriladi. Davom etamizmi?", ru: "Все ваши чаты будут удалены навсегда. Продолжить?", en: "All your chats will be permanently deleted. Continue?" },
    "set.eraseKb":  { uz: "Bilim to'plamini o'chirish", ru: "Очистить базу знаний", en: "Erase knowledge base" },
    "set.signOut":  { uz: "Chiqish",    ru: "Выйти",     en: "Sign out" },
    "model.premiumNote": {
        uz: "Premium modellar OpenRouter kaliti qo'shilganda ishlaydi",
        ru: "Премиум-модели заработают после добавления ключа OpenRouter",
        en: "Premium models activate once an OpenRouter key is added",
    },
    "model.soonHint": { uz: "Hozircha mavjud emas", ru: "Пока недоступно", en: "Not available yet" },
    // Model tavsiflari (ai-models.ts note'lari — dropdownda ko'rinadi, tilga moslanadi)
    "model.note.gemini-3.8-flash":      { uz: "Eng kuchli, bepul — default", ru: "Самая мощная, бесплатно — по умолчанию", en: "Most capable, free — default" },
    "model.note.gemini-2.5-flash-lite": { uz: "Eng tez, bepul",   ru: "Самая быстрая, бесплатно", en: "Fastest, free" },
    "model.note.gemini-2.5-flash":      { uz: "Bepul, barqaror",  ru: "Бесплатно, стабильно",    en: "Free, stable" },
    "model.note.deepseek/deepseek-chat":            { uz: "Kod+chat, juda arzon", ru: "Код+чат, очень дёшево", en: "Code+chat, very cheap" },
    "model.note.deepseek/deepseek-r1":              { uz: "Reasoning",          ru: "Рассуждения",   en: "Reasoning" },
    "model.note.openai/gpt-4o-mini":                { uz: "OpenAI",             ru: "OpenAI",        en: "OpenAI" },
    "model.note.openai/gpt-4o":                     { uz: "OpenAI (qimmat)",    ru: "OpenAI (дорого)", en: "OpenAI (pricey)" },
    "model.note.anthropic/claude-3.5-haiku":        { uz: "Anthropic, tez",     ru: "Anthropic, быстро", en: "Anthropic, fast" },
    "model.note.anthropic/claude-3.7-sonnet":       { uz: "Anthropic (kuchli)", ru: "Anthropic (мощно)", en: "Anthropic (powerful)" },
    "model.note.meta-llama/llama-3.3-70b-instruct": { uz: "Meta (ochiq)",       ru: "Meta (открытая)", en: "Meta (open)" },

    // Rejim sublari (label'lar brend nomi sifatida o'zgarmaydi: Chat Bot, Gen Code, ...)
    "mode.chat.sub":   { uz: "Oddiy suhbat",            ru: "Обычный чат",              en: "Everyday chat" },
    "mode.code.sub":   { uz: "Kod yozib berish",        ru: "Написание кода",           en: "Write code" },
    "mode.pic.sub":    { uz: "Rasm yaratish",           ru: "Создание изображений",     en: "Create images" },
    "mode.vid.sub":    { uz: "Video yaratish",          ru: "Создание видео",           en: "Create video" },
    "mode.music.sub":  { uz: "Musiqa yaratish",         ru: "Создание музыки",          en: "Create music" },
    "mode.cowork.sub": { uz: "Canvas — birga ishlash",  ru: "Canvas — совместная работа", en: "Canvas — work together" },
    "mode.soonTitleHint": {
        uz: "Tez orada — eng yaxshi model bilan ishga tushadi",
        ru: "Скоро — запустится с лучшей моделью",
        en: "Coming soon — launching with the best model",
    },

    // "+" menyu
    "plus.file":   { uz: "File biriktirish",    ru: "Прикрепить файл", en: "Attach file" },
    "plus.live":   { uz: "Humo Live",           ru: "Humo Live",       en: "Humo Live" },
    "plus.code":   { uz: "Kod yozish",          ru: "Написать код",    en: "Write code" },
    "plus.pic":    { uz: "Rasm yaratish",       ru: "Создать изображение", en: "Create image" },
    "plus.vid":    { uz: "Video yaratish",      ru: "Создать видео",   en: "Create video" },
    "plus.music":  { uz: "Musiqa yaratish",     ru: "Создать музыку",  en: "Create music" },
    "plus.cowork": { uz: "Humo CoWork",         ru: "Humo CoWork",     en: "Humo CoWork" },
    "plus.search": { uz: "Saytlardan qidirish", ru: "Поиск по сайтам", en: "Search the web" },
    "plus.think":  { uz: "Chuqur fikrlash",     ru: "Глубокое размышление", en: "Deep thinking" },

    // confirm / prompt
    "confirm.deleteChat": { uz: "Bu suhbatni butunlay o'chirasizmi?", ru: "Удалить этот чат навсегда?", en: "Delete this chat permanently?" },
    "confirm.deleteN": {
        uz: "{n} ta suhbat butunlay o'chiriladi. Davom etamizmi?",
        ru: "{n} чатов будут удалены навсегда. Продолжить?",
        en: "{n} chats will be permanently deleted. Continue?",
    },
    "prompt.copyLink":    { uz: "Havolani nusxa oling:", ru: "Скопируйте ссылку:", en: "Copy the link:" },
    "prompt.chatName":    { uz: "Chat nomi:", ru: "Название чата:", en: "Chat name:" },
    "confirm.unshare": {
        uz: "Ulashilgan havola o'chiriladi — havola bo'yicha kirganlar endi ko'ra olmaydi. Davom etamizmi?",
        ru: "Общая ссылка будет удалена — открывшие её больше не смогут просматривать. Продолжить?",
        en: "The shared link will be removed — anyone who had it can no longer view this. Continue?",
    },

    // auth
    "auth.signinDesc": {
        uz: "Chat tarixingizni saqlash va sizni yaxshi tanish uchun kiring.",
        ru: "Войдите, чтобы сохранять историю чатов и чтобы ИИ лучше вас узнал.",
        en: "Sign in to save your chat history and let the AI get to know you.",
    },
    "auth.google": { uz: "Google bilan kirish", ru: "Войти через Google", en: "Sign in with Google" },

    // "ishlash" holati
    "work.search": { uz: "Saytlardan qidiryapti", ru: "Ищет по сайтам",   en: "Searching the web" },
    "work.think":  { uz: "Chuqur o'ylayapti",     ru: "Глубоко размышляет", en: "Thinking deeply" },
    "work.code":   { uz: "Kod yozyapti",          ru: "Пишет код",        en: "Writing code" },
    "work.cowork": { uz: "Canvas tayyorlayapti",  ru: "Готовит Canvas",   en: "Preparing Canvas" },
    "work.default":{ uz: "O'ylayapti",            ru: "Думает",           en: "Thinking" },

    // umumiy
    "common.close":    { uz: "Yopish",      ru: "Закрыть",     en: "Close" },
    "common.cancel":   { uz: "Bekor",       ru: "Отмена",      en: "Cancel" },
    "common.select":   { uz: "Tanlash",     ru: "Выбрать",     en: "Select" },
    "common.delete":   { uz: "O'chirish",   ru: "Удалить",     en: "Delete" },
    "common.copy":     { uz: "Nusxa olish", ru: "Копировать",  en: "Copy" },
    "common.download": { uz: "Yuklab olish",ru: "Скачать",     en: "Download" },
    "common.edit":     { uz: "Tahrirlash",  ru: "Редактировать", en: "Edit" },

    // sidebar
    "sidebar.collapse":  { uz: "Panelni yig'ish", ru: "Свернуть панель",  en: "Collapse panel" },
    "sidebar.expand":    { uz: "Panelni ochish",  ru: "Развернуть панель", en: "Expand panel" },
    "sidebar.modes":     { uz: "Rejimlar",        ru: "Режимы",           en: "Modes" },
    "sidebar.chats":     { uz: "Chatlar",         ru: "Чаты",             en: "Chats" },
    "sidebar.newChat":   { uz: "Yangi chat",      ru: "Новый чат",        en: "New chat" },
    "sidebar.searchChat":{ uz: "Chat qidirish...",ru: "Поиск чата...",    en: "Search chats..." },
    "sidebar.noMatch":   { uz: "Mos chat topilmadi.", ru: "Чаты не найдены.", en: "No matching chats." },
    "sidebar.empty1":    { uz: "Hali suhbat yo'q.",   ru: "Пока нет чатов.",  en: "No chats yet." },
    "sidebar.empty2":    { uz: "Yangi chat bilan boshlang.", ru: "Начните с нового чата.", en: "Start a new chat." },
    "sidebar.knowledge": { uz: "Bilim to'plamim", ru: "Моя база знаний",  en: "My knowledge base" },

    // Profil paneli (AI ichida)
    "pp.humoId":   { uz: "Humo ID",       ru: "Humo ID",        en: "Humo ID" },
    "pp.email":    { uz: "Email",         ru: "Эл. почта",      en: "Email" },
    "pp.level":    { uz: "Daraja",        ru: "Уровень",        en: "Level" },
    "pp.location": { uz: "Joylashuv",     ru: "Местоположение", en: "Location" },
    "pp.bio":      { uz: "Bio",           ru: "О себе",         en: "Bio" },
    "pp.since":    { uz: "A'zo bo'lgan",  ru: "С нами с",       en: "Member since" },
    "pp.verified": { uz: "Tasdiqlangan",  ru: "Подтверждён",    en: "Verified" },
    "pp.founder":  { uz: "Asoschi",       ru: "Основатель",     en: "Founder" },
    "pp.editFull": { uz: "For Humo'da to'liq tahrirlash", ru: "Полностью изменить в For Humo", en: "Edit fully in For Humo" },
    "pp.empty":    { uz: "Profil ma'lumoti topilmadi.", ru: "Профиль не найден.", en: "Profile not found." },

    // Bilim to'plami paneli (AI ichida)
    "kbp.subtitle": {
        uz: "AI siz haqingizda eslab qolgan ma'lumotlar. Istalgan paytda o'chira olasiz.",
        ru: "Что ИИ запомнил о вас. Вы можете удалить в любой момент.",
        en: "What the AI has remembered about you. You can delete anytime.",
    },
    "kbp.empty":        { uz: "Hali hech narsa eslab qolinmagan.", ru: "Пока ничего не запомнено.", en: "Nothing remembered yet." },
    "kbp.eraseAll":     { uz: "Hammasini o'chirish", ru: "Удалить всё", en: "Erase all" },
    "kbp.eraseConfirm": { uz: "Barcha eslab qolingan ma'lumotlar o'chiriladi. Davom etamizmi?", ru: "Все запомненные данные будут удалены. Продолжить?", en: "All remembered data will be erased. Continue?" },
    "kbp.count":        { uz: "{n} ta ma'lumot", ru: "{n} фактов", en: "{n} facts" },
    "sidebar.profile":   { uz: "Profilim",        ru: "Мой профиль",      en: "My profile" },
    "sidebar.selectAll": { uz: "Hammasi",         ru: "Все",              en: "All" },
    "chat.msgWord":      { uz: "xabar",           ru: "сообщ.",           en: "messages" },
    "live.voiceTooltip": { uz: "Humo Live (ovozli)", ru: "Humo Live (голос)", en: "Humo Live (voice)" },

    // chat element amallari
    "item.reshare":   { uz: "Havolani qayta nusxalash", ru: "Скопировать ссылку снова", en: "Copy link again" },
    "item.share":     { uz: "Ulashish (havola nusxa)",  ru: "Поделиться (копия ссылки)", en: "Share (copy link)" },
    "item.unshare":   { uz: "Ulashishni bekor qilish",  ru: "Отменить доступ по ссылке", en: "Stop sharing" },
    "item.rename":    { uz: "Nomini o'zgartirish",      ru: "Переименовать",    en: "Rename" },
    "item.archive":   { uz: "Arxivlash",                ru: "Архивировать",     en: "Archive" },
    "item.unarchive": { uz: "Qayta faollashtir",        ru: "Разархивировать",  en: "Unarchive" },

    // header
    "header.home":   { uz: "For Humo'ga qaytish", ru: "Вернуться в For Humo", en: "Back to For Humo" },
    "header.conv":   { uz: "Suhbat",              ru: "Чат",                  en: "Chat" },

    // empty state
    "empty.welcome":     { uz: "Humo AI'ga xush kelibsiz", ru: "Добро пожаловать в Humo AI", en: "Welcome to Humo AI" },
    "empty.greet":       { uz: "Assalomu alaykum, {name}!", ru: "Здравствуйте, {name}!", en: "Hi, {name}!" },
    "empty.titlePic":    { uz: "Qanday rasm yarataylik?",  ru: "Какое изображение создадим?", en: "What image shall we create?" },
    "empty.titleCowork": { uz: "Nima yaratamiz?",          ru: "Что создадим?",              en: "What shall we create?" },
    "empty.titleChat":   { uz: "Bugun nima qilamiz?",      ru: "Чем займёмся сегодня?",      en: "What shall we do today?" },

    // taklif kartalari — rasm
    "sugg.pic.landscape.t": { uz: "Manzara",   ru: "Пейзаж",    en: "Landscape" },
    "sugg.pic.landscape.s": { uz: "Tabiat/shahar", ru: "Природа/город", en: "Nature/city" },
    "sugg.pic.landscape.p": { uz: "Toshkent kunbotishida, iliq ranglar, yuqori sifat", ru: "Ташкент на закате, тёплые тона, высокое качество", en: "Tashkent at sunset, warm colors, high quality" },
    "sugg.pic.portrait.t":  { uz: "Portret",   ru: "Портрет",   en: "Portrait" },
    "sugg.pic.portrait.s":  { uz: "Personaj",  ru: "Персонаж",  en: "Character" },
    "sugg.pic.portrait.p":  { uz: "kelajak jangchisi portreti, kinematik yorug'lik", ru: "портрет воина будущего, кинематографический свет", en: "portrait of a future warrior, cinematic lighting" },
    "sugg.pic.logo.t":      { uz: "Logo",      ru: "Логотип",   en: "Logo" },
    "sugg.pic.logo.s":      { uz: "Brend/ikon",ru: "Бренд/иконка", en: "Brand/icon" },
    "sugg.pic.logo.p":      { uz: "minimalist logo, moviy gradient, texnologiya", ru: "минималистичный логотип, синий градиент, технологии", en: "minimalist logo, blue gradient, technology" },
    "sugg.pic.fantasy.t":   { uz: "Fantastik", ru: "Фэнтези",   en: "Fantasy" },
    "sugg.pic.fantasy.s":   { uz: "Xayoliy",   ru: "Воображаемое", en: "Imaginary" },
    "sugg.pic.fantasy.p":   { uz: "kosmosda suzayotgan orol, syurreal, detalli", ru: "парящий в космосе остров, сюрреализм, детализация", en: "island floating in space, surreal, detailed" },

    // taklif kartalari — chat
    "sugg.chat.code.t":    { uz: "Kod yoz",   ru: "Напиши код", en: "Write code" },
    "sugg.chat.code.s":    { uz: "Tushuntirmalar bilan", ru: "С пояснениями", en: "With explanations" },
    "sugg.chat.code.p":    { uz: "Menga kod yozib ber: ", ru: "Напиши мне код: ", en: "Write me code: " },
    "sugg.chat.translate.t": { uz: "Tarjima", ru: "Перевод", en: "Translate" },
    "sugg.chat.translate.s": { uz: "O'zbek ↔ Ingliz", ru: "Русский ↔ Английский", en: "Uzbek ↔ English" },
    "sugg.chat.translate.p": { uz: "Quyidagi matnni tarjima qil: ", ru: "Переведи следующий текст: ", en: "Translate the following text: " },
    "sugg.chat.explain.t": { uz: "Tushuntir", ru: "Объясни", en: "Explain" },
    "sugg.chat.explain.s": { uz: "Sodda tilda", ru: "Простыми словами", en: "In simple terms" },
    "sugg.chat.explain.p": { uz: "Menga sodda tilda tushuntir: ", ru: "Объясни мне простыми словами: ", en: "Explain to me in simple terms: " },
    "sugg.chat.letter.t":  { uz: "Xat yoz", ru: "Напиши письмо", en: "Write a letter" },
    "sugg.chat.letter.s":  { uz: "Rasmiy uslubda", ru: "В официальном стиле", en: "In a formal style" },
    "sugg.chat.letter.p":  { uz: "Menga rasmiy xat yozib ber: ", ru: "Напиши мне официальное письмо: ", en: "Write me a formal letter: " },

    // xabar sohasi
    "msg.imageGenerating": { uz: "Rasm yaratilyapti...", ru: "Создаётся изображение...", en: "Generating image..." },
    "msg.file":            { uz: "Fayl", ru: "Файл", en: "File" },
    "msg.attachedFile":    { uz: "Biriktirilgan fayl", ru: "Прикреплённый файл", en: "Attached file" },
    "tts.loading":  { uz: "Ovoz tayyorlanyapti...", ru: "Готовится озвучка...", en: "Preparing audio..." },
    "tts.stop":     { uz: "To'xtatish", ru: "Остановить", en: "Stop" },
    "tts.read":     { uz: "Ovoz bilan o'qish", ru: "Прочитать вслух", en: "Read aloud" },
    "tts.toggleOff":{ uz: "Ovoz o'chiq", ru: "Звук выключен", en: "Voice off" },
    "tts.toggleOn": { uz: "Ovoz yoqish", ru: "Включить звук", en: "Turn on voice" },
    "msg.regenerate": { uz: "Qayta generatsiya", ru: "Сгенерировать заново", en: "Regenerate" },
    "msg.sharePrompt":{ uz: "Promptni ulashish", ru: "Поделиться запросом", en: "Share prompt" },

    // composer
    "composer.more":        { uz: "Ko'proq", ru: "Ещё", en: "More" },
    "composer.liveTooltip": { uz: "Humo Live — ovozli suhbat", ru: "Humo Live — голосовой чат", en: "Humo Live — voice chat" },
    "ph.listening": { uz: "Tinglayapman...", ru: "Слушаю...", en: "Listening..." },
    "ph.pic":       { uz: "Rasmni tasvirlab bering... (masalan: quyosh botishi, tog'lar)", ru: "Опишите изображение... (например: закат, горы)", en: "Describe the image... (e.g. sunset, mountains)" },
    "ph.cowork":    { uz: "Nima yaratamiz? (hujjat/kod)", ru: "Что создадим? (документ/код)", en: "What shall we create? (doc/code)" },
    "ph.code":      { uz: "Kod so'rang...", ru: "Запросите код...", en: "Ask for code..." },
    "ph.chat":      { uz: "Humo AI'ga xabar yozing...", ru: "Напишите Humo AI...", en: "Message Humo AI..." },
    "voice.start":  { uz: "Ovoz bilan", ru: "Голосом", en: "By voice" },

    // canvas
    "canvas.charsWord":  { uz: "belgi", ru: "симв.", en: "chars" },
    "canvas.copy":       { uz: "Nusxa", ru: "Копировать", en: "Copy" },
    "canvas.backToChat": { uz: "Chatga qaytish", ru: "Вернуться в чат", en: "Back to chat" },
    "canvas.placeholder":{
        uz: "Canvas bo'sh. Chatda so'rang — masalan: \"Startap uchun biznes-reja yoz\" yoki \"React login formasi kodini yoz\". AI shu yerga yozadi, siz ham tahrirlashingiz mumkin.",
        ru: "Canvas пуст. Спросите в чате — например: \"Напиши бизнес-план для стартапа\" или \"Напиши код формы входа на React\". ИИ напишет здесь, и вы сможете редактировать.",
        en: "Canvas is empty. Ask in chat — e.g. \"Write a business plan for a startup\" or \"Write a React login form\". The AI writes here and you can edit it too.",
    },

    // KB banner
    "kb.title": { uz: "Sizni yaxshiroq tanish uchun 1 daqiqa", ru: "1 минута, чтобы узнать вас лучше", en: "1 minute to get to know you better" },
    "kb.desc0": {
        uz: "AI hozircha siz haqingizda hech narsa bilmaydi. Bir necha savolga javob bering — tavsiyalar aniqroq bo'ladi.",
        ru: "ИИ пока ничего о вас не знает. Ответьте на несколько вопросов — рекомендации станут точнее.",
        en: "The AI doesn't know anything about you yet. Answer a few questions and its suggestions get sharper.",
    },
    "kb.descN": {
        uz: "Hozir {n} ta ma'lumot. Yana bir necha savol javob bering — AI aniqroq javob beradi.",
        ru: "Сейчас {n} фактов. Ответьте ещё на несколько вопросов — ИИ будет отвечать точнее.",
        en: "{n} facts so far. Answer a few more questions and the AI will respond more precisely.",
    },
    "kb.start": { uz: "Boshlash →", ru: "Начать →", en: "Get started →" },
    "kb.later": { uz: "Keyinroq",   ru: "Позже",    en: "Later" },

    // Humo Live (ovozli suhbat overlay)
    "live.voice.full":   { uz: "To'liq, mustahkam ohang", ru: "Полный, уверенный тон", en: "Full, confident tone" },
    "live.voice.bright": { uz: "Yorug', yengil ohang",    ru: "Светлый, лёгкий тон",   en: "Bright, light tone" },
    "live.st.connecting":{ uz: "Ulanmoqda...",    ru: "Подключение...",   en: "Connecting..." },
    "live.st.speaking":  { uz: "Humo gapiryapti...", ru: "Humo говорит...", en: "Humo is speaking..." },
    "live.st.micOff":    { uz: "Mikrofon o'chiq", ru: "Микрофон выключен", en: "Mic is off" },
    "live.st.listening": { uz: "Tinglayapman...",  ru: "Слушаю...",        en: "Listening..." },
    "live.st.ended":     { uz: "Suhbat tugadi",    ru: "Разговор завершён", en: "Call ended" },
    "live.st.ready":     { uz: "Boshlashga tayyor", ru: "Готов к началу",  en: "Ready to start" },
    "live.youPrefix":    { uz: "Siz: ",            ru: "Вы: ",             en: "You: " },
    "live.preview":      { uz: "Eshitib ko'rish",  ru: "Прослушать",       en: "Preview" },
    "live.screenShare":  { uz: "Ekranni ulashish", ru: "Поделиться экраном", en: "Share screen" },
    "live.screenStop":   { uz: "Ekranni to'xtatish", ru: "Остановить экран", en: "Stop screen" },
    "live.start":        { uz: "Suhbatni boshlash", ru: "Начать разговор",  en: "Start the call" },
    "live.camOn":        { uz: "Kamerani yoqish",  ru: "Включить камеру",  en: "Turn on camera" },
    "live.camOff":       { uz: "Kamerani o'chirish", ru: "Выключить камеру", en: "Turn off camera" },
    "live.micOn":        { uz: "Mikrofonni yoqish", ru: "Включить микрофон", en: "Turn on mic" },
    "live.micOff":       { uz: "Mikrofonni o'chirish", ru: "Выключить микрофон", en: "Turn off mic" },
    "live.end":          { uz: "Tugatish",         ru: "Завершить",        en: "End" },
    "live.camSwitch":    { uz: "Kamerani almashtirish", ru: "Переключить камеру", en: "Switch camera" },
    "live.hint":         {
        uz: "Tugmani bosing va gaplashing (istalgan tilda). Mikrofonga ruxsat bering.",
        ru: "Нажмите кнопку и говорите (на любом языке). Разрешите доступ к микрофону.",
        en: "Press the button and speak (in any language). Allow microphone access.",
    },
    "live.err.auth":     { uz: "Iltimos, avval kiring.", ru: "Пожалуйста, сначала войдите.", en: "Please sign in first." },
    "live.err.unavail":  { uz: "Live hozircha ishlamayapti.", ru: "Live пока недоступен.", en: "Live isn't available right now." },
    "live.err.conn":     { uz: "Ulanishda xatolik.", ru: "Ошибка подключения.", en: "Connection error." },
    "live.err.mic":      { uz: "Mikrofonga ruxsat berilmadi.", ru: "Доступ к микрофону не разрешён.", en: "Microphone access denied." },
    "live.err.failed":   { uz: "Ulanib bo'lmadi. Qayta urinib ko'ring.", ru: "Не удалось подключиться. Попробуйте снова.", en: "Couldn't connect. Try again." },
};

export function aiT(lang: AiLang, key: string): string {
    const row = DICT[key];
    if (!row) return key;
    return row[lang] ?? row.uz;
}

// {n} o'rin egasi bilan
export function aiTn(lang: AiLang, key: string, n: number): string {
    return aiT(lang, key).replace("{n}", String(n));
}

// Qurilma/route locale'dan AI tilini aniqlash: ru→ru, en→en, aks holda uz.
export function aiLangFromLocale(locale: string | undefined | null): AiLang {
    return locale === "ru" || locale === "en" ? locale : "uz";
}
