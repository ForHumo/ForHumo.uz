// Emoji shortcode → emoji xaritasi. Slack/Discord/GitHub uslubidagi qisqa nomlar.
// Kompozitorda ":smile" yozilganda tanlanadi.

export const EMOJI_SHORTCODES: Record<string, string> = {
    // Yuz — quvonch
    smile: "😊", grin: "😁", joy: "😂", rofl: "🤣", laughing: "😆",
    wink: "😉", blush: "😊", smiley: "😃", relaxed: "☺️",
    sweat_smile: "😅", innocent: "😇", slight_smile: "🙂",
    // Yuz — sevgi
    heart_eyes: "😍", kissing_heart: "😘", kissing: "😗",
    hugging: "🤗", star_struck: "🤩", smirk: "😏",
    // Yuz — o'ylash
    thinking: "🤔", hushed: "😯", zipper_mouth: "🤐",
    raised_eyebrow: "🤨", neutral_face: "😐", expressionless: "😑",
    no_mouth: "😶", pensive: "😔", confused: "😕", worried: "😟",
    // Yuz — g'am
    disappointed: "😞", frowning: "☹️", cry: "😢", sob: "😭",
    tired: "😫", weary: "😩", sleeping: "😴", sleepy: "😪",
    yawning: "🥱", dizzy: "😵",
    // Yuz — g'azab
    angry: "😠", rage: "😡", triumph: "😤", cursing: "🤬",
    scream: "😱", fearful: "😨", cold_sweat: "😰", flushed: "😳",
    // Yuz — hazil
    stuck_out_tongue: "😛", winking_tongue: "😜", crazy: "🤪",
    money_mouth: "🤑", nerd: "🤓", sunglasses: "😎", partying: "🥳",
    // Yuz — kasal
    mask: "😷", sick: "🤒", thermometer_face: "🤒",
    face_vomiting: "🤮", sneezing: "🤧", woozy: "🥴",
    // Qo'l ishoralari
    thumbsup: "👍", "+1": "👍", thumbsdown: "👎", "-1": "👎",
    ok_hand: "👌", clap: "👏", raised_hands: "🙌", muscle: "💪",
    pray: "🙏", handshake: "🤝", wave: "👋", point_up: "☝️",
    point_down: "👇", point_left: "👈", point_right: "👉",
    fist: "✊", punch: "👊", crossed_fingers: "🤞", v: "✌️",
    metal: "🤘", call_me: "🤙", vulcan: "🖖", writing: "✍️",
    // Yurak
    heart: "❤️", broken_heart: "💔", two_hearts: "💕", sparkling_heart: "💖",
    heartbeat: "💓", heartpulse: "💗", cupid: "💘", gift_heart: "💝",
    revolving_hearts: "💞", blue_heart: "💙", green_heart: "💚",
    yellow_heart: "💛", purple_heart: "💜", black_heart: "🖤",
    orange_heart: "🧡", white_heart: "🤍", brown_heart: "🤎",
    // Belgi
    fire: "🔥", star: "⭐", star2: "🌟", boom: "💥", sparkles: "✨",
    zap: "⚡", collision: "💥", tada: "🎉", confetti: "🎊",
    balloon: "🎈", gift: "🎁", cake: "🎂", birthday: "🎂",
    party: "🥳", bell: "🔔", speaker: "🔊", mute: "🔇",
    heavy_check: "✔️", check: "✅", x: "❌", question: "❓",
    exclamation: "❗", warning: "⚠️", 100: "💯", ok: "🆗",
    // Ovqat
    pizza: "🍕", burger: "🍔", fries: "🍟", hotdog: "🌭",
    taco: "🌮", sushi: "🍣", ramen: "🍜", spaghetti: "🍝",
    coffee: "☕", tea: "🍵", beer: "🍺", wine: "🍷",
    cocktail: "🍸", champagne: "🍾", cake_slice: "🍰", cookie: "🍪",
    apple: "🍎", banana: "🍌", grapes: "🍇", watermelon: "🍉",
    strawberry: "🍓", peach: "🍑", cherries: "🍒", pineapple: "🍍",
    // Hayvon
    dog: "🐶", cat: "🐱", mouse: "🐭", hamster: "🐹", rabbit: "🐰",
    fox: "🦊", bear: "🐻", panda: "🐼", koala: "🐨", tiger: "🐯",
    lion: "🦁", cow: "🐮", horse: "🐴", monkey: "🐵", chicken: "🐔",
    penguin: "🐧", bird: "🐦", frog: "🐸", turtle: "🐢",
    fish: "🐟", octopus: "🐙", butterfly: "🦋", bug: "🐛",
    // Tabiat/ob-havo
    sun: "☀️", cloud: "☁️", rain: "🌧️", snow: "❄️", snowflake: "❄️",
    thunder: "⛈️", rainbow: "🌈", moon: "🌙", earth: "🌍",
    tree: "🌳", palm_tree: "🌴", cactus: "🌵", herb: "🌿",
    rose: "🌹", tulip: "🌷", sunflower: "🌻",
    // Faoliyat
    soccer: "⚽", basketball: "🏀", football: "🏈", baseball: "⚾",
    tennis: "🎾", volleyball: "🏐", rugby: "🏉", ping_pong: "🏓",
    badminton: "🏸", hockey: "🏒", cricket: "🏏", golf: "⛳",
    boxing: "🥊", trophy: "🏆", medal: "🏅", first: "🥇",
    // Sayohat
    car: "🚗", taxi: "🚕", bus: "🚌", train: "🚆", airplane: "✈️",
    rocket: "🚀", ship: "🚢", boat: "⛵", bike: "🚴",
    // Ish
    computer: "💻", phone: "📱", camera: "📷", tv: "📺",
    keyboard: "⌨️", printer: "🖨️", floppy: "💾", cd: "💿",
    book: "📚", clipboard: "📋", envelope: "✉️", mailbox: "📬",
    money: "💰", credit_card: "💳", chart: "📊", calendar: "📅",
    // Diqqat
    eyes: "👀", brain: "🧠", skull: "💀", ghost: "👻",
    alien: "👽", robot: "🤖", clown: "🤡", poop: "💩",
};

// Fuzzy qidiruv: shortcode fragment bilan mos keladigan tavsiya
export function searchShortcodes(query: string, limit = 8): Array<{ code: string; emoji: string }> {
    const q = query.toLowerCase();
    if (!q) return [];
    const scored: Array<{ code: string; emoji: string; score: number }> = [];
    for (const [code, emoji] of Object.entries(EMOJI_SHORTCODES)) {
        if (code === q) return [{ code, emoji }]; // aniq mos
        if (code.startsWith(q)) scored.push({ code, emoji, score: 100 });
        else if (code.includes(q)) scored.push({ code, emoji, score: 50 });
    }
    return scored.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
        .slice(0, limit)
        .map(({ code, emoji }) => ({ code, emoji }));
}
