// ========================================
// Constants & Configuration
// ========================================
const COLS = 6;
const ROWS = 8;
const CELL_SIZE = 80;
const BOARD_PADDING = 40;
const CANVAS_WIDTH = COLS * CELL_SIZE + 2 * BOARD_PADDING;
const CANVAS_HEIGHT = ROWS * CELL_SIZE + 2 * BOARD_PADDING;
const PIECE_RADIUS = CELL_SIZE * 0.38;
const ANIM_DURATION = 250; // ms for move animation
const CAPTURE_ANIM_DURATION = 350;
const gameOptions = {
    sound: true,
    showHints: true,
    animations: true,
    aiFirst: false,
    aiDelay: 200,
};

// Difficulty presets: { depth, maxTime, evalMultiplier, useTactics, useKillerMoves, variety, humanBias }
const DIFFICULTY = {
    beginner:  { depth: 2, maxTime: 450,   evalMult: 0.58, tactics: true, killer: false, varietyChance: 0.62, varietyWindow: 180, varietyTemp: 82, humanBias: 0.75, label: '入门' },
    easy:      { depth: 3, maxTime: 700,   evalMult: 0.75, tactics: true, killer: false, varietyChance: 0.45, varietyWindow: 120, varietyTemp: 55, humanBias: 0.55, label: '简单' },
    medium:    { depth: 5, maxTime: 3000,  evalMult: 1.0,  tactics: true, killer: true,  varietyChance: 0.25, varietyWindow: 55,  varietyTemp: 28, humanBias: 0.35, label: '普通' },
    hard:      { depth: 7, maxTime: 6500,  evalMult: 1.15, tactics: true, killer: true,  varietyChance: 0.10, varietyWindow: 25,  varietyTemp: 14, humanBias: 0.18, label: '困难' },
    nightmare: { depth: 7, maxTime: 5500,  evalMult: 1.4,  tactics: true, killer: true,  varietyChance: 0.02, varietyWindow: 8,   varietyTemp: 6,  humanBias: 0.02, label: '噩梦' },
};
let currentDifficulty = 'medium';
let onlineMatch = {
    active: false,
    searching: false,
    opponent: null,
};
let matchSearchTimer = null;
let matchCountdownTimer = null;
let rematchResponseTimer = null;
let opponentRematchTimer = null;
let realtimeQueueFallbackTimer = null;
let aiTurnTimer = null;
let chatTimers = [];
let chatMessages = [];
let recentOpponentNames = [];
let realtimeClient = {
    ws: null,
    playerId: '',
    side: '',
    roomId: '',
};
const PLAYER_PROFILE_KEY = 'maziqi-player-profile-v1';
const OPPONENT_PROFILE_KEY = 'maziqi-opponent-profiles-v1';
const MATCH_HISTORY_KEY = 'maziqi-match-history-v1';
const DAILY_MISSIONS_KEY = 'maziqi-daily-missions-v1';
const REALTIME_SERVER_KEY = 'maziqi-realtime-server-url-v1';
const MAX_MATCH_HISTORY = 18;
const REALTIME_QUEUE_AI_FALLBACK_MS = 3500;
const DAILY_MISSION_DEFS = [
    { id: 'complete-online', title: '完成 2 局在线对局', target: 2, reward: 12 },
    { id: 'win-online', title: '赢下 1 局在线对局', target: 1, reward: 18 },
    { id: 'send-chat', title: '发送 3 条快捷消息', target: 3, reward: 8 },
];
const BEGINNER_PROTECTION_GAMES = 8;
const PROFILE_AVATAR_OPTIONS = [
    { value: '🐴', label: '🐴 骑手' },
    { value: '♞', label: '♞ 棋士' },
    { value: '🔥', label: '🔥 进攻' },
    { value: '🛡️', label: '🛡️ 防守' },
    { value: '🌙', label: '🌙 冷静' },
    { value: '⚡', label: '⚡ 快棋' },
    { value: '🏆', label: '🏆 连胜奖杯', unlock: { type: 'wins', amount: 3, text: '赢 3 局解锁' } },
    { value: '💎', label: '💎 钻石骑士', unlock: { type: 'rating', amount: 1750, text: '达到钻石解锁' } },
    { value: '👑', label: '👑 大师王冠', unlock: { type: 'rating', amount: 2000, text: '达到大师解锁' } },
];
const PROFILE_TITLE_OPTIONS = [
    { value: '新锐骑手', label: '新锐骑手' },
    { value: '稳健棋手', label: '稳健棋手' },
    { value: '进攻派', label: '进攻派' },
    { value: '残局猎手', label: '残局猎手' },
    { value: '快棋玩家', label: '快棋玩家' },
    { value: '三连胜', label: '三连胜', unlock: { type: 'streak', amount: 3, text: '达成 3 连胜解锁' } },
    { value: '任务达人', label: '任务达人', unlock: { type: 'missionPoints', amount: 30, text: '30 活跃点解锁' } },
    { value: '白银骑士', label: '白银骑士', unlock: { type: 'rating', amount: 1250, text: '达到白银解锁' } },
    { value: '黄金统帅', label: '黄金统帅', unlock: { type: 'rating', amount: 1500, text: '达到黄金解锁' } },
];
const PROFILE_ACCENT_OPTIONS = [
    { value: '#5aa7ff', label: '蓝色' },
    { value: '#8ef3c5', label: '青绿' },
    { value: '#ffb86b', label: '金色' },
    { value: '#ff7aa8', label: '玫红' },
    { value: '#b998ff', label: '紫色' },
    { value: '#ffe066', label: '赛季金', unlock: { type: 'missionPoints', amount: 20, text: '20 活跃点解锁' } },
    { value: '#f0f4ff', label: '钻石白', unlock: { type: 'rating', amount: 1750, text: '达到钻石解锁' } },
];
const TUTORIAL_CHALLENGES = [
    {
        title: '开局抢中',
        shortTitle: '抢中',
        desc: '真实对局开局要抢中心据点。红方有两匹马，只有一匹能立刻占到安全中路。',
        hint: '不要走边线马；选择左侧红马跳到中路发光格，下一回合能同时威胁两侧。',
        pieces: [
            { side: 'player', col: 1, row: 6 },
            { side: 'player', col: 4, row: 7 },
            { side: 'ai', col: 0, row: 2 },
            { side: 'ai', col: 5, row: 2 },
        ],
        target: { col: 2, row: 4 },
        goal: 'target',
        maxMoves: 1,
        success: '好开局！中心马比边线马更容易制造后续威胁。',
    },
    {
        title: '底线拦截',
        shortTitle: '拦截',
        desc: '蓝方已经贴近你的底线。真实对局里，这种威胁必须马上处理。',
        hint: '先别冲线，红马可以一步跳吃下方蓝子，解除蓝方下一手到底线获胜的威胁。',
        pieces: [
            { side: 'player', col: 1, row: 4 },
            { side: 'player', col: 4, row: 5 },
            { side: 'ai', col: 2, row: 6 },
            { side: 'ai', col: 5, row: 5 },
        ],
        target: { col: 2, row: 6 },
        goal: 'capture',
        maxMoves: 1,
        success: '拦得好！先防住必胜威胁，才有机会反击。',
    },
    {
        title: '解开马腿',
        shortTitle: '解腿',
        desc: '自己的棋子也会卡住马腿。先移动挡路红马，再让主力马进入关键格。',
        hint: '直接跳目标会被正前方红马卡腿；第一步先把挡路马挪开，第二步主力马进发光格。',
        pieces: [
            { side: 'player', col: 2, row: 6 },
            { side: 'player', col: 2, row: 5 },
            { side: 'ai', col: 0, row: 2 },
            { side: 'ai', col: 5, row: 3 },
        ],
        target: { col: 3, row: 4 },
        goal: 'target',
        maxMoves: 2,
        success: '对！高手会先处理马腿，再走关键跳点。',
    },
    {
        title: '立即取胜',
        shortTitle: '取胜',
        desc: '真实残局里，如果有一步获胜，就不要贪吃子或做防守。',
        hint: '左侧红马可以一步跳到最上方底线；其它棋子和蓝子都是干扰。',
        pieces: [
            { side: 'player', col: 1, row: 2 },
            { side: 'player', col: 5, row: 5 },
            { side: 'ai', col: 3, row: 1 },
            { side: 'ai', col: 4, row: 3 },
        ],
        target: { col: 0, row: 0 },
        goal: 'finish',
        maxMoves: 1,
        success: '果断！看到一步胜时，直接结束比赛。',
    },
    {
        title: '两步抢攻',
        shortTitle: '抢攻',
        desc: '中盘常常要提前两步布局。红马要在两步内转到能攻击双翼的位置。',
        hint: '先从左下角跳到中路，再跳到发光格；边路看似安全，但会慢一拍。',
        pieces: [
            { side: 'player', col: 0, row: 7 },
            { side: 'player', col: 5, row: 6 },
            { side: 'ai', col: 1, row: 3 },
            { side: 'ai', col: 4, row: 2 },
        ],
        target: { col: 3, row: 4 },
        goal: 'target',
        maxMoves: 2,
        success: '漂亮！两步转位能把边线马变成进攻核心。',
    },
    {
        title: '弃边绕腿',
        shortTitle: '绕腿',
        desc: '被卡马腿时，强行走直线会浪费回合。用两步绕开封锁，切入中路。',
        hint: '正前方被堵住，先跳到右侧中转点，再回到发光目标。',
        pieces: [
            { side: 'player', col: 1, row: 7 },
            { side: 'player', col: 1, row: 6 },
            { side: 'ai', col: 3, row: 6 },
            { side: 'ai', col: 5, row: 5 },
        ],
        target: { col: 4, row: 4 },
        goal: 'target',
        maxMoves: 2,
        success: '对！绕开封锁后，马才能重新进入主战场。',
    },
    {
        title: '连续战术吃子',
        shortTitle: '连吃',
        desc: '真实对局里，连续吃子要算清下一跳。两步内清掉所有蓝方关键子。',
        hint: '先吃近处蓝子，再从新位置继续跳吃远处蓝子；如果先走错方向，第二枚就吃不到。',
        pieces: [
            { side: 'player', col: 2, row: 6 },
            { side: 'ai', col: 3, row: 4 },
            { side: 'ai', col: 5, row: 3 },
        ],
        target: { col: 5, row: 3 },
        goal: 'captureAll',
        maxMoves: 2,
        success: '漂亮！连续吃子能快速清除对方反击点。',
    },
    {
        title: '攻防选择',
        shortTitle: '攻防',
        desc: '你能吃子，也能冲线。判断哪一步真正改变胜负，而不是只看眼前收益。',
        hint: '吃右侧蓝子只是赚子；左侧红马能两步冲线，第一步必须先占发光中转格。',
        pieces: [
            { side: 'player', col: 0, row: 5 },
            { side: 'player', col: 4, row: 5 },
            { side: 'ai', col: 5, row: 3 },
            { side: 'ai', col: 2, row: 1 },
        ],
        target: { col: 1, row: 3 },
        goal: 'target',
        maxMoves: 1,
        success: '判断正确！先走中转格，下一手就能制造冲线压力。',
    },
    {
        title: '残局三步冲线',
        shortTitle: '残局',
        desc: '模拟真实残局：蓝子挡路且有干扰子，红方必须三步内找到最快冲线路线。',
        hint: '不要先吃边上的蓝子。用右侧红马连续向上转位，第三步跳到最上方底线。',
        pieces: [
            { side: 'player', col: 3, row: 6 },
            { side: 'player', col: 0, row: 5 },
            { side: 'ai', col: 1, row: 3 },
            { side: 'ai', col: 4, row: 2 },
            { side: 'ai', col: 5, row: 4 },
        ],
        target: { col: 4, row: 0 },
        goal: 'finish',
        maxMoves: 3,
        success: '完成！这就是实战残局里的最快冲线思路。',
    },
];
const DEFAULT_PLAYER_PROFILE = {
    name: 'Player',
    avatar: '🐴',
    title: '新锐骑手',
    accent: '#5aa7ff',
    rating: 1200,
    wins: 0,
    losses: 0,
    streak: 0,
    bestRating: 1200,
    missionPoints: 0,
};
let playerProfile = loadPlayerProfile();
let matchHistory = loadMatchHistory();
let dailyMissions = loadDailyMissions();
let pendingForfeitAction = null;
let activeTutorialIndex = null;

const ONLINE_OPPONENTS = [
    { name: 'TinyHoof', avatar: '🐣', title: '刚入门', accent: '#ffe066', rating: 820, wins: 2, losses: 12, bestRating: 900, difficulty: 'beginner', style: '新手型', styleKey: 'random', personality: 'friendly', chatRate: 0.70, rematchRate: 0.56 },
    { name: 'SleepyPony', avatar: '😴', title: '慢热玩家', accent: '#b998ff', rating: 870, wins: 3, losses: 13, bestRating: 930, difficulty: 'beginner', style: '慢半拍', styleKey: 'patient', personality: 'quiet', chatRate: 0.30, rematchRate: 0.42 },
    { name: 'SnackKnight', avatar: '🍪', title: '休闲新手', accent: '#ffb86b', rating: 920, wins: 4, losses: 14, bestRating: 980, difficulty: 'beginner', style: '随手型', styleKey: 'casual', personality: 'friendly', chatRate: 0.66, rematchRate: 0.52 },
    { name: 'WobblyMane', avatar: '🫠', title: '练习中', accent: '#8fb8ff', rating: 960, wins: 5, losses: 15, bestRating: 1035, difficulty: 'beginner', style: '不稳定型', styleKey: 'random', personality: 'expressive', chatRate: 0.62, rematchRate: 0.48 },
    { name: 'MapleFoal', avatar: '🍁', title: '新棋友', accent: '#ff9a9a', rating: 1010, wins: 6, losses: 15, bestRating: 1080, difficulty: 'beginner', style: '轻松型', styleKey: 'mobile', personality: 'friendly', chatRate: 0.58, rematchRate: 0.50 },
    { name: 'PebbleStep', avatar: '🪨', title: '保守新手', accent: '#7f93c9', rating: 1050, wins: 7, losses: 16, bestRating: 1115, difficulty: 'beginner', style: '保守型', styleKey: 'blocker', personality: 'quiet', chatRate: 0.26, rematchRate: 0.36 },
    { name: 'RiverKnight', avatar: '🐴', title: '休闲骑手', accent: '#8ef3c5', rating: 1180, wins: 12, losses: 15, bestRating: 1230, difficulty: 'easy', style: '休闲玩家', styleKey: 'casual', personality: 'friendly', chatRate: 0.62, rematchRate: 0.46 },
    { name: 'PonyRain', avatar: '🌧️', title: '新手骑手', accent: '#8fb8ff', rating: 1090, wins: 8, losses: 13, bestRating: 1140, difficulty: 'easy', style: '新手型', styleKey: 'casual', personality: 'friendly', chatRate: 0.64, rematchRate: 0.48 },
    { name: 'GrassHoof', avatar: '🌿', title: '练习棋友', accent: '#7fdc9d', rating: 1135, wins: 10, losses: 14, bestRating: 1180, difficulty: 'easy', style: '练习型', styleKey: 'balanced', personality: 'friendly', chatRate: 0.52, rematchRate: 0.44 },
    { name: 'LittleDrum', avatar: '🥁', title: '随性玩家', accent: '#ffb86b', rating: 1215, wins: 16, losses: 17, bestRating: 1265, difficulty: 'easy', style: '随性型', styleKey: 'random', personality: 'expressive', chatRate: 0.60, rematchRate: 0.42 },
    { name: 'TeaHorse', avatar: '🍵', title: '轻松棋友', accent: '#8ef3c5', rating: 1260, wins: 20, losses: 18, bestRating: 1305, difficulty: 'easy', style: '轻松型', styleKey: 'patient', personality: 'friendly', chatRate: 0.58, rematchRate: 0.50 },
    { name: 'SunnyMane', avatar: '☀️', title: '开朗棋手', accent: '#ffe066', rating: 1295, wins: 23, losses: 21, bestRating: 1335, difficulty: 'easy', style: '开朗型', styleKey: 'mobile', personality: 'friendly', chatRate: 0.66, rematchRate: 0.52 },
    { name: 'BambooStep', avatar: '🎋', title: '慢节奏棋手', accent: '#7fdc9d', rating: 1325, wins: 26, losses: 22, bestRating: 1360, difficulty: 'easy', style: '节奏慢', styleKey: 'blocker', personality: 'quiet', chatRate: 0.28, rematchRate: 0.32 },
    { name: 'SoftKnight', avatar: '🧸', title: '温和棋士', accent: '#ffb6d5', rating: 1360, wins: 29, losses: 24, bestRating: 1405, difficulty: 'easy', style: '稳慢型', styleKey: 'patient', personality: 'friendly', chatRate: 0.50, rematchRate: 0.45 },
    { name: 'CornerColt', avatar: '🔷', title: '边线玩家', accent: '#5aa7ff', rating: 1390, wins: 33, losses: 29, bestRating: 1435, difficulty: 'easy', style: '边路型', styleKey: 'wing', personality: 'balanced', chatRate: 0.38, rematchRate: 0.34 },
    { name: 'NorthWind', avatar: '🌬️', title: '稳健棋手', accent: '#9fb8ff', rating: 1420, wins: 41, losses: 35, bestRating: 1480, difficulty: 'medium', style: '稳健型', styleKey: 'solid', personality: 'focused', chatRate: 0.34, rematchRate: 0.36 },
    { name: 'CopperMare', avatar: '🟤', title: '均衡棋友', accent: '#c4a66a', rating: 1460, wins: 44, losses: 38, bestRating: 1505, difficulty: 'medium', style: '均衡型', styleKey: 'balanced', personality: 'balanced', chatRate: 0.40, rematchRate: 0.38 },
    { name: 'MoonStable', avatar: '🌙', title: '均衡骑士', accent: '#b998ff', rating: 1490, wins: 48, losses: 42, bestRating: 1535, difficulty: 'medium', style: '均衡型', styleKey: 'balanced', personality: 'balanced', chatRate: 0.42, rematchRate: 0.40 },
    { name: 'SharpSaddle', avatar: '🗡️', title: '小攻势玩家', accent: '#ff7a6b', rating: 1530, wins: 55, losses: 49, bestRating: 1585, difficulty: 'medium', style: '进攻型', styleKey: 'attacker', personality: 'expressive', chatRate: 0.50, rematchRate: 0.40 },
    { name: 'RedCannon', avatar: '🔥', title: '进攻派', accent: '#ff7a6b', rating: 1560, wins: 61, losses: 55, bestRating: 1620, difficulty: 'medium', style: '进攻型', styleKey: 'attacker', personality: 'expressive', chatRate: 0.56, rematchRate: 0.44 },
    { name: 'QuietBridge', avatar: '🌉', title: '防守棋友', accent: '#7f93c9', rating: 1605, wins: 66, losses: 58, bestRating: 1650, difficulty: 'medium', style: '防守型', styleKey: 'defender', personality: 'quiet', chatRate: 0.24, rematchRate: 0.32 },
    { name: 'CloudRider', avatar: '☁️', title: '灵活棋手', accent: '#5aa7ff', rating: 1640, wins: 73, losses: 61, bestRating: 1695, difficulty: 'medium', style: '灵活型', styleKey: 'mobile', personality: 'balanced', chatRate: 0.44, rematchRate: 0.38 },
    { name: 'CenterOak', avatar: '🌳', title: '中路棋手', accent: '#8ef3c5', rating: 1680, wins: 80, losses: 67, bestRating: 1725, difficulty: 'medium', style: '中路型', styleKey: 'solid', personality: 'focused', chatRate: 0.30, rematchRate: 0.34 },
    { name: 'SilentHorse', avatar: '🛡️', title: '防守专家', accent: '#7f93c9', rating: 1710, wins: 86, losses: 70, bestRating: 1760, difficulty: 'hard', style: '防守反击', styleKey: 'defender', personality: 'quiet', chatRate: 0.22, rematchRate: 0.28 },
    { name: 'ForkSmith', avatar: '🔱', title: '战术棋手', accent: '#b998ff', rating: 1750, wins: 90, losses: 72, bestRating: 1810, difficulty: 'hard', style: '陷阱型', styleKey: 'trap', personality: 'focused', chatRate: 0.22, rematchRate: 0.30 },
    { name: 'IronHoof', avatar: '⚙️', title: '压迫型棋手', accent: '#c4a66a', rating: 1785, wins: 94, losses: 78, bestRating: 1840, difficulty: 'hard', style: '压迫型', styleKey: 'pressure', personality: 'expressive', chatRate: 0.48, rematchRate: 0.34 },
    { name: 'EndgameFox', avatar: '🦊', title: '残局猎手', accent: '#ffb86b', rating: 1860, wins: 113, losses: 88, bestRating: 1915, difficulty: 'hard', style: '残局专家', styleKey: 'endgame', personality: 'focused', chatRate: 0.26, rematchRate: 0.42 },
    { name: 'StoneGate', avatar: '🪨', title: '铁壁棋手', accent: '#7f93c9', rating: 1895, wins: 118, losses: 91, bestRating: 1940, difficulty: 'hard', style: '铁壁型', styleKey: 'defender', personality: 'quiet', chatRate: 0.16, rematchRate: 0.26 },
    { name: 'JadeKnight', avatar: '♞', title: '计算型棋士', accent: '#8ef3c5', rating: 1935, wins: 126, losses: 92, bestRating: 1990, difficulty: 'hard', style: '计算型', styleKey: 'calculator', personality: 'focused', chatRate: 0.24, rematchRate: 0.30 },
    { name: 'LotusBlade', avatar: '🪷', title: '高手', accent: '#ff7aa8', rating: 2010, wins: 148, losses: 96, bestRating: 2075, difficulty: 'nightmare', style: '高手', styleKey: 'trap', personality: 'quiet', chatRate: 0.18, rematchRate: 0.24 },
    { name: 'NightHeron', avatar: '🪽', title: '冷静高手', accent: '#9fb8ff', rating: 2075, wins: 158, losses: 101, bestRating: 2130, difficulty: 'nightmare', style: '稳健高手', styleKey: 'master', personality: 'focused', chatRate: 0.14, rematchRate: 0.22 },
    { name: 'StarCourier', avatar: '⚡', title: '快棋玩家', accent: '#ffe066', rating: 2140, wins: 171, losses: 108, bestRating: 2205, difficulty: 'nightmare', style: '快棋高手', styleKey: 'speed', personality: 'expressive', chatRate: 0.40, rematchRate: 0.36 },
    { name: 'DeepRiver', avatar: '🌊', title: '大师', accent: '#5aa7ff', rating: 2260, wins: 204, losses: 119, bestRating: 2325, difficulty: 'nightmare', style: '大师', styleKey: 'master', personality: 'focused', chatRate: 0.16, rematchRate: 0.22 },
];

function mergeProfileOptions(baseOptions, opponentField, labelPrefix = '') {
    const merged = [...baseOptions];
    const seen = new Set(merged.map(item => item.value));
    ONLINE_OPPONENTS.forEach(opponent => {
        const value = opponent[opponentField];
        if (!value || seen.has(value)) return;
        seen.add(value);
        merged.push({ value, label: labelPrefix ? `${value} ${labelPrefix}` : value, source: 'opponent' });
    });
    return merged;
}

function profileOptionsForField(field) {
    if (field === 'avatar') return mergeProfileOptions(PROFILE_AVATAR_OPTIONS, 'avatar', '头像');
    if (field === 'title') return mergeProfileOptions(PROFILE_TITLE_OPTIONS, 'title');
    return PROFILE_ACCENT_OPTIONS;
}

const PLAYER_CHAT_MESSAGES = ['👍', '👏', '😮', '🤔', '漂亮！', '好棋', '有点难', '我想想', '再来一局？', '差一点', '稳住', '运气不错', '别急', '这步危险', '守住了', '机会来了', '厉害', '差点中招', '😭', '😢', '😓', '😅'];
const OPPONENT_CHAT_MESSAGES = {
    greeting: ['👍', '👏'],
    playerChat: ['👍', '👏', '🤔'],
    playerRematchChat: ['👍', '再来一局？'],
    playerPraiseChat: ['👍', '👏', '厉害'],
    playerThinkingChat: ['别急', '我想想', '🤔'],
    afterPlayerMove: ['🤔', '我想想'],
    afterPlayerThreat: ['这步危险', '我想想', '有点难'],
    afterOpponentMove: ['稳住', '我想想'],
    afterOpponentThreat: ['机会来了', '这步危险', '🤔'],
    ambient: ['我想想', '有点难', '🤔', '稳住'],
    ahead: ['稳住', '机会来了', '守住了'],
    behind: ['有点难', '我想想', '差一点', '🤔', '😢', '😓'],
    equal: ['稳住', '我想想', '🤔'],
    afterPlayerCapture: ['漂亮！', '好棋', '厉害', '有点难', '😢'],
    afterOpponentCapture: ['机会来了', '运气不错', '👏'],
    escapedDanger: ['守住了', '差点中招', '稳住', '😓'],
    endWin: ['👍', '👏', '运气不错'],
    endLose: ['漂亮！', '好棋', '厉害', '再来一局？', '😭', '😅'],
};

const STYLE_CHAT_MESSAGES = {
    casual: {
        greeting: ['👍', '👏'],
        ambient: ['🤔', '有点难'],
        afterPlayerMove: ['好棋', '🤔'],
        afterOpponentMove: ['👍', '稳住'],
        afterPlayerCapture: ['漂亮！', '😮', '😢'],
        afterOpponentCapture: ['运气不错', '👏'],
        ahead: ['稳住', '👍'],
        behind: ['有点难', '差一点', '😢'],
        endLose: ['漂亮！', '再来一局？', '😭'],
    },
    random: {
        greeting: ['👏', '😮'],
        ambient: ['🤔', '机会来了'],
        afterPlayerMove: ['😮', '我想想'],
        afterOpponentMove: ['机会来了', '👍'],
        afterPlayerCapture: ['厉害', '😮', '😭'],
        afterOpponentCapture: ['运气不错', '👏'],
        ahead: ['机会来了', '运气不错'],
        behind: ['差一点', '有点难', '😓'],
    },
    patient: {
        greeting: ['👍'],
        playerThinkingChat: ['别急', '我想想'],
        ambient: ['我想想', '别急'],
        afterPlayerThreat: ['我想想', '有点难'],
        afterOpponentMove: ['稳住', '我想想'],
        ahead: ['稳住', '守住了'],
        behind: ['我想想', '有点难', '😓'],
        escapedDanger: ['守住了', '稳住', '😅'],
    },
    blocker: {
        ambient: ['稳住', '我想想'],
        afterPlayerThreat: ['这步危险', '我想想'],
        afterOpponentMove: ['稳住', '守住了'],
        ahead: ['守住了', '稳住'],
        behind: ['有点难', '差一点', '😓'],
        escapedDanger: ['守住了', '差点中招', '😅'],
    },
    solid: {
        greeting: ['👍'],
        ambient: ['稳住', '我想想'],
        afterPlayerMove: ['🤔', '我想想'],
        afterOpponentMove: ['稳住'],
        ahead: ['稳住', '守住了'],
        behind: ['有点难', '我想想', '😓'],
    },
    balanced: {
        greeting: ['👍', '👏'],
        playerChat: ['👍', '🤔'],
        ambient: ['我想想', '稳住'],
        afterPlayerMove: ['好棋', '🤔'],
        afterOpponentMove: ['稳住', '👍'],
    },
    attacker: {
        greeting: ['👏', '👍'],
        ambient: ['机会来了', '🤔'],
        afterPlayerThreat: ['这步危险', '😮'],
        afterOpponentThreat: ['机会来了', '这步危险'],
        afterOpponentCapture: ['机会来了', '👏'],
        ahead: ['机会来了', '运气不错'],
        behind: ['差一点', '有点难', '😢'],
        endWin: ['👏', '运气不错'],
    },
    mobile: {
        greeting: ['👍'],
        ambient: ['🤔', '机会来了'],
        afterPlayerMove: ['😮', '我想想'],
        afterOpponentMove: ['机会来了', '👍'],
        ahead: ['机会来了', '稳住'],
        behind: ['差一点', '我想想', '😓'],
    },
    wing: {
        greeting: ['👍'],
        ambient: ['🤔', '我想想'],
        afterPlayerMove: ['好棋', '🤔'],
        afterOpponentMove: ['稳住', '机会来了'],
        ahead: ['机会来了', '稳住'],
    },
    defender: {
        greeting: ['👍'],
        ambient: ['稳住', '我想想'],
        afterPlayerThreat: ['这步危险', '有点难'],
        afterOpponentMove: ['守住了', '稳住'],
        escapedDanger: ['守住了', '差点中招'],
        ahead: ['守住了', '稳住'],
        behind: ['有点难', '我想想', '😓'],
    },
    pressure: {
        greeting: ['👏'],
        ambient: ['机会来了', '🤔'],
        afterOpponentMove: ['这步危险', '机会来了'],
        afterOpponentThreat: ['机会来了', '这步危险'],
        afterOpponentCapture: ['👏', '机会来了'],
        ahead: ['机会来了', '稳住'],
        behind: ['差一点', '有点难', '😢'],
    },
    endgame: {
        greeting: ['👍'],
        ambient: ['我想想', '稳住'],
        afterPlayerMove: ['好棋', '我想想'],
        afterOpponentMove: ['稳住', '我想想'],
        ahead: ['稳住', '守住了'],
        behind: ['有点难', '我想想', '😓'],
        endLose: ['好棋', '再来一局？', '😅'],
    },
    calculator: {
        greeting: ['👍'],
        ambient: ['我想想', '🤔'],
        playerThinkingChat: ['我想想', '🤔'],
        afterPlayerMove: ['🤔', '我想想'],
        afterPlayerThreat: ['这步危险', '我想想'],
        afterOpponentMove: ['稳住', '我想想'],
        behind: ['有点难', '我想想', '😓'],
    },
    trap: {
        greeting: ['👍'],
        ambient: ['🤔', '机会来了'],
        afterPlayerMove: ['🤔', '差点中招'],
        afterPlayerThreat: ['这步危险', '我想想'],
        afterOpponentThreat: ['机会来了', '这步危险'],
        escapedDanger: ['差点中招', '守住了', '😅'],
        ahead: ['机会来了', '稳住'],
    },
    speed: {
        greeting: ['👏', '👍'],
        ambient: ['机会来了', '👍'],
        afterPlayerMove: ['😮', '好棋'],
        afterOpponentMove: ['机会来了', '👏'],
        afterOpponentCapture: ['👏', '运气不错'],
        ahead: ['机会来了', '👍'],
        behind: ['差一点', '有点难', '😢'],
    },
    master: {
        greeting: ['👍'],
        ambient: ['我想想', '稳住'],
        playerPraiseChat: ['👍', '厉害'],
        afterPlayerMove: ['好棋', '🤔'],
        afterPlayerThreat: ['这步危险', '我想想'],
        afterOpponentMove: ['稳住', '我想想'],
        ahead: ['稳住', '守住了'],
        behind: ['有点难', '我想想', '😓'],
        endLose: ['厉害', '好棋', '😅'],
    },
};

const PLAY_STYLE = {
    casual:     { attack: 0.70, defense: 0.70, capture: 0.65, mobility: 0.85, center: 0.65, block: 0.55, support: 0.65, risk: 0.18, variety: 1.35, tempo: 1.00, opening: 'random' },
    random:     { attack: 0.90, defense: 0.78, capture: 0.90, mobility: 1.05, center: 0.75, block: 0.75, support: 0.75, risk: 0.20, variety: 1.55, tempo: 0.95, opening: 'random' },
    patient:    { attack: 0.70, defense: 1.05, capture: 0.70, mobility: 0.70, center: 0.80, block: 1.10, support: 1.05, risk: 0.06, variety: 1.10, tempo: 1.35, opening: 'edge' },
    blocker:    { attack: 0.65, defense: 1.25, capture: 0.70, mobility: 0.70, center: 0.75, block: 1.55, support: 1.10, risk: 0.04, variety: 0.95, tempo: 1.25, opening: 'wide' },
    solid:      { attack: 0.85, defense: 1.20, capture: 0.90, mobility: 0.90, center: 1.05, block: 1.20, support: 1.25, risk: 0.04, variety: 0.70, tempo: 1.10, opening: 'center' },
    balanced:   { attack: 1.00, defense: 1.00, capture: 1.00, mobility: 1.00, center: 1.00, block: 1.00, support: 1.00, risk: 0.08, variety: 0.90, tempo: 1.00, opening: 'center' },
    attacker:   { attack: 1.35, defense: 0.78, capture: 1.35, mobility: 1.05, center: 0.95, block: 0.70, support: 0.85, risk: 0.18, variety: 0.85, tempo: 0.85, opening: 'center' },
    mobile:     { attack: 1.00, defense: 0.90, capture: 0.95, mobility: 1.45, center: 1.10, block: 0.85, support: 0.90, risk: 0.12, variety: 1.15, tempo: 0.90, opening: 'wing' },
    wing:       { attack: 0.92, defense: 0.92, capture: 0.90, mobility: 1.20, center: 0.62, block: 0.95, support: 0.95, risk: 0.10, variety: 1.05, tempo: 1.00, opening: 'wing' },
    defender:   { attack: 0.75, defense: 1.45, capture: 0.90, mobility: 0.75, center: 0.85, block: 1.45, support: 1.40, risk: 0.02, variety: 0.55, tempo: 1.25, opening: 'wide' },
    pressure:   { attack: 1.18, defense: 0.95, capture: 1.15, mobility: 1.05, center: 1.20, block: 1.05, support: 1.00, risk: 0.10, variety: 0.65, tempo: 0.80, opening: 'center' },
    endgame:    { attack: 0.92, defense: 1.18, capture: 1.15, mobility: 0.88, center: 1.00, block: 1.15, support: 1.35, risk: 0.03, variety: 0.45, tempo: 1.15, opening: 'edge' },
    calculator: { attack: 1.00, defense: 1.22, capture: 1.05, mobility: 0.95, center: 1.05, block: 1.15, support: 1.35, risk: 0.02, variety: 0.35, tempo: 1.20, opening: 'center' },
    trap:       { attack: 1.10, defense: 1.05, capture: 0.92, mobility: 1.05, center: 0.95, block: 1.20, support: 1.15, risk: 0.09, variety: 0.65, tempo: 1.05, opening: 'wing' },
    speed:      { attack: 1.22, defense: 0.82, capture: 1.08, mobility: 1.25, center: 1.10, block: 0.75, support: 0.82, risk: 0.16, variety: 0.95, tempo: 0.55, opening: 'center' },
    master:     { attack: 1.08, defense: 1.24, capture: 1.10, mobility: 1.05, center: 1.12, block: 1.20, support: 1.35, risk: 0.03, variety: 0.30, tempo: 1.15, opening: 'center' },
};

function loadPlayerProfile() {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_PLAYER_PROFILE };
    try {
        const saved = localStorage.getItem(PLAYER_PROFILE_KEY);
        if (!saved) return { ...DEFAULT_PLAYER_PROFILE };
        const parsed = JSON.parse(saved);
        return {
            ...DEFAULT_PLAYER_PROFILE,
            ...parsed,
            rating: Number(parsed.rating) || DEFAULT_PLAYER_PROFILE.rating,
            wins: Number(parsed.wins) || 0,
            losses: Number(parsed.losses) || 0,
            streak: Number(parsed.streak) || 0,
            bestRating: Number(parsed.bestRating) || DEFAULT_PLAYER_PROFILE.bestRating,
            missionPoints: Number(parsed.missionPoints) || 0,
            name: String(parsed.name || DEFAULT_PLAYER_PROFILE.name).slice(0, 16),
            avatar: String(parsed.avatar || DEFAULT_PLAYER_PROFILE.avatar),
            title: String(parsed.title || DEFAULT_PLAYER_PROFILE.title),
            accent: String(parsed.accent || DEFAULT_PLAYER_PROFILE.accent),
        };
    } catch (error) {
        console.warn('Unable to load player profile:', error);
        return { ...DEFAULT_PLAYER_PROFILE };
    }
}

function savePlayerProfile() {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(playerProfile));
    } catch (error) {
        console.warn('Unable to save player profile:', error);
    }
}

function loadMatchHistory() {
    if (typeof localStorage === 'undefined') return [];
    try {
        const saved = localStorage.getItem(MATCH_HISTORY_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return parsed.slice(0, MAX_MATCH_HISTORY).map(entry => ({
            opponent: String(entry.opponent || ''),
            opponentAvatar: String(entry.opponentAvatar || '♞'),
            result: entry.result === 'win' ? 'win' : 'loss',
            ratingDelta: Number(entry.ratingDelta) || 0,
            opponentRating: Number(entry.opponentRating) || 0,
            moves: Number(entry.moves) || 0,
            forfeit: !!entry.forfeit,
            playedAt: Number(entry.playedAt) || Date.now(),
        })).filter(entry => entry.opponent);
    } catch (error) {
        console.warn('Unable to load match history:', error);
        return [];
    }
}

function saveMatchHistory() {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(matchHistory.slice(0, MAX_MATCH_HISTORY)));
    } catch (error) {
        console.warn('Unable to save match history:', error);
    }
}

function todayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

function defaultDailyMissions() {
    const progress = {};
    const claimed = {};
    DAILY_MISSION_DEFS.forEach(mission => {
        progress[mission.id] = 0;
        claimed[mission.id] = false;
    });
    return { date: todayKey(), progress, claimed };
}

function normalizeDailyMissions(saved) {
    if (!saved || saved.date !== todayKey()) return defaultDailyMissions();
    const daily = defaultDailyMissions();
    DAILY_MISSION_DEFS.forEach(mission => {
        daily.progress[mission.id] = Math.max(0, Math.min(mission.target, Number(saved.progress?.[mission.id]) || 0));
        daily.claimed[mission.id] = !!saved.claimed?.[mission.id];
    });
    return daily;
}

function loadDailyMissions() {
    if (typeof localStorage === 'undefined') return defaultDailyMissions();
    try {
        const saved = localStorage.getItem(DAILY_MISSIONS_KEY);
        return normalizeDailyMissions(saved ? JSON.parse(saved) : null);
    } catch (error) {
        console.warn('Unable to load daily missions:', error);
        return defaultDailyMissions();
    }
}

function saveDailyMissions() {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(DAILY_MISSIONS_KEY, JSON.stringify(dailyMissions));
    } catch (error) {
        console.warn('Unable to save daily missions:', error);
    }
}

function playerRankLabel(rating = playerProfile.rating) {
    if (rating >= 2000) return '大师';
    if (rating >= 1750) return '钻石';
    if (rating >= 1500) return '黄金';
    if (rating >= 1250) return '白银';
    if (rating >= 1000) return '青铜';
    return '新锐';
}

function onlineGamesPlayed() {
    return (playerProfile.wins || 0) + (playerProfile.losses || 0);
}

function hasBeginnerProtection() {
    return onlineGamesPlayed() < BEGINNER_PROTECTION_GAMES || playerProfile.rating < 1000;
}

function isProfileOptionUnlocked(item) {
    if (!item.unlock) return true;
    const amount = item.unlock.amount;
    if (item.unlock.type === 'rating') return playerProfile.rating >= amount;
    if (item.unlock.type === 'wins') return (playerProfile.wins || 0) >= amount;
    if (item.unlock.type === 'streak') return Math.max(0, playerProfile.streak || 0) >= amount;
    if (item.unlock.type === 'missionPoints') return (playerProfile.missionPoints || 0) >= amount;
    return false;
}

function findProfileOption(field, value) {
    return profileOptionsForField(field).find(item => item.value === value);
}

function populateProfileSelect(id, options, currentValue) {
    const select = document.getElementById(id);
    select.innerHTML = '';
    options.forEach(item => {
        const option = document.createElement('option');
        const unlocked = isProfileOptionUnlocked(item) || item.value === currentValue;
        option.value = item.value;
        option.textContent = unlocked ? item.label : `🔒 ${item.label} · ${item.unlock.text}`;
        option.disabled = !unlocked;
        select.appendChild(option);
    });
    select.value = options.some(item => item.value === currentValue) ? currentValue : options[0].value;
}

function renderAvatarPicker(options, currentValue) {
    const grid = document.getElementById('profile-avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    options.forEach(item => {
        const unlocked = isProfileOptionUnlocked(item) || item.value === currentValue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'avatar-choice';
        button.textContent = item.value;
        button.title = unlocked ? item.label : `${item.label} · ${item.unlock.text}`;
        button.disabled = !unlocked;
        button.classList.toggle('active', item.value === currentValue);
        button.addEventListener('click', () => updateProfileOption('avatar', item.value));
        grid.appendChild(button);
    });
}

function updateUnlockSummary(message = '') {
    const summary = document.getElementById('profile-unlock-summary');
    if (!summary) return;
    const allOptions = [...profileOptionsForField('avatar'), ...profileOptionsForField('title'), ...PROFILE_ACCENT_OPTIONS];
    const unlocked = allOptions.filter(isProfileOptionUnlocked).length;
    summary.textContent = message || `已解锁外观 ${unlocked}/${allOptions.length} · 头像库和称号已加入更多可选外观，积分、胜场、连胜和每日活跃点还能解锁稀有外观。`;
}

function loadOpponentProfiles() {
    if (typeof localStorage === 'undefined') return;
    try {
        const saved = localStorage.getItem(OPPONENT_PROFILE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        ONLINE_OPPONENTS.forEach(opponent => {
            const profile = parsed[opponent.name];
            if (!profile) return;
            opponent.rating = Number(profile.rating) || opponent.rating;
            opponent.wins = Number(profile.wins) || 0;
            opponent.losses = Number(profile.losses) || 0;
            opponent.bestRating = Number(profile.bestRating) || opponent.bestRating || opponent.rating;
            opponent.gamesVsPlayer = Number(profile.gamesVsPlayer) || 0;
            opponent.lastResultVsPlayer = profile.lastResultVsPlayer === 'win' || profile.lastResultVsPlayer === 'loss' ? profile.lastResultVsPlayer : '';
            opponent.lastPlayedAt = Number(profile.lastPlayedAt) || 0;
            opponent.awayUntil = Number(profile.awayUntil) || 0;
            opponent.firstMoveHistory = Array.isArray(profile.firstMoveHistory) ? profile.firstMoveHistory.slice(0, 8).map(String) : [];
        });
    } catch (error) {
        console.warn('Unable to load opponent profiles:', error);
    }
}

function saveOpponentProfiles() {
    if (typeof localStorage === 'undefined') return;
    try {
        const profileMap = {};
        ONLINE_OPPONENTS.forEach(opponent => {
            profileMap[opponent.name] = {
                rating: opponent.rating,
                wins: opponent.wins || 0,
                losses: opponent.losses || 0,
                bestRating: opponent.bestRating || opponent.rating,
                gamesVsPlayer: opponent.gamesVsPlayer || 0,
                lastResultVsPlayer: opponent.lastResultVsPlayer || '',
                lastPlayedAt: opponent.lastPlayedAt || 0,
                awayUntil: opponent.awayUntil || 0,
                firstMoveHistory: Array.isArray(opponent.firstMoveHistory) ? opponent.firstMoveHistory.slice(0, 8) : [],
            };
        });
        localStorage.setItem(OPPONENT_PROFILE_KEY, JSON.stringify(profileMap));
    } catch (error) {
        console.warn('Unable to save opponent profiles:', error);
    }
}

function winRateText(wins = 0, losses = 0) {
    const total = wins + losses;
    return total ? `${Math.round(wins / total * 100)}%` : '--';
}

function renderLeaderboardList(list, limit = 3) {
    if (!list) return;
    const entries = [
        ...ONLINE_OPPONENTS.map(opponent => ({
            name: opponent.name,
            avatar: opponent.avatar || '♞',
            rating: opponent.rating,
            me: false,
        })),
        {
            name: playerProfile.name || DEFAULT_PLAYER_PROFILE.name,
            avatar: playerProfile.avatar || DEFAULT_PLAYER_PROFILE.avatar,
            rating: playerProfile.rating,
            me: true,
        },
    ].sort((a, b) => b.rating - a.rating);
    const playerRank = entries.findIndex(entry => entry.me) + 1;
    const visible = entries.slice(0, limit);
    if (!visible.some(entry => entry.me)) visible.push(entries.find(entry => entry.me));

    list.innerHTML = '';
    visible.filter(Boolean).forEach(entry => {
        const row = document.createElement('div');
        row.className = `leaderboard-row${entry.me ? ' me' : ''}`;
        const rank = document.createElement('span');
        rank.textContent = `#${entries.indexOf(entry) + 1}`;
        const name = document.createElement('strong');
        name.textContent = `${entry.avatar} ${entry.me ? '你' : entry.name}`;
        const rating = document.createElement('span');
        rating.textContent = `${entry.rating}`;
        row.appendChild(rank);
        row.appendChild(name);
        row.appendChild(rating);
        list.appendChild(row);
    });

}

function renderLeaderboard() {
    renderLeaderboardList(document.getElementById('leaderboard-list'), 3);
    renderLeaderboardList(document.getElementById('leaderboard-detail-list'), 10);
}

function renderRecentMatchesList(list, limit = 3) {
    if (!list) return;
    list.innerHTML = '';
    if (!matchHistory.length) {
        const empty = document.createElement('div');
        empty.className = 'lobby-empty';
        empty.textContent = '完成在线对局后，这里会显示最近结果。';
        list.appendChild(empty);
        return;
    }
    matchHistory.slice(0, limit).forEach(entry => {
        const row = document.createElement('div');
        row.className = `recent-match-row ${entry.result}`;
        const avatar = document.createElement('span');
        avatar.textContent = entry.opponentAvatar;
        const name = document.createElement('strong');
        name.textContent = entry.opponent;
        const result = document.createElement('span');
        const sign = entry.ratingDelta > 0 ? '+' : '';
        result.textContent = `${entry.result === 'win' ? '胜' : (entry.forfeit ? '弃' : '负')} ${sign}${entry.ratingDelta}`;
        row.appendChild(avatar);
        row.appendChild(name);
        row.appendChild(result);
        list.appendChild(row);
    });
}

function renderRecentMatches() {
    renderRecentMatchesList(document.getElementById('recent-matches-list'), 3);
    renderRecentMatchesList(document.getElementById('recent-matches-detail-list'), 10);
}

function renderDailyMissionsList(list) {
    if (!list) return;
    dailyMissions = normalizeDailyMissions(dailyMissions);
    list.innerHTML = '';
    DAILY_MISSION_DEFS.forEach(mission => {
        const progress = Math.min(mission.target, dailyMissions.progress[mission.id] || 0);
        const done = progress >= mission.target;
        const row = document.createElement('div');
        row.className = `mission-row${done ? ' done' : ''}`;
        const title = document.createElement('strong');
        title.textContent = mission.title;
        const state = document.createElement('span');
        state.textContent = dailyMissions.claimed[mission.id] ? `+${mission.reward}` : `${progress}/${mission.target}`;
        row.appendChild(title);
        row.appendChild(state);
        list.appendChild(row);
    });
    const points = document.createElement('div');
    points.className = 'lobby-empty';
    points.textContent = `活跃点：${playerProfile.missionPoints || 0}`;
    list.appendChild(points);
}

function renderDailyMissions() {
    renderDailyMissionsList(document.getElementById('daily-missions-list'));
    renderDailyMissionsList(document.getElementById('daily-missions-detail-list'));
}

function updateLobbyInsights() {
    renderLeaderboard();
    renderRecentMatches();
    renderDailyMissions();
}

function currentPlayStyle() {
    if (!onlineMatch.active || !onlineMatch.opponent) return PLAY_STYLE.balanced;
    return PLAY_STYLE[onlineMatch.opponent.styleKey] || PLAY_STYLE.balanced;
}

function updatePlayerProfileUI() {
    document.documentElement.style.setProperty('--profile-accent', playerProfile.accent || DEFAULT_PLAYER_PROFILE.accent);
    document.getElementById('lobby-avatar').textContent = playerProfile.avatar || DEFAULT_PLAYER_PROFILE.avatar;
    document.getElementById('lobby-player-name').textContent = playerProfile.name || DEFAULT_PLAYER_PROFILE.name;
    document.getElementById('lobby-player-title').textContent = playerProfile.title || DEFAULT_PLAYER_PROFILE.title;
    document.getElementById('lobby-rating-rank').textContent = `${playerProfile.rating} · ${playerRankLabel()}`;
    document.getElementById('lobby-record').textContent = `${playerProfile.wins}胜 ${playerProfile.losses}负`;
    const totalGames = playerProfile.wins + playerProfile.losses;
    document.getElementById('lobby-winrate').textContent = totalGames ? `${Math.round(playerProfile.wins / totalGames * 100)}%` : '--';
    document.getElementById('lobby-best-streak').textContent = `${playerProfile.bestRating || playerProfile.rating} · ${playerProfile.streak > 0 ? '+' : ''}${playerProfile.streak || 0}`;
    const avatarOptions = profileOptionsForField('avatar');
    populateProfileSelect('profile-avatar-select', avatarOptions, playerProfile.avatar || DEFAULT_PLAYER_PROFILE.avatar);
    populateProfileSelect('profile-title-select', profileOptionsForField('title'), playerProfile.title || DEFAULT_PLAYER_PROFILE.title);
    populateProfileSelect('profile-accent-select', profileOptionsForField('accent'), playerProfile.accent || DEFAULT_PLAYER_PROFILE.accent);
    renderAvatarPicker(avatarOptions, playerProfile.avatar || DEFAULT_PLAYER_PROFILE.avatar);
    document.getElementById('profile-name-input').value = playerProfile.name || DEFAULT_PLAYER_PROFILE.name;
    document.getElementById('profile-avatar-select').value = playerProfile.avatar || DEFAULT_PLAYER_PROFILE.avatar;
    document.getElementById('profile-title-select').value = playerProfile.title || DEFAULT_PLAYER_PROFILE.title;
    document.getElementById('profile-accent-select').value = playerProfile.accent || DEFAULT_PLAYER_PROFILE.accent;
    updateUnlockSummary();
    document.getElementById('player-card').style.setProperty('--profile-accent', playerProfile.accent || DEFAULT_PLAYER_PROFILE.accent);
    document.getElementById('player-card-avatar').textContent = playerProfile.avatar || DEFAULT_PLAYER_PROFILE.avatar;
    document.getElementById('player-card-name').textContent = playerProfile.name || DEFAULT_PLAYER_PROFILE.name;
    document.getElementById('player-rating').textContent = playerProfile.rating;
    document.getElementById('player-rank').textContent = playerRankLabel();
    document.getElementById('online-my-rating').textContent = `${playerProfile.rating} · ${playerRankLabel()}`;
    document.getElementById('online-my-record').textContent = `${playerProfile.wins}胜 ${playerProfile.losses}负`;
    updateLobbyInsights();
}

function updateProfileOption(field, value) {
    if (field === 'name') {
        const cleanName = value.trim().slice(0, 16);
        playerProfile.name = cleanName || DEFAULT_PLAYER_PROFILE.name;
    } else {
        const option = findProfileOption(field, value);
        if (option && !isProfileOptionUnlocked(option)) {
            updatePlayerProfileUI();
            updateUnlockSummary(`${option.label} 还未解锁：${option.unlock.text}`);
            return;
        }
        playerProfile[field] = value;
    }
    savePlayerProfile();
    updatePlayerProfileUI();
}

function advanceDailyMission(id, amount = 1) {
    dailyMissions = normalizeDailyMissions(dailyMissions);
    const mission = DAILY_MISSION_DEFS.find(item => item.id === id);
    if (!mission || dailyMissions.claimed[id]) return;
    const current = dailyMissions.progress[id] || 0;
    dailyMissions.progress[id] = Math.min(mission.target, current + amount);
    if (dailyMissions.progress[id] >= mission.target) {
        dailyMissions.claimed[id] = true;
        playerProfile.missionPoints = (playerProfile.missionPoints || 0) + mission.reward;
        savePlayerProfile();
    }
    saveDailyMissions();
    renderDailyMissions();
}

loadOpponentProfiles();

const HORSE_MOVES = [
    { leg: [0, -1], dest: [-1, -2] },
    { leg: [0, -1], dest: [+1, -2] },
    { leg: [0, +1], dest: [-1, +2] },
    { leg: [0, +1], dest: [+1, +2] },
    { leg: [-1, 0], dest: [-2, -1] },
    { leg: [-1, 0], dest: [-2, +1] },
    { leg: [+1, 0], dest: [+2, -1] },
    { leg: [+1, 0], dest: [+2, +1] },
];

// ========================================
// Canvas Setup
// ========================================
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

function resizeBoardToViewport() {
    if (window.innerWidth <= 960) {
        canvas.style.width = '';
        return;
    }

    const container = document.getElementById('game-container');
    const header = document.getElementById('game-header');
    const onlineLobby = document.getElementById('online-lobby');
    const boardArea = document.getElementById('board-area');
    const boardShell = document.getElementById('board-shell');
    const boardFooter = document.getElementById('board-footer');
    const containerStyles = getComputedStyle(container);
    const gap = parseFloat(containerStyles.gap) || 0;
    const shellStyles = getComputedStyle(boardShell);
    const shellHorizontalPadding = parseFloat(shellStyles.paddingLeft) + parseFloat(shellStyles.paddingRight);
    const shellVerticalPadding = parseFloat(shellStyles.paddingTop) + parseFloat(shellStyles.paddingBottom);
    const availableHeight = window.innerHeight
        - document.body.offsetTop
        - header.offsetHeight
        - onlineLobby.offsetHeight
        - boardFooter.offsetHeight
        - gap * 2
        - shellVerticalPadding
        - 72;
    const availableWidth = boardArea.clientWidth - shellHorizontalPadding - 24;
    const widthFromHeight = availableHeight * (CANVAS_WIDTH / CANVAS_HEIGHT);
    const nextWidth = Math.max(320, Math.min(CANVAS_WIDTH, availableWidth, widthFromHeight));
    canvas.style.width = `${Math.floor(nextWidth)}px`;
}

window.addEventListener('resize', () => {
    resizeBoardToViewport();
    render();
});

// ========================================
// Sound Effects (Web Audio API, no files)
// ========================================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playMoveSound() {
    if (!gameOptions.sound) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
}

function playCaptureSound() {
    if (!gameOptions.sound) return;
    const ctx = getAudioCtx();
    // Impact hit
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(300, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);
    // Crunch noise
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.15);
}

function playWinSound() {
    if (!gameOptions.sound) return;
    const ctx = getAudioCtx();
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 - triumphant arpeggio
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
    });
    // Final shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'triangle';
    const tEnd = ctx.currentTime + 0.48;
    osc2.frequency.setValueAtTime(1047, tEnd);
    osc2.frequency.linearRampToValueAtTime(1100, tEnd + 0.8);
    gain2.gain.setValueAtTime(0, tEnd);
    gain2.gain.linearRampToValueAtTime(0.15, tEnd + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, tEnd + 0.8);
    osc2.start(tEnd);
    osc2.stop(tEnd + 0.8);
}

function playLoseSound() {
    if (!gameOptions.sound) return;
    const ctx = getAudioCtx();
    const notes = [392, 349, 311, 262]; // G4, F4, Eb4, C4 - descending minor
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.2;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
    });
    // Low rumble
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sawtooth';
    const tEnd = ctx.currentTime + 0.6;
    osc2.frequency.setValueAtTime(100, tEnd);
    osc2.frequency.exponentialRampToValueAtTime(50, tEnd + 0.8);
    gain2.gain.setValueAtTime(0.1, tEnd);
    gain2.gain.exponentialRampToValueAtTime(0.001, tEnd + 0.8);
    osc2.start(tEnd);
    osc2.stop(tEnd + 0.8);
}

// ========================================
// Animation State
// ========================================
let animation = {
    active: false,
    piece: null,         // piece being animated
    fromX: 0, fromY: 0, // pixel start
    toX: 0, toY: 0,     // pixel end
    startTime: 0,
    duration: 0,
    onComplete: null,
    // Capture effect
    captureEffect: null, // { x, y, startTime, duration, side }
    // Particles
    particles: [],
};

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function spawnCaptureParticles(x, y, side) {
    const color = side === 'player' ? '#ff4444' : '#5577cc';
    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
        const speed = 80 + Math.random() * 120;
        animation.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 1.5 + Math.random() * 1.0,
            radius: 3 + Math.random() * 4,
            color,
        });
    }
}

function animateMove(piece, fromCol, fromRow, toCol, toRow, capturedPiece, onComplete) {
    const from = cellCenter(fromCol, fromRow);
    const to = cellCenter(toCol, toRow);

    // Sound effects
    if (capturedPiece) {
        playCaptureSound();
    } else {
        playMoveSound();
    }

    // If there's a capture, spawn particles
    if (capturedPiece) {
        spawnCaptureParticles(to.x, to.y, capturedPiece.side);
        animation.captureEffect = {
            x: to.x, y: to.y,
            startTime: performance.now(),
            duration: CAPTURE_ANIM_DURATION,
            side: capturedPiece.side
        };
    }

    if (!gameOptions.animations) {
        render();
        if (onComplete) onComplete();
        return;
    }

    animation.active = true;
    animation.piece = piece;
    animation.fromX = from.x;
    animation.fromY = from.y;
    animation.toX = to.x;
    animation.toY = to.y;
    animation.startTime = performance.now();
    animation.duration = ANIM_DURATION;
    animation.onComplete = onComplete;

    requestAnimationFrame(animationLoop);
}

function animationLoop(timestamp) {
    const elapsed = timestamp - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);

    // Update particles
    const dt = 1 / 60;
    animation.particles = animation.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt; // gravity
        p.life -= p.decay * dt;
        return p.life > 0;
    });

    render(timestamp);

    if (progress < 1 || animation.particles.length > 0 || (animation.captureEffect && timestamp - animation.captureEffect.startTime < animation.captureEffect.duration)) {
        requestAnimationFrame(animationLoop);
    } else {
        animation.active = false;
        animation.captureEffect = null;
        const cb = animation.onComplete;
        animation.onComplete = null;
        render();
        if (cb) cb();
    }
}

// ========================================
// Game State
// ========================================
let gameState = {};

function isTutorialMode() {
    return activeTutorialIndex !== null;
}

function clearPendingAITurn() {
    if (aiTurnTimer) {
        clearTimeout(aiTurnTimer);
        aiTurnTimer = null;
    }
}

function scheduleAITurn(delay) {
    clearPendingAITurn();
    aiTurnTimer = setTimeout(() => {
        aiTurnTimer = null;
        doAITurn();
    }, delay);
}

function initGame() {
    clearPendingAITurn();
    if (rematchResponseTimer) {
        clearTimeout(rematchResponseTimer);
        rematchResponseTimer = null;
    }
    // Cancel any running animation
    animation.active = false;
    animation.particles = [];
    animation.captureEffect = null;
    animation.onComplete = null;

    gameState.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    gameState.pieces = [];

    for (let col = 0; col < COLS; col++) {
        const piece = { id: col + COLS, side: 'ai', col, row: 0, alive: true };
        gameState.pieces.push(piece);
        gameState.board[0][col] = piece;
    }
    for (let col = 0; col < COLS; col++) {
        const piece = { id: col, side: 'player', col, row: 7, alive: true };
        gameState.pieces.push(piece);
        gameState.board[7][col] = piece;
    }

    gameState.currentTurn = onlineMatch.active ? onlineMatch.firstTurn : (gameOptions.aiFirst ? 'ai' : 'player');
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.forfeit = false;
    gameState.forfeitReason = '';
    gameState.lastAIMove = null;
    gameState.aiMoveCount = 0;
    gameState.moveCount = 0;
    gameState.inputLocked = false;

    transpositionTable.clear();
    killerMoves = [{}, {}];

    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('game-over-details').textContent = '';
    updatePostGameChat(null);
    document.getElementById('rematch-status').textContent = '';
    hideForfeitConfirm();
    document.getElementById('rematch-btn').disabled = false;
    document.getElementById('rematch-btn').textContent = '请求再战';
    document.getElementById('return-lobby-btn').disabled = false;
    document.getElementById('play-again-btn').disabled = false;
    if (!isTutorialMode()) {
        document.getElementById('game-tip').textContent = '目标：率先到达对方底线，或吃掉所有对方棋子。';
    }
    resetOnlineChat();
    updateTurnIndicator();
    resizeBoardToViewport();
    render();
    if (onlineMatch.active) {
        onlineMatch.opponentRequestedRematch = false;
        scheduleOpponentChat('greeting', 0.55, 900, 2600);
        scheduleAmbientOpponentChat(true);
    }
    if (gameState.currentTurn === 'ai') {
        gameState.inputLocked = true;
        scheduleAITurn(getOpponentThinkDelay());
    }
}

function addTutorialPiece(side, col, row, id) {
    const piece = { id, side, col, row, alive: true };
    gameState.pieces.push(piece);
    gameState.board[row][col] = piece;
}

function renderTutorialSelector() {
    const selector = document.getElementById('tutorial-selector');
    if (!selector) return;
    selector.innerHTML = '';
    TUTORIAL_CHALLENGES.forEach((challenge, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tutorial-btn';
        button.dataset.tutorial = String(index);
        button.textContent = `${index + 1}. ${challenge.shortTitle || challenge.title}`;
        button.classList.toggle('active', index === activeTutorialIndex);
        button.addEventListener('click', () => initTutorialChallenge(index));
        selector.appendChild(button);
    });
}

function updateTutorialUI(message = '') {
    const challenge = TUTORIAL_CHALLENGES[activeTutorialIndex] || TUTORIAL_CHALLENGES[0];
    const title = document.getElementById('tutorial-title');
    const desc = document.getElementById('tutorial-desc');
    const status = document.getElementById('tutorial-status');
    renderTutorialSelector();
    if (title) title.textContent = `第 ${activeTutorialIndex + 1}/${TUTORIAL_CHALLENGES.length} 关：${challenge.title}`;
    if (desc) desc.textContent = challenge.desc;
    const limitText = challenge.maxMoves ? `限 ${challenge.maxMoves} 步，已走 ${gameState.moveCount || 0} 步。` : '';
    if (status) status.textContent = message || `${limitText}提示：${challenge.hint} 完成目标后自动进入下一关。`;
    document.getElementById('game-tip').textContent = `${challenge.desc} ${challenge.hint}`;
}

function initTutorialChallenge(index = activeTutorialIndex || 0) {
    clearPendingAITurn();
    activeTutorialIndex = Math.max(0, Math.min(TUTORIAL_CHALLENGES.length - 1, Number(index) || 0));
    const challenge = TUTORIAL_CHALLENGES[activeTutorialIndex];
    animation.active = false;
    animation.particles = [];
    animation.captureEffect = null;
    animation.onComplete = null;
    gameState.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    gameState.pieces = [];
    challenge.pieces.forEach((piece, pieceIndex) => addTutorialPiece(piece.side, piece.col, piece.row, pieceIndex));
    gameState.currentTurn = 'player';
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.forfeit = false;
    gameState.lastAIMove = null;
    gameState.aiMoveCount = 0;
    gameState.moveCount = 0;
    gameState.inputLocked = false;
    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('game-over-details').textContent = '';
    updatePostGameChat(null);
    updateTutorialUI();
    updateTurnIndicator();
    resizeBoardToViewport();
    render();
}

function startTutorialMode(index = 0) {
    cancelMatchmaking(false);
    closeRealtimeConnection();
    onlineMatch = { active: false, searching: false, opponent: null };
    activeTutorialIndex = Number(index) || 0;
    resetOnlineChat();
    updateOnlinePanel();
    updateDifficultyButtons();
    updateModeSpecificUI();
    showGameScreen();
    initTutorialChallenge(activeTutorialIndex);
}

function isTutorialComplete(capturedPiece) {
    const challenge = TUTORIAL_CHALLENGES[activeTutorialIndex];
    if (!challenge) return false;
    if (challenge.goal === 'capture') return !!capturedPiece && capturedPiece.side === 'ai';
    if (challenge.goal === 'captureAll') return !gameState.pieces.some(piece => piece.side === 'ai' && piece.alive);
    if (challenge.goal === 'finish') return gameState.pieces.some(piece => piece.side === 'player' && piece.alive && piece.row === 0);
    if (challenge.goal === 'target') {
        return gameState.pieces.some(piece => piece.side === 'player' && piece.alive && piece.col === challenge.target.col && piece.row === challenge.target.row);
    }
    return false;
}

function chooseTutorialAIMove() {
    const moves = getOrderedMoves('ai', 0);
    if (!moves.length) return null;
    const winningMove = moves.find(({ piece, move }) => isGoalMove(piece, move));
    if (winningMove) return winningMove;
    const captureMove = moves.find(({ move }) => move.isCapture);
    return captureMove || moves[0];
}

function finishFailedTutorial(message) {
    gameState.gameOver = true;
    gameState.winner = 'ai';
    gameState.inputLocked = false;
    updateTutorialUI(message);
    updateTurnIndicator();
    render();
    setTimeout(() => {
        if (isTutorialMode()) initTutorialChallenge(activeTutorialIndex);
    }, 1300);
}

function doTutorialAITurn() {
    if (!isTutorialMode() || gameState.gameOver || gameState.currentTurn !== 'ai') return;
    const choice = chooseTutorialAIMove();
    if (!choice) {
        gameState.currentTurn = 'player';
        gameState.inputLocked = false;
        updateTutorialUI('蓝方暂无可走位置，继续完成目标。');
        updateTurnIndicator();
        render();
        return;
    }

    const piece = choice.piece;
    const move = choice.move;
    const fromCol = piece.col;
    const fromRow = piece.row;
    const capturedPiece = move.isCapture ? gameState.board[move.row][move.col] : null;
    gameState.lastAIMove = { pieceId: piece.id, fromCol, fromRow, toCol: move.col, toRow: move.row };
    executeMove(piece, move);

    animateMove(piece, fromCol, fromRow, move.col, move.row, capturedPiece, () => {
        if (!isTutorialMode()) return;
        gameState.inputLocked = false;
        if (checkWin() && gameState.winner === 'ai') {
            finishFailedTutorial('蓝方已经完成冲线或吃光红子。真实对局中慢一步就会输，重新挑战。');
            return;
        }
        gameState.currentTurn = 'player';
        updateTutorialUI(capturedPiece
            ? '蓝方刚刚吃掉了一枚红子。现在从变化后的局面继续找最佳手。'
            : '蓝方已经回应了一步。观察黄色标记的位置，再继续完成目标。');
        updateTurnIndicator();
        render();
    });
}

function handleTutorialAfterMove(capturedPiece) {
    const challenge = TUTORIAL_CHALLENGES[activeTutorialIndex];
    if (isTutorialComplete(capturedPiece)) {
        gameState.gameOver = true;
        gameState.winner = 'player';
        updateTutorialUI(challenge.success);
        updateTurnIndicator();
        render();
        setTimeout(() => {
            if (!isTutorialMode()) return;
            if (activeTutorialIndex < TUTORIAL_CHALLENGES.length - 1) {
                initTutorialChallenge(activeTutorialIndex + 1);
            } else {
                showGameOver('教程完成！');
            }
        }, 900);
        return;
    }
    if (challenge.maxMoves && (gameState.moveCount || 0) >= challenge.maxMoves) {
        gameState.gameOver = true;
        updateTutorialUI(`这条路线超过了 ${challenge.maxMoves} 步限制，实战里会慢一拍。重新摆局再试。`);
        updateTurnIndicator();
        render();
        setTimeout(() => {
            if (isTutorialMode()) initTutorialChallenge(activeTutorialIndex);
        }, 1100);
        return;
    }
    gameState.currentTurn = 'ai';
    gameState.inputLocked = true;
    updateTutorialUI(`还没完成目标。蓝方现在会走一步。${challenge.maxMoves ? `你还剩 ${challenge.maxMoves - (gameState.moveCount || 0)} 步。` : ''}`);
    updateTurnIndicator();
    render();
    clearPendingAITurn();
    aiTurnTimer = setTimeout(() => {
        aiTurnTimer = null;
        doTutorialAITurn();
    }, 650);
}

// ========================================
// Movement Logic (with 别马腿)
// ========================================
function getValidMoves(piece) {
    const moves = [];
    for (const move of HORSE_MOVES) {
        const legCol = piece.col + move.leg[0];
        const legRow = piece.row + move.leg[1];
        const destCol = piece.col + move.dest[0];
        const destRow = piece.row + move.dest[1];

        if (legCol < 0 || legCol >= COLS || legRow < 0 || legRow >= ROWS) continue;
        if (destCol < 0 || destCol >= COLS || destRow < 0 || destRow >= ROWS) continue;
        if (gameState.board[legRow][legCol] !== null) continue;

        const target = gameState.board[destRow][destCol];
        if (target !== null && target.side === piece.side) continue;

        moves.push({
            col: destCol,
            row: destRow,
            isCapture: target !== null && target.side !== piece.side
        });
    }
    return moves;
}

function executeMove(piece, move) {
    if (move.isCapture) {
        const captured = gameState.board[move.row][move.col];
        captured.alive = false;
    }
    gameState.board[piece.row][piece.col] = null;
    piece.col = move.col;
    piece.row = move.row;
    gameState.board[move.row][move.col] = piece;
}

// ========================================
// Win Detection
// ========================================
function checkWin() {
    for (const piece of gameState.pieces) {
        if (!piece.alive) continue;
        if (piece.side === 'player' && piece.row === 0) {
            gameState.gameOver = true;
            gameState.winner = 'player';
            return true;
        }
        if (piece.side === 'ai' && piece.row === 7) {
            gameState.gameOver = true;
            gameState.winner = 'ai';
            return true;
        }
    }
    const playerAlive = gameState.pieces.some(p => p.side === 'player' && p.alive);
    const aiAlive = gameState.pieces.some(p => p.side === 'ai' && p.alive);
    if (!playerAlive) { gameState.gameOver = true; gameState.winner = 'ai'; return true; }
    if (!aiAlive) { gameState.gameOver = true; gameState.winner = 'player'; return true; }
    return false;
}

function isGameOver() {
    for (const piece of gameState.pieces) {
        if (!piece.alive) continue;
        if (piece.side === 'player' && piece.row === 0) return true;
        if (piece.side === 'ai' && piece.row === 7) return true;
    }
    return !gameState.pieces.some(p => p.side === 'player' && p.alive)
        || !gameState.pieces.some(p => p.side === 'ai' && p.alive);
}

// ========================================
// AI Logic (Advanced Minimax + Alpha-Beta)
// ========================================
let transpositionTable = new Map();
let aiStartTime = 0;
let nodesSearched = 0;
let killerMoves = [{}, {}]; // killer move heuristic per depth
let rootMoveScores = [];

function boardHash() {
    let hash = '';
    for (const p of gameState.pieces) {
        hash += p.alive ? `${p.col},${p.row}` : 'X';
        hash += '|';
    }
    return hash;
}

const distanceCache = new Map();
function minHorseDistance(col, row, targetRow) {
    const key = `${col},${row},${targetRow}`;
    if (distanceCache.has(key)) return distanceCache.get(key);
    if (row === targetRow) { distanceCache.set(key, 0); return 0; }

    const visited = new Set();
    const queue = [[col, row, 0]];
    visited.add(`${col},${row}`);
    while (queue.length > 0) {
        const [c, r, d] = queue.shift();
        for (const move of HORSE_MOVES) {
            const nc = c + move.dest[0];
            const nr = r + move.dest[1];
            if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
            if (nr === targetRow) { distanceCache.set(key, d + 1); return d + 1; }
            const nk = `${nc},${nr}`;
            if (!visited.has(nk)) { visited.add(nk); queue.push([nc, nr, d + 1]); }
        }
    }
    distanceCache.set(key, 99);
    return 99;
}

function evaluateBoard() {
    const diff = DIFFICULTY[currentDifficulty];
    let score = 0;

    const aiPieces = [];
    const playerPieces = [];
    for (const p of gameState.pieces) {
        if (!p.alive) continue;
        if (p.side === 'ai') aiPieces.push(p);
        else playerPieces.push(p);
    }

    // Terminal
    for (const p of aiPieces) { if (p.row === 7) return 200000; }
    for (const p of playerPieces) { if (p.row === 0) return -200000; }
    if (playerPieces.length === 0) return 200000;
    if (aiPieces.length === 0) return -200000;

    // Material
    score += (aiPieces.length - playerPieces.length) * 300;

    let aiMinDist = 99, playerMinDist = 99;
    let aiThreats = 0, playerThreats = 0;

    for (const p of aiPieces) {
        const dist = minHorseDistance(p.col, p.row, 7);
        if (dist < aiMinDist) aiMinDist = dist;
        score += p.row * p.row * 5;
        score += (7 - dist) * 35;
        const moves = getValidMoves(p);
        score += moves.length * 7;
        for (const m of moves) {
            if (m.row > p.row) score += 8;
            if (m.row === 7) { score += 1200; aiThreats++; }
            if (m.isCapture) score += 90;
        }
        if (p.col >= 1 && p.col <= 4) score += 10;
        if (p.col >= 2 && p.col <= 3) score += 12;

        const attackers = countThreatsToSquare('player', p.col, p.row);
        const defenders = countControlsToSquare('ai', p.col, p.row, p);
        if (attackers > 0) score -= defenders > 0 ? 70 : 180;
    }

    for (const p of playerPieces) {
        const dist = minHorseDistance(p.col, p.row, 0);
        if (dist < playerMinDist) playerMinDist = dist;
        score -= (7 - p.row) * (7 - p.row) * 5;
        score -= (7 - dist) * 35;
        const moves = getValidMoves(p);
        score -= moves.length * 7;
        for (const m of moves) {
            if (m.row < p.row) score -= 8;
            if (m.row === 0) { score -= 1200; playerThreats++; }
            if (m.isCapture) score -= 90;
        }
        if (p.col >= 1 && p.col <= 4) score -= 10;
        if (p.col >= 2 && p.col <= 3) score -= 12;

        const attackers = countThreatsToSquare('ai', p.col, p.row);
        const defenders = countControlsToSquare('player', p.col, p.row, p);
        if (attackers > 0) score += defenders > 0 ? 70 : 180;
    }

    // Race
    score += (playerMinDist - aiMinDist) * 140;
    score += (aiThreats - playerThreats) * 650;

    if (!diff.tactics) {
        // Easy mode: add some randomness to make it weaker
        score += (Math.random() - 0.5) * 100;
        return Math.round(score * diff.evalMult);
    }

    // Threat awareness
    if (playerMinDist <= 1) {
        score -= 3000;
        for (const pp of playerPieces) {
            if (minHorseDistance(pp.col, pp.row, 0) <= 1) {
                for (const ap of aiPieces) {
                    const moves = getValidMoves(ap);
                    for (const m of moves) {
                        if (m.col === pp.col && m.row === pp.row) score += 2000;
                    }
                }
                for (const move of HORSE_MOVES) {
                    const destCol = pp.col + move.dest[0];
                    const destRow = pp.row + move.dest[1];
                    if (destRow === 0 && destCol >= 0 && destCol < COLS) {
                        const legCol = pp.col + move.leg[0];
                        const legRow = pp.row + move.leg[1];
                        if (legRow >= 0 && legRow < ROWS && legCol >= 0 && legCol < COLS) {
                            for (const ap of aiPieces) {
                                const aMoves = getValidMoves(ap);
                                for (const am of aMoves) {
                                    if (am.col === legCol && am.row === legRow) score += 800;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if (aiMinDist <= 1) score += 3000;
    if (aiMinDist <= 2) score += 800;
    if (playerMinDist <= 2) score -= 1000;

    // Blocking strategy
    for (const pp of playerPieces) {
        for (const move of HORSE_MOVES) {
            const legCol = pp.col + move.leg[0];
            const legRow = pp.row + move.leg[1];
            if (legRow >= 0 && legRow < ROWS && legCol >= 0 && legCol < COLS) {
                const blocker = gameState.board[legRow][legCol];
                if (blocker && blocker.side === 'ai') {
                    const destRow = pp.row + move.dest[1];
                    score += destRow < pp.row ? 25 : 8;
                }
            }
        }
    }

    // Coordination
    for (let i = 0; i < aiPieces.length; i++) {
        for (let j = i + 1; j < aiPieces.length; j++) {
            const dx = Math.abs(aiPieces[i].col - aiPieces[j].col);
            const dy = Math.abs(aiPieces[i].row - aiPieces[j].row);
            if ((dx === 1 && dy === 2) || (dx === 2 && dy === 1)) score += 15;
        }
    }

    score += scoreBoardForPlayStyle(aiPieces, playerPieces);

    // === Nightmare-level extras ===
    if (diff.evalMult > 1.0) {
        // Tempo: count who has more immediate threats
        let aiThreats = 0, playerThreats = 0;
        for (const p of aiPieces) {
            const moves = getValidMoves(p);
            for (const m of moves) {
                if (m.row === 7) aiThreats++;
                if (m.isCapture) aiThreats += 0.5;
            }
        }
        for (const p of playerPieces) {
            const moves = getValidMoves(p);
            for (const m of moves) {
                if (m.row === 0) playerThreats++;
                if (m.isCapture) playerThreats += 0.5;
            }
        }
        score += (aiThreats - playerThreats) * 40;

        // Multi-piece coordination for creating unstoppable dual threats
        let aiPiecesNearGoal = aiPieces.filter(p => p.row >= 4).length;
        let playerPiecesNearGoal = playerPieces.filter(p => p.row <= 3).length;
        score += (aiPiecesNearGoal - playerPiecesNearGoal) * 30;

        // Punish having pieces stuck on edges
        for (const p of aiPieces) {
            if (p.col === 0 || p.col === COLS - 1) score -= 10;
        }
        for (const p of playerPieces) {
            if (p.col === 0 || p.col === COLS - 1) score += 10;
        }

        // Fork detection: AI pieces that threaten multiple forward destinations
        for (const p of aiPieces) {
            const moves = getValidMoves(p);
            let forwardMoves = moves.filter(m => m.row > p.row);
            if (forwardMoves.length >= 3) score += 40; // very mobile forward
        }
    }

    return Math.round(score * diff.evalMult);
}

function saveMove(piece, move) {
    return {
        piece,
        fromCol: piece.col,
        fromRow: piece.row,
        capturedPiece: move.isCapture ? gameState.board[move.row][move.col] : null
    };
}

function restoreMove(saved) {
    const piece = saved.piece;
    gameState.board[piece.row][piece.col] = null;
    if (saved.capturedPiece) {
        saved.capturedPiece.alive = true;
        gameState.board[saved.capturedPiece.row][saved.capturedPiece.col] = saved.capturedPiece;
    }
    piece.col = saved.fromCol;
    piece.row = saved.fromRow;
    gameState.board[piece.row][piece.col] = piece;
}

function moveKey(piece, move) {
    return `${piece.id}:${move.col},${move.row}`;
}

function fullMoveKey(piece, move) {
    return `${piece.id}:${piece.col},${piece.row}>${move.col},${move.row}`;
}

function opponentOf(side) {
    return side === 'ai' ? 'player' : 'ai';
}

function isGoalMove(piece, move) {
    return piece.side === 'ai' ? move.row === ROWS - 1 : move.row === 0;
}

function getImmediateGoalMoves(side) {
    const goalMoves = [];
    const pieces = gameState.pieces.filter(p => p.alive && p.side === side);
    for (const piece of pieces) {
        const moves = getValidMoves(piece);
        for (const move of moves) {
            if (isGoalMove(piece, move)) {
                goalMoves.push({ piece, move });
            }
        }
    }
    return goalMoves;
}

function scoreImmediateConsequences(piece, move) {
    const saved = saveMove(piece, move);
    executeMove(piece, move);
    const ownThreats = getImmediateGoalMoves(piece.side).length;
    const opponentThreats = getImmediateGoalMoves(opponentOf(piece.side)).length;
    restoreMove(saved);

    return ownThreats * 3000 - opponentThreats * 5000;
}

function scoreOpponentMoveMemory(piece, move) {
    if (!onlineMatch.active || !onlineMatch.opponent || piece.side !== 'ai') return 0;
    let score = 0;
    const key = fullMoveKey(piece, move);
    const salt = `${onlineMatch.opponent.name}:${onlineMatch.roomId}:${key}:${gameState.moveCount}:${onlineMatch.moveSalt || 0}`;
    const style = currentPlayStyle();
    const noiseScale = gameState.moveCount <= 8 ? 44 : 18;
    score += Math.round((stableNameValue(salt, 211) - 0.5) * noiseScale * Math.max(0.4, style.variety));

    if ((gameState.aiMoveCount || 0) === 0) {
        const history = Array.isArray(onlineMatch.opponent.firstMoveHistory) ? onlineMatch.opponent.firstMoveHistory : [];
        const repeatCount = history.filter(item => item === key).length;
        if (repeatCount) score -= 70 + repeatCount * 55;
        if (history[0] === key) score -= 90;
    }

    return score;
}

function countThreatsToSquare(side, col, row) {
    let threats = 0;
    const pieces = gameState.pieces.filter(p => p.alive && p.side === side);
    for (const piece of pieces) {
        const moves = getValidMoves(piece);
        if (moves.some(m => m.col === col && m.row === row)) threats++;
    }
    return threats;
}

function countControlsToSquare(side, col, row, ignoredPiece = null) {
    let controls = 0;
    const pieces = gameState.pieces.filter(p => p.alive && p.side === side && p !== ignoredPiece);
    for (const piece of pieces) {
        for (const move of HORSE_MOVES) {
            const legCol = piece.col + move.leg[0];
            const legRow = piece.row + move.leg[1];
            const destCol = piece.col + move.dest[0];
            const destRow = piece.row + move.dest[1];
            if (destCol !== col || destRow !== row) continue;
            if (legCol < 0 || legCol >= COLS || legRow < 0 || legRow >= ROWS) continue;
            if (gameState.board[legRow][legCol] === null) controls++;
        }
    }
    return controls;
}

function scoreOpeningPreference(piece, move, style) {
    if (!onlineMatch.active || gameState.moveCount > 5 || piece.side !== 'ai') return 0;
    const centerDistance = Math.abs(move.col - (COLS - 1) / 2);
    const edgeDistance = Math.min(move.col, COLS - 1 - move.col);
    switch (style.opening) {
        case 'center':
            return (2.5 - centerDistance) * 22;
        case 'edge':
            return (2 - edgeDistance) * 18;
        case 'wide':
            return centerDistance * 16;
        case 'wing':
            return (move.col <= 1 || move.col >= COLS - 2) ? 28 : -8;
        case 'random':
            return ((piece.id * 17 + move.col * 11 + move.row * 7) % 31) - 15;
        default:
            return 0;
    }
}

function scoreMoveStyleFeatures(piece, move, depth = 0) {
    if (!onlineMatch.active || piece.side !== 'ai') return 0;
    const style = currentPlayStyle();
    const forward = move.row - piece.row;
    const centerDistance = Math.abs(move.col - (COLS - 1) / 2);
    let score = 0;

    score += forward * 22 * style.attack;
    score += (2.5 - centerDistance) * 12 * style.center;
    if (move.isCapture) score += 55 * style.capture;
    score += scoreOpeningPreference(piece, move, style);

    if (depth > 1) return Math.round(score);

    const saved = saveMove(piece, move);
    executeMove(piece, move);
    const landingThreats = countThreatsToSquare('player', move.col, move.row);
    const support = countControlsToSquare('ai', move.col, move.row, piece);
    const mobility = getValidMoves(piece).length;
    const playerGoalThreat = getImmediateGoalMoves('player').length > 0;
    restoreMove(saved);

    score += mobility * 9 * style.mobility;
    score += support * 28 * style.support;
    score -= landingThreats * 75 * (1 - style.risk);
    if (landingThreats > support && !move.isCapture) score -= 45 * style.defense;
    if (playerGoalThreat) score += 90 * style.defense;

    return Math.round(score);
}

function scoreBoardForPlayStyle(aiPieces, playerPieces) {
    if (!onlineMatch.active || !onlineMatch.opponent) return 0;
    const style = currentPlayStyle();
    let score = 0;

    for (const piece of aiPieces) {
        const moves = getValidMoves(piece);
        const forwardMoves = moves.filter(move => move.row > piece.row).length;
        const captureMoves = moves.filter(move => move.isCapture).length;
        const centerDistance = Math.abs(piece.col - (COLS - 1) / 2);
        const attackers = countThreatsToSquare('player', piece.col, piece.row);
        const defenders = countControlsToSquare('ai', piece.col, piece.row, piece);

        score += forwardMoves * 12 * style.attack;
        score += captureMoves * 35 * style.capture;
        score += moves.length * 8 * style.mobility;
        score += (2.5 - centerDistance) * 12 * style.center;
        score += defenders * 18 * style.support;
        if (attackers > 0) score -= attackers * 65 * (1 - style.risk);
    }

    for (const piece of playerPieces) {
        const moves = getValidMoves(piece);
        const playerForward = moves.filter(move => move.row < piece.row).length;
        const playerCaptures = moves.filter(move => move.isCapture).length;
        score -= playerForward * 10 * style.defense;
        score -= playerCaptures * 28 * style.defense;

        for (const move of HORSE_MOVES) {
            const legCol = piece.col + move.leg[0];
            const legRow = piece.row + move.leg[1];
            if (legRow < 0 || legRow >= ROWS || legCol < 0 || legCol >= COLS) continue;
            const blocker = gameState.board[legRow][legCol];
            if (blocker && blocker.side === 'ai') score += 24 * style.block;
        }
    }

    return Math.round(score);
}

function scoreHumanMoveFeatures(piece, move) {
    const diff = DIFFICULTY[currentDifficulty];
    if (!diff.humanBias) return 0;

    const isAI = piece.side === 'ai';
    const forward = isAI ? move.row - piece.row : piece.row - move.row;
    const centerDistance = Math.abs(move.col - (COLS - 1) / 2);
    let score = 0;

    score += forward * 18;
    score += (2.5 - centerDistance) * 8;
    if (forward < 0 && !move.isCapture) score -= 35;
    if (move.isCapture) score += 60;

    if (isAI && gameState.lastAIMove && gameState.lastAIMove.pieceId === piece.id) {
        score += 25;
        if (move.col === gameState.lastAIMove.fromCol && move.row === gameState.lastAIMove.fromRow) {
            score -= 55;
        }
    }

    const saved = saveMove(piece, move);
    executeMove(piece, move);

    const opponent = opponentOf(piece.side);
    const landingThreats = countThreatsToSquare(opponent, move.col, move.row);
    const support = countControlsToSquare(piece.side, move.col, move.row, piece);
    score += support * 25;
    if (landingThreats > 0) score -= move.isCapture ? 30 : 70;
    score += getValidMoves(piece).length * 6;

    for (const teammate of gameState.pieces) {
        if (!teammate.alive || teammate.side !== piece.side || teammate === piece) continue;
        const dx = Math.abs(teammate.col - piece.col);
        const dy = Math.abs(teammate.row - piece.row);
        if (dx <= 2 && dy <= 2) score += 8;
        if ((dx === 1 && dy === 2) || (dx === 2 && dy === 1)) score += 14;
    }

    restoreMove(saved);
    return Math.round(score * diff.humanBias);
}

function scoreMoveForOrdering(piece, move, isAI, depth) {
    let s = 0;
    if (move.isCapture) s += 10000;
    if (isAI) {
        s += move.row * 100;
        if (move.row === 7) s += 50000;
    } else {
        s += (7 - move.row) * 100;
        if (move.row === 0) s += 50000;
    }
    if (move.col >= 2 && move.col <= 3) s += 20;
    s += scoreImmediateConsequences(piece, move);
    s += scoreMoveStyleFeatures(piece, move, depth);
    if (isAI && depth === 0) s += scoreOpponentMoveMemory(piece, move);

    // Killer move heuristic
    const diff = DIFFICULTY[currentDifficulty];
    if (diff.killer && depth < killerMoves.length) {
        const key = moveKey(piece, move);
        if (killerMoves[depth % killerMoves.length][key]) s += 5000;
    }
    return s;
}

function getOrderedMoves(side, depth) {
    const isAI = side === 'ai';
    const pieces = gameState.pieces.filter(p => p.alive && p.side === side);
    const allMoves = [];
    for (const piece of pieces) {
        const moves = getValidMoves(piece);
        for (const move of moves) {
            allMoves.push({ piece, move, score: scoreMoveForOrdering(piece, move, isAI, depth) });
        }
    }
    allMoves.sort((a, b) => b.score - a.score);
    return allMoves;
}

function chooseImmediateTacticalMove() {
    const aiMoves = getOrderedMoves('ai', 0);
    const winningMove = aiMoves.find(({ piece, move }) => isGoalMove(piece, move));
    if (winningMove) {
        return { score: 200000, move: { piece: winningMove.piece, move: winningMove.move } };
    }

    if (getImmediateGoalMoves('player').length === 0) {
        return null;
    }

    let bestSafeMove = null;
    let bestSafeScore = -Infinity;
    for (const { piece, move } of aiMoves) {
        const saved = saveMove(piece, move);
        executeMove(piece, move);
        const playerCanWinNext = getImmediateGoalMoves('player').length > 0;
        const score = evaluateBoard();
        restoreMove(saved);

        if (!playerCanWinNext && score > bestSafeScore) {
            bestSafeScore = score;
            bestSafeMove = { piece, move };
        }
    }

    return bestSafeMove ? { score: bestSafeScore, move: bestSafeMove } : null;
}

function hasUrgentDanger() {
    if (getImmediateGoalMoves('player').length > 0) return true;

    for (const piece of gameState.pieces) {
        if (!piece.alive || piece.side !== 'ai') continue;
        const attackers = countThreatsToSquare('player', piece.col, piece.row);
        const defenders = countControlsToSquare('ai', piece.col, piece.row, piece);
        if (attackers > 0 && defenders === 0) return true;
    }
    return false;
}

function getMoveSafety(piece, move) {
    const saved = saveMove(piece, move);
    executeMove(piece, move);
    const playerCanWinNext = getImmediateGoalMoves('player').length > 0;
    const landingThreats = countThreatsToSquare('player', move.col, move.row);
    const support = countControlsToSquare('ai', move.col, move.row, piece);
    restoreMove(saved);

    return { playerCanWinNext, landingThreats, support };
}

function isSafeVarietyMove(candidate) {
    const safety = getMoveSafety(candidate.piece, candidate.move);
    if (safety.playerCanWinNext) return false;
    if (safety.landingThreats === 0) return true;
    if (!candidate.move.isCapture) return false;
    return safety.support >= safety.landingThreats;
}

function chooseWeightedMove(candidates, bestScore, temperature) {
    const weights = candidates.map(candidate => Math.exp((candidate.score - bestScore) / temperature));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let pick = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
        pick -= weights[i];
        if (pick <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function chooseVariedStrategicMove(bestResult, scoredMoves) {
    if (!bestResult || !bestResult.move || scoredMoves.length <= 1) return bestResult;

    const diff = DIFFICULTY[currentDifficulty];
    const style = currentPlayStyle();
    if (hasUrgentDanger()) return bestResult;
    const antiFarmBoost = onlineMatch.active ? ((gameState.moveCount || 0) < 10 ? 0.24 : 0.12) : 0;
    if (Math.random() > Math.min(0.82, diff.varietyChance * style.variety + antiFarmBoost)) return bestResult;

    const bestScore = Math.max(bestResult.score, ...scoredMoves.map(candidate => candidate.score));
    if (Math.abs(bestScore) >= 100000) return bestResult;
    if (bestScore < -200) return bestResult;

    const candidates = scoredMoves.filter(candidate =>
        candidate.score >= bestScore - diff.varietyWindow * style.variety - (onlineMatch.active ? 24 : 0)
        && isSafeVarietyMove(candidate)
    );

    if (candidates.length <= 1) return bestResult;

    const humanizedCandidates = candidates.map(candidate => ({
        piece: candidate.piece,
        move: candidate.move,
        searchScore: candidate.score,
        score: candidate.score + scoreHumanMoveFeatures(candidate.piece, candidate.move) + scoreMoveStyleFeatures(candidate.piece, candidate.move)
    }));
    const bestHumanScore = Math.max(...humanizedCandidates.map(candidate => candidate.score));
    const selected = chooseWeightedMove(humanizedCandidates, bestHumanScore, Math.max(4, diff.varietyTemp * style.variety));
    return { score: selected.searchScore, move: { piece: selected.piece, move: selected.move } };
}

function onlineCarelessMistakeChance() {
    if (!onlineMatch.active || !onlineMatch.opponent) return 0;
    const difficulty = onlineMatch.opponent.difficulty;
    if (difficulty !== 'beginner' && difficulty !== 'easy' && difficulty !== 'medium') return 0;
    let chance = difficulty === 'beginner' ? 0.115 : (difficulty === 'easy' ? 0.075 : 0.032);
    if (onlineMatch.opponent.styleKey === 'random') chance += 0.025;
    if (onlineMatch.opponent.styleKey === 'speed') chance += 0.012;
    if (getMaterialBalance() >= 2) chance += 0.018;
    if (gameState.moveCount <= 3) chance *= 0.55;
    return Math.min(difficulty === 'beginner' ? 0.16 : 0.12, chance);
}

function chooseCarelessOnlineMove() {
    if (Math.random() > onlineCarelessMistakeChance()) return null;
    if (getImmediateGoalMoves('ai').length > 0 || getImmediateGoalMoves('player').length > 0) return null;

    const moves = getOrderedMoves('ai', 0);
    if (moves.length < 4) return null;

    const scored = [];
    for (const { piece, move } of moves) {
        const saved = saveMove(piece, move);
        executeMove(piece, move);
        const allowsImmediateGoal = getImmediateGoalMoves('player').length > 0;
        const score = evaluateBoard();
        restoreMove(saved);
        if (!allowsImmediateGoal) scored.push({ piece, move, score });
    }

    if (scored.length < 3) return null;
    scored.sort((a, b) => b.score - a.score);
    const bestScore = scored[0].score;
    const difficulty = onlineMatch.opponent.difficulty;
    const minDrop = difficulty === 'beginner' ? 90 : (difficulty === 'easy' ? 140 : 80);
    const maxDrop = difficulty === 'beginner' ? 920 : (difficulty === 'easy' ? 760 : 360);
    const candidates = scored.filter(candidate =>
        candidate.score <= bestScore - minDrop
        && candidate.score >= bestScore - maxDrop
        && !isGoalMove(candidate.piece, candidate.move)
    );

    if (!candidates.length) return null;
    const pool = candidates.slice(-Math.min(candidates.length, difficulty === 'beginner' ? 6 : (difficulty === 'easy' ? 5 : 3)));
    const selected = pool[Math.floor(Math.random() * pool.length)];
    return { score: selected.score, move: { piece: selected.piece, move: selected.move }, careless: true };
}

function terminalScore(depthRemaining) {
    const score = evaluateBoard();
    if (score > 100000) return score + depthRemaining * 1000;
    if (score < -100000) return score - depthRemaining * 1000;
    return score;
}

function minimax(depth, isMaximizing, alpha, beta, maxDepth) {
    nodesSearched++;
    const diff = DIFFICULTY[currentDifficulty];

    if ((nodesSearched & 4095) === 0 && Date.now() - aiStartTime > diff.maxTime) {
        return { score: evaluateBoard(), move: null, timeout: true };
    }

    if (isGameOver()) {
        return { score: terminalScore(depth), move: null };
    }

    if (depth === 0) {
        return { score: evaluateBoard(), move: null };
    }

    // Transposition table
    const hash = boardHash() + (isMaximizing ? 'M' : 'm') + depth;
    const cached = transpositionTable.get(hash);
    if (cached && cached.depth >= depth) return cached.result;

    const side = isMaximizing ? 'ai' : 'player';
    const currentDepthIndex = maxDepth - depth;
    const isRoot = isMaximizing && currentDepthIndex === 0;
    const orderedMoves = getOrderedMoves(side, currentDepthIndex);

    if (orderedMoves.length === 0) {
        return { score: isMaximizing ? -100000 : 100000, move: null };
    }

    let bestMove = null;

    if (isMaximizing) {
        let maxScore = -Infinity;
        let didCutoff = false;
        for (const { piece, move } of orderedMoves) {
            const saved = saveMove(piece, move);
            executeMove(piece, move);
            const result = minimax(depth - 1, false, alpha, beta, maxDepth);
            restoreMove(saved);
            if (result.timeout) return result;
            const compareScore = isRoot ? result.score + scoreOpponentMoveMemory(piece, move) : result.score;
            if (isRoot) rootMoveScores.push({ piece, move, score: compareScore, searchScore: result.score });
            if (compareScore > maxScore) {
                maxScore = compareScore;
                bestMove = { piece, move };
            }
            alpha = Math.max(alpha, maxScore);
            if (beta <= alpha) {
                // Store killer move
                if (diff.killer && currentDepthIndex < killerMoves.length) {
                    killerMoves[currentDepthIndex][moveKey(piece, move)] = true;
                }
                didCutoff = true;
                break;
            }
        }
        const ret = { score: maxScore, move: bestMove };
        if (!didCutoff) transpositionTable.set(hash, { depth, result: ret });
        return ret;
    } else {
        let minScore = Infinity;
        let didCutoff = false;
        for (const { piece, move } of orderedMoves) {
            const saved = saveMove(piece, move);
            executeMove(piece, move);
            const result = minimax(depth - 1, true, alpha, beta, maxDepth);
            restoreMove(saved);
            if (result.timeout) return result;
            if (result.score < minScore) {
                minScore = result.score;
                bestMove = { piece, move };
            }
            beta = Math.min(beta, minScore);
            if (beta <= alpha) {
                if (diff.killer && currentDepthIndex < killerMoves.length) {
                    killerMoves[currentDepthIndex][moveKey(piece, move)] = true;
                }
                didCutoff = true;
                break;
            }
        }
        const ret = { score: minScore, move: bestMove };
        if (!didCutoff) transpositionTable.set(hash, { depth, result: ret });
        return ret;
    }
}

function iterativeDeepening() {
    const diff = DIFFICULTY[currentDifficulty];
    aiStartTime = Date.now();
    nodesSearched = 0;
    transpositionTable.clear();
    killerMoves = [{}, {}];

    const tacticalMove = chooseImmediateTacticalMove();
    if (tacticalMove) return tacticalMove;

    const carelessMove = chooseCarelessOnlineMove();
    if (carelessMove) return carelessMove;

    let bestResult = null;
    let completedRootMoveScores = [];

    for (let depth = 1; depth <= diff.depth; depth++) {
        rootMoveScores = [];
        const result = minimax(depth, true, -Infinity, Infinity, depth);
        if (result.timeout) break;
        bestResult = result;
        completedRootMoveScores = rootMoveScores.slice();
        if (result.score >= 100000) break;
        if (result.score <= -100000) break;
    }

    return chooseVariedStrategicMove(bestResult, completedRootMoveScores);
}

function stableNameValue(name, salt = 0) {
    let hash = 2166136261 + salt;
    for (let i = 0; i < name.length; i++) {
        hash ^= name.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
}

function opponentOnlineChance(opponent) {
    const byDifficulty = { beginner: 0.88, easy: 0.82, medium: 0.66, hard: 0.46, nightmare: 0.30 };
    let chance = byDifficulty[opponent.difficulty] ?? 0.55;
    if (opponent.personality === 'friendly') chance += 0.08;
    if (opponent.personality === 'quiet') chance -= 0.08;
    if ((opponent.gamesVsPlayer || 0) >= 3 && opponent.lastResultVsPlayer === 'loss') chance -= 0.10;
    return Math.max(0.18, Math.min(0.90, chance));
}

function isOpponentAvailable(opponent, now = Date.now()) {
    if ((opponent.awayUntil || 0) > now) return false;
    const bucket = Math.floor(now / (1000 * 60 * 8));
    return stableNameValue(`${opponent.name}:${bucket}`, 97) < opponentOnlineChance(opponent);
}

function availableOpponents() {
    const available = ONLINE_OPPONENTS.filter(opponent => isOpponentAvailable(opponent));
    return available.length >= 4 ? available : ONLINE_OPPONENTS.filter(opponent => !(opponent.awayUntil || 0) || opponent.awayUntil < Date.now());
}

function pickOnlineOpponent() {
    const rating = playerProfile.rating;
    const onlinePool = availableOpponents();
    const withinWindow = windowSize => onlinePool.filter(opponent => Math.abs(opponent.rating - rating) <= windowSize);
    let basePool = withinWindow(220);
    if (basePool.length < 4) basePool = withinWindow(380);
    if (basePool.length < 4) basePool = onlinePool;
    if (hasBeginnerProtection()) {
        const protectedPool = onlinePool.filter(opponent =>
            opponent.rating <= Math.max(1100, rating + 120)
            && (opponent.difficulty === 'beginner' || opponent.difficulty === 'easy')
        );
        if (protectedPool.length >= 4) basePool = protectedPool;
    }
    if (rating <= 1250) {
        const lowerRatedPool = basePool.filter(opponent => opponent.rating <= rating + 80);
        if (lowerRatedPool.length >= 4) basePool = lowerRatedPool;
    }
    const freshPool = basePool.filter(opponent => !recentOpponentNames.includes(opponent.name) && !(opponent.lastPlayedAt && Date.now() - opponent.lastPlayedAt < 1000 * 60 * 4));
    const pool = freshPool.length >= 3 ? freshPool : basePool.filter(opponent => opponent.name !== onlineMatch.opponent?.name);
    const finalPool = (pool.length ? pool : basePool).slice().sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating));
    const topPool = finalPool.slice(0, Math.min(finalPool.length, Math.random() < 0.72 ? 6 : 9));
    const opponent = topPool[Math.floor(Math.random() * topPool.length)] || finalPool[0] || ONLINE_OPPONENTS[0];
    recentOpponentNames = [opponent.name, ...recentOpponentNames.filter(name => name !== opponent.name)].slice(0, 5);
    return opponent;
}

function createMatchSession(opponent) {
    return {
        active: true,
        searching: false,
        opponent,
        roomId: nextRoomId(),
        latency: Math.floor(24 + Math.random() * 48),
        firstTurn: Math.random() < 0.5 ? 'player' : 'ai',
        moveSalt: Math.floor(Math.random() * 1000000),
        ratingDelta: null,
        opponentRatingDelta: null,
        beginnerProtection: false,
        privateRoom: false,
        profileApplied: false,
        opponentLeft: false,
    };
}

function isRealtimeMatch() {
    return onlineMatch.active && onlineMatch.realtime && realtimeClient.ws;
}

function closeRealtimeConnection() {
    if (realtimeQueueFallbackTimer) {
        clearTimeout(realtimeQueueFallbackTimer);
        realtimeQueueFallbackTimer = null;
    }
    if (realtimeClient.ws) {
        realtimeClient.ws.onclose = null;
        realtimeClient.ws.close();
    }
    realtimeClient = { ws: null, playerId: '', side: '', roomId: '' };
}

function serverToLocalCoord(col, row) {
    if (realtimeClient.side === 'blue') return { col: COLS - 1 - col, row: ROWS - 1 - row };
    return { col, row };
}

function localToServerCoord(col, row) {
    if (realtimeClient.side === 'blue') return { col: COLS - 1 - col, row: ROWS - 1 - row };
    return { col, row };
}

function serverSideToLocal(side) {
    return side === realtimeClient.side ? 'player' : 'ai';
}

function serverTurnToLocal(turn) {
    return turn === realtimeClient.side ? 'player' : 'ai';
}

function realtimeOpponentFromState(state) {
    const opponent = state.players.find(player => player.id !== realtimeClient.playerId) || {};
    return {
        name: opponent.name || '好友玩家',
        avatar: opponent.avatar || '♞',
        title: state.roomId?.startsWith('MZQ-') ? '好友房间' : '在线玩家',
        accent: '#8ef3c5',
        rating: opponent.rating || 1200,
        wins: 0,
        losses: 0,
        bestRating: opponent.rating || 1200,
        difficulty: 'medium',
        style: '真人对局',
        styleKey: 'balanced',
        personality: 'balanced',
        chatRate: 0,
        rematchRate: 0,
    };
}

function buildRealtimePieces(state) {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const pieces = state.pieces.map(serverPiece => {
        const position = serverToLocalCoord(serverPiece.col, serverPiece.row);
        const piece = {
            id: serverPiece.id,
            serverId: serverPiece.id,
            side: serverSideToLocal(serverPiece.side),
            col: position.col,
            row: position.row,
            alive: !!serverPiece.alive,
        };
        if (piece.alive) board[piece.row][piece.col] = piece;
        return piece;
    });
    return { board, pieces };
}

function findRealtimeMoveAnimation(nextPieces, nextMoveCount) {
    if (!Array.isArray(gameState.pieces) || !gameState.pieces.length || nextMoveCount <= (gameState.moveCount || 0)) return null;
    const previousById = new Map(gameState.pieces.map(piece => [piece.serverId ?? piece.id, piece]));
    const movedPiece = nextPieces.find(piece => {
        const previous = previousById.get(piece.serverId ?? piece.id);
        return piece.alive && previous?.alive && (previous.col !== piece.col || previous.row !== piece.row);
    });
    if (!movedPiece) return null;

    const previousMovedPiece = previousById.get(movedPiece.serverId ?? movedPiece.id);
    const capturedPiece = gameState.pieces.find(piece => {
        const nextPiece = nextPieces.find(item => (item.serverId ?? item.id) === (piece.serverId ?? piece.id));
        return piece.alive && (!nextPiece || !nextPiece.alive) && piece.col === movedPiece.col && piece.row === movedPiece.row;
    }) || null;

    return {
        piece: previousMovedPiece,
        fromCol: previousMovedPiece.col,
        fromRow: previousMovedPiece.row,
        toCol: movedPiece.col,
        toRow: movedPiece.row,
        capturedPiece,
    };
}

function applyRealtimeSnapshot(state, nextState, nextMoveCount) {
    gameState.board = nextState.board;
    gameState.pieces = nextState.pieces;
    gameState.currentTurn = state.winner ? null : serverTurnToLocal(state.currentTurn);
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.gameOver = !!state.winner;
    gameState.winner = state.winner ? serverSideToLocal(state.winner) : null;
    gameState.forfeit = false;
    gameState.moveCount = nextMoveCount;
    gameState.inputLocked = false;
    animation.active = false;
}

function applyRealtimeState(state) {
    const me = state.players.find(player => player.id === realtimeClient.playerId);
    if (!me) return;
    if (realtimeQueueFallbackTimer) {
        clearTimeout(realtimeQueueFallbackTimer);
        realtimeQueueFallbackTimer = null;
    }
    const sameRealtimeRoom = onlineMatch.realtime && onlineMatch.roomId === state.roomId;
    const previousResult = sameRealtimeRoom ? {
        profileApplied: onlineMatch.profileApplied,
        ratingDelta: onlineMatch.ratingDelta,
        opponentRatingDelta: onlineMatch.opponentRatingDelta,
        beginnerProtection: onlineMatch.beginnerProtection,
    } : {};
    realtimeClient.side = me.side;
    realtimeClient.roomId = state.roomId;

    const opponent = realtimeOpponentFromState(state);
    onlineMatch = {
        ...createMatchSession(opponent),
        roomId: state.roomId,
        active: true,
        searching: false,
        opponent,
        realtime: true,
        privateRoom: true,
        profileApplied: !!previousResult.profileApplied,
        ratingDelta: previousResult.ratingDelta ?? null,
        opponentRatingDelta: previousResult.opponentRatingDelta ?? null,
        beginnerProtection: !!previousResult.beginnerProtection,
        firstTurn: serverTurnToLocal(state.currentTurn),
        latency: 0,
    };

    const nextMoveCount = Number(state.moveCount) || 0;
    const nextState = buildRealtimePieces(state);
    const moveAnimation = findRealtimeMoveAnimation(nextState.pieces, nextMoveCount);
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.inputLocked = !!moveAnimation;
    animation.active = false;

    const finalizeState = () => {
        applyRealtimeSnapshot(state, nextState, nextMoveCount);
        updateOnlinePanel();
        updateDifficultyButtons();
        updateModeSpecificUI();
        updateTurnIndicator();
        render();
        if (gameState.gameOver) {
            showGameOver(gameState.winner === 'player' ? '你赢了！' : `${opponent.name} 赢了！`);
        }
    };

    updateOnlinePanel();
    updateDifficultyButtons();
    updateModeSpecificUI();
    updateTurnIndicator();
    if (moveAnimation) {
        animateMove(moveAnimation.piece, moveAnimation.fromCol, moveAnimation.fromRow, moveAnimation.toCol, moveAnimation.toRow, moveAnimation.capturedPiece, finalizeState);
    } else {
        finalizeState();
    }
}

function connectRealtimeRoom(roomCode) {
    const serverUrl = saveRealtimeServerUrl();
    if (!serverUrl) return false;
    closeRealtimeConnection();
    document.getElementById('room-code-status').textContent = `正在连接 ${serverUrl}...`;
    const ws = new WebSocket(serverUrl);
    realtimeClient = { ws, playerId: '', side: '', roomId: roomCode };

    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'hello',
            profile: {
                name: playerProfile.name,
                rating: playerProfile.rating,
                avatar: playerProfile.avatar,
            },
        }));
    };
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'hello' || message.type === 'hello.ok') {
            realtimeClient.playerId = message.playerId || realtimeClient.playerId;
            if (message.type === 'hello.ok') ws.send(JSON.stringify({ type: 'room.join', roomId: roomCode }));
        } else if (message.type === 'room.created' || message.type === 'room.joined') {
            document.getElementById('matchmaking-title').textContent = '等待好友加入';
            document.getElementById('matchmaking-subtitle').textContent = `房间 ${roomCode} 已连接，等待另一位玩家...`;
            document.getElementById('matched-ready').textContent = '等待中';
        } else if (message.type === 'game.start' || message.type === 'game.state') {
            showGameScreen();
            applyRealtimeState(message);
        } else if (message.type === 'chat.message') {
            if (message.from !== realtimeClient.playerId) addChatMessage('opponent', message.text);
        } else if (message.type === 'error') {
            if (message.message === 'ROOM_NOT_FOUND') {
                ws.send(JSON.stringify({ type: 'room.create', roomId: roomCode }));
            } else {
                document.getElementById('matchmaking-subtitle').textContent = `服务器错误：${message.message}`;
            }
        }
    };
    ws.onerror = () => {
        document.getElementById('matchmaking-subtitle').textContent = '实时服务器连接失败，请检查地址或稍后再试。';
    };
    ws.onclose = () => {
        if (isRealtimeMatch() && !gameState.gameOver) {
            onlineMatch.opponentLeft = true;
            setOpponentStatus('连接断开');
        }
    };
    return true;
}

function connectRealtimeQueue() {
    const serverUrl = localStorage.getItem(REALTIME_SERVER_KEY) || '';
    if (!serverUrl) return false;
    closeRealtimeConnection();
    document.getElementById('matchmaking-subtitle').textContent = `正在连接实时服务器 ${serverUrl}；若暂无真人会快速补位...`;
    const ws = new WebSocket(serverUrl);
    realtimeClient = { ws, playerId: '', side: '', roomId: '' };
    scheduleRealtimeQueueFallback();

    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'hello',
            profile: {
                name: playerProfile.name,
                rating: playerProfile.rating,
                avatar: playerProfile.avatar,
            },
        }));
    };
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'hello' || message.type === 'hello.ok') {
            realtimeClient.playerId = message.playerId || realtimeClient.playerId;
            if (message.type === 'hello.ok') ws.send(JSON.stringify({ type: 'queue.join' }));
        } else if (message.type === 'queue.waiting') {
            document.getElementById('matchmaking-title').textContent = '等待真实玩家';
            document.getElementById('matchmaking-subtitle').textContent = '已进入实时匹配队列；暂无真人时会立刻用在线对手补位。';
            scheduleRealtimeQueueFallback();
        } else if (message.type === 'game.start' || message.type === 'game.state') {
            showGameScreen();
            applyRealtimeState(message);
        } else if (message.type === 'chat.message') {
            if (message.from !== realtimeClient.playerId) addChatMessage('opponent', message.text);
        } else if (message.type === 'error') {
            document.getElementById('matchmaking-subtitle').textContent = `服务器错误：${message.message}`;
        }
    };
    ws.onerror = () => {
        startRealtimeAiSubstitute('实时服务器暂时不可用，已为你匹配在线对手。');
    };
    ws.onclose = () => {
        if (isRealtimeMatch() && !gameState.gameOver) {
            onlineMatch.opponentLeft = true;
            setOpponentStatus('连接断开');
        }
    };
    return true;
}

function startRealtimeAiSubstitute(message) {
    if (realtimeQueueFallbackTimer) {
        clearTimeout(realtimeQueueFallbackTimer);
        realtimeQueueFallbackTimer = null;
    }
    if (!onlineMatch.searching) return;
    if (realtimeClient.ws && realtimeClient.ws.readyState === WebSocket.OPEN) {
        realtimeClient.ws.send(JSON.stringify({ type: 'queue.cancel' }));
    }
    closeRealtimeConnection();
    document.getElementById('matchmaking-title').textContent = '为你找到在线对手';
    document.getElementById('matchmaking-subtitle').textContent = message;
    matchSearchTimer = setTimeout(() => {
        matchSearchTimer = null;
        showMatchFound(pickOnlineOpponent());
    }, 450 + Math.random() * 650);
}

function scheduleRealtimeQueueFallback() {
    if (realtimeQueueFallbackTimer) clearTimeout(realtimeQueueFallbackTimer);
    realtimeQueueFallbackTimer = setTimeout(() => {
        realtimeQueueFallbackTimer = null;
        startRealtimeAiSubstitute('暂无真人在线，已为你匹配一位在线对手。');
    }, REALTIME_QUEUE_AI_FALLBACK_MS);
}

function sendRealtimeMove(piece, moveTarget) {
    if (!isRealtimeMatch() || realtimeClient.ws.readyState !== WebSocket.OPEN) return false;
    const to = localToServerCoord(moveTarget.col, moveTarget.row);
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.inputLocked = true;
    render();
    realtimeClient.ws.send(JSON.stringify({
        type: 'game.move',
        pieceId: piece.serverId ?? piece.id,
        toCol: to.col,
        toRow: to.row,
    }));
    return true;
}

function nextRoomId() {
    return `MZQ-${Math.floor(1000 + Math.random() * 9000)}`;
}

function flipFirstTurn(turn) {
    return turn === 'player' ? 'ai' : 'player';
}

function rematchAcceptChance() {
    const dominance = matchDominanceScore();
    let chance = gameState.winner === 'player' ? 0.58 : 0.74;
    if (gameState.winner === 'player') {
        chance += dominance >= 4 ? -0.26 : dominance <= 1 ? 0.10 : -0.06;
    } else {
        chance += dominance >= 4 ? 0.18 : dominance <= 1 ? 0.08 : 0.04;
    }
    if (gameState.moveCount >= 18) chance += 0.06;
    if (onlineMatch.opponent && onlineMatch.opponent.difficulty === 'nightmare') chance -= 0.08;
    return Math.max(0.16, Math.min(0.88, chance));
}

function clearChatTimers() {
    chatTimers.forEach(timer => clearTimeout(timer));
    chatTimers = [];
    if (opponentRematchTimer) {
        clearTimeout(opponentRematchTimer);
        opponentRematchTimer = null;
    }
}

function pickMessage(group) {
    const styleMessages = STYLE_CHAT_MESSAGES[onlineMatch.opponent?.styleKey]?.[group];
    const messages = styleMessages || OPPONENT_CHAT_MESSAGES[group] || OPPONENT_CHAT_MESSAGES.playerChat;
    const safeMessages = messages.filter(message => PLAYER_CHAT_MESSAGES.includes(message));
    const choices = safeMessages.length ? safeMessages : PLAYER_CHAT_MESSAGES;
    return choices[Math.floor(Math.random() * choices.length)];
}

function getMaterialBalance() {
    if (!gameState.pieces) return 0;
    const playerCount = gameState.pieces.filter(piece => piece.side === 'player' && piece.alive).length;
    const opponentCount = gameState.pieces.filter(piece => piece.side === 'ai' && piece.alive).length;
    return opponentCount - playerCount;
}

function countAlivePieces(side) {
    if (!gameState.pieces) return 0;
    return gameState.pieces.filter(piece => piece.side === side && piece.alive).length;
}

function matchDominanceScore() {
    if (!gameState.pieces || !gameState.winner) return 0;
    const playerAlive = countAlivePieces('player');
    const opponentAlive = countAlivePieces('ai');
    const winnerAlive = gameState.winner === 'player' ? playerAlive : opponentAlive;
    const loserAlive = gameState.winner === 'player' ? opponentAlive : playerAlive;
    const materialLead = Math.max(0, winnerAlive - loserAlive);
    const capturePressure = loserAlive <= 2 ? 2 : loserAlive <= 3 ? 1 : 0;
    const speedPressure = gameState.moveCount <= 8 ? 2 : gameState.moveCount <= 14 ? 1 : 0;
    return materialLead + capturePressure + speedPressure;
}

function hasGoalThreat(side) {
    return getOrderedMoves(side, 0).some(({ piece, move }) => isGoalMove(piece, move));
}

function hasCaptureThreat(side) {
    return getOrderedMoves(side, 0).some(({ move }) => move.isCapture);
}

function choosePlayerMoveChatGroup(wasCapture) {
    if (wasCapture) return 'afterPlayerCapture';
    if (hasGoalThreat('player')) return 'afterPlayerThreat';
    if (hasCaptureThreat('player') && Math.random() < 0.55) return 'afterPlayerThreat';
    return Math.abs(getMaterialBalance()) >= 2 ? pickAmbientChatGroup() : 'afterPlayerMove';
}

function chooseOpponentMoveChatGroup(wasCapture, wasUnderGoalThreat) {
    if (wasCapture) return 'afterOpponentCapture';
    if (wasUnderGoalThreat && !hasGoalThreat('player')) return 'escapedDanger';
    if (hasGoalThreat('ai') || (hasCaptureThreat('ai') && Math.random() < 0.45)) return 'afterOpponentThreat';
    return Math.abs(getMaterialBalance()) >= 2 ? pickAmbientChatGroup() : 'afterOpponentMove';
}

function chooseReplyChatGroup(text) {
    if (text === '再来一局？') return 'playerRematchChat';
    if (['漂亮！', '好棋', '厉害', '👏'].includes(text)) return 'playerPraiseChat';
    if (['😭', '😢', '😓', '😅'].includes(text)) return 'playerThinkingChat';
    if (['有点难', '我想想', '🤔', '别急'].includes(text)) return 'playerThinkingChat';
    return 'playerChat';
}

function opponentPersonality() {
    return onlineMatch.opponent || { personality: 'balanced', chatRate: 0.36, rematchRate: 0.32 };
}

function personalityChatChance(baseChance, group) {
    const opponent = opponentPersonality();
    const personality = opponent.personality || 'balanced';
    let chance = baseChance * (opponent.chatRate ?? 0.36);

    if (personality === 'friendly' && (group === 'greeting' || group === 'playerChat' || group === 'endLose')) chance *= 1.35;
    if (personality === 'expressive' && (group.includes('Capture') || group === 'afterPlayerMove' || group === 'afterOpponentMove')) chance *= 1.25;
    if (personality === 'focused' && (group === 'ambient' || group === 'greeting' || group === 'playerChat')) chance *= 0.68;
    if (personality === 'quiet') chance *= 0.58;

    return Math.max(0.03, Math.min(0.72, chance));
}

function opponentRematchChance() {
    const opponent = opponentPersonality();
    const dominance = matchDominanceScore();
    let chance = opponent.rematchRate ?? 0.32;
    if (gameState.winner === 'player') {
        chance += dominance >= 4 ? -0.28 : dominance <= 1 ? 0.12 : -0.06;
    } else {
        chance += dominance >= 4 ? 0.24 : dominance <= 1 ? 0.10 : 0.04;
    }
    if (gameState.moveCount >= 18) chance += 0.08;
    if (opponent.personality === 'quiet') chance -= 0.08;
    if (opponent.personality === 'friendly') chance += 0.08;
    return Math.max(0.04, Math.min(0.78, chance));
}

function markOpponentAway(minutes = 8) {
    if (!onlineMatch.opponent) return;
    onlineMatch.opponent.awayUntil = Date.now() + minutes * 60 * 1000;
    saveOpponentProfiles();
}

function opponentLeaveChance() {
    const opponent = opponentPersonality();
    const dominance = matchDominanceScore();
    let chance = 0.18;
    if (gameState.winner === 'player' && dominance >= 4) chance += 0.30;
    if (gameState.winner !== 'player' && dominance >= 4) chance -= 0.08;
    if ((opponent.gamesVsPlayer || 0) >= 3) chance += 0.10;
    if (opponent.personality === 'quiet') chance += 0.10;
    if (opponent.personality === 'friendly') chance -= 0.08;
    return Math.max(0.05, Math.min(0.58, chance));
}

function opponentLeavesRoom(message = '对手已离开房间。') {
    if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft) return;
    onlineMatch.opponentLeft = true;
    markOpponentAway(6 + Math.floor(Math.random() * 14));
    const status = document.getElementById('rematch-status');
    const rematchBtn = document.getElementById('rematch-btn');
    if (status) status.textContent = message;
    if (rematchBtn) rematchBtn.disabled = true;
    updateOnlinePanel();
    updateChatControls();
}

function pickAmbientChatGroup() {
    if (!gameState.pieces || gameState.gameOver) return 'ambient';
    const playerCount = gameState.pieces.filter(piece => piece.side === 'player' && piece.alive).length;
    const opponentCount = gameState.pieces.filter(piece => piece.side === 'ai' && piece.alive).length;
    if (opponentCount > playerCount) return Math.random() < 0.58 ? 'ahead' : 'ambient';
    if (opponentCount < playerCount) return Math.random() < 0.62 ? 'behind' : 'ambient';
    return 'ambient';
}

function renderChatLog() {
    const log = document.getElementById('chat-log');
    if (!log) return;
    log.innerHTML = '';

    if (!chatMessages.length) {
        const empty = document.createElement('div');
        empty.className = 'chat-empty';
        empty.textContent = '对局开始后可以发送表情或短消息';
        log.appendChild(empty);
        return;
    }

    chatMessages.slice(-12).forEach(message => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${message.from}`;
        const sender = document.createElement('span');
        sender.className = 'chat-sender';
        sender.textContent = message.from === 'me' ? '你' : (onlineMatch.opponent ? onlineMatch.opponent.name : '对手');
        const content = document.createElement('span');
        content.textContent = message.text;
        bubble.appendChild(sender);
        bubble.appendChild(content);
        log.appendChild(bubble);
    });
    log.scrollTop = log.scrollHeight;
}

function updatePostGameChat(message) {
    const postGameChat = document.getElementById('post-game-chat');
    if (!postGameChat) return;

    if (!message || message.from !== 'opponent') {
        postGameChat.classList.add('hidden');
        postGameChat.textContent = '';
        return;
    }

    postGameChat.innerHTML = '';
    const sender = document.createElement('span');
    sender.className = 'chat-sender';
    sender.textContent = onlineMatch.opponent ? onlineMatch.opponent.name : '对手';
    const content = document.createElement('span');
    content.textContent = message.text;
    postGameChat.appendChild(sender);
    postGameChat.appendChild(content);
    postGameChat.classList.remove('hidden');
}

function updateChatControls() {
    document.querySelectorAll('.chat-btn').forEach(button => {
        button.disabled = !onlineMatch.active || onlineMatch.searching || onlineMatch.opponentLeft || gameState.gameOver;
    });
    const select = document.getElementById('chat-select');
    if (select) select.disabled = !onlineMatch.active || onlineMatch.searching || onlineMatch.opponentLeft || gameState.gameOver;
}

function resetOnlineChat() {
    clearChatTimers();
    chatMessages = [];
    renderChatLog();
    updateChatControls();
}

function addChatMessage(from, text) {
    if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft || !text) return;
    chatMessages.push({ from, text });
    if (chatMessages.length > 24) chatMessages = chatMessages.slice(-24);
    renderChatLog();
    if (gameState.gameOver && from === 'opponent') {
        updatePostGameChat(chatMessages[chatMessages.length - 1]);
    }
}

function scheduleOpponentChat(group, chance = 1, minDelay = 650, maxDelay = 1800, allowAfterGameOver = false) {
    if (onlineMatch.realtime) return;
    if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft || Math.random() > personalityChatChance(chance, group)) return;
    const typingDelay = Math.min(minDelay - 180, Math.max(240, minDelay * 0.45 + Math.random() * 360));
    const typingTimer = setTimeout(() => {
        chatTimers = chatTimers.filter(item => item !== typingTimer);
        if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft || (gameState.gameOver && !allowAfterGameOver)) return;
        setOpponentStatus('输入中...');
    }, typingDelay);
    chatTimers.push(typingTimer);
    const timer = setTimeout(() => {
        chatTimers = chatTimers.filter(item => item !== timer);
        if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft || (gameState.gameOver && !allowAfterGameOver)) return;
        addChatMessage('opponent', pickMessage(group));
        setOpponentStatus(gameState.currentTurn === 'ai' ? '思考中' : '在线');
        updateChatControls();
    }, minDelay + Math.random() * (maxDelay - minDelay));
    chatTimers.push(timer);
}

function scheduleAmbientOpponentChat(initial = false) {
    if (onlineMatch.realtime) return;
    if (!onlineMatch.active || !onlineMatch.opponent || gameState.gameOver) return;
    const opponent = opponentPersonality();
    const quietMultiplier = opponent.personality === 'quiet' || opponent.personality === 'focused' ? 1.35 : 1;
    const minDelay = (initial ? 5200 : 12000) * quietMultiplier;
    const maxDelay = (initial ? 13000 : 26000) * quietMultiplier;
    const timer = setTimeout(() => {
        chatTimers = chatTimers.filter(item => item !== timer);
        if (!onlineMatch.active || !onlineMatch.opponent || gameState.gameOver) return;
        if (Math.random() < personalityChatChance(0.42, 'ambient')) {
            addChatMessage('opponent', pickMessage(pickAmbientChatGroup()));
            updateChatControls();
        }
        scheduleAmbientOpponentChat(false);
    }, minDelay + Math.random() * (maxDelay - minDelay));
    chatTimers.push(timer);
}

function sendQuickChat(text) {
    if (!onlineMatch.active || onlineMatch.searching || gameState.gameOver) return;
    addChatMessage('me', text);
    advanceDailyMission('send-chat');
    if (isRealtimeMatch() && realtimeClient.ws.readyState === WebSocket.OPEN) {
        realtimeClient.ws.send(JSON.stringify({ type: 'chat.send', text }));
        return;
    }
    scheduleOpponentChat(chooseReplyChatGroup(text), 0.38, 700, 1900);
}

function getOpponentThinkDelay() {
    if (!onlineMatch.active) return gameOptions.aiDelay;
    const style = currentPlayStyle();
    const base = gameState.moveCount < 4 ? 650 : 900;
    const complexity = Math.min(900, getOrderedMoves('ai', 0).length * 55);
    const jitter = Math.random() * 750;
    return Math.floor((base + complexity + jitter) * style.tempo + (onlineMatch.latency || 0));
}

function updateDifficultyButtons() {
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.toggle('active', !onlineMatch.active && btn.dataset.diff === currentDifficulty);
    });
}

function updateModeSpecificUI() {
    document.getElementById('online-lobby').classList.toggle('hidden', !onlineMatch.active && !onlineMatch.searching);
    document.querySelectorAll('.training-only').forEach(el => {
        el.classList.toggle('hidden', onlineMatch.active || onlineMatch.searching || isTutorialMode());
    });
    document.querySelectorAll('.online-only').forEach(el => {
        el.classList.toggle('hidden', !onlineMatch.active);
    });
    document.querySelectorAll('.tutorial-only').forEach(el => {
        el.classList.toggle('hidden', !isTutorialMode());
    });
    updateChatControls();
}

function setOpponentStatus(text) {
    const status = document.getElementById('online-player-status');
    if (status && onlineMatch.active && onlineMatch.opponent) status.textContent = text;
}

function updateOnlinePanel() {
    updatePlayerProfileUI();
    const matchBtn = document.getElementById('match-btn');
    const status = document.getElementById('opponent-status');
    const name = document.getElementById('opponent-name');
    const rating = document.getElementById('opponent-rating');

    matchBtn.classList.toggle('searching', onlineMatch.searching);
    if (onlineMatch.searching) {
        matchBtn.textContent = '匹配中...';
        status.textContent = '正在连接';
        name.textContent = '寻找在线玩家';
        rating.textContent = '...';
        document.getElementById('opponent-card').style.removeProperty('--opponent-accent');
        document.getElementById('opponent-card-avatar').textContent = '?';
        return;
    }

    if (onlineMatch.active && onlineMatch.opponent) {
        const opponent = onlineMatch.opponent;
        matchBtn.textContent = '重新匹配';
        status.textContent = `${opponent.title} · ${playerRankLabel(opponent.rating)}`;
        name.textContent = opponent.name;
        rating.textContent = opponent.rating;
        document.getElementById('opponent-card').style.setProperty('--opponent-accent', opponent.accent || '#8ef3c5');
        document.getElementById('opponent-card-avatar').textContent = opponent.avatar || '?';
        document.getElementById('online-opponent-profile').textContent = `${opponent.avatar || '♞'} ${opponent.title || opponent.style}`;
        document.getElementById('online-player-name').textContent = opponent.name;
        document.getElementById('online-player-rating').textContent = `${opponent.rating} · ${playerRankLabel(opponent.rating)}`;
        document.getElementById('online-opponent-record').textContent = `${opponent.wins || 0}胜 ${opponent.losses || 0}负 · ${winRateText(opponent.wins || 0, opponent.losses || 0)} · 最佳 ${opponent.bestRating || opponent.rating}`;
        document.getElementById('online-player-status').textContent = onlineMatch.opponentLeft ? '已离开' : (gameState.currentTurn === 'ai' ? '思考中' : '在线');
        document.getElementById('online-room-id').textContent = onlineMatch.roomId || '--';
        document.getElementById('online-latency').textContent = onlineMatch.latency ? `${onlineMatch.latency}ms` : '--';
        return;
    }

    matchBtn.textContent = '匹配在线玩家';
    status.textContent = '未匹配';
    name.textContent = '等待对手';
    rating.textContent = '--';
    document.getElementById('opponent-card').style.removeProperty('--opponent-accent');
    document.getElementById('opponent-card-avatar').textContent = '?';
    document.getElementById('online-opponent-profile').textContent = '--';
    document.getElementById('online-player-name').textContent = '--';
    document.getElementById('online-player-rating').textContent = '--';
    document.getElementById('online-opponent-record').textContent = '--';
    document.getElementById('online-player-status').textContent = '未连接';
    document.getElementById('online-room-id').textContent = '--';
    document.getElementById('online-latency').textContent = '--';
}

function showMainMenu() {
    cancelMatchmaking(false);
    activeTutorialIndex = null;
    updateModeSpecificUI();
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('matchmaking-screen').classList.add('hidden');
    document.getElementById('game-container').classList.add('hidden');
}

function showGameScreen() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('matchmaking-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    resizeBoardToViewport();
    render();
}

function showMatchmakingScreen() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.add('hidden');
    const screen = document.getElementById('matchmaking-screen');
    screen.classList.remove('hidden', 'matched');
    document.getElementById('matchmaking-title').textContent = '正在寻找对手';
    document.getElementById('matchmaking-subtitle').textContent = `正在根据你的 ${playerProfile.rating} 积分、延迟和当前队列寻找合适玩家...`;
    document.getElementById('matched-avatar').textContent = '?';
    document.getElementById('matched-avatar').style.background = '';
    document.getElementById('matched-name').textContent = '--';
    document.getElementById('matched-meta').textContent = '--';
    document.getElementById('matched-ready').textContent = '准备中';
}

function cancelMatchmaking(returnToMenu = true) {
    if (matchSearchTimer) clearTimeout(matchSearchTimer);
    if (matchCountdownTimer) clearInterval(matchCountdownTimer);
    if (rematchResponseTimer) clearTimeout(rematchResponseTimer);
    clearChatTimers();
    if (onlineMatch.searching || onlineMatch.realtime) closeRealtimeConnection();
    matchSearchTimer = null;
    matchCountdownTimer = null;
    rematchResponseTimer = null;
    if (onlineMatch.searching) {
        onlineMatch = { active: false, searching: false, opponent: null };
        updateOnlinePanel();
        updateDifficultyButtons();
        updateModeSpecificUI();
    }
    if (returnToMenu) showMainMenu();
}

function showMatchFound(opponent, roomCode = '') {
    const screen = document.getElementById('matchmaking-screen');
    screen.classList.add('matched');
    document.getElementById('matchmaking-title').textContent = '匹配成功';
    document.getElementById('matchmaking-subtitle').textContent = roomCode ? `房间 ${roomCode} 已连接，双方正在确认对局。` : '双方正在确认对局，即将进入棋盘。';
    document.getElementById('matched-avatar').textContent = opponent.avatar || opponent.name.slice(0, 1).toUpperCase();
    document.getElementById('matched-avatar').style.background = `linear-gradient(135deg, ${opponent.accent || '#8ef3c5'}, #5aa7ff)`;
    document.getElementById('matched-name').textContent = opponent.name;
    document.getElementById('matched-meta').textContent = `${opponent.title} · ${opponent.rating}分/${playerRankLabel(opponent.rating)} · ${opponent.wins}胜${opponent.losses}负 · 差距 ${Math.abs(opponent.rating - playerProfile.rating)}`;
    let countdown = 3;
    document.getElementById('matched-ready').textContent = `${countdown}`;
    matchCountdownTimer = setInterval(() => {
        countdown--;
        document.getElementById('matched-ready').textContent = countdown > 0 ? `${countdown}` : '进入对局';
        if (countdown <= 0) {
            clearInterval(matchCountdownTimer);
            matchCountdownTimer = null;
            onlineMatch = createMatchSession(opponent);
            if (roomCode) {
                onlineMatch.roomId = roomCode;
                onlineMatch.privateRoom = true;
            }
            currentDifficulty = opponent.difficulty;
            updateOnlinePanel();
            updateDifficultyButtons();
            updateModeSpecificUI();
            showGameScreen();
            initGame();
        }
    }, 700);
}

function startTrainingMode() {
    cancelMatchmaking(false);
    activeTutorialIndex = null;
    onlineMatch = { active: false, searching: false, opponent: null };
    resetOnlineChat();
    updateOnlinePanel();
    updateDifficultyButtons();
    updateModeSpecificUI();
    showGameScreen();
    initGame();
}

function startOnlineMatch() {
    if (onlineMatch.searching) return;

    showMatchmakingScreen();
    activeTutorialIndex = null;
    gameState.gameOver = false;
    onlineMatch.active = false;
    onlineMatch.searching = true;
    onlineMatch.opponent = null;
    resetOnlineChat();
    updateOnlinePanel();
    updateDifficultyButtons();
    updateModeSpecificUI();
    if (connectRealtimeQueue()) return;

    const poolPressure = Math.max(0, 8 - availableOpponents().length);
    matchSearchTimer = setTimeout(() => {
        matchSearchTimer = null;
        const opponent = pickOnlineOpponent();
        showMatchFound(opponent);
    }, 850 + Math.random() * 1500 + poolPressure * 180);
}

function normalizeRoomCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
}

function generateRoomCode() {
    return `MZQ-${Math.floor(1000 + Math.random() * 9000)}`;
}

function showRoomCodeOverlay() {
    const serverInput = document.getElementById('server-url-input');
    serverInput.value = localStorage.getItem(REALTIME_SERVER_KEY) || '';
    document.getElementById('room-code-status').textContent = serverInput.value
        ? '已填写实时服务器地址。创建/加入房间会优先连接服务器；连接失败会提示。'
        : '创建房间码后可以分享给朋友；未填写服务器地址时会先进入同房间模拟对局。';
    document.getElementById('room-code-overlay').classList.remove('hidden');
}

function hideRoomCodeOverlay() {
    document.getElementById('room-code-overlay').classList.add('hidden');
}

function pickRoomOpponent(roomCode) {
    const pool = availableOpponents().filter(opponent => !recentOpponentNames.includes(opponent.name));
    const candidates = pool.length ? pool : availableOpponents();
    const index = stableNameValue(`room:${roomCode}`, candidates.length);
    return candidates[index] || pickOnlineOpponent();
}

function startRoomChallenge() {
    const input = document.getElementById('room-code-input');
    const roomCode = normalizeRoomCode(input.value);
    if (roomCode.length < 4) {
        document.getElementById('room-code-status').textContent = '请输入至少 4 位房间码，或先创建一个房间码。';
        return;
    }

    requestForfeitConfirmation('进入好友房间', () => {
        saveRealtimeServerUrl();
        hideRoomCodeOverlay();
        cancelMatchmaking(false);
        showMatchmakingScreen();
        document.getElementById('matchmaking-title').textContent = '正在进入好友房间';
        document.getElementById('matchmaking-subtitle').textContent = `正在连接房间 ${roomCode}...`;
        onlineMatch.active = false;
        onlineMatch.searching = true;
        onlineMatch.opponent = null;
        resetOnlineChat();
        updateOnlinePanel();
        updateDifficultyButtons();
        updateModeSpecificUI();
        if (connectRealtimeRoom(roomCode)) return;
        matchSearchTimer = setTimeout(() => {
            matchSearchTimer = null;
            showMatchFound(pickRoomOpponent(roomCode), roomCode);
        }, 900 + Math.random() * 900);
    });
}

function normalizeRealtimeServerUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('ws://') || raw.startsWith('wss://')) return raw.replace(/\/+$/, '');
    if (raw.startsWith('http://')) return raw.replace(/^http:\/\//, 'ws://').replace(/\/+$/, '');
    if (raw.startsWith('https://')) return raw.replace(/^https:\/\//, 'wss://').replace(/\/+$/, '');
    return `wss://${raw.replace(/\/+$/, '')}`;
}

function saveRealtimeServerUrl() {
    const serverInput = document.getElementById('server-url-input');
    const url = normalizeRealtimeServerUrl(serverInput.value);
    serverInput.value = url;
    if (url) localStorage.setItem(REALTIME_SERVER_KEY, url);
    else localStorage.removeItem(REALTIME_SERVER_KEY);
    return url;
}

function rememberOpponentMovePattern(piece, move) {
    if (!onlineMatch.active || !onlineMatch.opponent || (gameState.aiMoveCount || 0) !== 0) return;
    const history = Array.isArray(onlineMatch.opponent.firstMoveHistory) ? onlineMatch.opponent.firstMoveHistory : [];
    const key = fullMoveKey(piece, move);
    onlineMatch.opponent.firstMoveHistory = [key, ...history.filter(item => item !== key)].slice(0, 8);
    saveOpponentProfiles();
}

function doAITurn() {
    if (gameState.gameOver || gameState.currentTurn !== 'ai' || isTutorialMode()) return;

    const result = iterativeDeepening();

    if (result && result.move) {
        const p = result.move.piece;
        const m = result.move.move;
        const fromCol = p.col;
        const fromRow = p.row;
        const capturedPiece = m.isCapture ? gameState.board[m.row][m.col] : null;
        const wasUnderGoalThreat = hasGoalThreat('player');

        rememberOpponentMovePattern(p, m);
        gameState.lastAIMove = { pieceId: p.id, fromCol, fromRow, toCol: m.col, toRow: m.row };
        executeMove(p, m);
        gameState.aiMoveCount = (gameState.aiMoveCount || 0) + 1;
        gameState.moveCount++;

        // Animate the AI move
        gameState.inputLocked = true;
        animateMove(p, fromCol, fromRow, m.col, m.row, capturedPiece, () => {
            gameState.inputLocked = false;
            if (checkWin()) {
                render();
                updateTurnIndicator();
                showGameOver(gameState.winner === 'player' ? '你赢了！' : opponentWinMessage());
                return;
            }
            gameState.currentTurn = 'player';
            updateTurnIndicator();
            render();
            scheduleOpponentChat(chooseOpponentMoveChatGroup(!!capturedPiece, wasUnderGoalThreat), capturedPiece ? 0.24 : 0.12, 800, 2300);
        });
    } else {
        gameState.gameOver = true;
        gameState.winner = 'player';
        updateTurnIndicator();
        render();
        showGameOver(onlineMatch.active ? `${onlineMatch.opponent.name} 无路可走，你赢了！` : 'AI无路可走，你赢了！');
    }
}

// ========================================
// Click Interaction
// ========================================
function pixelToBoard(pixelX, pixelY) {
    return {
        col: Math.floor((pixelX - BOARD_PADDING) / CELL_SIZE),
        row: Math.floor((pixelY - BOARD_PADDING) / CELL_SIZE)
    };
}

function handleClick(event) {
    if (gameState.gameOver || gameState.currentTurn !== 'player' || gameState.inputLocked || animation.active) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;
    const { col, row } = pixelToBoard(pixelX, pixelY);

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    handleCellClick(col, row);
}

function handleCellClick(col, row) {
    const clickedPiece = gameState.board[row][col];

    if (gameState.selectedPiece === null) {
        if (clickedPiece && clickedPiece.side === 'player') {
            gameState.selectedPiece = clickedPiece;
            gameState.validMoves = getValidMoves(clickedPiece);
            if (isTutorialMode()) {
                updateTutorialUI(`已选中红马。现在点发光目标，或点任意高亮可走格。${TUTORIAL_CHALLENGES[activeTutorialIndex]?.hint || ''}`);
            }
            render();
        }
    } else {
        const moveTarget = gameState.validMoves.find(m => m.col === col && m.row === row);

        if (moveTarget) {
            const piece = gameState.selectedPiece;
            if (sendRealtimeMove(piece, moveTarget)) return;
            const fromCol = piece.col;
            const fromRow = piece.row;
            const capturedPiece = moveTarget.isCapture ? gameState.board[moveTarget.row][moveTarget.col] : null;

            gameState.lastAIMove = null;
            executeMove(piece, moveTarget);
            gameState.moveCount++;
            gameState.selectedPiece = null;
            gameState.validMoves = [];

            // Animate player move
            gameState.inputLocked = true;
            animateMove(piece, fromCol, fromRow, moveTarget.col, moveTarget.row, capturedPiece, () => {
                gameState.inputLocked = false;
                if (isTutorialMode()) {
                    handleTutorialAfterMove(capturedPiece);
                    return;
                }
                if (checkWin()) {
                    render();
                    updateTurnIndicator();
                    showGameOver(gameState.winner === 'player' ? '你赢了！' : opponentWinMessage());
                    return;
                }
                gameState.currentTurn = 'ai';
                updateTurnIndicator();
                render();
                scheduleOpponentChat(choosePlayerMoveChatGroup(moveTarget.isCapture), moveTarget.isCapture ? 0.38 : 0.16, 600, 1900);
                scheduleAITurn(getOpponentThinkDelay() + 1200);
            });
        } else if (clickedPiece && clickedPiece.side === 'player') {
            gameState.selectedPiece = clickedPiece;
            gameState.validMoves = getValidMoves(clickedPiece);
            if (isTutorialMode()) {
                updateTutorialUI(`已切换到这匹红马。看高亮格，选择能完成目标的位置。${TUTORIAL_CHALLENGES[activeTutorialIndex]?.hint || ''}`);
            }
            render();
        } else {
            gameState.selectedPiece = null;
            gameState.validMoves = [];
            if (isTutorialMode()) {
                updateTutorialUI(`这格不是当前红马的合法落点。${TUTORIAL_CHALLENGES[activeTutorialIndex]?.hint || ''}`);
            }
            render();
        }
    }
}

canvas.addEventListener('click', handleClick);

canvas.addEventListener('mousemove', (event) => {
    if (gameState.gameOver || gameState.currentTurn !== 'player' || gameState.inputLocked || animation.active) {
        canvas.style.cursor = 'default';
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;
    const { col, row } = pixelToBoard(pixelX, pixelY);

    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
        const piece = gameState.board[row][col];
        if (piece && piece.side === 'player') {
            canvas.style.cursor = 'pointer';
        } else if (gameState.selectedPiece && gameState.validMoves.some(m => m.col === col && m.row === row)) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    } else {
        canvas.style.cursor = 'default';
    }
});

// ========================================
// Rendering
// ========================================
function cellCenter(col, row) {
    return {
        x: BOARD_PADDING + col * CELL_SIZE + CELL_SIZE / 2,
        y: BOARD_PADDING + row * CELL_SIZE + CELL_SIZE / 2
    };
}

function drawBackground() {
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#F0D9B5';
    ctx.fillRect(BOARD_PADDING, BOARD_PADDING, COLS * CELL_SIZE, ROWS * CELL_SIZE);
}

function drawGrid() {
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1.5;
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_PADDING, BOARD_PADDING + r * CELL_SIZE);
        ctx.lineTo(BOARD_PADDING + COLS * CELL_SIZE, BOARD_PADDING + r * CELL_SIZE);
        ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_PADDING + c * CELL_SIZE, BOARD_PADDING);
        ctx.lineTo(BOARD_PADDING + c * CELL_SIZE, BOARD_PADDING + ROWS * CELL_SIZE);
        ctx.stroke();
    }
    ctx.strokeStyle = '#5C4033';
    ctx.lineWidth = 3;
    ctx.strokeRect(BOARD_PADDING, BOARD_PADDING, COLS * CELL_SIZE, ROWS * CELL_SIZE);

    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(BOARD_PADDING, BOARD_PADDING + 4 * CELL_SIZE);
    ctx.lineTo(BOARD_PADDING + COLS * CELL_SIZE, BOARD_PADDING + 4 * CELL_SIZE);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawLabels() {
    ctx.fillStyle = '#E0D0B0';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let c = 0; c < COLS; c++) {
        const x = BOARD_PADDING + c * CELL_SIZE + CELL_SIZE / 2;
        ctx.fillText(c + 1, x, BOARD_PADDING / 2);
        ctx.fillText(c + 1, x, CANVAS_HEIGHT - BOARD_PADDING / 2);
    }
    for (let r = 0; r < ROWS; r++) {
        const y = BOARD_PADDING + r * CELL_SIZE + CELL_SIZE / 2;
        ctx.fillText(r + 1, BOARD_PADDING / 2, y);
        ctx.fillText(r + 1, CANVAS_WIDTH - BOARD_PADDING / 2, y);
    }
}

function drawHighlights() {
    if (isTutorialMode()) {
        const target = TUTORIAL_CHALLENGES[activeTutorialIndex]?.target;
        if (target) {
            const { x, y } = cellCenter(target.col, target.row);
            ctx.fillStyle = 'rgba(255, 182, 213, 0.28)';
            ctx.fillRect(BOARD_PADDING + target.col * CELL_SIZE + 1, BOARD_PADDING + target.row * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            ctx.strokeStyle = '#b998ff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, y, PIECE_RADIUS + 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // AI last move
    if (gameState.lastAIMove) {
        ctx.fillStyle = 'rgba(255, 200, 0, 0.2)';
        ctx.fillRect(
            BOARD_PADDING + gameState.lastAIMove.fromCol * CELL_SIZE + 1,
            BOARD_PADDING + gameState.lastAIMove.fromRow * CELL_SIZE + 1,
            CELL_SIZE - 2, CELL_SIZE - 2
        );
        ctx.fillRect(
            BOARD_PADDING + gameState.lastAIMove.toCol * CELL_SIZE + 1,
            BOARD_PADDING + gameState.lastAIMove.toRow * CELL_SIZE + 1,
            CELL_SIZE - 2, CELL_SIZE - 2
        );
    }

    // Selected piece
    if (gameOptions.showHints && gameState.selectedPiece && !animation.active) {
        const sp = gameState.selectedPiece;
        ctx.fillStyle = 'rgba(0, 120, 255, 0.3)';
        ctx.fillRect(
            BOARD_PADDING + sp.col * CELL_SIZE + 1,
            BOARD_PADDING + sp.row * CELL_SIZE + 1,
            CELL_SIZE - 2, CELL_SIZE - 2
        );
        for (const move of gameState.validMoves) {
            const { x, y } = cellCenter(move.col, move.row);
            if (move.isCapture) {
                ctx.strokeStyle = 'rgba(255, 50, 50, 0.7)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, PIECE_RADIUS + 4, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = 'rgba(0, 200, 80, 0.5)';
                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawSinglePiece(x, y, piece, isSelected) {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 2, y + 3, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Body
    if (piece.side === 'player') {
        const grad = ctx.createRadialGradient(x - 6, y - 6, 4, x, y, PIECE_RADIUS);
        grad.addColorStop(0, '#ff4444');
        grad.addColorStop(1, '#aa0000');
        ctx.fillStyle = grad;
    } else {
        const grad = ctx.createRadialGradient(x - 6, y - 6, 4, x, y, PIECE_RADIUS);
        grad.addColorStop(0, '#5577cc');
        grad.addColorStop(1, '#1a1a4e');
        ctx.fillStyle = grad;
    }
    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected ? '#00ffff' : (piece.side === 'player' ? '#ff8888' : '#8899cc');
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    if (isSelected) {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, PIECE_RADIUS + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('马', x, y + 1);
}

function drawPieces(timestamp) {
    for (const piece of gameState.pieces) {
        if (!piece.alive) continue;

        // Skip the animating piece (draw it separately)
        if (animation.active && animation.piece === piece) continue;

        const { x, y } = cellCenter(piece.col, piece.row);
        const isSelected = gameState.selectedPiece === piece;
        drawSinglePiece(x, y, piece, isSelected);
    }

    // Draw the animating piece on top
    if (animation.active && animation.piece) {
        const elapsed = timestamp - animation.startTime;
        const progress = Math.min(elapsed / animation.duration, 1);
        const easedProgress = easeOutBack(progress);

        const ax = animation.fromX + (animation.toX - animation.fromX) * easedProgress;
        const ay = animation.fromY + (animation.toY - animation.fromY) * easedProgress;

        // Lift effect: piece rises and falls during animation
        const lift = Math.sin(progress * Math.PI) * 15;

        drawSinglePiece(ax, ay - lift, animation.piece, false);
    }
}

function drawCaptureEffect(timestamp) {
    if (animation.captureEffect) {
        const ce = animation.captureEffect;
        const elapsed = timestamp - ce.startTime;
        const progress = Math.min(elapsed / ce.duration, 1);

        // Expanding ring
        const radius = PIECE_RADIUS + progress * 40;
        const alpha = 1 - progress;
        const color = ce.side === 'player' ? `rgba(255, 68, 68, ${alpha * 0.6})` : `rgba(85, 119, 204, ${alpha * 0.6})`;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(ce.x, ce.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner flash
        if (progress < 0.3) {
            const flashAlpha = (0.3 - progress) / 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.4})`;
            ctx.beginPath();
            ctx.arc(ce.x, ce.y, PIECE_RADIUS * (1 - progress), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw particles
    for (const p of animation.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function render(timestamp) {
    const ts = timestamp || performance.now();
    drawBackground();
    drawGrid();
    drawLabels();
    drawHighlights();
    drawPieces(ts);
    drawCaptureEffect(ts);
}

// ========================================
// UI Controls
// ========================================
function updateTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    if (gameState.gameOver) {
        if (isTutorialMode()) {
            indicator.textContent = gameState.winner === 'player' ? '教程完成！' : '重新挑战';
            indicator.className = gameState.winner === 'player' ? 'win' : 'lose';
        } else if (gameState.winner === 'player') {
            indicator.textContent = onlineMatch.active ? '你赢了对局！' : '你赢了！';
            indicator.className = 'win';
        } else {
            indicator.textContent = onlineMatch.active ? '对手获胜' : 'AI赢了！';
            indicator.className = 'lose';
        }
    } else if (gameState.currentTurn === 'player') {
        indicator.textContent = '你的回合';
        indicator.className = 'player-turn';
    } else {
        indicator.textContent = onlineMatch.active ? `${onlineMatch.opponent.name} 思考中...` : 'AI思考中...';
        indicator.className = 'ai-turn';
    }
    updateGameInfo();
}

function updateGameInfo() {
    const diff = DIFFICULTY[currentDifficulty];
    const playerCount = gameState.pieces ? gameState.pieces.filter(p => p.side === 'player' && p.alive).length : 0;
    const aiCount = gameState.pieces ? gameState.pieces.filter(p => p.side === 'ai' && p.alive).length : 0;
    document.getElementById('player-count').textContent = playerCount;
    document.getElementById('ai-count').textContent = aiCount;
    document.getElementById('move-count').textContent = gameState.moveCount || 0;
    if (isTutorialMode()) {
        document.getElementById('current-difficulty-label').textContent = '教程挑战';
        document.getElementById('ai-depth-label').textContent = '--';
        document.getElementById('opponent-side-label').textContent = '目标';
        return;
    }
    document.getElementById('current-difficulty-label').textContent = onlineMatch.active ? '在线匹配' : diff.label;
    document.getElementById('ai-depth-label').textContent = `${diff.depth}层`;
    document.getElementById('opponent-side-label').textContent = onlineMatch.active && onlineMatch.opponent
        ? onlineMatch.opponent.name
        : '蓝方';
    if (onlineMatch.active) updateOnlinePanel();
}

function opponentWinMessage() {
    return onlineMatch.active ? `${onlineMatch.opponent.name} 赢了！` : 'AI赢了！';
}

function calculateRatingDelta(opponent, didWin) {
    const expected = 1 / (1 + Math.pow(10, (opponent.rating - playerProfile.rating) / 400));
    const score = didWin ? 1 : 0;
    const rawDelta = Math.round(28 * (score - expected));
    if (didWin) return Math.max(8, Math.min(24, rawDelta));
    const lossDelta = Math.min(-6, Math.max(-22, rawDelta));
    return hasBeginnerProtection() ? Math.max(-6, lossDelta) : lossDelta;
}

function calculateForfeitDelta(opponent) {
    return Math.min(-18, calculateRatingDelta(opponent, false));
}

function applyOnlineMatchResult() {
    if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.profileApplied) return;
    const didWin = gameState.winner === 'player';
    const opponent = onlineMatch.opponent;
    const hadBeginnerProtection = hasBeginnerProtection();
    const delta = gameState.forfeit ? calculateForfeitDelta(onlineMatch.opponent) : calculateRatingDelta(onlineMatch.opponent, didWin);
    onlineMatch.ratingDelta = delta;
    onlineMatch.opponentRatingDelta = -delta;
    onlineMatch.beginnerProtection = !gameState.forfeit && !didWin && hadBeginnerProtection;
    onlineMatch.profileApplied = true;
    playerProfile.rating = Math.max(800, playerProfile.rating + delta);
    playerProfile.bestRating = Math.max(playerProfile.bestRating || playerProfile.rating, playerProfile.rating);
    if (didWin) {
        playerProfile.wins += 1;
        playerProfile.streak = Math.max(1, (playerProfile.streak || 0) + 1);
    } else {
        playerProfile.losses += 1;
        playerProfile.streak = Math.min(-1, (playerProfile.streak || 0) - 1);
    }
    opponent.rating = Math.max(800, opponent.rating - delta);
    opponent.bestRating = Math.max(opponent.bestRating || opponent.rating, opponent.rating);
    if (didWin) {
        opponent.losses = (opponent.losses || 0) + 1;
    } else {
        opponent.wins = (opponent.wins || 0) + 1;
    }
    opponent.gamesVsPlayer = (opponent.gamesVsPlayer || 0) + 1;
    opponent.lastResultVsPlayer = didWin ? 'loss' : 'win';
    opponent.lastPlayedAt = Date.now();
    if (!gameState.forfeit) {
        advanceDailyMission('complete-online');
        if (didWin) advanceDailyMission('win-online');
    }
    matchHistory = [{
        opponent: opponent.name,
        opponentAvatar: opponent.avatar || '♞',
        result: didWin ? 'win' : 'loss',
        ratingDelta: delta,
        opponentRating: opponent.rating,
        moves: gameState.moveCount || 0,
        forfeit: !!gameState.forfeit,
        playedAt: Date.now(),
    }, ...matchHistory].slice(0, MAX_MATCH_HISTORY);
    saveMatchHistory();
    savePlayerProfile();
    saveOpponentProfiles();
    updatePlayerProfileUI();
    updateOnlinePanel();
}

function updateOnlineResultDetails() {
    const details = document.getElementById('game-over-details');
    if (!onlineMatch.active || !onlineMatch.opponent) {
        details.textContent = '';
        return;
    }
    if (onlineMatch.realtime) {
        applyOnlineMatchResult();
        const resultText = gameState.winner === 'player' ? '你获胜' : `${onlineMatch.opponent.name} 获胜`;
        const sign = onlineMatch.ratingDelta > 0 ? '+' : '';
        const opponentSign = onlineMatch.opponentRatingDelta > 0 ? '+' : '';
        const protectionLabel = onlineMatch.beginnerProtection ? ' · 新手保护已生效' : '';
        details.textContent = `实时房间 ${onlineMatch.roomId} · ${resultText} · 你 ${sign}${onlineMatch.ratingDelta} / 对手 ${opponentSign}${onlineMatch.opponentRatingDelta} · 当前 ${playerProfile.rating}${protectionLabel}`;
        return;
    }

    applyOnlineMatchResult();
    const sign = onlineMatch.ratingDelta > 0 ? '+' : '';
    const opponentSign = onlineMatch.opponentRatingDelta > 0 ? '+' : '';
    const resultLabel = gameState.forfeit ? '中途离开判负 · ' : '';
    const protectionLabel = onlineMatch.beginnerProtection ? ' · 新手保护已生效' : '';
    details.textContent = `${resultLabel}房间 ${onlineMatch.roomId} · 你 ${sign}${onlineMatch.ratingDelta} / 对手 ${opponentSign}${onlineMatch.opponentRatingDelta} · 当前 ${playerProfile.rating} · 延迟 ${onlineMatch.latency}ms${protectionLabel}`;
}

function updateGameOverActions() {
    const playAgainBtn = document.getElementById('play-again-btn');
    const rematchBtn = document.getElementById('rematch-btn');
    const returnLobbyBtn = document.getElementById('return-lobby-btn');
    const status = document.getElementById('rematch-status');

    playAgainBtn.disabled = false;
    rematchBtn.disabled = false;
    returnLobbyBtn.disabled = false;
    rematchBtn.textContent = '请求再战';
    status.textContent = '';

    if (isTutorialMode()) {
        playAgainBtn.textContent = '重玩教程';
        rematchBtn.classList.add('hidden');
        returnLobbyBtn.textContent = '返回大厅';
        returnLobbyBtn.classList.remove('hidden');
        return;
    }

    if (onlineMatch.active && onlineMatch.opponent) {
        playAgainBtn.textContent = onlineMatch.realtime ? '返回大厅' : '匹配新对手';
        rematchBtn.classList.toggle('hidden', !!onlineMatch.realtime);
        returnLobbyBtn.textContent = '离开房间';
        returnLobbyBtn.classList.remove('hidden');
        return;
    }

    playAgainBtn.textContent = '再来一局';
    rematchBtn.classList.add('hidden');
    returnLobbyBtn.classList.add('hidden');
}

function hasUnfinishedOnlineGame() {
    return onlineMatch.active && onlineMatch.opponent && !onlineMatch.searching && !gameState.gameOver && (onlineMatch.realtime || !onlineMatch.profileApplied);
}

function forfeitOnlineGame(reason = '中途离开') {
    if (!hasUnfinishedOnlineGame()) return false;
    if (isRealtimeMatch() && realtimeClient.ws.readyState === WebSocket.OPEN) {
        realtimeClient.ws.send(JSON.stringify({ type: 'game.resign' }));
    }
    gameState.gameOver = true;
    gameState.winner = 'ai';
    gameState.forfeit = true;
    gameState.forfeitReason = reason;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.inputLocked = false;
    animation.active = false;
    updateTurnIndicator();
    applyOnlineMatchResult();
    markOpponentAway(4 + Math.floor(Math.random() * 8));
    addChatMessage('opponent', Math.random() < 0.55 ? '👍' : '再来一局？');
    updateChatControls();
    return true;
}

function hideForfeitConfirm() {
    const overlay = document.getElementById('forfeit-confirm-overlay');
    if (overlay) overlay.classList.add('hidden');
    pendingForfeitAction = null;
}

function requestForfeitConfirmation(reason, onConfirm) {
    if (!hasUnfinishedOnlineGame()) {
        onConfirm();
        return;
    }
    pendingForfeitAction = { reason, onConfirm };
    const text = document.getElementById('forfeit-confirm-text');
    if (text) {
        const opponentName = onlineMatch.opponent ? onlineMatch.opponent.name : '对手';
        text.textContent = `现在${reason}会被判负，至少扣 18 分，并让 ${opponentName} 获胜。确定继续吗？`;
    }
    document.getElementById('forfeit-confirm-overlay').classList.remove('hidden');
}

function leaveOnlineRoom() {
    if (rematchResponseTimer) {
        clearTimeout(rematchResponseTimer);
        rematchResponseTimer = null;
    }
    if (opponentRematchTimer) {
        clearTimeout(opponentRematchTimer);
        opponentRematchTimer = null;
    }
    if (onlineMatch.active && onlineMatch.opponent && !onlineMatch.opponentLeft) {
        markOpponentAway(3 + Math.floor(Math.random() * 8));
    }
    document.getElementById('game-over-overlay').style.display = 'none';
    closeRealtimeConnection();
    onlineMatch = { active: false, searching: false, opponent: null };
    activeTutorialIndex = null;
    resetOnlineChat();
    updateOnlinePanel();
    updateDifficultyButtons();
    updateModeSpecificUI();
    showMainMenu();
}

function startAcceptedRematch(statusMessage) {
    const status = document.getElementById('rematch-status');
    status.textContent = statusMessage;
    onlineMatch.opponentRequestedRematch = false;
    onlineMatch.firstTurn = flipFirstTurn(onlineMatch.firstTurn);
    onlineMatch.roomId = nextRoomId();
    onlineMatch.latency = Math.floor(24 + Math.random() * 48);
    onlineMatch.moveSalt = Math.floor(Math.random() * 1000000);
    onlineMatch.ratingDelta = null;
    onlineMatch.opponentRatingDelta = null;
    onlineMatch.beginnerProtection = false;
    onlineMatch.profileApplied = false;
    onlineMatch.opponentLeft = false;
    updateOnlinePanel();
    setTimeout(() => initGame(), 850);
}

function requestRematch() {
    if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft || rematchResponseTimer) return;

    const playAgainBtn = document.getElementById('play-again-btn');
    const rematchBtn = document.getElementById('rematch-btn');
    const returnLobbyBtn = document.getElementById('return-lobby-btn');
    const status = document.getElementById('rematch-status');

    if (onlineMatch.opponentRequestedRematch) {
        playAgainBtn.disabled = true;
        rematchBtn.disabled = true;
        returnLobbyBtn.disabled = true;
        startAcceptedRematch('已接受再战，准备新一局...');
        return;
    }

    playAgainBtn.disabled = true;
    rematchBtn.disabled = true;
    returnLobbyBtn.disabled = true;
    status.textContent = `等待 ${onlineMatch.opponent.name} 回应...`;

    const responseDelay = Math.floor(900 + Math.random() * 1600 + (onlineMatch.latency || 0) * 3);
    rematchResponseTimer = setTimeout(() => {
        rematchResponseTimer = null;
        if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft) return;
        const accepted = Math.random() < rematchAcceptChance();

        if (!accepted) {
            status.textContent = `${onlineMatch.opponent.name} 拒绝了再战。`;
            playAgainBtn.disabled = false;
            returnLobbyBtn.disabled = false;
            rematchBtn.disabled = true;
            if (Math.random() < 0.64) {
                const opponentName = onlineMatch.opponent.name;
                setTimeout(() => opponentLeavesRoom(`${opponentName} 已离开房间。`), 700 + Math.random() * 1600);
            }
            return;
        }

        startAcceptedRematch(`${onlineMatch.opponent.name} 已接受，准备新一局...`);
    }, responseDelay);
}

function scheduleOpponentRematchRequest() {
    if (onlineMatch.realtime) return;
    if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft || opponentRematchTimer) return;
    opponentRematchTimer = setTimeout(() => {
        opponentRematchTimer = null;
        if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft || !gameState.gameOver || rematchResponseTimer) return;
        if (Math.random() > opponentRematchChance()) return;

        onlineMatch.opponentRequestedRematch = true;
        addChatMessage('opponent', '再来一局？');
        const status = document.getElementById('rematch-status');
        const rematchBtn = document.getElementById('rematch-btn');
        status.textContent = `${onlineMatch.opponent.name} 请求再战。`;
        rematchBtn.textContent = '接受再战';
        rematchBtn.disabled = false;
    }, 1800 + Math.random() * 2600);
}

function scheduleOpponentLeaveAfterGame() {
    if (onlineMatch.realtime) return;
    if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft) return;
    const timer = setTimeout(() => {
        chatTimers = chatTimers.filter(item => item !== timer);
        if (!onlineMatch.active || !onlineMatch.opponent || onlineMatch.opponentLeft || !gameState.gameOver || onlineMatch.opponentRequestedRematch || rematchResponseTimer) return;
        if (Math.random() < opponentLeaveChance()) {
            opponentLeavesRoom(`${onlineMatch.opponent.name} 已离开房间。`);
        }
    }, 5200 + Math.random() * 6400);
    chatTimers.push(timer);
}

function showGameOver(message) {
    document.getElementById('game-over-message').textContent = message;
    updateOnlineResultDetails();
    updateGameOverActions();
    document.getElementById('game-over-overlay').style.display = 'flex';
    updateChatControls();
    scheduleOpponentChat(gameState.winner === 'player' ? 'endLose' : 'endWin', 0.34, 900, 2400, true);
    scheduleOpponentRematchRequest();
    scheduleOpponentLeaveAfterGame();
    if (gameState.winner === 'player') {
        playWinSound();
    } else {
        playLoseSound();
    }
}

// Difficulty buttons
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        requestForfeitConfirmation('切换难度', () => {
            onlineMatch = { active: false, searching: false, opponent: null };
            activeTutorialIndex = null;
            currentDifficulty = btn.dataset.diff;
            updateOnlinePanel();
            updateDifficultyButtons();
            updateModeSpecificUI();
            showGameScreen();
            initGame();
        });
    });
});

document.getElementById('menu-training-btn').addEventListener('click', () => requestForfeitConfirmation('切换训练', startTrainingMode));
document.getElementById('menu-online-btn').addEventListener('click', () => requestForfeitConfirmation('重新匹配', startOnlineMatch));
document.getElementById('menu-room-btn').addEventListener('click', showRoomCodeOverlay);
document.getElementById('menu-tutorial-btn').addEventListener('click', () => requestForfeitConfirmation('进入教程', () => startTutorialMode(0)));
document.getElementById('match-btn').addEventListener('click', () => requestForfeitConfirmation('重新匹配', startOnlineMatch));
document.getElementById('cancel-match-btn').addEventListener('click', () => cancelMatchmaking(true));
document.getElementById('profile-name-input').addEventListener('change', (event) => updateProfileOption('name', event.target.value));
document.getElementById('profile-avatar-select').addEventListener('change', (event) => updateProfileOption('avatar', event.target.value));
document.getElementById('profile-title-select').addEventListener('change', (event) => updateProfileOption('title', event.target.value));
document.getElementById('profile-accent-select').addEventListener('change', (event) => updateProfileOption('accent', event.target.value));
document.getElementById('profile-settings-open').addEventListener('click', () => {
    document.getElementById('profile-settings-overlay').classList.remove('hidden');
});
document.getElementById('profile-settings-close').addEventListener('click', () => {
    document.getElementById('profile-settings-overlay').classList.add('hidden');
});
document.getElementById('profile-settings-overlay').addEventListener('click', (event) => {
    if (event.target.id === 'profile-settings-overlay') {
        document.getElementById('profile-settings-overlay').classList.add('hidden');
    }
});
document.getElementById('room-code-close').addEventListener('click', hideRoomCodeOverlay);
document.getElementById('room-code-overlay').addEventListener('click', (event) => {
    if (event.target.id === 'room-code-overlay') hideRoomCodeOverlay();
});
document.getElementById('room-code-create').addEventListener('click', () => {
    saveRealtimeServerUrl();
    const code = generateRoomCode();
    document.getElementById('room-code-input').value = code;
    const serverUrl = localStorage.getItem(REALTIME_SERVER_KEY);
    document.getElementById('room-code-status').textContent = serverUrl
        ? `房间 ${code} 已创建。服务器：${serverUrl}。朋友使用同一个服务器地址和房间码加入。`
        : `房间 ${code} 已创建。未填写服务器地址时，点击“进入房间”会开始模拟。`;
});
document.getElementById('room-code-join').addEventListener('click', startRoomChallenge);
document.getElementById('room-code-input').addEventListener('input', (event) => {
    event.target.value = normalizeRoomCode(event.target.value);
});
document.getElementById('server-url-input').addEventListener('change', saveRealtimeServerUrl);
document.querySelectorAll('.tutorial-btn').forEach(button => {
    button.addEventListener('click', () => initTutorialChallenge(Number(button.dataset.tutorial)));
});
document.querySelectorAll('.lobby-tab').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.lobby-tab').forEach(tab => tab.classList.toggle('active', tab === button));
        document.querySelectorAll('.lobby-tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.lobbyPanel === button.dataset.lobbyTab);
        });
    });
});
document.querySelectorAll('.detail-tab').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.detail-tab').forEach(tab => tab.classList.toggle('active', tab === button));
        document.querySelectorAll('.detail-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.detailPanel === button.dataset.detailTab);
        });
    });
});
document.getElementById('lobby-detail-open').addEventListener('click', () => {
    updateLobbyInsights();
    document.getElementById('lobby-detail-overlay').classList.remove('hidden');
});
document.getElementById('lobby-detail-close').addEventListener('click', () => {
    document.getElementById('lobby-detail-overlay').classList.add('hidden');
});
document.getElementById('lobby-detail-overlay').addEventListener('click', (event) => {
    if (event.target.id === 'lobby-detail-overlay') {
        document.getElementById('lobby-detail-overlay').classList.add('hidden');
    }
});

document.getElementById('sound-toggle').addEventListener('change', (event) => {
    gameOptions.sound = event.target.checked;
});

document.getElementById('hints-toggle').addEventListener('change', (event) => {
    gameOptions.showHints = event.target.checked;
    render();
});

document.getElementById('animation-toggle').addEventListener('change', (event) => {
    gameOptions.animations = event.target.checked;
});

document.getElementById('ai-first-toggle').addEventListener('change', (event) => {
    gameOptions.aiFirst = event.target.checked;
    initGame();
});

document.getElementById('ai-delay-select').addEventListener('change', (event) => {
    gameOptions.aiDelay = Number(event.target.value);
});

document.getElementById('home-btn').addEventListener('click', () => {
    requestForfeitConfirmation('离开房间', () => {
        leaveOnlineRoom();
    });
});
document.getElementById('restart-btn').addEventListener('click', () => {
    if (onlineMatch.active && !gameState.gameOver) {
        requestForfeitConfirmation('重新开始', () => {
            document.getElementById('game-over-overlay').style.display = 'none';
            startOnlineMatch();
        });
        return;
    }
    if (isTutorialMode()) {
        initTutorialChallenge(activeTutorialIndex);
        return;
    }
    initGame();
});
document.getElementById('play-again-btn').addEventListener('click', () => {
    if (isTutorialMode()) {
        document.getElementById('game-over-overlay').style.display = 'none';
        initTutorialChallenge(0);
        return;
    }
    if (onlineMatch.active) {
        document.getElementById('game-over-overlay').style.display = 'none';
        if (onlineMatch.realtime) {
            leaveOnlineRoom();
            return;
        }
        startOnlineMatch();
        return;
    }
    initGame();
});
document.getElementById('rematch-btn').addEventListener('click', () => requestRematch());
document.getElementById('return-lobby-btn').addEventListener('click', () => leaveOnlineRoom());
document.querySelectorAll('.chat-btn').forEach(button => {
    button.addEventListener('click', () => sendQuickChat(button.dataset.chat));
});
document.getElementById('chat-send-btn').addEventListener('click', () => {
    sendQuickChat(document.getElementById('chat-select').value);
});
document.getElementById('forfeit-cancel-btn').addEventListener('click', hideForfeitConfirm);
document.getElementById('forfeit-confirm-btn').addEventListener('click', () => {
    const pending = pendingForfeitAction;
    hideForfeitConfirm();
    if (!pending) return;
    forfeitOnlineGame(pending.reason);
    pending.onConfirm();
});

window.addEventListener('beforeunload', () => {
    forfeitOnlineGame('断开连接');
});

// ========================================
// Start
// ========================================
updateOnlinePanel();
updateDifficultyButtons();
updateModeSpecificUI();
initGame();
