const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const lightCanvas = document.createElement('canvas');
lightCanvas.width = canvas.width;
lightCanvas.height = canvas.height;
const lightCtx = lightCanvas.getContext('2d');

const WORLD = { width: 14000, height: 8000 };
const VIEW = { width: canvas.width, height: canvas.height };
let CAMP_POSITION = null;
const TERRAIN_CHUNK_SIZE = 256;
const RESOURCE_GRID_SIZE = 256;
const MAX_TERRAIN_CHUNKS = 180;
const MAX_PARTICLES = 220;
const COVER_GRID_SIZE = 160;
const ITEM_ICON_GRID = 12;
const MAX_ENEMIES = 115;
const MAX_NEARBY_ENEMIES = 20;
const DYNAMIC_SPAWN_MIN_DISTANCE = 560;
const DYNAMIC_SPAWN_MAX_DISTANCE = 940;
const ACTIVE_ENEMY_KEEP_DISTANCE = 1750;
const BIOME_TREE_KINDS = [
    'tree', 'grassOakTree', 'meadowBlossomTree', 'forestOakTree', 'birchTree', 'pineTree', 'mapleTree',
    'deadTree', 'darkTree', 'hardwoodTree', 'buttressRoot', 'swampCypressTree', 'reedWillowTree',
    'mineIronwoodTree', 'ruinsElderTree',
];
const TREE_STUMP_KIND = Object.fromEntries(BIOME_TREE_KINDS.map(kind => [kind, `${kind}Stump`]));
const STUMP_TREE_KIND = Object.fromEntries(BIOME_TREE_KINDS.map(kind => [`${kind}Stump`, kind]));
const WOOD_EQUIVALENTS = ['wood', 'oakWood', 'blossomWood', 'birchWood', 'pineWood', 'mapleWood', 'deadWood', 'darkWood', 'cypressWood', 'willowWood', 'ironwood', 'elderWood', 'buttressWood', 'hardwood'];
const BIOME_MONSTER_TERRAIN = {
    grassRunner: ['grass'],
    tallgrassRaptor: ['tallgrass'],
    meadowMoth: ['meadow'],
    forestBear: ['forest'],
    bambooPanda: ['bamboo'],
    birchStag: ['birch'],
    pineLynx: ['pine'],
    mapleFox: ['maple'],
    reedCrab: ['reedWetland', 'shore'],
    swampMireling: ['swamp', 'mud'],
    drySandWasp: ['dry'],
    mineCrystalBat: ['mine'],
    ruinsBoneGuard: ['ruins'],
};
const VILLAGER_HOSTILE_MONSTERS = new Set([
    'wolf', 'shade', 'golem',
    'tallgrassRaptor', 'forestBear', 'pineLynx',
    'jungleSnake', 'vineStalker',
    'swampMireling', 'drySandWasp',
    'ruinsBoneGuard',
]);
const keys = new Set();
const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, blocking: false };
const touchInput = { moveX: 0, moveY: 0, interact: false, joystickPointerId: null };
const camera = { x: 0, y: 0 };
const terrainChunkCache = new Map();
const vegetationSpriteCache = {
    tallGrass: new Map(),
    bamboo: new Map(),
};
let activeJungleCultVillage = null;
let activeAdvancedVillage = null;
const wildernessSettings = {
    seedText: '',
    monsterDensity: 1,
    dayLength: 230,
    jungleScale: 1,
    forestScale: 1,
    villageScale: 1,
    villageDistance: 1,
    cultSpacing: 150,
    fortressEnabled: true,
};
let toastTimer = null;
let lastTime = performance.now();
let worldSeed = createWorldSeed();
CAMP_POSITION = createCampPosition();
let worldRegionsCacheSeed = null;
let worldRegionsCache = null;
let villagePathCacheSeed = null;
let villagePathCache = null;
let state = createState();

const RESOURCE_LABELS = {
    wood: '木头',
    oakWood: '橡木',
    blossomWood: '花冠木',
    birchWood: '白桦木',
    pineWood: '松木',
    mapleWood: '枫木',
    deadWood: '枯木',
    darkWood: '暗木',
    cypressWood: '柏木',
    willowWood: '柳木',
    ironwood: '铁木',
    elderWood: '古树木',
    buttressWood: '板根木',
    bamboo: '竹材',
    bambooShard: '竹片',
    jungleLeaf: '丛林大叶',
    vine: '藤蔓',
    jungleFruit: '热带果',
    hardwood: '硬木',
    stone: '石头',
    fiber: '纤维',
    pebble: '小石子',
    berry: '浆果',
    herb: '草药',
    mushroom: '蘑菇',
    flower: '野花',
    lotus: '莲花',
    cactusFruit: '仙人掌果',
    resin: '树脂',
    sap: '树液',
    honey: '蜂蜜',
    beeStinger: '蜂刺',
    beeswax: '蜂蜡',
    rabbitFur: '兔毛',
    rabbitFoot: '兔腿',
    antler: '鹿角',
    sinew: '鹿筋',
    frogLeg: '蛙腿',
    frogTongue: '蛙舌',
    scorpionShell: '蝎壳',
    batWing: '蝠翼',
    stoneCore: '石核',
    shadowShard: '暗影残片',
    shadowEssence: '暗影精华',
    beastClaw: '兽爪',
    pollenDust: '花粉尘',
    thickFur: '厚毛皮',
    reedShell: '湿地甲壳',
    mireCore: '泥沼核心',
    crystalFang: '晶牙',
    boneShard: '骨片',
    toxicMushroom: '毒蘑菇',
    mud: '泥块',
    ore: '铁矿',
    coal: '煤块',
    hide: '兽皮',
    meat: '生肉',
    slimeGel: '黏液',
    fang: '兽牙',
    venom: '毒刺',
    crystal: '魔晶',
    stoneAxe: '石斧',
    stonePickaxe: '石镐',
    stoneSickle: '石镰',
    stoneSpear: '石矛',
    slingshot: '弹弓',
    bambooSpear: '竹矛',
    ironSword: '铁剑',
    crystalBlade: '魔晶剑',
    venomDagger: '毒牙匕首',
    leatherArmor: '皮甲',
    clothArmor: '布衣',
    ironArmor: '铁甲',
    crystalArmor: '魔晶甲',
    woodShield: '木盾',
    ironShield: '铁盾',
    thickFurCoat: '厚毛皮衣',
    reedShellArmor: '湿地甲壳甲',
    mireCoreArmor: '泥沼护甲',
    coalBomb: '煤火弹',
    poisonVial: '毒药',
    campfire: '营火',
    torch: '火把',
    bedroll: '睡袋',
    campCharm: '营地护符',
    snare: '捕兽夹',
    bambooFence: '竹栅栏',
    bambooTrap: '竹刺陷阱',
    potionTable: '药水台',
    workbench: '工作台',
    forge: '锻造台',
    campFlag: '营地旗帜',
    potion: '治疗药水',
    stew: '蘑菇汤',
    salve: '黏液药膏',
    antidote: '解毒药',
    speedPotion: '迅捷药水',
    regenPotion: '再生药水',
    ironSkinPotion: '硬皮药水',
    bandage: '绷带',
    honeySalve: '蜂蜜药膏',
    nightVisionPotion: '夜视药水',
    jumpPotion: '跳跃药水',
    poisonResistPotion: '毒抗药水',
    shadowPotion: '暗影药水',
    strongBandage: '强效绷带',
    sinewBow: '鹿筋弓',
    simpleArrow: '简易箭',
    poisonArrow: '毒箭',
    beeDart: '蜂刺飞镖',
    antlerSpear: '鹿角矛',
    stoneCoreHammer: '石核锤',
    rabbitCloak: '兔毛披肩',
    scorpionArmor: '蝎壳甲',
    antlerCharm: '鹿角护符',
    waxTorch: '蜂蜡火把',
    beehiveBox: '蜂箱',
    antlerHorn: '鹿角号角',
    shadowLantern: '暗影灯',
    stoneCoreTotem: '石核图腾',
    reedMat: '芦苇席',
    chest: '木箱',
    resinGlue: '树脂胶',
    mapleSnack: '枫糖点心',
    honeyRoastMeat: '蜂蜜烤肉',
    roastMeat: '烤肉',
    key: '废墟钥匙',
    copperCoin: '铜币',
};

const SIMPLE_WEAPON_DEFS = [
    { id: 'woodFork', name: '木叉', desc: '中距离刺击，命中轻微击退', cost: { wood: 3, fiber: 1 }, icon: 'spear', profile: { damage: 2, range: 76, stamina: 10, cooldown: 0.36, arc: 0.26, style: 'thrust', knock: 1.25 } },
    { id: 'stoneBladeSpear', name: '石刃短矛', desc: '快速连刺，第三击距离更长', cost: { wood: 2, stone: 2, fiber: 1 }, icon: 'spear', profile: { damage: 3, range: 78, stamina: 10, cooldown: 0.32, arc: 0.28, style: 'thrust', comboRange: 28 } },
    { id: 'bambooPike', name: '竹刺枪', desc: '直线突刺，可穿过第一个小怪', cost: { bamboo: 4, stone: 1 }, icon: 'spear', profile: { damage: 3, range: 118, stamina: 12, cooldown: 0.48, arc: 0.36, style: 'thrust', maxHits: 2 } },
    { id: 'boneSpikedClub', name: '骨刺棍', desc: '横扫攻击，命中造成流血', cost: { wood: 3, fang: 1, fiber: 1 }, icon: 'club', profile: { damage: 3, range: 54, stamina: 12, cooldown: 0.42, arc: -0.05, style: 'slash', cleave: true, bleed: true } },
    { id: 'vineStoneHammer', name: '藤索石锤', desc: '慢速重击，砸地可短暂定身', cost: { wood: 2, stone: 4, fiber: 3 }, icon: 'hammer', station: 'workbench', unlock: ['workbench'], profile: { damage: 5, range: 52, stamina: 18, cooldown: 0.72, arc: 0.04, style: 'chop', cleave: true, root: 700 } },
    { id: 'shieldClub', name: '木盾短棍', desc: '攻防一体，命中后短暂稳住身形', cost: { wood: 5, fiber: 2 }, icon: 'shield', profile: { damage: 2, range: 45, stamina: 9, cooldown: 0.34, arc: 0.05, style: 'club', guard: true, knock: 0.8 } },
    { id: 'twinStoneDagger', name: '双石匕首', desc: '双连击，贴身快速爆发', cost: { stone: 3, fiber: 2 }, icon: 'dagger', profile: { damage: 2, range: 38, stamina: 8, cooldown: 0.22, arc: 0.02, style: 'stab', multiStrike: 2 } },
    { id: 'bambooThrowingKnife', name: '竹片飞刀', desc: '轻快近战，短按连削并附带飞刀残影', cost: { bamboo: 2, fiber: 1 }, icon: 'dagger', profile: { damage: 2, range: 50, stamina: 9, cooldown: 0.28, arc: 0.08, style: 'stab', dart: true } },
    { id: 'torchClub', name: '火把棍', desc: '近战点燃敌人，夜晚伤害更高', cost: { wood: 2, resin: 1, coal: 1 }, icon: 'torch', unlock: ['resin', 'coal'], profile: { damage: 3, range: 48, stamina: 11, cooldown: 0.38, arc: 0.08, style: 'club', burn: true, nightBonus: 1 } },
    { id: 'toxicKnife', name: '毒刺短刀', desc: '快速攻击，命中叠毒', cost: { stone: 2, toxicMushroom: 1, fiber: 1 }, icon: 'dagger', profile: { damage: 2, range: 36, stamina: 8, cooldown: 0.24, arc: 0.04, style: 'stab', poison: true } },
    { id: 'beeNeedleSpear', name: '蜂刺针矛', desc: '高频刺击，小概率麻痹', cost: { wood: 2, beeStinger: 1, fiber: 1 }, icon: 'spear', profile: { damage: 3, range: 86, stamina: 10, cooldown: 0.3, arc: 0.3, style: 'thrust', stunChance: 0.28 } },
    { id: 'antlerFork', name: '鹿角叉', desc: '扇形戳刺，适合打多个敌人', cost: { wood: 2, antler: 1, fiber: 1 }, icon: 'spear', profile: { damage: 4, range: 82, stamina: 13, cooldown: 0.44, arc: -0.02, style: 'slash', maxHits: 3 } },
    { id: 'sling', name: '投石带', desc: '消耗小石子，蓄力越久越远', cost: { fiber: 4, hide: 1 }, icon: 'bow', ranged: true, profile: { damage: 2, range: 390, stamina: 11, cooldown: 0.78, arc: 0.18, style: 'thrust', rangedKind: 'slingStone' } },
    { id: 'bambooCrossbow', name: '竹弩', desc: '慢装填，高穿透直线射击', cost: { bamboo: 5, wood: 2, fiber: 3 }, icon: 'bow', station: 'workbench', unlock: ['workbench', 'simpleArrow'], ranged: true, profile: { damage: 4, range: 520, stamina: 18, cooldown: 1.15, arc: 0.18, style: 'thrust', rangedKind: 'crossbowBolt', maxHits: 2 } },
    { id: 'ropeSickle', name: '绳镰', desc: '拉拽敌人，绕身攻击', cost: { stoneSickle: 1, fiber: 4 }, icon: 'sickle', station: 'workbench', unlock: ['stoneSickle'], profile: { damage: 3, range: 118, stamina: 13, cooldown: 0.46, arc: -0.08, style: 'rope', pull: true } },
    { id: 'nailClub', name: '木钉棒', desc: '普通挥击，概率眩晕', cost: { wood: 3, stone: 2 }, icon: 'club', profile: { damage: 3, range: 48, stamina: 12, cooldown: 0.4, arc: 0.04, style: 'club', stunChance: 0.35 } },
    { id: 'resinHammer', name: '树脂粘锤', desc: '命中减速，蓄力感强的黏击', cost: { wood: 3, resin: 2, stone: 2 }, icon: 'hammer', station: 'workbench', unlock: ['resin'], profile: { damage: 4, range: 50, stamina: 15, cooldown: 0.58, arc: 0.05, style: 'chop', root: 1100 } },
    { id: 'frogWhip', name: '蛙舌鞭', desc: '长距离鞭打，可打断冲锋', cost: { frogTongue: 1, fiber: 3, wood: 1 }, icon: 'whip', station: 'workbench', unlock: ['frogTongue'], profile: { damage: 2, range: 116, stamina: 12, cooldown: 0.42, arc: -0.03, style: 'slash', interrupt: true } },
    { id: 'scorpionHook', name: '蝎尾钩', desc: '钩击加毒伤，可把小怪拉近', cost: { scorpionShell: 1, venom: 1, wood: 2 }, icon: 'sickle', station: 'forge', unlock: ['scorpionShell', 'venom'], profile: { damage: 4, range: 88, stamina: 14, cooldown: 0.46, arc: 0.12, style: 'thrust', poison: true, pull: true } },
    { id: 'shadowWoodBlade', name: '影木刃', desc: '短距离瞬斩，夜晚有额外残影', cost: { wood: 2, shadowShard: 1, fiber: 1 }, icon: 'blade', station: 'forge', unlock: ['shadowShard'], profile: { damage: 4, range: 58, stamina: 13, cooldown: 0.34, arc: 0.02, style: 'slash', cleave: true, nightBonus: 2, shadow: true } },
    { id: 'clawHookBlade', name: '兽爪钩刃', desc: '突进钩斩，可拉近敌人', cost: { beastClaw: 2, wood: 2, fiber: 2 }, icon: 'blade', station: 'workbench', unlock: ['beastClaw'], profile: { damage: 4, range: 72, stamina: 13, cooldown: 0.38, arc: 0.08, style: 'slash', pull: true, knock: 1.15 } },
    { id: 'pollenDartFan', name: '花粉飞扇', desc: '轻快挥击，命中会减速', cost: { pollenDust: 2, blossomWood: 2, fiber: 2 }, icon: 'dagger', station: 'workbench', unlock: ['pollenDust'], profile: { damage: 2, range: 64, stamina: 9, cooldown: 0.26, arc: -0.04, style: 'slash', root: 900, multiStrike: 2 } },
    { id: 'crystalFangSpear', name: '晶牙长矛', desc: '长距离晶刺，穿透多个目标', cost: { crystalFang: 1, ironwood: 2, fiber: 2 }, icon: 'spear', station: 'forge', unlock: ['crystalFang'], profile: { damage: 5, range: 116, stamina: 16, cooldown: 0.52, arc: 0.32, style: 'thrust', maxHits: 3 } },
    { id: 'boneShardMace', name: '骨片钉锤', desc: '重击震退，概率眩晕', cost: { boneShard: 3, deadWood: 2, stone: 2 }, icon: 'hammer', station: 'forge', unlock: ['boneShard'], profile: { damage: 5, range: 54, stamina: 17, cooldown: 0.62, arc: 0.04, style: 'chop', cleave: true, stunChance: 0.45 } },
];

Object.assign(RESOURCE_LABELS, Object.fromEntries(SIMPLE_WEAPON_DEFS.map(weapon => [weapon.id, weapon.name])));

const VILLAGER_TRADES = {
    blacksmith: [
        { give: { ore: 2, coal: 1 }, receive: { simpleArrow: 8 }, minRep: -2 },
        { give: { crystal: 1, ore: 3 }, receive: { ironSword: 1 }, minRep: 2 },
        { give: { stoneCore: 1, coal: 2 }, receive: { stoneCoreHammer: 1 }, minRep: 4 },
    ],
    apothecary: [
        { give: { herb: 3, flower: 1 }, receive: { potion: 1 }, minRep: -2 },
        { give: { lotus: 2, slimeGel: 1 }, receive: { regenPotion: 1 }, minRep: 1 },
        { give: { honey: 1, antidote: 1 }, receive: { poisonResistPotion: 1 }, minRep: 2 },
    ],
    kitchen: [
        { give: { meat: 2, wood: 1 }, receive: { roastMeat: 2 }, minRep: -2 },
        { give: { honey: 1, meat: 2 }, receive: { honeyRoastMeat: 1 }, minRep: 1 },
        { give: { sap: 1, berry: 2 }, receive: { mapleSnack: 2 }, minRep: 2 },
    ],
    guard: [
        { give: { ore: 1, fiber: 2 }, receive: { simpleArrow: 10 }, minRep: -1 },
        { give: { coal: 1, stone: 3 }, receive: { stoneSpear: 1 }, minRep: 1 },
        { give: { crystal: 1, bandage: 2 }, receive: { ironSkinPotion: 1 }, minRep: 3 },
    ],
    elder: [
        { give: { flower: 3 }, receive: { bandage: 2 }, minRep: 0 },
        { give: { crystal: 1, flower: 4 }, receive: { antlerHorn: 1 }, minRep: 2 },
        { give: { shadowShard: 2, crystal: 1 }, receive: { shadowLantern: 1 }, minRep: 4 },
    ],
    unemployed: [
        { give: { fiber: 3 }, receive: { berry: 2 }, minRep: -3 },
        { give: { pebble: 4 }, receive: { mushroom: 1, flower: 1 }, minRep: -2 },
        { give: { wood: 3, stone: 1 }, receive: { torch: 1 }, minRep: 0 },
    ],
    merchant: [
        { give: { wood: 5 }, receive: { copperCoin: 2 }, minRep: -3 },
        { give: { berry: 4 }, receive: { copperCoin: 1 }, minRep: -3 },
        { give: { ore: 2 }, receive: { copperCoin: 5 }, minRep: -2 },
        { give: { copperCoin: 2 }, receive: { bandage: 1 }, minRep: -3 },
        { give: { copperCoin: 3 }, receive: { simpleArrow: 8 }, minRep: -3 },
        { give: { copperCoin: 5 }, receive: { potion: 1 }, minRep: -2 },
        { give: { copperCoin: 4 }, receive: { torch: 2 }, minRep: -3 },
        { give: { copperCoin: 4 }, receive: { roastMeat: 2 }, minRep: -2 },
        { give: { copperCoin: 5 }, receive: { antidote: 1 }, minRep: -1 },
        { give: { copperCoin: 6 }, receive: { speedPotion: 1 }, minRep: 0 },
        { give: { copperCoin: 7 }, receive: { bambooTrap: 1 }, minRep: 0 },
        { give: { copperCoin: 7 }, receive: { poisonArrow: 6 }, minRep: 1 },
        { give: { copperCoin: 8 }, receive: { sinewBow: 1 }, minRep: 1 },
        { give: { copperCoin: 10 }, receive: { ironSkinPotion: 1 }, minRep: 2 },
        { give: { copperCoin: 12 }, receive: { bedroll: 1 }, minRep: 2 },
        { give: { copperCoin: 14 }, receive: { shadowLantern: 1 }, minRep: 4 },
    ],
};

const RESOURCE_ICONS = {
    wood: '🪵',
    oakWood: '⌑',
    blossomWood: '✿',
    birchWood: '▯',
    pineWood: '⩓',
    mapleWood: '⌬',
    deadWood: '⌦',
    darkWood: '◬',
    cypressWood: '⌍',
    willowWood: '⌇',
    ironwood: '⬒',
    elderWood: '◌',
    buttressWood: '⟂',
    bamboo: '🎋',
    bambooShard: '▴',
    jungleLeaf: '▰',
    vine: '〰',
    jungleFruit: '◉',
    hardwood: '▥',
    stone: '🪨',
    fiber: '🌾',
    pebble: '▫',
    berry: '🍓',
    herb: '🌿',
    mushroom: '🍄',
    flower: '🌼',
    lotus: '🪷',
    cactusFruit: '🌵',
    resin: '▣',
    sap: '◈',
    honey: '▥',
    beeStinger: '˄',
    beeswax: '▰',
    rabbitFur: '▱',
    rabbitFoot: '⌙',
    antler: '⌯',
    sinew: '〰',
    frogLeg: '⌞',
    frogTongue: '⌁',
    scorpionShell: '◓',
    batWing: '⌁',
    stoneCore: '◉',
    shadowShard: '◒',
    shadowEssence: '◉',
    toxicMushroom: '▴',
    mud: '🟤',
    ore: '⛏',
    coal: '◼',
    hide: '🟫',
    meat: '🥩',
    slimeGel: '🟢',
    fang: '🦷',
    venom: '☠',
    crystal: '💎',
    stoneAxe: '🪓',
    stonePickaxe: '⛏',
    stoneSickle: '⌒',
    stoneSpear: '🔱',
    slingshot: '⌒',
    bambooSpear: '🎋',
    ironSword: '⚔',
    crystalBlade: '🗡',
    venomDagger: '🔪',
    leatherArmor: '🥋',
    clothArmor: '▱',
    ironArmor: '🛡',
    crystalArmor: '💠',
    woodShield: '◧',
    ironShield: '◨',
    thickFurCoat: '▰',
    reedShellArmor: '◔',
    mireCoreArmor: '●',
    coalBomb: '💣',
    poisonVial: '☠',
    campfire: '🔥',
    torch: '🔥',
    bedroll: '🛏',
    campCharm: '✨',
    snare: '🪤',
    bambooFence: '▥',
    bambooTrap: '╳',
    potionTable: '▣',
    workbench: '▤',
    forge: '▧',
    campFlag: '🚩',
    potion: '🧪',
    stew: '🍲',
    salve: '💚',
    antidote: '🧴',
    speedPotion: '⚡',
    regenPotion: '✚',
    ironSkinPotion: '◆',
    bandage: '▭',
    honeySalve: '▣',
    nightVisionPotion: '◐',
    jumpPotion: '↟',
    poisonResistPotion: '◍',
    shadowPotion: '◑',
    strongBandage: '▤',
    sinewBow: '⌒',
    simpleArrow: '➜',
    poisonArrow: '➤',
    beeDart: '⋗',
    antlerSpear: '♈',
    stoneCoreHammer: '▐',
    rabbitCloak: '▱',
    scorpionArmor: '◓',
    antlerCharm: '⌯',
    waxTorch: '▥',
    beehiveBox: '▦',
    antlerHorn: '⌯',
    shadowLantern: '◒',
    stoneCoreTotem: '◉',
    beastClaw: '⌞',
    pollenDust: '✣',
    thickFur: '▰',
    reedShell: '◔',
    mireCore: '●',
    crystalFang: '⬖',
    boneShard: '▱',
    reedMat: '▤',
    chest: '▣',
    resinGlue: '▣',
    mapleSnack: '▪',
    honeyRoastMeat: '▰',
    roastMeat: '🍖',
    key: '🗝',
    copperCoin: '◎',
};
Object.assign(RESOURCE_ICONS, Object.fromEntries(SIMPLE_WEAPON_DEFS.map(weapon => [weapon.id, {
    spear: '🔱',
    dagger: '🔪',
    hammer: '▐',
    shield: '◧',
    torch: '🔥',
    bow: '⌒',
    sickle: '⌒',
    blade: '🗡',
    club: '▌',
    whip: '〰',
}[weapon.icon] || '⚔'])));

const HOTBAR_ITEMS = ['stoneAxe', 'stonePickaxe', 'stoneSpear', 'ironSword', 'crystalBlade', 'torch', 'potion', 'speedPotion', 'bedroll'];
const POOR_SWIMMERS = new Set(['boar', 'wolf', 'scorpion', 'golem']);
const BACKPACK_COLUMNS = 9;
const BACKPACK_ROWS = 3;
const BACKPACK_SLOT_LIMIT = BACKPACK_COLUMNS * BACKPACK_ROWS;
const CHEST_SLOT_LIMIT = 27;
const ITEM_ICON_TYPES = {
    wood: 'wood', oakWood: 'oakWood', blossomWood: 'blossomWood', birchWood: 'birchWood', pineWood: 'pineWood', mapleWood: 'mapleWood', deadWood: 'deadWood', darkWood: 'darkWood', cypressWood: 'cypressWood', willowWood: 'willowWood', ironwood: 'ironwood', elderWood: 'elderWood', buttressWood: 'buttressWood', bamboo: 'bamboo', bambooShard: 'bamboo', jungleLeaf: 'jungleLeaf', vine: 'vine', jungleFruit: 'jungleFruit', hardwood: 'wood', stone: 'stone', pebble: 'stone', ore: 'ore', coal: 'coal', crystal: 'crystal', mud: 'mud',
    resin: 'resin', sap: 'sap', honey: 'honey', beeStinger: 'fang', beeswax: 'honey', rabbitFur: 'hide', rabbitFoot: 'meat', antler: 'fang', sinew: 'fiber',
    frogLeg: 'meat', frogTongue: 'venom', scorpionShell: 'armor', batWing: 'wing', stoneCore: 'stoneCore', shadowShard: 'shadow', shadowEssence: 'shadow', toxicMushroom: 'toxicMushroom',
    fiber: 'grass', herb: 'herb', flower: 'flower', berry: 'berry', mushroom: 'mushroom', lotus: 'lotus', cactusFruit: 'cactus',
    hide: 'hide', meat: 'meat', slimeGel: 'gel', fang: 'fang', venom: 'venom', beastClaw: 'claw', pollenDust: 'pollenDust', thickFur: 'thickFur', reedShell: 'reedShell', mireCore: 'mireCore', crystalFang: 'crystalFang', boneShard: 'boneShard',
    stoneAxe: 'axe', stonePickaxe: 'pickaxe', stoneSickle: 'sickle', stoneSpear: 'spear', slingshot: 'bow', bambooSpear: 'spear', ironSword: 'sword', crystalBlade: 'blade', venomDagger: 'dagger',
    leatherArmor: 'armor', clothArmor: 'cloak', ironArmor: 'armor', crystalArmor: 'armor', thickFurCoat: 'cloak', reedShellArmor: 'armor', mireCoreArmor: 'armorPotion', woodShield: 'shield', ironShield: 'shield',
    coalBomb: 'bomb', poisonVial: 'toxicMushroom', campfire: 'torch', torch: 'torch', bedroll: 'bedroll', campCharm: 'charm', snare: 'trap', bambooFence: 'fence', bambooTrap: 'trap',
    potionTable: 'stationPotion', workbench: 'stationWorkbench', forge: 'stationForge', campFlag: 'flag',
    potion: 'potion', stew: 'stew', salve: 'salve', antidote: 'antidote', speedPotion: 'speed', regenPotion: 'potion', ironSkinPotion: 'armorPotion',
    honeySalve: 'salve', nightVisionPotion: 'potion', jumpPotion: 'speed', poisonResistPotion: 'antidote', shadowPotion: 'shadow', bandage: 'bandage', strongBandage: 'bandage',
    sinewBow: 'bow', simpleArrow: 'arrow', poisonArrow: 'arrow', beeDart: 'dart', antlerSpear: 'spear', stoneCoreHammer: 'hammer', rabbitCloak: 'cloak', scorpionArmor: 'armor',
    antlerCharm: 'charm', waxTorch: 'torch', beehiveBox: 'honey', antlerHorn: 'horn', shadowLantern: 'shadow', stoneCoreTotem: 'stoneCore', reedMat: 'grass', chest: 'stationWorkbench', resinGlue: 'resin',
    mapleSnack: 'sap', honeyRoastMeat: 'meat', roastMeat: 'meat', key: 'key',
};
Object.assign(ITEM_ICON_TYPES, Object.fromEntries(SIMPLE_WEAPON_DEFS.map(weapon => [weapon.id, weapon.icon])));
const PIXEL_ICON_PALETTES = {
    wood: ['#5a341d', '#9a6436', '#d49a5a'], oakWood: ['#4f2d16', '#8a5a32', '#d6a85b'], blossomWood: ['#6b3b1f', '#b87462', '#ffd6ec'], birchWood: ['#2d2a25', '#f1ead3', '#fff8d8'], pineWood: ['#3b2417', '#5a341d', '#d0a85f'], mapleWood: ['#5a2f1c', '#b85a2a', '#d8a041'], deadWood: ['#2d2117', '#5a4632', '#7a6040'], darkWood: ['#151f16', '#342819', '#5c3f82'], cypressWood: ['#1f2d1d', '#46351f', '#6f8750'], willowWood: ['#2d2a1d', '#5b4a2d', '#c6e07b'], ironwood: ['#1f2428', '#3f3f3f', '#b77dff'], elderWood: ['#2f3945', '#4a4036', '#d7bcff'], buttressWood: ['#2a1a10', '#7a4a2a', '#c18a52'], bamboo: ['#1f5f34', '#70bf55', '#d7f28a'], jungleLeaf: ['#0f3d28', '#2fa35a', '#8cff66'], vine: ['#173b24', '#5fae49', '#cde77b'], jungleFruit: ['#1f5f34', '#ff7a3d', '#ffd166'], stone: ['#48515a', '#8c98a4', '#d8e5f2'],
    ore: ['#48515a', '#7dcbe8', '#e8fbff'], coal: ['#121820', '#303946', '#7b8794'], crystal: ['#512b9a', '#b77dff', '#f2ddff'],
    mud: ['#3b2a1b', '#6d5438', '#a38350'], grass: ['#1f5f34', '#5fbf55', '#cde77b'], herb: ['#17613a', '#69e08e', '#d5ffd8'],
    resin: ['#5a341d', '#ffb84d', '#fff0a8'], sap: ['#5a2f1c', '#d68a43', '#ffd166'], honey: ['#8a5a12', '#ffd166', '#fff3b0'],
    claw: ['#3d2a1d', '#c99a62', '#fff3d0'], pollenDust: ['#8a5a12', '#ffd166', '#fff3b0'], thickFur: ['#4f321d', '#b98f68', '#ead8bd'], reedShell: ['#2f4b3a', '#6f8750', '#d7f28a'], mireCore: ['#263f34', '#6d5438', '#8cff66'], crystalFang: ['#512b9a', '#b77dff', '#ffffff'], boneShard: ['#5a5146', '#d8d0bd', '#fff3d0'],
    shadow: ['#171326', '#6f4cc2', '#d8c4ff'], toxicMushroom: ['#241330', '#8cff66', '#d94bff'],
    wing: ['#1c2035', '#8fb8ff', '#d8e5f2'], stoneCore: ['#2f3945', '#b77dff', '#ffd166'], bow: ['#5a341d', '#d6a06a', '#f8fbff'], arrow: ['#5a341d', '#c5d6df', '#8cff66'], dart: ['#5a341d', '#ffd166', '#8cff66'], hammer: ['#5a341d', '#66737f', '#b77dff'], cloak: ['#6b4a36', '#f1dfc3', '#ffffff'], horn: ['#5a341d', '#d8c08a', '#fff3b0'],
    flower: ['#2e7d43', '#ffd166', '#ff6b9a'], berry: ['#245d34', '#d93f68', '#ff9ab0'], mushroom: ['#efe3c0', '#d94b5f', '#ffffff'],
    lotus: ['#1f6b52', '#f4a6d7', '#ffd166'], cactus: ['#1d6b47', '#58c47a', '#ff6b9a'], hide: ['#4b2d1d', '#9a5f3f', '#d6a06a'],
    meat: ['#7f2630', '#d94b5f', '#ffd0b8'], gel: ['#125f4c', '#5ee089', '#c8ffd8'], fang: ['#5d4934', '#f8fbff', '#c9d6dd'],
    venom: ['#213c1e', '#8cff66', '#d6ff9c'], axe: ['#5a341d', '#a8b3bd', '#f8fbff'], pickaxe: ['#5a341d', '#66737f', '#d8e5f2'], sickle: ['#5a341d', '#c5d6df', '#f8fbff'],
    spear: ['#5a341d', '#d8e5f2', '#d7f28a'], sword: ['#38414d', '#c5d6df', '#ffffff'], blade: ['#512b9a', '#b77dff', '#ffffff'],
    dagger: ['#203020', '#8cff66', '#f8fbff'], armor: ['#4a3a2a', '#9fb3c8', '#ffffff'], shield: ['#5a341d', '#c5d6df', '#ffd166'],
    bomb: ['#161b22', '#ff9f1c', '#ffd166'], torch: ['#5a341d', '#ff9f1c', '#ffd166'], bedroll: ['#27364a', '#8fb8ff', '#f8fbff'],
    charm: ['#5d2ea6', '#ffd166', '#ffffff'], trap: ['#5a341d', '#d8e5f2', '#ffd166'], fence: ['#1f5f34', '#d7f28a', '#9bd86a'],
    flag: ['#5a341d', '#ff6b6b', '#ffffff'], potion: ['#2d4b6b', '#7dcbe8', '#ffffff'], stew: ['#5a341d', '#d68a43', '#ffd166'],
    salve: ['#125f4c', '#5ee089', '#ffffff'], antidote: ['#213c1e', '#8cff66', '#ffffff'], speed: ['#27364a', '#ffd166', '#ffffff'],
    stationPotion: ['#3a2454', '#7dcbe8', '#ffd166'], stationWorkbench: ['#4a2b17', '#9a6436', '#d49a5a'], stationForge: ['#2f3945', '#ff9f1c', '#d8e5f2'],
    armorPotion: ['#26384d', '#c5d6df', '#ffffff'], bandage: ['#5d4934', '#f8fbff', '#d8e5f2'], key: ['#5a3c13', '#ffd166', '#fff3b0'], default: ['#26384d', '#9fb3c8', '#ffffff'],
};

const RECIPES = [
    recipe('axe', '石斧', '砍树更快', { wood: 4, stone: 3 }, game => {
        game.inventory.stoneAxe += 1;
    }, game => game.inventory.stoneAxe > 0 || game.equipment.tool === '石斧'),
    recipe('pickaxe', '石镐', '挖石和采矿', { wood: 3, stone: 5, fiber: 2 }, game => {
        game.inventory.stonePickaxe += 1;
    }, game => game.inventory.stonePickaxe > 0 || game.equipment.tool === '石镐'),
    recipe('sickle', '石镰', '快速收割纤维和花草', { wood: 2, stone: 3, fiber: 2 }, game => {
        game.inventory.stoneSickle += 1;
    }, game => game.inventory.stoneSickle > 0 || game.equipment.tool === '石镰'),
    recipe('bambooShard', '竹片', '把 1 个竹材削成 3 个竹片，供竹片飞刀发射', { bamboo: 1 }, game => {
        game.inventory.bambooShard = (game.inventory.bambooShard || 0) + 3;
    }, () => false),
    recipe('workbench', '工作台', '放置后制作复杂物品', { wood: 8, stone: 2 }, game => {
        game.inventory.workbench += 1;
    }, () => false),
    recipe('potionTable', '药水台', '放置后制作高级药水', { wood: 3, stone: 4, lotus: 1 }, game => {
        game.inventory.potionTable += 1;
    }, () => false),
    recipe('forge', '锻造台', '放置后锻造高级装备', { stone: 8, mud: 4, coal: 3, ore: 2 }, game => {
        game.inventory.forge += 1;
    }, () => false),
    ...SIMPLE_WEAPON_DEFS.map(weapon => ({ ...recipe(weapon.id, weapon.name, weapon.desc, weapon.cost, game => {
        game.inventory[weapon.id] = (game.inventory[weapon.id] || 0) + 1;
    }, game => (game.inventory[weapon.id] || 0) > 0 || game.equipment.weapon === weapon.name), station: weapon.station || '', unlock: weapon.unlock || [] })),
    recipe('spear', '石矛', '近战伤害 +2', { wood: 3, stone: 3, fiber: 2 }, game => {
        game.inventory.stoneSpear += 1;
    }, game => game.inventory.stoneSpear > 0 || game.equipment.weapon === '石矛'),
    recipe('slingshot', '弹弓', '消耗小石子进行远程攻击', { wood: 3, lotus: 1, fiber: 3 }, game => {
        game.inventory.slingshot += 1;
    }, game => game.inventory.slingshot > 0 || game.equipment.weapon === '弹弓'),
    recipe('pebble', '小石子', '把手上的石头敲成 3 发弹弓弹药', { stone: 1 }, game => {
        game.inventory.pebble += 3;
    }, () => false),
    recipe('bambooSpear', '竹矛', '攻击距离很长，适合隔开野兽', { bamboo: 4, fiber: 2, stone: 1 }, game => {
        game.inventory.bambooSpear += 1;
    }, game => game.inventory.bambooSpear > 0 || game.equipment.weapon === '竹矛'),
    recipe('sword', '铁剑', '可以挑战守门石像', { wood: 2, ore: 6, hide: 2 }, game => {
        game.inventory.ironSword += 1;
    }, game => game.inventory.ironSword > 0 || game.equipment.weapon === '铁剑'),
    recipe('armor', '皮甲', '受到伤害 -1', { hide: 4, fiber: 4 }, game => {
        game.inventory.leatherArmor += 1;
    }, game => game.inventory.leatherArmor > 0 || game.equipment.armor === '皮甲'),
    recipe('clothArmor', '布衣', '最基础的轻甲', { fiber: 8 }, game => {
        game.inventory.clothArmor += 1;
    }, game => game.inventory.clothArmor > 0 || game.equipment.armor === '布衣'),
    recipe('bandage', '绷带', '手工制作，恢复 12 生命', { fiber: 3 }, game => {
        game.inventory.bandage += 1;
    }, () => false),
    recipe('potion', '治疗药水', '恢复 35 生命', { herb: 2, berry: 2 }, game => {
        game.inventory.potion += 1;
    }, () => false),
    recipe('stew', '蘑菇汤', '补充饥饿并少量恢复生命', { mushroom: 3, berry: 1 }, game => {
        game.inventory.stew += 1;
    }, () => false),
    recipe('salve', '黏液药膏', '使用 2.4 秒，恢复 45 生命并清除中毒', { slimeGel: 2, herb: 2, flower: 1 }, game => {
        game.inventory.salve += 1;
    }, () => false),
    recipe('antidote', '解毒药', '解除中毒并恢复 15 生命', { herb: 1, lotus: 1, mushroom: 1 }, game => {
        game.inventory.antidote += 1;
    }, () => false),
    recipe('speedPotion', '迅捷药水', '25 秒移动速度大幅提高（约 +55%）', { cactusFruit: 2, slimeGel: 1, lotus: 1 }, game => {
        game.inventory.speedPotion += 1;
    }, () => false),
    recipe('regenPotion', '再生药水', '24 秒持续恢复生命', { herb: 2, lotus: 2, slimeGel: 1 }, game => {
        game.inventory.regenPotion += 1;
    }, () => false),
    recipe('ironSkinPotion', '硬皮药水', '24 秒显著降低受到的伤害', { cactusFruit: 1, mud: 2, coal: 1 }, game => {
        game.inventory.ironSkinPotion += 1;
    }, () => false),
    recipe('honeySalve', '蜂蜜药膏', '恢复 30 生命，并再生 8 秒', { honey: 1, herb: 1, fiber: 1 }, game => { game.inventory.honeySalve += 1; }, () => false),
    recipe('nightVisionPotion', '夜视药水', '35 秒大幅扩大夜晚视野', { batWing: 1, crystal: 1, lotus: 1 }, game => { game.inventory.nightVisionPotion += 1; }, () => false),
    recipe('jumpPotion', '跳跃药水', '18 秒行动更轻快，显著减轻水/泥地阻力', { frogLeg: 1, lotus: 1, slimeGel: 1 }, game => { game.inventory.jumpPotion += 1; }, () => false),
    recipe('poisonResistPotion', '毒抗药水', '40 秒免疫中毒并清除当前中毒', { scorpionShell: 1, antidote: 1, honey: 1 }, game => { game.inventory.poisonResistPotion += 1; }, () => false),
    recipe('shadowPotion', '暗影药水', '30 秒大幅降低怪物感知', { shadowShard: 2, toxicMushroom: 1, crystal: 1 }, game => { game.inventory.shadowPotion += 1; }, () => false),
    recipe('poisonVial', '毒药', '可投掷的毒瓶，制造毒雾', { toxicMushroom: 3, venom: 1 }, game => { game.inventory.poisonVial += 1; }, () => false),
    recipe('strongBandage', '强效绷带', '恢复 25 生命', { bandage: 1, honey: 1, herb: 1 }, game => { game.inventory.strongBandage += 1; }, () => false),
    recipe('ironArmor', '铁甲', '防御大幅提升', { ore: 8, coal: 2, hide: 2 }, game => {
        game.inventory.ironArmor += 1;
    }, game => game.inventory.ironArmor > 0 || game.equipment.armor === '铁甲'),
    recipe('campfire', '营火', '可放置，靠近后烹饪熟食', { wood: 5, stone: 3, coal: 1 }, game => {
        game.inventory.campfire += 1;
    }, () => false),
    recipe('torch', '火把', '夜晚照明', { wood: 2, coal: 1, slimeGel: 1 }, game => {
        game.inventory.torch += 1;
    }, game => game.inventory.torch > 0 || game.equipment.utility === '火把'),
    recipe('bedroll', '睡袋', '在营地跳到清晨', { hide: 2, fiber: 4, flower: 1 }, game => {
        game.inventory.bedroll += 1;
    }, game => game.inventory.bedroll > 0),
    recipe('campCharm', '营地护符', '提高最大生命', { crystal: 1, flower: 2, fang: 1 }, game => {
        game.inventory.campCharm += 1;
    }, game => game.inventory.campCharm > 0),
    recipe('snare', '捕兽夹', '短暂定住野兽', { fang: 2, fiber: 3, ore: 1 }, game => {
        game.inventory.snare += 1;
    }, () => false),
    recipe('bambooFence', '竹栅栏', '放置后阻挡小怪', { bamboo: 3, fiber: 1 }, game => {
        game.inventory.bambooFence += 2;
    }, () => false),
    recipe('bambooTrap', '竹刺陷阱', '放置后伤害并减速怪物', { bamboo: 3, fiber: 2, fang: 1 }, game => {
        game.inventory.bambooTrap += 1;
    }, () => false),
    recipe('campFlag', '营地旗帜', '回到营地附近', { wood: 3, fiber: 2, flower: 1 }, game => {
        game.inventory.campFlag += 1;
    }, game => game.inventory.campFlag > 0),
    recipe('crystalBlade', '魔晶剑', '高伤害长剑', { ironSword: 1, crystal: 4, fang: 2 }, game => {
        game.inventory.crystalBlade += 1;
    }, game => game.inventory.crystalBlade > 0 || game.equipment.weapon === '魔晶剑'),
    recipe('sinewBow', '鹿筋弓', '远程武器基础', { wood: 4, sinew: 2, fiber: 2 }, game => { game.inventory.sinewBow += 1; }, game => game.inventory.sinewBow > 0 || game.equipment.weapon === '鹿筋弓'),
    recipe('simpleArrow', '简易箭', '弓的弹药', { bamboo: 1, stone: 1, fiber: 1 }, game => { game.inventory.simpleArrow += 6; }, () => false),
    recipe('poisonArrow', '毒箭', '带毒箭矢', { simpleArrow: 3, venom: 1 }, game => { game.inventory.poisonArrow += 3; }, () => false),
    recipe('beeDart', '蜂刺飞镖', '轻型投掷物', { beeStinger: 1, bamboo: 1, fiber: 1 }, game => { game.inventory.beeDart += 2; }, () => false),
    recipe('antlerSpear', '鹿角矛', '更强的长柄刺击', { antler: 1, bamboo: 4, sinew: 1 }, game => { game.inventory.antlerSpear += 1; }, game => game.inventory.antlerSpear > 0 || game.equipment.weapon === '鹿角矛'),
    recipe('stoneCoreHammer', '石核锤', '慢速高伤武器', { stoneCore: 1, wood: 3, ore: 2 }, game => { game.inventory.stoneCoreHammer += 1; }, game => game.inventory.stoneCoreHammer > 0 || game.equipment.weapon === '石核锤'),
    recipe('venomDagger', '毒牙匕首', '快攻短武器', { fang: 2, venom: 2, wood: 1 }, game => {
        game.inventory.venomDagger += 1;
    }, game => game.inventory.venomDagger > 0 || game.equipment.weapon === '毒牙匕首'),
    recipe('woodShield', '木盾', '轻量格挡', { wood: 5, hide: 1 }, game => {
        game.inventory.woodShield += 1;
    }, game => game.inventory.woodShield > 0 || game.equipment.shield === '木盾'),
    recipe('ironShield', '铁盾', '强力格挡', { wood: 2, ore: 4, coal: 1 }, game => {
        game.inventory.ironShield += 1;
    }, game => game.inventory.ironShield > 0 || game.equipment.shield === '铁盾'),
    recipe('crystalArmor', '魔晶甲', '高防御护甲', { ironArmor: 1, crystal: 3, slimeGel: 2 }, game => {
        game.inventory.crystalArmor += 1;
    }, game => game.inventory.crystalArmor > 0 || game.equipment.armor === '魔晶甲'),
    recipe('rabbitCloak', '兔毛披肩', '轻便保暖披肩', { rabbitFur: 3, hide: 1, fiber: 2 }, game => { game.inventory.rabbitCloak += 1; }, game => game.inventory.rabbitCloak > 0 || game.equipment.armor === '兔毛披肩'),
    recipe('scorpionArmor', '蝎壳甲', '防御并抗毒', { scorpionShell: 3, hide: 2, ore: 2 }, game => { game.inventory.scorpionArmor += 1; }, game => game.inventory.scorpionArmor > 0 || game.equipment.armor === '蝎壳甲'),
    recipe('thickFurCoat', '厚毛皮衣', '温暖厚实，减轻击退', { thickFur: 3, hide: 2, fiber: 3 }, game => { game.inventory.thickFurCoat += 1; }, game => game.inventory.thickFurCoat > 0 || game.equipment.armor === '厚毛皮衣'),
    recipe('reedShellArmor', '湿地甲壳甲', '湿地甲壳制成，抗减速', { reedShell: 3, cypressWood: 2, fiber: 3 }, game => { game.inventory.reedShellArmor += 1; }, game => game.inventory.reedShellArmor > 0 || game.equipment.armor === '湿地甲壳甲'),
    recipe('mireCoreArmor', '泥沼护甲', '泥沼核心护甲，防御较高', { mireCore: 2, mud: 4, hide: 2 }, game => { game.inventory.mireCoreArmor += 1; }, game => game.inventory.mireCoreArmor > 0 || game.equipment.armor === '泥沼护甲'),
    recipe('antlerCharm', '鹿角护符', '提高最大生命', { antler: 1, crystal: 1, flower: 2 }, game => { game.inventory.antlerCharm += 1; }, game => game.inventory.antlerCharm > 0),
    recipe('waxTorch', '蜂蜡火把', '更明亮的火把', { beeswax: 1, wood: 2, coal: 1 }, game => { game.inventory.waxTorch += 1; }, () => false),
    recipe('beehiveBox', '蜂箱', '可放置的蜂箱', { beeswax: 1, wood: 4, flower: 2 }, game => { game.inventory.beehiveBox += 1; }, () => false),
    recipe('antlerHorn', '鹿角号角', '驱散近处小怪', { antler: 1, fiber: 2 }, game => { game.inventory.antlerHorn += 1; }, () => false),
    recipe('shadowLantern', '暗影灯', '冷色照明放置物', { shadowShard: 2, crystal: 1, torch: 1 }, game => { game.inventory.shadowLantern += 1; }, () => false),
    recipe('stoneCoreTotem', '石核图腾', '压制附近刷怪', { stoneCore: 1, crystal: 1, stone: 6 }, game => { game.inventory.stoneCoreTotem += 1; }, () => false),
    recipe('reedMat', '芦苇席', '湿地行走辅助垫', { fiber: 5, lotus: 1 }, game => { game.inventory.reedMat += 1; }, () => false),
    recipe('chest', '木箱', '可放置的储物箱', { wood: 8, fiber: 2 }, game => { game.inventory.chest += 1; }, () => false),
    recipe('resinGlue', '树脂胶', '高级合成材料', { resin: 2, coal: 1 }, game => { game.inventory.resinGlue += 1; }, () => false),
    recipe('mapleSnack', '枫糖点心', '补充饥饿并短暂提速', { sap: 2, berry: 1 }, game => { game.inventory.mapleSnack += 1; }, () => false),
    recipe('honeyRoastMeat', '蜂蜜烤肉', '大量补充饥饿并恢复生命', { honey: 1, roastMeat: 1 }, game => { game.inventory.honeyRoastMeat += 1; }, () => false),
    recipe('coalBomb', '煤火弹', '范围伤害道具', { coal: 3, slimeGel: 1, fiber: 1 }, game => {
        game.inventory.coalBomb += 1;
    }, () => false),
    recipe('roastMeat', '烤肉', '大量补充饥饿并少量恢复生命', { meat: 1, coal: 1 }, game => {
        game.inventory.roastMeat += 1;
    }, () => false),
    recipe('key', '废墟钥匙', '打开古代废墟', { ore: 8, crystal: 3, fang: 1 }, game => {
        game.inventory.key += 1;
        game.quest = 'open-ruins';
        showToast('废墟钥匙完成！去地图右上角打开古代废墟。');
    }, game => game.inventory.key > 0 || game.ruinsOpened),
];

const STARTING_RECIPE_IDS = new Set(['axe', 'pickaxe', 'sickle', 'workbench', 'spear', 'pebble', 'clothArmor', 'bandage', 'potion']);
const RECIPE_LEARNING_RULES = {
    bambooShard: { materials: ['bamboo'] },
    potionTable: { materials: ['lotus'], teachers: ['apothecary'], note: 'apothecary' },
    forge: { materials: ['ore', 'coal'], teachers: ['blacksmith'], note: 'blacksmith' },
    vineStoneHammer: { teachers: ['unemployed', 'blacksmith'], note: 'workbench' },
    torchClub: { materials: ['resin', 'coal'] },
    bambooCrossbow: { materials: ['bamboo'], teachers: ['guard'], note: 'guard' },
    ropeSickle: { teachers: ['unemployed'], note: 'workbench' },
    resinHammer: { materials: ['resin'], note: 'blacksmith' },
    frogWhip: { materials: ['frogTongue'], note: 'apothecary' },
    scorpionHook: { materials: ['scorpionShell', 'venom'], note: 'guard' },
    shadowWoodBlade: { materials: ['shadowShard'], note: 'elder' },
    clawHookBlade: { materials: ['beastClaw'], note: 'guard' },
    pollenDartFan: { materials: ['pollenDust'], note: 'apothecary' },
    crystalFangSpear: { materials: ['crystalFang'], note: 'blacksmith' },
    boneShardMace: { materials: ['boneShard'], note: 'elder' },
    slingshot: { materials: ['lotus'], teachers: ['guard'] },
    bambooSpear: { materials: ['bamboo'], teachers: ['guard'] },
    sword: { materials: ['ore'], teachers: ['blacksmith'], note: 'blacksmith' },
    armor: { materials: ['hide'], teachers: ['guard'] },
    stew: { materials: ['mushroom'], teachers: ['kitchen'] },
    salve: { materials: ['slimeGel'], teachers: ['apothecary'] },
    antidote: { materials: ['lotus'], teachers: ['apothecary'] },
    speedPotion: { materials: ['cactusFruit'], teachers: ['apothecary'], note: 'apothecary' },
    regenPotion: { materials: ['lotus', 'slimeGel'], teachers: ['apothecary'], note: 'apothecary' },
    ironSkinPotion: { materials: ['mud', 'coal'], teachers: ['apothecary', 'guard'], note: 'guard' },
    honeySalve: { materials: ['honey'], teachers: ['apothecary'] },
    nightVisionPotion: { materials: ['batWing'], note: 'elder' },
    jumpPotion: { materials: ['frogLeg'], teachers: ['apothecary'] },
    poisonResistPotion: { materials: ['scorpionShell'], teachers: ['apothecary'], note: 'apothecary' },
    shadowPotion: { materials: ['shadowShard'], note: 'elder' },
    poisonVial: { materials: ['toxicMushroom', 'venom'], teachers: ['apothecary'], note: 'apothecary' },
    strongBandage: { materials: ['honey'], teachers: ['apothecary'] },
    ironArmor: { materials: ['ore'], teachers: ['blacksmith'], note: 'blacksmith' },
    campfire: { materials: ['coal'], teachers: ['kitchen'] },
    torch: { materials: ['coal'], teachers: ['guard'] },
    bedroll: { materials: ['hide'], teachers: ['unemployed'] },
    campCharm: { materials: ['crystal'], teachers: ['elder'], note: 'elder' },
    snare: { materials: ['fang'], teachers: ['guard'] },
    bambooFence: { materials: ['bamboo'], teachers: ['unemployed'] },
    bambooTrap: { materials: ['bamboo', 'fang'], teachers: ['guard'], note: 'guard' },
    campFlag: { teachers: ['elder'] },
    crystalBlade: { materials: ['crystal'], teachers: ['blacksmith'], note: 'elder' },
    sinewBow: { materials: ['sinew'], teachers: ['guard'], note: 'guard' },
    simpleArrow: { materials: ['bamboo'], teachers: ['guard'] },
    poisonArrow: { materials: ['venom'], teachers: ['guard', 'apothecary'], note: 'guard' },
    beeDart: { materials: ['beeStinger'], teachers: ['guard'] },
    antlerSpear: { materials: ['antler'], teachers: ['guard'], note: 'guard' },
    stoneCoreHammer: { materials: ['stoneCore'], teachers: ['blacksmith'], note: 'blacksmith' },
    venomDagger: { materials: ['fang', 'venom'], teachers: ['blacksmith'], note: 'guard' },
    woodShield: { materials: ['hide'], teachers: ['guard'] },
    ironShield: { materials: ['ore'], teachers: ['blacksmith', 'guard'], note: 'blacksmith' },
    crystalArmor: { materials: ['crystal'], teachers: ['blacksmith'], note: 'elder' },
    rabbitCloak: { materials: ['rabbitFur'], teachers: ['unemployed'] },
    scorpionArmor: { materials: ['scorpionShell'], teachers: ['blacksmith'], note: 'blacksmith' },
    thickFurCoat: { materials: ['thickFur'], teachers: ['unemployed'] },
    reedShellArmor: { materials: ['reedShell'], teachers: ['unemployed'], note: 'workbench' },
    mireCoreArmor: { materials: ['mireCore'], teachers: ['blacksmith'], note: 'elder' },
    antlerCharm: { materials: ['antler'], teachers: ['elder'], note: 'elder' },
    waxTorch: { materials: ['beeswax'], teachers: ['unemployed'] },
    beehiveBox: { materials: ['beeswax'], note: 'workbench' },
    antlerHorn: { materials: ['antler'], teachers: ['guard'] },
    shadowLantern: { materials: ['shadowShard'], note: 'elder' },
    stoneCoreTotem: { materials: ['stoneCore'], teachers: ['elder'], note: 'elder' },
    reedMat: { materials: ['lotus'], teachers: ['unemployed'] },
    chest: { teachers: ['unemployed'] },
    resinGlue: { materials: ['resin'], teachers: ['blacksmith'] },
    mapleSnack: { materials: ['sap'], teachers: ['kitchen'] },
    honeyRoastMeat: { materials: ['honey'], teachers: ['kitchen'] },
    coalBomb: { materials: ['coal'], teachers: ['guard'], note: 'guard' },
    roastMeat: { materials: ['meat', 'coal'], teachers: ['kitchen'] },
    key: { materials: ['crystal'], teachers: ['elder'], note: 'elder' },
};
RECIPES.forEach(item => {
    if (!STARTING_RECIPE_IDS.has(item.id)) item.learn = RECIPE_LEARNING_RULES[item.id] || null;
});

const TEACHER_RECIPE_IDS = Object.entries(RECIPE_LEARNING_RULES).reduce((acc, [id, rule]) => {
    (rule.teachers || []).forEach(role => {
        acc[role] ||= [];
        acc[role].push(id);
    });
    return acc;
}, {});
const NOTE_RECIPE_IDS = Object.entries(RECIPE_LEARNING_RULES).reduce((acc, [id, rule]) => {
    if (rule.note) {
        acc[rule.note] ||= [];
        acc[rule.note].push(id);
    }
    return acc;
}, {});

const COLORS = {
    outline: '#101820',
    skin: '#ffd39b',
    hair: '#4a2b17',
    shirt: '#2e7dd1',
    pants: '#27364a',
    boot: '#1b1f29',
    gold: '#ffd166',
    white: '#f8fbff',
    leaf1: '#2eb872',
    leaf2: '#1f8f54',
    leaf3: '#73e29b',
    trunk: '#86572b',
    bark: '#4f321d',
    stone1: '#a8b3bd',
    stone2: '#66737f',
    ore1: '#94e3ff',
    ore2: '#318db0',
    grass1: '#81e979',
    grass2: '#3a9f55',
    berry: '#d93f68',
    herb: '#9cffb7',
    slime1: '#5ee089',
    slime2: '#168b64',
    boar1: '#9a5f3f',
    boar2: '#5f3527',
    wolf1: '#7f8b99',
    wolf2: '#46515d',
    bat1: '#4b3c74',
    bat2: '#241b3c',
    frog1: '#5dbb63',
    frog2: '#2f7f44',
    scorpion1: '#c58a43',
    scorpion2: '#6d4121',
    golem1: '#87919b',
    golem2: '#4f5964',
    fire1: '#ff9f1c',
    fire2: '#ffd166',
    ruin1: '#687481',
    ruin2: '#2f3945',
    crystal1: '#b77dff',
    crystal2: '#5d2ea6',
    water1: '#286ea6',
    water2: '#58b6df',
    flower1: '#ffd166',
    flower2: '#ff6b9a',
    slash: '#fff3b0',
};

const SPRITES = {
    player: {
        w: 16,
        rows: [
            '................',
            '.....oooooo.....',
            '....ohhhhho.....',
            '....hssssh......',
            '....hseesh......',
            '.....ssss.......',
            '....bbbbbb......',
            '...bbggggbb.....',
            '...bggggggb.....',
            '....gggggg......',
            '....p....p......',
            '...pp....pp.....',
            '...k......k.....',
            '..kk......kk....',
            '................',
            '................',
        ],
        map: { o: 'outline', h: 'hair', s: 'skin', e: 'outline', b: 'shirt', g: 'shirt', p: 'pants', k: 'boot' },
    },
    tree: {
        w: 18,
        rows: [
            '.......oooo.......',
            '.....oolllloo.....',
            '....ollllLlllo....',
            '...olllLlllLllo...',
            '..olllLlllllllLo..',
            '..ollllllllllllo..',
            '...olllLlllLllo...',
            '....oollllllloo...',
            '......oottoo......',
            '.......tttt.......',
            '.......tTtt.......',
            '......ttTTtt......',
            '.....otttttto.....',
            '..................',
            '..................',
            '..................',
        ],
        map: { o: 'outline', l: 'leaf1', L: 'leaf3', t: 'trunk', T: 'bark' },
    },
    rock: {
        w: 16,
        rows: [
            '................',
            '......oooo......',
            '....oossssoo....',
            '...osSSssSSso...',
            '..osssssSSssso..',
            '..ossSSssssSSo..',
            '..osssssssssso..',
            '...osSSssssso...',
            '....oossssoo....',
            '......oooo......',
            '................',
            '................',
        ],
        map: { o: 'outline', s: 'stone1', S: 'stone2' },
    },
    grass: {
        w: 16,
        rows: [
            '................',
            '................',
            '....g....g......',
            '...ggg..ggg.....',
            '..gGgggggGg.....',
            '...gggGggg......',
            '..ggggggggg.....',
            '....g..g........',
            '................',
        ],
        map: { g: 'grass1', G: 'grass2' },
    },
    berry: {
        w: 16,
        rows: [
            '................',
            '.....gggg.......',
            '...ggGggGgg.....',
            '..gggrggrgg.....',
            '...ggrgggr......',
            '..ggGggGggg.....',
            '....gggg........',
            '................',
        ],
        map: { g: 'grass1', G: 'grass2', r: 'berry' },
    },
    ore: {
        w: 16,
        rows: [
            '................',
            '.....oooo.......',
            '...oossssoo.....',
            '..osSCsssCso....',
            '..osssCCssso....',
            '..oSsssssCSO....',
            '...ossCsssso....',
            '....oosssso.....',
            '......oooo......',
            '................',
        ],
        map: { o: 'outline', s: 'stone1', S: 'stone2', C: 'ore1', O: 'ore2' },
    },
    herb: {
        w: 16,
        rows: [
            '................',
            '.......h........',
            '....h.hhh.h.....',
            '...hhhhHhhhh....',
            '.....hhHhh......',
            '...h.hhhhh.h....',
            '......hhh.......',
            '................',
        ],
        map: { h: 'herb', H: 'white' },
    },
    slime: {
        w: 16,
        rows: [
            '................',
            '................',
            '.....oooooo.....',
            '...oossssssso...',
            '..osssssssssso..',
            '..osseesssesso..',
            '..osssssssssso..',
            '...oosSSSSoo....',
            '.....oooooo.....',
            '................',
        ],
        map: { o: 'outline', s: 'slime1', S: 'slime2', e: 'outline' },
    },
    boar: {
        w: 20,
        rows: [
            '....................',
            '.....oo.......oo....',
            '....obboooooobb.....',
            '...obbbbbbbbbbbbo...',
            '..obbeebbbbbbeebbo..',
            '..obbbbbBBBBbbbbbo..',
            '...obbWbbbbbbWbbo...',
            '....ooobbbbbbooo....',
            '......kk....kk......',
            '.....kk......kk.....',
            '....................',
        ],
        map: { o: 'outline', b: 'boar1', B: 'boar2', e: 'outline', W: 'white', k: 'boot' },
    },
    wolf: {
        w: 20,
        rows: [
            '....................',
            '...oo..........oo...',
            '..owwoooooooooowwo..',
            '.owwwwwwwwwwwwwwwo.',
            '.owweewwwwwwwweewo.',
            '..owwwwWWWWwwwwwo..',
            '...owwwwwwwwwwo....',
            '....ooo....ooo.....',
            '....kk......kk.....',
            '...kk........kk....',
            '....................',
        ],
        map: { o: 'outline', w: 'wolf1', W: 'wolf2', e: 'outline', k: 'boot' },
    },
    bat: {
        w: 16,
        rows: [
            '................',
            '.oo........oo...',
            'obbo..oo..obbo.',
            '.obboobboobbo..',
            '..obbeBBebbo...',
            '...oobBBboo....',
            '.....b..b......',
            '................',
        ],
        map: { o: 'outline', b: 'bat1', B: 'bat2', e: 'white' },
    },
    frog: {
        w: 16,
        rows: [
            '................',
            '....oo....oo....',
            '...offooooffo...',
            '..offfffffffo...',
            '..offeffefffo...',
            '..offffFFfffo...',
            '...offfffffo....',
            '..kk......kk....',
            '................',
        ],
        map: { o: 'outline', f: 'frog1', F: 'frog2', e: 'white', k: 'frog2' },
    },
    scorpion: {
        w: 18,
        rows: [
            '........oo........',
            '.......osso.......',
            '......ossso.......',
            '..oo.ossSSssoo....',
            '.ossoosssssssso...',
            'osssoseessseesso..',
            '.ossoosssssssso...',
            '..oo..oo....oo....',
            '......kk....kk....',
            '..................',
        ],
        map: { o: 'outline', s: 'scorpion1', S: 'scorpion2', e: 'white', k: 'scorpion2' },
    },
    golem: {
        w: 20,
        rows: [
            '.......oooooo.......',
            '.....oossssssoo.....',
            '....osSSssssSSso....',
            '...osssssCCsssso....',
            '..osSSssssssSSsso...',
            '..osssCCsssssssso...',
            '...osssssSSsssso....',
            '....ooosssssooo.....',
            '....osss....ssso....',
            '...ossso....ossso...',
            '....................',
        ],
        map: { o: 'outline', s: 'golem1', S: 'golem2', C: 'crystal1' },
    },
    campfire: {
        w: 18,
        rows: [
            '..................',
            '.......ff.........',
            '......fFFf........',
            '.....fFFFFf.......',
            '......fFFf........',
            '.....wwwwww.......',
            '....wwwWWwww......',
            '.....oo..oo.......',
            '....oo....oo......',
        ],
        map: { f: 'fire1', F: 'fire2', w: 'trunk', W: 'bark', o: 'outline' },
    },
    ruins: {
        w: 24,
        rows: [
            '....oooooooooooooooo....',
            '...orrrrrrrrrrrrrrrro...',
            '..orrrRRRrrrrRRRrrrro..',
            '..orrrRrrrrrrrrRrrrro..',
            '..orrrRrrrrrrrrRrrrro..',
            '..orrrRrrrddrrrRrrrro..',
            '..orrrRrrddddrrRrrrro..',
            '..orrrRrrddddrrRrrrro..',
            '..orrrRrrddddrrRrrrro..',
            '..orrrRrrddddrrRrrrro..',
            '..orrrRrrddddrrRrrrro..',
            '..orrrRrrrrrrrrRrrrro..',
            '..orrrrrrrrrrrrrrrrro..',
            '...oooooooooooooooooo...',
        ],
        map: { o: 'outline', r: 'ruin1', R: 'ruin2', d: 'outline' },
    },
};

function recipe(id, name, desc, cost, apply, owned) {
    return { id, name, desc, cost, apply, owned };
}

function createState() {
    const jungleCult = createJungleCultVillage();
    const village = createVillage();
    activeAdvancedVillage = village;
    const secondVillage = createSecondVillage(village);
    const thirdVillage = wildernessSettings.fortressEnabled ? createFortressVillage(village, secondVillage) : null;
    const villages = [jungleCult, village, secondVillage, thirdVillage].filter(Boolean);
    const resources = createResources(village);
    const spawnDens = createSpawnDens();
    const gameState = {
        player: {
            x: village.spawn.x,
            y: village.spawn.y,
            radius: 17,
            speed: 190,
            hp: 100,
            maxHp: 100,
            stamina: 100,
            hunger: 100,
            maxHunger: 100,
            hungerTickAt: 0,
            dizzyUntil: 0,
            nextHungerDizzyAt: 0,
            knockX: 0,
            knockY: 0,
            blocking: false,
            facing: { x: 1, y: 0 },
            attackUntil: 0,
            attackDir: { x: 1, y: 0 },
            attackCooldown: 0,
            attackQueuedUntil: 0,
            invincibleUntil: 0,
            harvestTarget: null,
            harvestBlockedAt: 0,
            speedBoostUntil: 0,
            slowUntil: 0,
            poisonUntil: 0,
            poisonTickAt: 0,
            neuroToxinUntil: 0,
            neuroToxinTickAt: 0,
            hungerToxinUntil: 0,
            weakToxinUntil: 0,
            regenUntil: 0,
            regenTickAt: 0,
            ironSkinUntil: 0,
            nightVisionUntil: 0,
            poisonResistUntil: 0,
            shadowUntil: 0,
            speedBoostPower: 1.32,
            jumpPotionUntil: 0,
            throwableAim: null,
            rangedAim: null,
            meleeCharge: null,
            pendingMeleeCharge: null,
        },
        inventory: { wood: 0, oakWood: 0, blossomWood: 0, birchWood: 0, pineWood: 0, mapleWood: 0, deadWood: 0, darkWood: 0, cypressWood: 0, willowWood: 0, ironwood: 0, elderWood: 0, buttressWood: 0, bamboo: 0, bambooShard: 0, jungleLeaf: 0, vine: 0, jungleFruit: 0, hardwood: 0, stone: 0, fiber: 0, pebble: 0, berry: 0, herb: 0, mushroom: 0, flower: 0, lotus: 0, cactusFruit: 0, resin: 0, sap: 0, honey: 0, beeStinger: 0, beeswax: 0, rabbitFur: 0, rabbitFoot: 0, antler: 0, sinew: 0, frogLeg: 0, frogTongue: 0, scorpionShell: 0, batWing: 0, stoneCore: 0, shadowShard: 0, shadowEssence: 0, beastClaw: 0, pollenDust: 0, thickFur: 0, reedShell: 0, mireCore: 0, crystalFang: 0, boneShard: 0, toxicMushroom: 0, mud: 0, ore: 0, coal: 0, hide: 0, meat: 0, slimeGel: 0, fang: 0, venom: 0, crystal: 0, stoneAxe: 0, stonePickaxe: 0, stoneSickle: 0, stoneSpear: 0, slingshot: 0, bambooSpear: 0, ironSword: 0, crystalBlade: 0, venomDagger: 0, sinewBow: 0, antlerSpear: 0, stoneCoreHammer: 0, leatherArmor: 0, clothArmor: 0, ironArmor: 0, crystalArmor: 0, rabbitCloak: 0, scorpionArmor: 0, thickFurCoat: 0, reedShellArmor: 0, mireCoreArmor: 0, woodShield: 0, ironShield: 0, coalBomb: 0, poisonVial: 0, campfire: 0, torch: 0, waxTorch: 0, shadowLantern: 0, bedroll: 0, campCharm: 0, antlerCharm: 0, snare: 0, bambooFence: 0, bambooTrap: 0, beehiveBox: 0, stoneCoreTotem: 0, reedMat: 0, chest: 0, potionTable: 0, workbench: 0, forge: 0, campFlag: 0, potion: 0, honeySalve: 0, nightVisionPotion: 0, jumpPotion: 0, poisonResistPotion: 0, shadowPotion: 0, stew: 0, salve: 0, antidote: 0, speedPotion: 0, regenPotion: 0, ironSkinPotion: 0, bandage: 0, strongBandage: 0, roastMeat: 0, honeyRoastMeat: 0, mapleSnack: 0, resinGlue: 0, simpleArrow: 0, poisonArrow: 0, beeDart: 0, antlerHorn: 0, key: 0, copperCoin: 0 },
        equipment: {
            tool: '徒手',
            weapon: '木棍',
            armor: '无',
            shield: '无',
            attack: 1,
            range: 42,
            defense: 0,
            utility: '无',
        },
        resources,
        tallGrassGrid: buildTallGrassGrid(resources),
        resourceGrid: buildResourceGrid(resources),
        spawnDens,
        village,
        villages,
        roadLamps: createVillageRoadLamps(villages),
        roadSigns: createVillageRoadSigns(villages),
        enemies: createEnemies(spawnDens),
        outdoorVillagers: [],
        pendingVillagerExits: [],
        pendingVillagerEntries: [],
        camp: { x: CAMP_POSITION.x, y: CAMP_POSITION.y, radius: 70, repaired: true },
        ruins: { x: worldRegionSet().ruins[0].x, y: worldRegionSet().ruins[0].y, radius: 58, opened: false },
        decorations: createDecorations(),
        decorationGrid: null,
        particles: [],
        floatTexts: [],
        projectiles: [],
        indoorProjectiles: [],
        placedTorches: [],
        placedFences: [],
        placedStations: [],
        bambooTraps: [],
        hotbarItems: Array(9).fill(null),
        draggedInventoryItem: null,
        draggedHotbarSlot: null,
        selectedBackpackItem: null,
        nextDynamicSpawnAt: 0,
        spawnCooldowns: new Map(),
        cameraShake: 0,
        selectedHotbar: 0,
        inventoryOpen: false,
        openChest: null,
        openIndoorContainer: null,
        activeTrader: null,
        pendingTrader: null,
        activeVillageTaskRole: null,
        villageTaskCompletions: {},
        discoveredMaterials: {},
        knownRecipes: {},
        learnedRecipeTeachers: {},
        foundRecipeNotes: {},
        indoor: null,
        villageReputation: 2,
        villageTasks: createVillageTasks(),
        wolfPacks: createWolfPackStates(),
        timeOfDay: 0.28,
        dayLength: wildernessSettings.dayLength,
        quest: 'collect-basic',
        win: false,
        lose: false,
        deathStartedAt: 0,
        deathMessage: '',
        deathAdvice: '',
    };
    gameState.decorationGrid = buildDecorationGrid(gameState.decorations);
    return gameState;
}

function createWorldSeed() {
    const text = String(wildernessSettings.seedText || '').trim();
    return text ? seedFromText(text) : Math.random() * 10000;
}

function seedFromText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash % 100000) + 0.137;
}

function createCampPosition() {
    const margin = 900;
    const safeWidth = WORLD.width - margin * 2;
    const safeHeight = WORLD.height - margin * 2;
    const x = margin + seededUnit(worldSeed, 41.7) * safeWidth;
    const y = margin + seededUnit(worldSeed, 42.3) * safeHeight;
    return { x: snapToGroundGrid(x), y: snapToGroundGrid(y) };
}

function resource(kind, x, y, gives, hp, radius) {
    return { kind, x, y, gives, hp, maxHp: hp, radius };
}

function createVillage(baseRegion = worldRegionSet().village) {
    const scaledRegion = { ...baseRegion, radius: (baseRegion.radius || 520) * wildernessSettings.villageScale };
    const region = dryVillageRegion(scaledRegion);
    const roadSeed = region.seed;
    const layout = villageLayoutForSeed(region.seed);
    const large = seededUnit(region.seed, 18.8) > 0.54;
    const spacing = large ? 1.28 : 1.08;
    const buildingDefs = expandedVillageBuildings(layout, region.seed, large, region.tier || 'advanced');
    const buildings = [];
    buildingDefs.forEach((building, index) => {
        if (building.cornerX && building.cornerY) {
            const size = fortressWallSize(region);
            const wall = fortressWallThickness();
            const x = snapToGroundGrid(region.x + building.cornerX * (size.w / 2 - building.w / 2 - wall * 0.35));
            const y = snapToGroundGrid(region.y + building.cornerY * (size.h / 2 - building.h / 2 - wall * 0.35));
            buildings.push({
                ...building,
                x,
                y,
                doorX: x,
                doorY: y + building.h * 0.32,
                roofTone: seededUnit(143, index),
            });
            return;
        }
        const angle = building.angle + (seededUnit(141, index) - 0.5) * 0.45;
        const dist = building.distance * spacing + (seededUnit(142, index) - 0.5) * 54;
        const rawPoint = nearestDryVillagePoint(region.x + Math.cos(angle) * dist, region.y + Math.sin(angle) * dist * 0.72, region);
        const point = avoidBuildingOverlap(rawPoint, building, buildings, region, index);
        const x = snapToGroundGrid(point.x);
        const y = snapToGroundGrid(point.y);
        buildings.push({
            ...building,
            x,
            y,
            doorX: x,
            doorY: y + building.h * 0.32,
            roofTone: seededUnit(143, index),
        });
    });
    const garden = villageGardenForRegion(region, layout, buildings);
    const rawWellPoint = nearestDryVillagePoint(region.x + layout.well.x + (seededUnit(144, 1) - 0.5) * 36, region.y + layout.well.y + (seededUnit(144, 2) - 0.5) * 28, region);
    const wellPoint = avoidPointOverlapWithBuildings(rawWellPoint, buildings, region, 120);
    const spawnPoint = nearestDryVillagePoint(region.x + layout.spawn.x, region.y + layout.spawn.y, region);
    const well = { x: snapToGroundGrid(wellPoint.x), y: snapToGroundGrid(wellPoint.y), radius: 22 };
    const tier = baseRegion.tier || 'advanced';
    const amenities = createVillageAmenities(region, buildings, well, tier);
    const village = {
        x: region.x,
        y: region.y,
        radius: tier === 'fortress' ? region.radius : (large ? region.radius * 1.22 : region.radius),
        seed: roadSeed,
        tier,
        reputation: 2,
        layoutName: layout.name,
        large,
        buildings,
        well,
        garden,
        amenities,
        spawn: { x: snapToGroundGrid(spawnPoint.x), y: snapToGroundGrid(spawnPoint.y) },
    };
    village.buildings.forEach(building => { building.village = village; });
    return village;
}

function createJungleCultVillage() {
    const region = (worldRegionSet().jungle || []).slice().sort((a, b) => b.radius - a.radius)[0] || { x: WORLD.width * 0.72, y: WORLD.height * 0.62, radius: 980, seed: 105 };
    const center = nearestJungleCorePoint(region);
    const seed = region.seed + 909;
    const jungleScale = clamp((region.radius - 820) / 620, 0, 1);
    const buildingDefs = [
        { kind: 'cultPriest', label: '祭司树屋', angle: -1.42, distance: 760, w: 82, h: 112 },
        { kind: 'cultHerbalist', label: '藤语书屋', angle: -0.22, distance: 920, w: 76, h: 104 },
        { kind: 'cultHealer', label: '疗藤小屋', angle: 0.38, distance: 850, w: 76, h: 100 },
        { kind: 'cultHunter', label: '蛇纹猎棚', angle: 0.92, distance: 990, w: 80, h: 102 },
        { kind: 'cultGuard', label: '树根守卫屋', angle: 2.05, distance: 840, w: 86, h: 108 },
        { kind: 'cultVillager', label: '藤蔓长屋', angle: 3.08, distance: 910, w: 78, h: 98 },
    ];
    if (region.radius > 1020) buildingDefs.push({ kind: 'cultVillager', label: '树冠长屋', angle: -2.55, distance: 1040, w: 76, h: 98 });
    if (region.radius > 1160) buildingDefs.push({ kind: 'cultHunter', label: '巡林猎棚', angle: 1.55, distance: 1120, w: 78, h: 100 });
    if (region.radius > 1300) buildingDefs.push({ kind: 'cultGuard', label: '根墙岗屋', angle: 2.72, distance: 1180, w: 84, h: 106 });
    if (region.radius > 1440) buildingDefs.push({ kind: 'cultHerbalist', label: '深藤书屋', angle: -0.82, distance: 1220, w: 76, h: 104 });
    if (region.radius > 1560) buildingDefs.push({ kind: 'cultVillager', label: '祭藤小屋', angle: 0.42, distance: 1080, w: 74, h: 96 });
    if (region.radius > 1680) buildingDefs.push({ kind: 'cultHunter', label: '毒箭树棚', angle: -2.0, distance: 1180, w: 78, h: 100 });
    if (region.radius > 1800) buildingDefs.push({ kind: 'cultPriest', label: '副祭司树屋', angle: 2.38, distance: 1260, w: 80, h: 108 });
    const buildings = [];
    const minBuildingDistance = wildernessSettings.cultSpacing;
    const maxBuildingDistance = 920 + jungleScale * 220;
    buildingDefs.forEach((building, index) => {
        let best = null;
        let bestGap = -Infinity;
        for (let attempt = 0; attempt < 24; attempt++) {
            const angle = building.angle
                + (seededUnit(seed, index * 31 + attempt) - 0.5) * 0.22
                + (attempt % 6 - 2.5) * 0.11;
            const dist = clamp(
                building.distance
                    + (seededUnit(seed + 3, index * 29 + attempt) - 0.5) * 130
                    + Math.floor(attempt / 6) * 90,
                460,
                maxBuildingDistance
            );
            const target = {
                x: clamp(center.x + Math.cos(angle) * dist, 220, WORLD.width - 220),
                y: clamp(center.y + Math.sin(angle) * dist * 0.84, 220, WORLD.height - 220),
            };
            const point = terrainInfoAt(target.x, target.y).kind === 'jungle' ? target : nearestJunglePoint(target.x, target.y, region);
            const candidate = { x: snapToGroundGrid(point.x), y: snapToGroundGrid(point.y) };
            const nearestGap = buildings.length
                ? Math.min(...buildings.map(other => distance(candidate, other) - minBuildingDistance))
                : minBuildingDistance;
            if (nearestGap > bestGap) {
                best = candidate;
                bestGap = nearestGap;
            }
            if (nearestGap >= 0) break;
        }
        if (buildings.length && bestGap < 0) return;
        buildings.push({
            ...building,
            x: best.x,
            y: best.y,
            doorX: best.x,
            doorY: best.y + building.h * 0.32,
            roofTone: seededUnit(seed + 7, index),
        });
    });
    if (!buildings.some(building => building.kind === 'cultHerbalist')) {
        const building = buildingDefs.find(item => item.kind === 'cultHerbalist');
        let best = null;
        let bestGap = -Infinity;
        for (let attempt = 0; attempt < 32; attempt++) {
            const angle = building.angle + (attempt - 16) * 0.08;
            const dist = clamp(building.distance + (attempt % 8 - 3.5) * 55, 520, maxBuildingDistance);
            const target = {
                x: clamp(center.x + Math.cos(angle) * dist, 220, WORLD.width - 220),
                y: clamp(center.y + Math.sin(angle) * dist * 0.84, 220, WORLD.height - 220),
            };
            const point = terrainInfoAt(target.x, target.y).kind === 'jungle' ? target : nearestJunglePoint(target.x, target.y, region);
            const candidate = { x: snapToGroundGrid(point.x), y: snapToGroundGrid(point.y) };
            const nearestGap = buildings.length ? Math.min(...buildings.map(other => distance(candidate, other))) : minBuildingDistance;
            if (nearestGap > bestGap) {
                best = candidate;
                bestGap = nearestGap;
            }
        }
        if (best) buildings.push({ ...building, x: best.x, y: best.y, doorX: best.x, doorY: best.y + building.h * 0.32, roofTone: seededUnit(seed + 77, 1) });
    }
    if (buildings.length < 3) {
        buildings.splice(0, buildings.length);
        buildingDefs.slice(0, 3).forEach((building, index) => {
            const angle = building.angle;
            const dist = 820 + index * 220;
            const target = {
                x: clamp(center.x + Math.cos(angle) * dist, 220, WORLD.width - 220),
                y: clamp(center.y + Math.sin(angle) * dist * 0.84, 220, WORLD.height - 220),
            };
            const point = terrainInfoAt(target.x, target.y).kind === 'jungle' ? target : nearestJunglePoint(target.x, target.y, region);
            const x = snapToGroundGrid(point.x);
            const y = snapToGroundGrid(point.y);
            if (buildings.every(other => distance({ x, y }, other) >= minBuildingDistance)) {
                buildings.push({ ...building, x, y, doorX: x, doorY: y + building.h * 0.32, roofTone: seededUnit(seed + 7, index) });
            }
        });
    }
    const altar = { kind: 'greenMotherAltar', x: snapToGroundGrid(center.x), y: snapToGroundGrid(center.y + 12), radius: 34 };
    const lamps = [];
    const lampCount = 9 + Math.round(jungleScale * 7);
    for (let i = 0; i < lampCount; i++) {
        const angle = i / lampCount * Math.PI * 2 + seededUnit(seed, i + 12) * 0.35;
        const dist = 180 + seededUnit(seed + 2, i) * (520 + jungleScale * 360);
        const point = nearestJunglePoint(center.x + Math.cos(angle) * dist, center.y + Math.sin(angle) * dist * 0.82, region);
        lamps.push({ kind: 'cultTreeLamp', x: snapToGroundGrid(point.x), y: snapToGroundGrid(point.y), radius: 14, index: i });
    }
    const village = {
        x: snapToGroundGrid(center.x),
        y: snapToGroundGrid(center.y),
        radius: 1180 + Math.round(jungleScale * 420),
        seed,
        tier: 'jungleCult',
        reputation: 1,
        layoutName: 'jungle-cult',
        large: true,
        buildings,
        well: null,
        garden: altar,
        amenities: { lamps, altar },
        spawn: { x: snapToGroundGrid(center.x + 220), y: snapToGroundGrid(center.y + 290) },
    };
    village.buildings.forEach(building => { building.village = village; });
    activeJungleCultVillage = village;
    return village;
}

function nearestJungleCorePoint(region) {
    const margin = 220;
    let best = { x: clamp(region.x, margin, WORLD.width - margin), y: clamp(region.y, margin, WORLD.height - margin) };
    let bestScore = Infinity;
    for (let ring = 0; ring <= 16; ring++) {
        const radius = ring * Math.max(42, region.radius / 16);
        const count = ring ? 18 : 1;
        for (let i = 0; i < count; i++) {
            const angle = i / count * Math.PI * 2 + seededUnit(region.seed || 1, ring) * 0.4;
            const point = {
                x: clamp(region.x + Math.cos(angle) * radius, margin, WORLD.width - margin),
                y: clamp(region.y + Math.sin(angle) * radius, margin, WORLD.height - margin),
            };
            const samples = [[0, 0], [180, 0], [-180, 0], [0, 180], [0, -180], [280, 120], [-280, -120]];
            const jungleCount = samples.filter(([ox, oy]) => terrainInfoAt(point.x + ox, point.y + oy).kind === 'jungle').length;
            const score = (samples.length - jungleCount) * 1000 + distance(point, region) * 0.12;
            if (score < bestScore) {
                best = point;
                bestScore = score;
            }
        }
    }
    return bestScore < 3000 ? best : nearestJunglePoint(region.x, region.y, region);
}

function nearestJunglePoint(x, y, region) {
    const margin = 180;
    let best = { x: clamp(x, margin, WORLD.width - margin), y: clamp(y, margin, WORLD.height - margin) };
    let bestScore = terrainInfoAt(best.x, best.y).kind === 'jungle' ? 0 : 9999;
    for (let ring = 1; ring <= 16; ring++) {
        const radius = ring * 54;
        for (let i = 0; i < 12; i++) {
            const angle = i / 12 * Math.PI * 2 + ring * 0.21;
            const candidate = {
                x: clamp(x + Math.cos(angle) * radius, margin, WORLD.width - margin),
                y: clamp(y + Math.sin(angle) * radius, margin, WORLD.height - margin),
            };
            const terrain = terrainInfoAt(candidate.x, candidate.y).kind;
            const score = (terrain === 'jungle' ? 0 : 10000) + distance(candidate, region) * 0.02 + distance(candidate, { x, y }) * 0.01;
            if (score < bestScore) {
                best = candidate;
                bestScore = score;
            }
        }
    }
    return best;
}

function createSecondVillage(primary) {
    const side = seededUnit(primary.seed || 1, 73) > 0.5 ? 1 : -1;
    const distanceScale = wildernessSettings.villageDistance;
    const target = {
        x: clamp(primary.x + side * (4600 + seededUnit(primary.seed, 74) * 1200) * distanceScale, 1100, WORLD.width - 1100),
        y: clamp(primary.y + (seededUnit(primary.seed, 75) - 0.5) * 2100 * distanceScale, 1100, WORLD.height - 1100),
        radius: Math.max(430, primary.radius * 0.9),
        seed: (primary.seed || 1) + 777,
        tier: 'basic',
    };
    const village = createVillage(target);
    village.layoutName = `${village.layoutName}-market`;
    return village;
}

function fortressWallThickness() {
    return 42;
}

function fortressWallSize(village) {
    return {
        w: village.radius * 1.34,
        h: village.radius * 0.98,
    };
}

function fortressGates(village) {
    const size = fortressWallSize(village);
    const gateHalf = 74;
    const left = village.x - size.w / 2;
    const right = village.x + size.w / 2;
    const top = village.y - size.h / 2;
    const bottom = village.y + size.h / 2;
    return {
        north: { x: village.x, y: top, half: gateHalf },
        south: { x: village.x, y: bottom, half: gateHalf },
        west: { x: left, y: village.y, half: gateHalf },
        east: { x: right, y: village.y, half: gateHalf },
    };
}

function isFortressGateClosed() {
    return nightAmount() > 0.22;
}

function fortressVillageTarget(primary, secondary) {
    const road = normalize(secondary.x - primary.x, secondary.y - primary.y);
    const side = seededUnit(primary.seed || 1, 91) > 0.5 ? 1 : -1;
    const center = {
        x: (primary.x + secondary.x) / 2,
        y: (primary.y + secondary.y) / 2,
    };
    const distanceScale = wildernessSettings.villageDistance;
    return {
        x: clamp(center.x - road.y * side * (4300 + seededUnit(primary.seed, 92) * 900) * distanceScale + road.x * 1500 * distanceScale, 1200, WORLD.width - 1200),
        y: clamp(center.y + road.x * side * (4300 + seededUnit(primary.seed, 93) * 900) * distanceScale + road.y * 1500 * distanceScale, 1200, WORLD.height - 1200),
        radius: 700,
        seed: (primary.seed || 1) + 1555,
        tier: 'fortress',
    };
}

function createFortressVillage(primary, secondary) {
    const village = createVillage(fortressVillageTarget(primary, secondary));
    village.layoutName = 'iron-fort';
    return village;
}

function createVillageRoadLamps(villages) {
    if (!villages?.length || villages.length < 2) return [];
    const lamps = [];
    const roadVillages = villages.map(village => roadVillageEndpoint(village)).filter(Boolean);
    const pairs = roadVillages.slice(1).map(village => [roadVillages[0], village]);
    for (const [a, b] of pairs) {
    const count = Math.max(4, Math.floor(distance(a, b) / 180));
    for (let i = 1; i < count; i++) {
        const t = i / count;
        const center = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
        const nearVillage = Math.min(distance(center, a), distance(center, b));
        if (nearVillage > 520) continue;
        const offset = (i % 2 ? 1 : -1) * 34;
        const dir = normalize(b.x - a.x, b.y - a.y);
        const x = snapToGroundGrid(center.x - dir.y * offset);
        const y = snapToGroundGrid(center.y + dir.x * offset);
        if (isDryVillagePoint(x, y)) lamps.push({ kind: 'villageLamp', x, y, radius: 12, index: i });
    }
    }
    return lamps;
}

function villageDisplayName(village) {
    if (village?.tier === 'jungleCult') return '丛林教派';
    if (village?.tier === 'fortress') return '铁堡村';
    if (village?.tier === 'basic') return '低级村';
    return '高级村';
}

function villageVisualProfile(village) {
    if (village?.tier === 'jungleCult') {
        return {
            flag: { main: '#123d2b', trim: '#8cff66', dark: '#0f2d22', emblem: 'leaf' },
            building: { roof: '#123d2b', wall: '#3a2417', accent: '#5fae49', sign: '#8cff66' },
            clothing: { body: '#173b24', trim: '#8cff66', accent: '#d94bff' },
        };
    }
    if (village?.tier === 'fortress') {
        return {
            flag: { main: '#2f3945', trim: '#d8e5f2', dark: '#171d24', emblem: 'bar' },
            building: { roof: '#303946', wall: '#6f7780', accent: '#8c98a4', sign: '#d8e5f2' },
            clothing: { body: '#303946', trim: '#d8e5f2', accent: '#8c98a4' },
        };
    }
    if (village?.tier === 'basic') {
        return {
            flag: { main: '#7a4a24', trim: '#d6a06a', dark: '#3f2a1c', emblem: 'patch' },
            building: { roof: '#6f5a2f', wall: '#8a6a3d', accent: '#5a341d', sign: '#d6a06a' },
            clothing: { body: '#5a4632', trim: '#d6a06a', accent: '#8a6a3d' },
        };
    }
    return {
        flag: { main: '#7f2034', trim: '#ffd166', dark: '#4a2b17', emblem: 'cross' },
        building: { roof: '#4b3b28', wall: '#7a6040', accent: '#d6a06a', sign: '#ffd166' },
        clothing: { body: '#4a3a2a', trim: '#ffd166', accent: '#d6a06a' },
    };
}

function createVillageRoadSigns(villages) {
    if (!villages?.length || villages.length < 2) return [];
    const signs = [];
    const signVillages = villages;
    signVillages.forEach((village, villageIndex) => {
        const nearby = villages
            .filter(other => other !== village)
            .map(other => ({ village: other, dist: distance(roadVillageEndpoint(village), roadVillageEndpoint(other)) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 2);
        nearby.forEach((target, targetIndex) => {
            const from = roadVillageEndpoint(village);
            const to = roadVillageEndpoint(target.village);
            const dir = normalize(to.x - from.x, to.y - from.y);
            const edgeDistance = village.tier === 'fortress'
                ? Math.max(fortressWallSize(village).w, fortressWallSize(village).h) * 0.54 + 42
                : village.radius + 86;
            const actualEdge = village.tier === 'jungleCult' ? 64 : edgeDistance;
            const sideOffset = (targetIndex - (nearby.length - 1) / 2) * 54;
            const x = snapToGroundGrid(from.x + dir.x * actualEdge - dir.y * sideOffset);
            const y = snapToGroundGrid(from.y + dir.y * actualEdge + dir.x * sideOffset);
            if (!isDryVillagePoint(x, y)) return;
            signs.push({
                kind: 'roadSign',
                x,
                y,
                radius: 18,
                angle: Math.atan2(dir.y, dir.x),
                label: villageDisplayName(target.village),
                distance: target.dist,
                villageIndex,
                targetIndex,
            });
        });
    });
    return signs;
}

function roadVillageEndpoint(village) {
    if (!village) return null;
    if (village.tier !== 'jungleCult') return village;
    const origin = activeAdvancedVillage || worldRegionSet().village || village;
    const dir = normalize(origin.x - village.x, origin.y - village.y);
    return {
        ...village,
        x: snapToGroundGrid(village.x + dir.x * Math.max(220, village.radius * 0.82)),
        y: snapToGroundGrid(village.y + dir.y * Math.max(220, village.radius * 0.82) * 0.82),
        radius: 120,
    };
}

function allVillages() {
    return state?.villages?.length ? state.villages : (state?.village ? [state.village] : []);
}

function homeVillageFor(npc) {
    return npc?.homeBuilding?.village || state.village;
}

function villageReputation(village = state.village) {
    if (!village) return state.villageReputation || 0;
    village.reputation ??= 2;
    return village.reputation;
}

function changeVillageReputation(village, delta) {
    if (!village) {
        state.villageReputation = (state.villageReputation || 0) + delta;
        return state.villageReputation;
    }
    village.reputation = villageReputation(village) + delta;
    if (village === state.village) state.villageReputation = village.reputation;
    return village.reputation;
}

function villageForTrader(npc) {
    return homeVillageFor(npc) || state.indoor?.building?.village || state.village;
}

function createVillageAmenities(region, buildings, well, tier = 'advanced') {
    const placed = [well];
    const place = (point, radius, minBuildingDistance = 74) => {
        const safe = avoidFunctionalPointOverlap(
            nearestDryVillagePoint(point.x, point.y, region),
            buildings,
            placed,
            region,
            radius,
            minBuildingDistance
        );
        const item = { x: snapToGroundGrid(safe.x), y: snapToGroundGrid(safe.y), radius };
        placed.push(item);
        return item;
    };
    const lampAnchors = [
        { x: region.x - region.radius * 0.42, y: region.y - region.radius * 0.18 },
        { x: region.x + region.radius * 0.38, y: region.y - region.radius * 0.14 },
        { x: region.x - region.radius * 0.32, y: region.y + region.radius * 0.32 },
        { x: region.x + region.radius * 0.34, y: region.y + region.radius * 0.28 },
        { x: well.x + 54, y: well.y + 38 },
    ];
    if (tier === 'basic') {
        const flag = place({ x: region.x - region.radius * 0.18, y: region.y - region.radius * 0.26 }, 18, 76);
        return {
            flag: { kind: 'villageFlag', label: '低级村旗', ...flag },
            lamps: lampAnchors.slice(0, 2).map((point, index) => {
                const lamp = place(point, 12, 58);
                return { kind: 'villageLamp', ...lamp, index };
            }),
        };
    }
    if (tier === 'fortress') {
        const notice = place({ x: region.x - 92, y: region.y + 70 }, 26, 82);
        const bell = place({ x: region.x + 92, y: region.y - 70 }, 28, 86);
        const flag = place({ x: region.x, y: region.y - 146 }, 18, 76);
        return {
            noticeBoard: { kind: 'villageNotice', label: '铁堡告示牌', ...notice },
            bell: { kind: 'villageBell', label: '铁堡警钟', ...bell, lastRungAt: 0 },
            flag: { kind: 'villageFlag', label: '铁堡村旗', ...flag },
            lamps: [
                { x: region.x - 210, y: region.y - 170 },
                { x: region.x + 210, y: region.y - 170 },
                { x: region.x - 210, y: region.y + 170 },
                { x: region.x + 210, y: region.y + 170 },
                { x: region.x, y: region.y - 230 },
                { x: region.x, y: region.y + 230 },
            ].map((point, index) => {
                const lamp = place(point, 12, 58);
                return { kind: 'villageLamp', ...lamp, index };
            }),
        };
    }
    const notice = place({ x: region.x - 72, y: region.y + 42 }, 26, 82);
    const bell = place({ x: region.x + 78, y: region.y - 54 }, 28, 86);
    const flag = place({ x: region.x - region.radius * 0.18, y: region.y - region.radius * 0.26 }, 18, 76);
    return {
        noticeBoard: { kind: 'villageNotice', label: '村庄告示牌', ...notice },
        bell: { kind: 'villageBell', label: '警钟', ...bell, lastRungAt: 0 },
        flag: { kind: 'villageFlag', label: '高级村旗', ...flag },
        lamps: lampAnchors.map((point, index) => {
            const lamp = place(point, 12, 58);
            return { kind: 'villageLamp', ...lamp, index };
        }),
    };
}

function avoidBuildingOverlap(point, building, placed, region, index) {
    let best = { x: snapToGroundGrid(point.x), y: snapToGroundGrid(point.y) };
    const minGap = Math.max(building.w, building.h) + 42;
    const overlaps = candidate => placed.some(other => Math.abs(candidate.x - other.x) < (building.w + other.w) / 2 + minGap * 0.35 && Math.abs(candidate.y - other.y) < (building.h + other.h) / 2 + minGap * 0.28);
    if (!overlaps(best)) return best;
    for (let r = 64; r <= 360; r += 48) {
        for (let i = 0; i < 14; i++) {
            const angle = (i / 14) * Math.PI * 2 + index * 0.37;
            const candidate = nearestDryVillagePoint(point.x + Math.cos(angle) * r, point.y + Math.sin(angle) * r * 0.76, region, 160);
            if (!overlaps(candidate)) return candidate;
        }
    }
    return best;
}

function avoidPointOverlapWithBuildings(point, buildings, region, minDistance = 100) {
    const overlaps = candidate => buildings.some(building => (
        Math.abs(candidate.x - building.x) < building.w / 2 + minDistance
        && Math.abs(candidate.y - building.y) < building.h / 2 + minDistance
    ));
    let best = { x: snapToGroundGrid(point.x), y: snapToGroundGrid(point.y) };
    if (!overlaps(best)) return best;
    for (let r = 48; r <= 360; r += 48) {
        for (let i = 0; i < 16; i++) {
            const angle = i * Math.PI * 2 / 16 + (region.seed || 0);
            const candidate = nearestDryVillagePoint(point.x + Math.cos(angle) * r, point.y + Math.sin(angle) * r, region, 160);
            if (!overlaps(candidate)) return candidate;
        }
    }
    return best;
}

function avoidFunctionalPointOverlap(point, buildings, placed, region, radius = 18, minBuildingDistance = 74) {
    const overlapsBuilding = candidate => buildings.some(building => (
        Math.abs(candidate.x - building.x) < building.w / 2 + minBuildingDistance
        && Math.abs(candidate.y - building.y) < building.h / 2 + minBuildingDistance
    ));
    const overlapsPlaced = candidate => placed.some(item => (
        distance(candidate, item) < radius + (item.radius || 18) + 24
    ));
    const overlaps = candidate => overlapsBuilding(candidate) || overlapsPlaced(candidate);
    const seed = region.seed || 0;
    const origin = { x: snapToGroundGrid(point.x), y: snapToGroundGrid(point.y) };
    if (!overlaps(origin)) return origin;
    for (let r = 48; r <= 460; r += 36) {
        for (let i = 0; i < 20; i++) {
            const angle = i * Math.PI * 2 / 20 + seed * 0.017 + r * 0.003;
            const candidate = nearestDryVillagePoint(point.x + Math.cos(angle) * r, point.y + Math.sin(angle) * r * 0.78, region, 180);
            const snapped = { x: snapToGroundGrid(candidate.x), y: snapToGroundGrid(candidate.y) };
            if (!overlaps(snapped)) return snapped;
        }
    }
    return origin;
}

function villageLayoutForSeed(seed) {
    const layouts = [
        {
            name: 'crossroads',
            well: { x: 8, y: 4 },
            garden: { x: 0.94, y: 0 },
            spawn: { x: -120, y: 96 },
            buildings: [
                { kind: 'blacksmith', label: '铁匠屋', angle: -2.35, distance: 210, w: 132, h: 112 },
                { kind: 'apothecary', label: '药师屋', angle: -0.78, distance: 198, w: 132, h: 112 },
                { kind: 'kitchen', label: '厨房', angle: 2.35, distance: 220, w: 132, h: 112 },
                { kind: 'elder', label: '村长屋', angle: 0.82, distance: 238, w: 132, h: 112 },
            ],
        },
        {
            name: 'riverside-row',
            well: { x: -72, y: 20 },
            garden: { x: 0.2, y: -0.62 },
            spawn: { x: -180, y: 132 },
            buildings: [
                { kind: 'blacksmith', label: '铁匠屋', angle: Math.PI, distance: 250, w: 132, h: 112 },
                { kind: 'kitchen', label: '厨房', angle: -2.45, distance: 170, w: 132, h: 112 },
                { kind: 'elder', label: '村长屋', angle: -0.08, distance: 205, w: 132, h: 112 },
                { kind: 'apothecary', label: '药师屋', angle: 0.48, distance: 290, w: 132, h: 112 },
            ],
        },
        {
            name: 'garden-court',
            well: { x: 60, y: -48 },
            garden: { x: -0.72, y: 0.34 },
            spawn: { x: 0, y: 190 },
            buildings: [
                { kind: 'elder', label: '村长屋', angle: -1.55, distance: 218, w: 132, h: 112 },
                { kind: 'kitchen', label: '厨房', angle: 0.08, distance: 226, w: 132, h: 112 },
                { kind: 'apothecary', label: '药师屋', angle: 1.68, distance: 208, w: 132, h: 112 },
                { kind: 'blacksmith', label: '铁匠屋', angle: 3.05, distance: 246, w: 132, h: 112 },
            ],
        },
        {
            name: 'hill-arc',
            well: { x: 4, y: 72 },
            garden: { x: 0.58, y: 0.58 },
            spawn: { x: -150, y: -128 },
            buildings: [
                { kind: 'blacksmith', label: '铁匠屋', angle: -2.8, distance: 250, w: 132, h: 112 },
                { kind: 'elder', label: '村长屋', angle: -1.15, distance: 218, w: 132, h: 112 },
                { kind: 'apothecary', label: '药师屋', angle: 0.35, distance: 226, w: 132, h: 112 },
                { kind: 'kitchen', label: '厨房', angle: 2.05, distance: 238, w: 132, h: 112 },
            ],
        },
    ];
    return layouts[Math.floor(seededUnit(seed, 12.4) * layouts.length) % layouts.length];
}

function expandedVillageBuildings(layout, seed, large, tier = 'advanced') {
    if (tier === 'basic') {
        return [
            { kind: 'basicElder', label: '简陋村长屋', angle: -1.45, distance: 180, w: 112, h: 96 },
            { kind: 'basicVillager', label: '草棚', angle: 0.2, distance: 195, w: 104, h: 88 },
            { kind: 'basicVillager', label: '草棚', angle: 2.25, distance: 205, w: 104, h: 88 },
            { kind: 'basicVillager', label: '破木屋', angle: -2.75, distance: 225, w: 112, h: 92 },
        ];
    }
    if (tier === 'fortress') {
        return [
            { kind: 'guardFortress', label: '东北石堡', cornerX: 1, cornerY: -1, w: 164, h: 138 },
            { kind: 'guardFortress', label: '东南石堡', cornerX: 1, cornerY: 1, w: 164, h: 138 },
            { kind: 'guardFortress', label: '西南石堡', cornerX: -1, cornerY: 1, w: 164, h: 138 },
            { kind: 'guardFortress', label: '西北石堡', cornerX: -1, cornerY: -1, w: 164, h: 138 },
            { kind: 'blacksmith', label: '铁堡锻造屋', angle: Math.PI, distance: 178, w: 132, h: 112 },
            { kind: 'elder', label: '铁堡议事屋', angle: -1.56, distance: 150, w: 132, h: 112 },
            { kind: 'merchant', label: '铁堡补给店', angle: 0, distance: 166, w: 142, h: 112 },
            { kind: 'kitchen', label: '铁堡厨房', angle: 1.57, distance: 160, w: 132, h: 112 },
        ];
    }
    const buildings = layout.buildings.map(item => ({ ...item }));
    buildings.push({ kind: 'guard', label: '守卫石屋', angle: -1.92 + seededUnit(seed, 24) * 0.55, distance: 285, w: 142, h: 116 });
    buildings.push({ kind: 'merchant', label: '商人小店', angle: -0.1 + seededUnit(seed, 25) * 0.7, distance: 300, w: 142, h: 112 });
    buildings.push({ kind: 'unemployed', label: '村民屋', angle: 1.18 + seededUnit(seed, 21) * 1.2, distance: 260, w: 126, h: 108 });
    if (large) {
        [
            { kind: 'unemployed', label: '村民屋', angle: 2.7, distance: 330, w: 126, h: 108 },
            { kind: seededUnit(seed, 22) > 0.5 ? 'kitchen' : 'apothecary', label: seededUnit(seed, 22) > 0.5 ? '厨房' : '药师屋', angle: -0.35, distance: 345, w: 132, h: 112 },
            { kind: seededUnit(seed, 23) > 0.5 ? 'blacksmith' : 'unemployed', label: seededUnit(seed, 23) > 0.5 ? '铁匠屋' : '村民屋', angle: -2.05, distance: 350, w: 132, h: 112 },
            { kind: 'guard', label: '守卫石屋', angle: 0.95, distance: 365, w: 142, h: 116 },
        ].forEach(item => buildings.push(item));
    }
    return buildings;
}

function villageGardenForRegion(region, layout = villageLayoutForSeed(region.seed || 1), buildings = []) {
    const baseX = region.x + region.radius * layout.garden.x + (seededUnit(145, 1) - 0.5) * 56;
    const baseY = region.y + region.radius * layout.garden.y + (seededUnit(145, 2) - 0.5) * 42;
    const point = nearestGardenPointAwayFromBuildings(baseX, baseY, region, buildings);
    return {
        x: snapToGroundGrid(point.x),
        y: snapToGroundGrid(point.y),
        w: 220,
        h: 150,
    };
}

function nearestGardenPointAwayFromBuildings(x, y, region, buildings) {
    const farEnough = point => buildings.every(building => distance(point, building) > Math.max(210, (building.w + building.h) * 0.85));
    let point = nearestDryVillagePoint(x, y, region);
    if (farEnough(point)) return point;
    for (let r = 80; r <= 420; r += 56) {
        for (let i = 0; i < 14; i++) {
            const angle = i * Math.PI * 2 / 14 + (region.seed || 0);
            point = nearestDryVillagePoint(x + Math.cos(angle) * r, y + Math.sin(angle) * r, region, 160);
            if (farEnough(point)) return point;
        }
    }
    return point;
}

function dryVillageRegion(region) {
    const point = nearestDryVillagePoint(region.x, region.y, region, 520);
    return { ...region, x: point.x, y: point.y };
}

function nearestDryVillagePoint(x, y, region, maxRadius = 360) {
    const start = { x: snapToGroundGrid(x), y: snapToGroundGrid(y) };
    if (isDryVillagePoint(start.x, start.y)) return start;
    for (let radius = 48; radius <= maxRadius; radius += 48) {
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2 + seededUnit(region.seed || 1, radius + i) * 0.2;
            const point = {
                x: snapToGroundGrid(clamp(x + Math.cos(angle) * radius, 160, WORLD.width - 160)),
                y: snapToGroundGrid(clamp(y + Math.sin(angle) * radius, 160, WORLD.height - 160)),
            };
            if (isDryVillagePoint(point.x, point.y)) return point;
        }
    }
    return start;
}

function isDryVillagePoint(x, y) {
    const samples = [
        [0, 0], [-72, 0], [72, 0], [0, -72], [0, 72],
        [-96, -64], [96, -64], [-96, 64], [96, 64],
    ];
    return samples.every(([ox, oy]) => {
        const water = Math.min(riverDistance(x + ox, y + oy) - 68, lakeDistance(x + ox, y + oy));
        return water >= 72;
    });
}

function snapToGroundGrid(value) {
    return Math.round(value / 32) * 32;
}

function createResources(villageParam = null) {
    const resources = [];
    const placementCell = 128;
    const placementGrid = new Map();
    const placementKey = (x, y) => `${Math.floor(x / placementCell)},${Math.floor(y / placementCell)}`;
    const registerResource = item => {
        resources.push(item);
        const key = placementKey(item.x, item.y);
        if (!placementGrid.has(key)) placementGrid.set(key, []);
        placementGrid.get(key).push(item);
    };
    const hasNearbyResource = (point, radius, spacing) => {
        const cx = Math.floor(point.x / placementCell);
        const cy = Math.floor(point.y / placementCell);
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
            for (let gx = cx - 1; gx <= cx + 1; gx++) {
                const bucket = placementGrid.get(`${gx},${gy}`);
                if (!bucket) continue;
                if (bucket.some(item => distance(item, point) < item.radius + radius + spacing)) return true;
            }
        }
        return false;
    };
    const campPoint = CAMP_POSITION;
    const ruinsPoint = worldRegionSet().ruins[0];
    const villageForClearance = villageParam || null;
    const add = (kind, x, y, gives, hp, radius) => {
        const point = { x, y };
        const terrain = terrainInfoAt(x, y);
        if (terrain.kind === 'water' || (terrain.kind === 'ruins' && kind !== 'ruinsElderTree')) return;
        if (villageForClearance && isNearVillageHouseClearance(point, villageForClearance)) return;
        if (villageRegionWeight(x, y) > 0.16) return;
        if (distance(point, campPoint) < 95 && kind !== 'grass' && kind !== 'tallGrass') return;
        if (distance(point, ruinsPoint) < 230) return;
        const spacing = kind === 'tallGrass' ? -42 : (kind === 'grass' ? 8 : 24);
        if (hasNearbyResource(point, radius, spacing)) return;
        registerResource(resource(kind, x, y, gives, hp, radius));
    };
    const addForced = (kind, x, y, gives, hp, radius) => {
        if (terrainInfoAt(x, y).kind === 'water') return;
        if (villageForClearance && kind !== 'woodFence' && isNearVillageHouseClearance({ x, y }, villageForClearance)) return;
        registerResource(resource(kind, x, y, gives, hp, radius));
    };

    for (let y = 180; y <= WORLD.height - 170; y += 72) {
        for (let x = 250; x <= WORLD.width - 180; x += 76) {
            const jitterX = (hash2(x * 0.07, y * 0.07) - 0.5) * 46;
            const jitterY = (hash2(x * 0.05 + 8, y * 0.05 - 2) - 0.5) * 44;
            const px = x + jitterX;
            const py = y + jitterY;
            const info = terrainInfoAt(px, py);
            const n = valueNoise(px * 0.014, py * 0.014);
            if (info.kind === 'bamboo') {
                if (n > 0.2) add('bamboo', px, py, 'bamboo', 5, 18);
                else if (n > 0.08) add('forestOakTree', px, py, 'oakWood', 5, 28);
                else add('grass', px, py, 'fiber', 3, 18);
            } else if (info.kind === 'birch') {
                if (n > 0.34) add('birchTree', px, py, 'birchWood', 5, 26);
                else if (n > 0.18) add(n > 0.26 ? 'flower' : 'berry', px, py, n > 0.26 ? 'flower' : 'berry', 3, 18);
            } else if (info.kind === 'pine') {
                if (n > 0.36) add('pineTree', px, py, 'pineWood', 6, 28);
                else if (n > 0.22) add('resinPatch', px, py, 'resin', 3, 14);
                else add('mushroom', px, py, 'mushroom', 3, 18);
            } else if (info.kind === 'maple') {
                if (n > 0.34) add('mapleTree', px, py, 'mapleWood', 6, 30);
                else if (n > 0.2) add('sapPatch', px, py, 'sap', 3, 14);
                else add('berry', px, py, 'berry', 3, 20);
            } else if (info.kind === 'meadow') {
                if (n > 0.82) add('meadowBlossomTree', px, py, 'blossomWood', 5, 28);
                else if (n > 0.72) add('beehive', px, py, 'honey', 5, 18);
                else if (n > 0.22) add('meadowFlower', px, py, 'flower', 3, 20);
                else if (n > 0.12) add('herb', px, py, 'herb', 3, 18);
            } else if (info.kind === 'darkForest') {
                if (n > 0.54) add('darkTree', px, py, 'darkWood', 6, 30);
                else if (n > 0.36) add('deadTree', px, py, 'deadWood', 5, 26);
                else if (n > 0.18) add('toxicMushroom', px, py, 'toxicMushroom', 3, 18);
                else if (n > 0.1) add('mushroom', px, py, 'mushroom', 3, 20);
                else add('deadTreeStump', px, py, 'deadWood', 3, 18);
            } else if (info.kind === 'jungle') {
                if (n > 0.84) add('jungleVine', px, py, 'vine', 4, 22);
                else if (n > 0.72) add('jungleLeafPlant', px, py, 'jungleLeaf', 4, 24);
                else if (n > 0.58) add('hardwoodTree', px, py, 'hardwood', 7, 32);
                else if (n > 0.46) add('buttressRoot', px, py, 'buttressWood', 5, 26);
                else if (n > 0.35) add('jungleFruitBush', px, py, 'jungleFruit', 3, 20);
                else if (n > 0.27) add('jungleOrchid', px, py, 'flower', 3, 18);
                else if (n > 0.18) add('poisonBloom', px, py, 'toxicMushroom', 3, 18);
                else if (n > 0.1) add('bamboo', px, py, 'bamboo', 5, 18);
                else add('jungleHerb', px, py, 'herb', 3, 18);
            } else if (info.kind === 'reedWetland') {
                if (n > 0.78) add('reedWillowTree', px, py, 'willowWood', 5, 27);
                else if (n > 0.25) add('reed', px, py, 'fiber', 2, 16);
                if (n > 0.68) add('lotus', px + 16, py - 12, 'lotus', 3, 18);
            } else if (info.kind === 'forest') {
                if (n > 0.38) add('forestOakTree', px, py, 'oakWood', 6, 34);
                else if (n > 0.22) add('forestOakTreeStump', px, py, 'oakWood', 3, 20);
                else add(n > 0.1 ? 'mushroom' : 'berry', px, py, n > 0.1 ? 'mushroom' : 'berry', 3, 20);
            } else if (info.kind === 'tallgrass') {
                add('tallGrass', px, py, 'fiber', 4, 18);
                [
                    [-28, -18, 0.18],
                    [30, 12, 0.28],
                    [-8, 32, 0.42],
                    [18, -34, 0.32],
                    [-36, 18, 0.36],
                ].forEach(([ox, oy, threshold], index) => {
                    const gx = px + ox + (hash2(px * 0.03 + index, py * 0.03) - 0.5) * 14;
                    const gy = py + oy + (hash2(px * 0.03 - index, py * 0.03 + 4) - 0.5) * 14;
                    if (terrainInfoAt(gx, gy).kind === 'tallgrass' && hash2(gx * 0.05, gy * 0.05) > threshold) {
                        add('tallGrass', gx, gy, 'fiber', 4, 18);
                    }
                });
                if (n > 0.78) add('herb', px + 24, py - 18, 'herb', 3, 18);
                else if (n < 0.08) add('grassOakTree', px - 12, py + 12, 'oakWood', 5, 28);
                else if (n < 0.18) add('flower', px - 22, py + 16, 'flower', 3, 18);
            } else if (info.kind === 'grass' || info.kind === 'camp') {
                if (n > 0.86) add('grassOakTree', px, py, 'oakWood', 5, 29);
                else if (n > 0.72) add('berry', px, py, 'berry', 3, 22);
                else if (n > 0.42) add('grass', px, py, 'fiber', 3, 18);
                else if (n > 0.32) add(n > 0.37 ? 'herb' : 'flower', px, py, n > 0.37 ? 'herb' : 'flower', 3, 18);
                else if (n > 0.18) add('pebble', px, py, 'stone', 2, 10);
            } else if (info.kind === 'shore') {
                if (n > 0.32) add('reed', px, py, 'fiber', 2, 16);
            } else if (info.kind === 'mud') {
                if (n > 0.82) add('swampCypressTree', px, py, 'cypressWood', 6, 30);
                else if (n > 0.66) add('lotus', px, py, 'lotus', 3, 18);
                else if (n > 0.36) add('reed', px, py, 'fiber', 2, 16);
                else add('mudClump', px, py, 'mud', 3, 14);
            } else if (info.kind === 'swamp') {
                if (n > 0.78) add('swampCypressTree', px, py, 'cypressWood', 6, 30);
                else if (n > 0.62) add('lotus', px, py, 'lotus', 3, 18);
                else if (n > 0.28) add('reed', px, py, 'fiber', 2, 16);
                else add('mushroom', px, py, 'mushroom', 3, 20);
            } else if (info.kind === 'dry') {
                if (n > 0.52) add('cactus', px, py, 'cactusFruit', 4, 22);
                else if (n > 0.32) add('rock', px, py, 'stone', 6, 24);
            } else if (info.kind === 'mine') {
                if (n > 0.84) add('mineIronwoodTree', px, py, 'ironwood', 7, 28);
                else if (n > 0.62) add('ore', px, py, 'ore', 8, 28);
                else if (n > 0.42) add('rock', px, py, 'stone', 7, 28);
                else if (n > 0.28) add('rock', px, py, 'coal', 6, 26);
            } else if (info.kind === 'ruins') {
                if (n > 0.62) add('ruinsElderTree', px, py, 'elderWood', 6, 30);
                else if (n > 0.42) add('rock', px, py, 'stone', 7, 28);
            }
        }
    }

    const regions = worldRegionSet();
    const village = villageParam || createVillage();
    const gardenPlants = [];
    for (let row = -3; row <= 3; row++) {
        for (let col = -4; col <= 4; col++) {
            const roll = seededUnit(146 + row * 7, col * 5);
            const kind = roll < 0.28 ? 'grass' : (roll < 0.52 ? 'berry' : 'herb');
            const x = village.garden.x + col * 24 + (seededUnit(147 + row, col) - 0.5) * 10;
            const y = village.garden.y + row * 20 + (seededUnit(148 + col, row) - 0.5) * 10;
            gardenPlants.push([x, y, kind]);
        }
    }
    const gardenFence = [];
    for (let x = village.garden.x - village.garden.w / 2; x <= village.garden.x + village.garden.w / 2; x += 28) {
        if (seededUnit(x, village.garden.y) > 0.22) gardenFence.push([x, village.garden.y - village.garden.h / 2, 'woodFence']);
        if (seededUnit(x, village.garden.y + 7) > 0.34) gardenFence.push([x, village.garden.y + village.garden.h / 2, 'woodFence']);
    }
    for (let y = village.garden.y - village.garden.h / 2 + 28; y < village.garden.y + village.garden.h / 2; y += 28) {
        if (seededUnit(village.garden.x, y) > 0.38) gardenFence.push([village.garden.x - village.garden.w / 2, y, 'woodFence']);
        if (seededUnit(village.garden.x + 9, y) > 0.26) gardenFence.push([village.garden.x + village.garden.w / 2, y, 'woodFence']);
    }
    [
        [CAMP_POSITION.x + 180, CAMP_POSITION.y + 90, 'tree'], [CAMP_POSITION.x - 160, CAMP_POSITION.y + 130, 'grassOakTreeStump'], [CAMP_POSITION.x + 220, CAMP_POSITION.y - 160, 'rock'],
        ...regions.mine.flatMap((region, index) => [
            [region.x + 80, region.y - 70, index % 2 ? 'rock' : 'ore'],
            [region.x - 120, region.y + 80, 'ore'],
        ]),
        ...regions.reedWetland.flatMap(region => [
            [region.x - 90, region.y + 50, 'reed'],
            [region.x + 100, region.y - 70, 'reed'],
        ]),
        ...regions.forest.slice(0, 2).flatMap(region => [
            [region.x - 120, region.y - 70, 'tree'],
            [region.x + 120, region.y + 80, 'forestOakTreeStump'],
        ]),
        ...gardenPlants,
        ...gardenFence,
    ].forEach(([x, y, kind]) => {
        const config = {
            tree: ['wood', 6, 34],
            rock: ['stone', 7, 28],
            ore: ['ore', 8, 28],
            reed: ['fiber', 2, 16],
            grassOakTreeStump: ['oakWood', 3, 20],
            forestOakTreeStump: ['oakWood', 3, 20],
            deadTreeStump: ['deadWood', 3, 18],
            herb: ['herb', 3, 18],
            berry: ['berry', 3, 20],
            grass: ['fiber', 3, 18],
            woodFence: ['wood', 4, 16],
        }[kind];
        const fixedVillagePlant = ['herb', 'berry', 'grass', 'woodFence'].includes(kind);
        (fixedVillagePlant ? addForced : add)(kind, x, y, ...config);
    });

    return resources.filter(item => terrainInfoAt(item.x, item.y).kind !== 'water');
}

function isNearVillageHouseClearance(point, village) {
    return (village.buildings || []).some(building => {
        const door = { x: building.doorX, y: building.doorY };
        if (distance(point, door) < 130) return true;
        return Math.abs(point.x - building.x) < building.w * 0.75 && Math.abs(point.y - building.y) < building.h * 0.72;
    });
}

function buildTallGrassGrid(resources) {
    const grid = new Map();
    for (const item of resources) {
        if (item.kind !== 'tallGrass' || item.hp <= 0) continue;
        const key = coverGridKey(item.x, item.y);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(item);
    }
    return grid;
}

function buildResourceGrid(resources) {
    const grid = new Map();
    for (const item of resources) {
        const gx = Math.floor(item.x / RESOURCE_GRID_SIZE);
        const gy = Math.floor(item.y / RESOURCE_GRID_SIZE);
        const key = `${gx},${gy}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(item);
    }
    return grid;
}

function buildDecorationGrid(decorations) {
    const grid = new Map();
    for (const item of decorations) {
        const gx = Math.floor(item.x / RESOURCE_GRID_SIZE);
        const gy = Math.floor(item.y / RESOURCE_GRID_SIZE);
        const key = `${gx},${gy}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(item);
    }
    return grid;
}

function visibleDecorations(margin = 100) {
    const grid = state.decorationGrid;
    if (!grid) return state.decorations;
    const minX = Math.floor((camera.x - margin) / RESOURCE_GRID_SIZE);
    const maxX = Math.floor((camera.x + VIEW.width + margin) / RESOURCE_GRID_SIZE);
    const minY = Math.floor((camera.y - margin) / RESOURCE_GRID_SIZE);
    const maxY = Math.floor((camera.y + VIEW.height + margin) / RESOURCE_GRID_SIZE);
    const items = [];
    for (let gy = minY; gy <= maxY; gy++) {
        for (let gx = minX; gx <= maxX; gx++) {
            const bucket = grid.get(`${gx},${gy}`);
            if (bucket) items.push(...bucket);
        }
    }
    return items;
}

function nearbyResources(x, y, radius = 320) {
    const grid = state.resourceGrid;
    if (!grid) return state.resources;
    const minX = Math.floor((x - radius) / RESOURCE_GRID_SIZE);
    const maxX = Math.floor((x + radius) / RESOURCE_GRID_SIZE);
    const minY = Math.floor((y - radius) / RESOURCE_GRID_SIZE);
    const maxY = Math.floor((y + radius) / RESOURCE_GRID_SIZE);
    const items = [];
    for (let gy = minY; gy <= maxY; gy++) {
        for (let gx = minX; gx <= maxX; gx++) {
            const bucket = grid.get(`${gx},${gy}`);
            if (bucket) items.push(...bucket);
        }
    }
    return items;
}

function visibleResources(margin = 180) {
    const grid = state.resourceGrid;
    if (!grid) return state.resources.filter(shouldDrawResource);
    const minX = Math.floor((camera.x - margin) / RESOURCE_GRID_SIZE);
    const maxX = Math.floor((camera.x + VIEW.width + margin) / RESOURCE_GRID_SIZE);
    const minY = Math.floor((camera.y - margin) / RESOURCE_GRID_SIZE);
    const maxY = Math.floor((camera.y + VIEW.height + margin) / RESOURCE_GRID_SIZE);
    const items = [];
    for (let gy = minY; gy <= maxY; gy++) {
        for (let gx = minX; gx <= maxX; gx++) {
            const bucket = grid.get(`${gx},${gy}`);
            if (!bucket) continue;
            for (const item of bucket) {
                if (shouldDrawResource(item)) items.push(item);
            }
        }
    }
    return items;
}

function coverGridKey(x, y) {
    return `${Math.floor(x / COVER_GRID_SIZE)},${Math.floor(y / COVER_GRID_SIZE)}`;
}

function enemy(kind, name, x, y, radius, hp, attack, speed, range, drop, dropAmount, boss = false) {
    return {
        kind, name, x, y, spawnX: x, spawnY: y, radius, hp, maxHp: hp, attack, speed, range, drop, dropAmount, boss,
        hurtUntil: 0,
        attackCooldown: 0,
        contactCooldown: 0,
        rootedUntil: 0,
        windupUntil: 0,
        strikeAt: 0,
        attackDir: { x: 0, y: 1 },
        facing: { x: hash2(x * 0.017, y * 0.017) > 0.5 ? 1 : -1, y: 0 },
        circleDir: { x: 0, y: 1 },
        circleSide: hash2(x * 0.02, y * 0.02) > 0.5 ? 1 : -1,
        retreatUntil: 0,
        chargeUntil: 0,
        chargeHit: false,
        leapStartAt: 0,
        leapUntil: 0,
        leapStartX: x,
        leapStartY: y,
        leapTargetX: x,
        leapTargetY: y,
        leapHit: false,
        leapDamage: true,
        tongueUntil: 0,
        tongueTargetX: x,
        tongueTargetY: y,
        swoopUntil: 0,
        swoopStartAt: 0,
        swoopStartX: x,
        swoopStartY: y,
        swoopTargetX: x,
        swoopTargetY: y,
        swoopHit: false,
        bossSkill: '',
        bossSkillAngle: 0,
        knockX: 0,
        knockY: 0,
    };
}

function makeEnemy(kind, x, y, boss = false) {
    const configs = {
        slime: ['史莱姆', 18, 16, 2, 92, 42, { slimeGel: { min: 1, max: 2 }, fiber: { min: 0, max: 1, chance: 0.45 } }, 1],
        frog: ['沼泽蛙', 16, 18, 1, 130, 58, { slimeGel: 1, frogLeg: { min: 0, max: 1, chance: 0.65 }, frogTongue: { min: 0, max: 1, chance: 0.22 }, lotus: { min: 0, max: 1, chance: 0.35 }, meat: { min: 0, max: 1, chance: 0.25 } }, 1],
        scorpion: ['沙蝎', 12, 18, 2, 120, 48, { venom: 1, scorpionShell: { min: 0, max: 1, chance: 0.6 }, fang: { min: 0, max: 1, chance: 0.35 } }, 1],
        boar: ['野猪', 22, 30, 5, 135, 68, { meat: { min: 2, max: 3 }, hide: { min: 1, max: 2 }, fang: { min: 0, max: 1, chance: 0.35 } }, 1],
        wolf: ['荒狼', 18, 24, 4, 148, 64, { fang: { min: 1, max: 2 }, hide: { min: 1, max: 1 }, meat: { min: 0, max: 1, chance: 0.45 } }, 1],
        bat: ['夜蝠', 12, 12, 2, 210, 96, { batWing: { min: 0, max: 1, chance: 0.7 }, fang: { min: 0, max: 1, chance: 0.55 }, meat: { min: 0, max: 1, chance: 0.25 } }, 1],
        bee: ['野蜂', 10, 10, 1, 185, 44, { beeStinger: { min: 0, max: 1, chance: 0.65 }, beeswax: { min: 0, max: 1, chance: 0.45 }, honey: { min: 0, max: 1, chance: 0.4 } }, 1],
        jungleSnake: ['丛林蛇', 11, 14, 2, 155, 56, { venom: { min: 1, max: 1 }, fang: { min: 0, max: 1, chance: 0.45 }, meat: { min: 0, max: 1, chance: 0.35 } }, 1],
        vineStalker: ['藤蔓潜伏者', 18, 30, 3, 92, 98, { vine: { min: 2, max: 4 }, jungleLeaf: { min: 0, max: 2, chance: 0.55 }, herb: { min: 0, max: 1, chance: 0.35 } }, 1],
        grassRunner: ['平原疾行兽', 14, 18, 2, 170, 52, { beastClaw: { min: 1, max: 1 }, meat: { min: 1, max: 2 }, fiber: { min: 0, max: 1, chance: 0.35 } }, 1],
        tallgrassRaptor: ['高草迅爪', 16, 22, 3, 160, 60, { beastClaw: { min: 1, max: 1 }, meat: { min: 1, max: 2 }, fiber: { min: 0, max: 1, chance: 0.35 } }, 1],
        meadowMoth: ['花粉蛾', 12, 12, 1, 160, 48, { pollenDust: { min: 1, max: 2 }, flower: { min: 1, max: 2 }, fiber: { min: 0, max: 1, chance: 0.35 } }, 1],
        forestBear: ['森林熊', 26, 42, 6, 112, 72, { thickFur: { min: 1, max: 2 }, beastClaw: { min: 0, max: 1, chance: 0.55 }, meat: { min: 2, max: 3 }, hide: { min: 1, max: 2 } }, 1],
        bambooPanda: ['竹林熊猫', 24, 34, 4, 120, 64, { thickFur: { min: 1, max: 1 }, bamboo: { min: 2, max: 4 }, meat: { min: 0, max: 1, chance: 0.25 } }, 1],
        birchStag: ['白桦角鹿', 20, 30, 3, 150, 58, { beastClaw: { min: 1, max: 1 }, antler: { min: 0, max: 1, chance: 0.65 }, meat: { min: 1, max: 2 }, hide: { min: 0, max: 1, chance: 0.45 } }, 1],
        pineLynx: ['松林猞猁', 15, 20, 3, 175, 58, { beastClaw: { min: 1, max: 1 }, thickFur: { min: 0, max: 1, chance: 0.45 }, meat: { min: 1, max: 2 }, hide: { min: 0, max: 1, chance: 0.45 } }, 1],
        mapleFox: ['枫林狐', 13, 16, 2, 185, 54, { beastClaw: { min: 1, max: 1 }, mapleWood: { min: 0, max: 1, chance: 0.3 }, meat: { min: 0, max: 1, chance: 0.45 }, berry: { min: 0, max: 1, chance: 0.35 } }, 1],
        reedCrab: ['芦苇蟹', 14, 18, 2, 116, 46, { reedShell: { min: 1, max: 1 }, mud: { min: 1, max: 2 }, meat: { min: 0, max: 1, chance: 0.4 } }, 1],
        swampMireling: ['泥沼怪', 18, 28, 3, 92, 56, { mireCore: { min: 1, max: 1 }, mud: { min: 2, max: 3 }, mushroom: { min: 0, max: 1, chance: 0.45 } }, 1],
        drySandWasp: ['沙地毒蜂', 11, 12, 2, 195, 52, { pollenDust: { min: 1, max: 1 }, venom: { min: 0, max: 1, chance: 0.45 }, cactusFruit: { min: 0, max: 1, chance: 0.45 }, fiber: { min: 0, max: 1, chance: 0.35 } }, 1],
        mineCrystalBat: ['晶矿蝠', 13, 14, 3, 220, 98, { crystalFang: { min: 1, max: 1 }, ore: { min: 0, max: 1, chance: 0.55 }, stone: { min: 1, max: 2 } }, 1],
        ruinsBoneGuard: ['遗迹骨卫', 20, 34, 5, 92, 64, { boneShard: { min: 1, max: 2 }, stone: { min: 2, max: 3 }, coal: { min: 0, max: 1, chance: 0.35 } }, 1],
        hare: ['野兔', 10, 8, 0, 170, 0, { rabbitFur: { min: 1, max: 1 }, rabbitFoot: { min: 0, max: 1, chance: 0.28 }, meat: { min: 0, max: 1, chance: 0.55 } }, 1],
        deer: ['林鹿', 18, 26, 0, 155, 0, { antler: { min: 0, max: 1, chance: 0.65 }, sinew: { min: 1, max: 2 }, meat: { min: 1, max: 2 }, hide: { min: 0, max: 1, chance: 0.45 } }, 1],
        shade: ['枯影', 16, 20, 3, 118, 58, { shadowShard: { min: 1, max: 2 }, toxicMushroom: { min: 0, max: 1, chance: 0.55 }, shadowEssence: { min: 0, max: 1, chance: 0.22 }, mushroom: { min: 0, max: 1, chance: 0.45 }, slimeGel: { min: 0, max: 1, chance: 0.35 } }, 1],
        golem: [boss ? '守门石像王' : '石像守卫', boss ? 36 : 26, boss ? 110 : 46, boss ? 13 : 7, boss ? 66 : 70, boss ? 118 : 78, boss ? { stoneCore: { min: 1, max: 1 }, crystal: { min: 5, max: 6 }, stone: { min: 8, max: 10 }, coal: { min: 3, max: 4 } } : { stoneCore: { min: 0, max: 1, chance: 0.45 }, stone: { min: 3, max: 5 }, coal: { min: 1, max: 2 }, crystal: { min: 0, max: 1, chance: 0.55 } }, 1],
    };
    const config = configs[kind];
    if (!config) return null;
    return enemy(kind, config[0], x, y, config[1], config[2], config[3], config[4], config[5], config[6], config[7], boss);
}

function createEnemies(spawnDens = []) {
    const enemies = [];
    const ruinsPoint = worldRegionSet().ruins[0];
    const enemySoftCap = Math.round(88 * wildernessSettings.monsterDensity);
    const add = (item, force = false) => {
        if (!item || !canSpawnEnemyAt(item.kind, item.x, item.y, enemies)) return;
        if (!force && enemies.length >= enemySoftCap && item.kind !== 'wolf' && !item.boss) return;
        if (item.kind !== 'golem' && distance(item, ruinsPoint) < 180) return;
        if (!force && enemies.some(enemyItem => distance(enemyItem, item) < enemyItem.radius + item.radius + 110)) return;
        enemies.push(item);
    };
    const initialCandidates = [];
    for (let y = 250; y <= WORLD.height - 220; y += 150) {
        for (let x = 290; x <= WORLD.width - 260; x += 170) {
            const px = x + (hash2(x * 0.03, y * 0.03) - 0.5) * 95;
            const py = y + (hash2(x * 0.04 + 6, y * 0.04 - 4) - 0.5) * 95;
            const info = terrainInfoAt(px, py);
            const n = valueNoise(px * 0.01 + 4, py * 0.01 - 3);
            const kind = chooseInitialSpawnKind(info.kind, px, py, n);
            if (kind) initialCandidates.push(makeEnemy(kind, px, py));
        }
    }
    initialCandidates
        .sort((a, b) => hash2(a.x * 0.013, a.y * 0.013) - hash2(b.x * 0.013, b.y * 0.013))
        .forEach(item => add(item));
    spawnDens.forEach(den => {
        if (hash2(den.x * 0.011, den.y * 0.011) > 0.58) add(makeEnemy(den.kind, den.x + 45, den.y + 20));
    });
    addBiomeCreatures(add);
    addMineGolems(add);
    add(makeEnemy('golem', ruinsPoint.x - 80, ruinsPoint.y + 120, true), true);
    if (!enemies.some(item => item.kind === 'boar' && item.x < 800 && item.y > 1050)) {
        add(makeEnemy('boar', 560, 1260));
    }
    createWolfPacks().forEach(add);
    return enemies;
}

function addMineGolems(add) {
    const mineCenters = worldRegionSet().mine.slice(0, 3);
    mineCenters.forEach((center, centerIndex) => {
        let placed = 0;
        for (let i = 0; i < 10 && placed < 2; i++) {
            const angle = hash2(center.x * 0.013 + i, center.y * 0.013 - i) * Math.PI * 2;
            const radius = 120 + hash2(center.x * 0.017 - i, center.y * 0.017 + i) * 380;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            if (terrainInfoAt(x, y).kind !== 'mine') continue;
            add(makeEnemy('golem', x, y), true);
            placed++;
        }
        if (!placed && terrainInfoAt(center.x, center.y).kind === 'mine') {
            add(makeEnemy('golem', center.x + centerIndex * 18, center.y), true);
        }
    });
}

function addBiomeCreatures(add) {
    [
        ['bee', 'meadow', 4],
        ['grassRunner', 'grass', 5],
        ['tallgrassRaptor', 'tallgrass', 4],
        ['meadowMoth', 'meadow', 5],
        ['forestBear', 'forest', 3],
        ['bambooPanda', 'bamboo', 3],
        ['birchStag', 'birch', 4],
        ['pineLynx', 'pine', 4],
        ['mapleFox', 'maple', 4],
        ['reedCrab', 'reedWetland', 4],
        ['swampMireling', 'swamp', 4],
        ['drySandWasp', 'dry', 4],
        ['mineCrystalBat', 'mine', 4],
        ['ruinsBoneGuard', 'ruins', 3],
        ['hare', 'meadow', 4],
        ['deer', 'birch', 4],
        ['deer', 'maple', 4],
        ['deer', 'pine', 4],
        ['shade', 'darkForest', 5],
        ['jungleSnake', 'jungle', 7],
        ['vineStalker', 'jungle', 4],
    ].forEach(([kind, terrainKind, count]) => {
        let placed = 0;
        const offset = Math.floor(hash2(kind.length, terrainKind.length) * 120);
        for (let y = 220 + offset; y < WORLD.height - 220 && placed < count; y += 180) {
            for (let x = 220 + offset; x < WORLD.width - 220 && placed < count; x += 180) {
                const px = x + (hash2(x * 0.02 + kind.length, y * 0.02) - 0.5) * 80;
                const py = y + (hash2(x * 0.02, y * 0.02 + terrainKind.length) - 0.5) * 80;
                if (terrainInfoAt(px, py).kind !== terrainKind) continue;
                add(makeEnemy(kind, px, py), true);
                placed++;
            }
        }
        for (let i = 0; i < 120 && placed < count; i++) {
            const x = 220 + hash2(i * 1.91 + kind.length, i * 0.37 + terrainKind.length) * (WORLD.width - 440);
            const y = 220 + hash2(i * 0.73 - kind.length, i * 2.11 - terrainKind.length) * (WORLD.height - 440);
            if (terrainInfoAt(x, y).kind !== terrainKind) continue;
            add(makeEnemy(kind, x, y), true);
            placed++;
        }
    });
}

function chooseInitialSpawnKind(terrainKind, x, y, n) {
    if (terrainKind === 'grass' && n > 0.76) return n > 0.92 ? 'slime' : 'grassRunner';
    if (terrainKind === 'tallgrass' && n > 0.5) return n > 0.76 ? 'tallgrassRaptor' : 'wolf';
    if (terrainKind === 'meadow' && n > 0.42) return n > 0.72 ? 'meadowMoth' : (n > 0.56 ? 'bee' : 'hare');
    if (terrainKind === 'darkForest' && n > 0.44) return 'shade';
    if (terrainKind === 'birch' && n > 0.36) return n > 0.66 ? 'birchStag' : (n > 0.52 ? 'deer' : 'hare');
    if (terrainKind === 'maple' && n > 0.36) return n > 0.66 ? 'mapleFox' : (n > 0.52 ? 'deer' : 'hare');
    if (terrainKind === 'pine' && n > 0.42) return n > 0.72 ? 'pineLynx' : (n > 0.56 ? 'wolf' : 'deer');
    if (terrainKind === 'jungle' && n > 0.42) return n > 0.82 ? 'vineStalker' : (n > 0.54 ? 'jungleSnake' : (n > 0.48 ? 'boar' : 'bee'));
    if ((terrainKind === 'grass' || terrainKind === 'shore') && n > 0.84) return n > 0.94 ? 'bat' : 'slime';
    if (terrainKind === 'reedWetland' && n > 0.46) return 'reedCrab';
    if ((terrainKind === 'swamp' || terrainKind === 'mud' || terrainKind === 'shore') && n > 0.48) return terrainKind === 'shore' ? 'frog' : (n > 0.72 ? 'swampMireling' : 'frog');
    if (terrainKind === 'dry' && n > 0.46) return n > 0.72 ? 'drySandWasp' : 'scorpion';
    if (terrainKind === 'forest' && n > 0.56) return n > 0.8 ? 'forestBear' : 'boar';
    if (terrainKind === 'bamboo' && n > 0.54) return n > 0.78 ? 'bambooPanda' : 'boar';
    if ((terrainKind === 'pine' || terrainKind === 'maple' || terrainKind === 'birch') && n > 0.66) return n > 0.84 ? 'wolf' : 'boar';
    if (terrainKind === 'mine' && n > 0.64) return n > 0.82 ? 'mineCrystalBat' : (n > 0.74 ? 'golem' : 'bat');
    if (terrainKind === 'ruins' && n > 0.64) return n > 0.82 ? 'ruinsBoneGuard' : (n > 0.74 ? 'golem' : 'bat');
    return '';
}

function dangerLevelAt(x, y) {
    return 1;
}

function canSpawnEnemyAt(kind, x, y, existing = []) {
    const terrain = terrainInfoAt(x, y);
    if (terrain.kind === 'water' && kind !== 'bat') return false;
    if (terrain.kind === 'village') return false;
    if (villageRegionWeight(x, y) > 0.18) return false;
    if (kind === 'golem' && !['mine', 'ruins'].includes(terrain.kind)) return false;
    if (isPoorSwimmer(kind) && kind !== 'golem' && isNearWater(x, y, 72)) return false;
    if (kind === 'scorpion' && (terrain.kind !== 'dry' || isNearWater(x, y, 180))) return false;
    if (kind === 'frog' && !['swamp', 'mud', 'shore', 'jungle'].includes(terrain.kind)) return false;
    if (kind === 'boar' && !['forest', 'bamboo', 'jungle', 'grass', 'shore'].includes(terrain.kind)) return false;
    if (kind === 'wolf' && !['tallgrass', 'forest', 'bamboo', 'jungle', 'grass'].includes(terrain.kind)) return false;
    if (kind === 'bat' && !['mine', 'ruins', 'forest', 'shore', 'grass'].includes(terrain.kind)) return false;
    if (kind === 'bee' && !['meadow', 'jungle'].includes(terrain.kind)) return false;
    if (kind === 'hare' && !['meadow', 'birch', 'maple', 'grass'].includes(terrain.kind)) return false;
    if (kind === 'deer' && !['birch', 'maple', 'pine', 'forest'].includes(terrain.kind)) return false;
    if (kind === 'shade' && terrain.kind !== 'darkForest') return false;
    if (kind === 'jungleSnake' && terrain.kind !== 'jungle') return false;
    if (kind === 'vineStalker' && terrain.kind !== 'jungle') return false;
    if (BIOME_MONSTER_TERRAIN[kind] && !BIOME_MONSTER_TERRAIN[kind].includes(terrain.kind)) return false;
    const localSame = existing.filter(enemyItem => enemyItem.hp > 0 && enemyItem.kind === kind && distance(enemyItem, { x, y }) < 520).length;
    const speciesCap = BIOME_MONSTER_TERRAIN[kind] ? 4 : (kind === 'vineStalker' ? 3 : (kind === 'jungleSnake' ? 5 : (kind === 'wolf' ? 4 : (kind === 'scorpion' ? 5 : (kind === 'bat' ? 10 : 6)))));
    return localSame < speciesCap;
}

function isNearWater(x, y, radius) {
    return terrainInfoAt(x, y).kind === 'water'
        || terrainInfoAt(x + radius, y).kind === 'water'
        || terrainInfoAt(x - radius, y).kind === 'water'
        || terrainInfoAt(x, y + radius).kind === 'water'
        || terrainInfoAt(x, y - radius).kind === 'water';
}

function isPoorSwimmer(kind) {
    return ['boar', 'wolf', 'scorpion', 'golem'].includes(kind);
}

function createWolfPackStates() {
    return {
        north: wolfPackState(4520, 980, 0),
        south: wolfPackState(950, 3300, 1.7),
        east: wolfPackState(5380, 2050, 3.4),
    };
}

function wolfPackState(x, y, phase) {
    return { homeX: x, homeY: y, roamX: x, roamY: y, phase, alertedUntil: 0, nextBiteAt: 0 };
}

function createWolfPacks() {
    return [
        ...createWolfPack('north', 4520, 980, '领头荒狼'),
        ...createWolfPack('south', 950, 3300, '南林头狼'),
        ...createWolfPack('east', 5380, 2050, '东岭头狼'),
    ];
}

function createWolfPack(packId, x, y, leaderName) {
    const pack = [
        enemy('wolf', leaderName, x, y, 21, 30, 5, 178, 72, { hide: 1, meat: 1, fang: 2 }, 1),
        enemy('wolf', '荒狼', x - 60, y + 60, 20, 24, 4, 170, 62, { hide: 1, meat: 1, fang: 2 }, 1),
        enemy('wolf', '荒狼', x + 90, y + 70, 20, 24, 4, 170, 62, { hide: 1, meat: 1, fang: 2 }, 1),
        enemy('wolf', '荒狼', x + 20, y + 150, 20, 24, 4, 170, 62, { hide: 1, meat: 1, fang: 2 }, 1),
    ];
    ['leader', 'left', 'right', 'rear'].forEach((role, index) => {
        pack[index].packId = packId;
        pack[index].packRole = role;
        pack[index].circleSide = role === 'left' ? -1 : 1;
    });
    return pack;
}

function createDecorations() {
    const items = [];
    const add = (kind, x, y, scale = 1) => items.push({ kind, x, y, scale });
    [
        [190, 420], [310, 590], [690, 420], [940, 520], [1230, 240], [1360, 690],
        [1510, 1210], [1860, 700], [2170, 650], [2250, 1180],
    ].forEach(([x, y], index) => add(index % 2 ? 'flowers' : 'tuft', x, y, 1 + (index % 3) * 0.15));
    [
        [1120, 1010], [1300, 910], [1660, 1190], [1910, 1040], [2040, 790],
    ].forEach(([x, y], index) => add(index % 2 ? 'pebbles' : 'crack', x, y, 1));
    return items;
}

function createVillageTasks() {
    return {
        blacksmith: { status: 'new', title: '修补守卫武备', need: { ore: 4, coal: 2 }, reward: { simpleArrow: 16, stoneSpear: 1 }, reputation: 1.4 },
        apothecary: { status: 'new', title: '夜巡伤药储备', need: { herb: 5, honey: 1 }, reward: { potion: 1, antidote: 1, bandage: 2 }, reputation: 1.2 },
        kitchen: { status: 'new', title: '巡夜热食', need: { meat: 2, mushroom: 2, coal: 1 }, reward: { roastMeat: 2, stew: 1 }, reputation: 1.1 },
        guard: { status: 'new', title: '加固村口防线', need: { bamboo: 4, fiber: 4, ore: 1 }, reward: { simpleArrow: 12, bandage: 1, bambooTrap: 1 }, reputation: 1.4 },
        elder: { status: 'new', title: '安抚村民的仪式', need: { flower: 4, crystal: 1, shadowShard: 1 }, reward: { antlerHorn: 1, copperCoin: 8 }, reputation: 2 },
        cultPriest: { status: 'new', title: '绿母毒谱补页', need: { toxicMushroom: 2, jungleLeaf: 4, vine: 3 }, reward: { poisonVial: 2, antidote: 1 }, reputation: 1.4 },
        cultHerbalist: { status: 'new', title: '安抚受控丛林兽', need: { jungleFruit: 4, vine: 4, venom: 1 }, reward: { jungleLeaf: 4, poisonVial: 1 }, reputation: 1.5 },
        cultHealer: { status: 'new', title: '补充疗藤药材', need: { herb: 4, jungleLeaf: 4, vine: 3 }, reward: { salve: 2, bandage: 2 }, reputation: 1.3 },
        cultHunter: { status: 'new', title: '补齐蛇纹毒箭', need: { simpleArrow: 6, venom: 2, fiber: 3 }, reward: { poisonArrow: 8, fang: 1 }, reputation: 1.3 },
        cultGuard: { status: 'new', title: '修缮根盾木甲', need: { buttressWood: 3, vine: 4, bamboo: 4 }, reward: { bambooTrap: 2, bandage: 2 }, reputation: 1.3 },
        cultVillager: { status: 'new', title: '准备绿母祭品', need: { jungleFruit: 5, jungleLeaf: 5, herb: 2 }, reward: { copperCoin: 5, salve: 1 }, reputation: 1.1 },
    };
}

function nextVillageTask(role, completed = 0) {
    const pools = {
        blacksmith: [
            { title: '打造巡逻箭簇', need: { ore: 3, coal: 1 }, reward: { simpleArrow: 14, copperCoin: 4 }, reputation: 1 },
            { title: '修补铁砧裂纹', need: { ore: 5, stone: 4 }, reward: { stoneSpear: 1, ironSkinPotion: 1 }, reputation: 1.5 },
            { title: '备战铁堡订单', need: { coal: 3, ore: 6 }, reward: { simpleArrow: 24, copperCoin: 10 }, reputation: 1.8 },
        ],
        apothecary: [
            { title: '补齐基础草药', need: { herb: 4, flower: 2 }, reward: { potion: 1, bandage: 2 }, reputation: 1 },
            { title: '调制解毒药', need: { herb: 3, toxicMushroom: 1, lotus: 1 }, reward: { antidote: 2, honeySalve: 1 }, reputation: 1.4 },
            { title: '夜巡再生药', need: { lotus: 2, slimeGel: 1, honey: 1 }, reward: { regenPotion: 1, copperCoin: 6 }, reputation: 1.8 },
        ],
        kitchen: [
            { title: '巡夜肉汤', need: { meat: 2, mushroom: 2 }, reward: { stew: 2 }, reputation: 1 },
            { title: '给守卫做干粮', need: { meat: 3, coal: 2 }, reward: { roastMeat: 3, copperCoin: 4 }, reputation: 1.3 },
            { title: '甜味补给', need: { honey: 1, sap: 2, berry: 2 }, reward: { mapleSnack: 2, honeyRoastMeat: 1 }, reputation: 1.7 },
        ],
        guard: [
            { title: '修补门口陷阱', need: { bamboo: 4, fiber: 3 }, reward: { bambooTrap: 1, simpleArrow: 8 }, reputation: 1 },
            { title: '巡逻箭袋', need: { fiber: 5, ore: 2 }, reward: { simpleArrow: 18, bandage: 1 }, reputation: 1.5 },
            { title: '清夜备战', need: { crystal: 1, bandage: 2, coal: 2 }, reward: { ironSkinPotion: 1, copperCoin: 8 }, reputation: 2 },
        ],
        elder: [
            { title: '村民安神花束', need: { flower: 4, herb: 2 }, reward: { copperCoin: 6, bandage: 2 }, reputation: 1.2 },
            { title: '修补村旗仪式', need: { flower: 3, fiber: 4, crystal: 1 }, reward: { antlerHorn: 1 }, reputation: 1.8 },
            { title: '驱散暗影传闻', need: { shadowShard: 2, crystal: 1, flower: 4 }, reward: { shadowLantern: 1, copperCoin: 12 }, reputation: 2.4 },
        ],
        cultPriest: [
            { title: '抄写神经毒谱', need: { toxicMushroom: 3, venom: 2, jungleLeaf: 4 }, reward: { poisonVial: 3, antidote: 1 }, reputation: 1.5 },
            { title: '清点绿母祭瓶', need: { herb: 4, vine: 4, jungleFruit: 2 }, reward: { potion: 1, poisonArrow: 4 }, reputation: 1.2 },
            { title: '调和虚弱毒引', need: { toxicMushroom: 2, flower: 2, venom: 2 }, reward: { poisonVial: 2, copperCoin: 6 }, reputation: 1.8 },
        ],
        cultHerbalist: [
            { title: '编织控兽藤环', need: { vine: 6, jungleLeaf: 4, fang: 1 }, reward: { poisonVial: 1, jungleFruit: 3 }, reputation: 1.4 },
            { title: '喂养丛林蛇群', need: { meat: 2, jungleFruit: 4, venom: 1 }, reward: { fang: 2, herb: 3 }, reputation: 1.6 },
            { title: '修补怪物图谱', need: { jungleLeaf: 6, toxicMushroom: 2, buttressWood: 1 }, reward: { antidote: 1, copperCoin: 7 }, reputation: 1.7 },
        ],
        cultHealer: [
            { title: '调制疗藤汁液', need: { herb: 5, jungleLeaf: 5, vine: 3 }, reward: { salve: 2, copperCoin: 4 }, reputation: 1.2 },
            { title: '缠伤藤带储备', need: { fiber: 4, vine: 5, jungleFruit: 2 }, reward: { bandage: 4, jungleLeaf: 2 }, reputation: 1.4 },
            { title: '安抚受伤教兽', need: { herb: 4, fang: 1, jungleFruit: 4 }, reward: { potion: 1, salve: 2 }, reputation: 1.7 },
        ],
        cultHunter: [
            { title: '削制毒吹箭', need: { simpleArrow: 8, venom: 2, fiber: 3 }, reward: { poisonArrow: 10 }, reputation: 1.2 },
            { title: '制作蛇纹矛尖', need: { fang: 2, stone: 4, vine: 3 }, reward: { stoneSpear: 1, poisonVial: 1 }, reputation: 1.5 },
            { title: '巡林猎手补给', need: { jungleFruit: 3, bandage: 2, poisonArrow: 4 }, reward: { copperCoin: 8, simpleArrow: 12 }, reputation: 1.8 },
        ],
        cultGuard: [
            { title: '加固树根岗哨', need: { buttressWood: 4, vine: 5 }, reward: { bambooTrap: 2, bandage: 2 }, reputation: 1.3 },
            { title: '修补木甲束带', need: { bamboo: 5, fiber: 4, jungleLeaf: 3 }, reward: { salve: 1, copperCoin: 6 }, reputation: 1.5 },
            { title: '布置根墙陷阱', need: { bambooTrap: 1, vine: 6, toxicMushroom: 1 }, reward: { poisonArrow: 6, bandage: 3 }, reputation: 1.8 },
        ],
        cultVillager: [
            { title: '采集绿母祭果', need: { jungleFruit: 6, jungleLeaf: 4 }, reward: { copperCoin: 5, salve: 1 }, reputation: 1.1 },
            { title: '补缀藤蔓长屋', need: { vine: 6, buttressWood: 2, fiber: 3 }, reward: { jungleFruit: 3, bandage: 2 }, reputation: 1.4 },
            { title: '准备夜祭篮', need: { herb: 3, toxicMushroom: 1, flower: 2 }, reward: { poisonVial: 1, copperCoin: 6 }, reputation: 1.6 },
        ],
    };
    const list = pools[role] || [];
    const template = list[completed % list.length];
    return template ? { ...template, need: { ...template.need }, reward: { ...template.reward }, status: 'new' } : null;
}


function createSpawnDens() {
    const dens = [];
    const biomeDenCaps = Object.fromEntries(Object.keys(BIOME_MONSTER_TERRAIN).map(kind => [kind, 7]));
    const caps = { frog: 12, scorpion: 12, bat: 16, wolf: 8, slime: 10, bee: 10, shade: 8, jungleSnake: 10, vineStalker: 6, ...biomeDenCaps };
    const counts = Object.fromEntries(Object.keys(caps).map(kind => [kind, 0]));
    const add = (kind, x, y) => {
        if (counts[kind] >= caps[kind]) return;
        if (!canDenExistAt(kind, x, y)) return;
        if (dens.some(den => distance(den, { x, y }) < 460)) return;
        dens.push({ kind, x, y, radius: 34, nextSpawnAt: 0 });
        counts[kind]++;
    };
    for (let y = 260; y < WORLD.height - 220; y += 240) {
        for (let x = 260; x < WORLD.width - 220; x += 260) {
            const px = x + (hash2(x * 0.019, y * 0.019) - 0.5) * 140;
            const py = y + (hash2(x * 0.017 + 5, y * 0.017 - 7) - 0.5) * 140;
            const terrain = terrainInfoAt(px, py).kind;
            const n = valueNoise(px * 0.006 + 21, py * 0.006 - 12);
            const biomeKind = chooseBiomeDenKind(terrain, n);
            if (biomeKind) add(biomeKind, px, py);
            else if ((terrain === 'swamp' || terrain === 'mud' || terrain === 'shore') && n > 0.54) add('frog', px, py);
            else if (terrain === 'dry' && n > 0.54) add('scorpion', px, py);
            else if ((terrain === 'mine' || terrain === 'ruins') && n > 0.4) add('bat', px, py);
            else if ((terrain === 'tallgrass' || terrain === 'forest') && n > 0.64) add('wolf', px, py);
            else if ((terrain === 'grass' || terrain === 'shore') && n > 0.7) add('slime', px, py);
            else if (terrain === 'meadow' && n > 0.34) add('bee', px, py);
            else if (terrain === 'darkForest' && n > 0.34) add('shade', px, py);
            else if (terrain === 'jungle' && n > 0.38) add(n > 0.74 ? 'vineStalker' : 'jungleSnake', px, py);
        }
    }
    return dens;
}

function chooseBiomeDenKind(terrain, n) {
    if (terrain === 'grass' && n > 0.58) return 'grassRunner';
    if (terrain === 'tallgrass' && n > 0.46) return 'tallgrassRaptor';
    if (terrain === 'meadow' && n > 0.4) return 'meadowMoth';
    if (terrain === 'forest' && n > 0.5) return 'forestBear';
    if (terrain === 'bamboo' && n > 0.48) return 'bambooPanda';
    if (terrain === 'birch' && n > 0.42) return 'birchStag';
    if (terrain === 'pine' && n > 0.4) return 'pineLynx';
    if (terrain === 'maple' && n > 0.42) return 'mapleFox';
    if (terrain === 'reedWetland' && n > 0.4) return 'reedCrab';
    if ((terrain === 'swamp' || terrain === 'mud') && n > 0.44) return 'swampMireling';
    if (terrain === 'dry' && n > 0.44) return 'drySandWasp';
    if (terrain === 'mine' && n > 0.4) return 'mineCrystalBat';
    if (terrain === 'ruins' && n > 0.4) return 'ruinsBoneGuard';
    return '';
}

function canDenExistAt(kind, x, y) {
    if (villageRegionWeight(x, y) > 0.12) return false;
    const terrain = terrainInfoAt(x, y).kind;
    if (terrain === 'water') return false;
    if (kind === 'frog') return ['swamp', 'mud', 'shore'].includes(terrain);
    if (kind === 'scorpion') return terrain === 'dry' && !isNearWater(x, y, 180);
    if (kind === 'bat') return terrain === 'mine' || terrain === 'ruins';
    if (kind === 'wolf') return terrain === 'tallgrass' || terrain === 'forest';
    if (kind === 'slime') return terrain === 'grass' || terrain === 'shore';
    if (kind === 'bee') return terrain === 'meadow';
    if (kind === 'jungleSnake') return terrain === 'jungle';
    if (kind === 'vineStalker') return terrain === 'jungle';
    if (kind === 'shade') return terrain === 'darkForest';
    if (BIOME_MONSTER_TERRAIN[kind]) return BIOME_MONSTER_TERRAIN[kind].includes(terrain);
    return false;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
}

function screenToWorld(x, y) {
    return { x: x + camera.x, y: y + camera.y };
}

function currentAimDir() {
    const p = state.player;
    const playerScreenX = worldX(p.x);
    const playerScreenY = worldY(p.y);
    const dx = mouse.x - playerScreenX;
    const dy = mouse.y - playerScreenY;
    return Math.hypot(dx, dy) > 18 ? normalize(dx, dy) : p.facing;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
}

function triggerPlayerDeath(message = '你倒下了。') {
    if (!state.lose) {
        state.lose = true;
        state.deathStartedAt = performance.now();
        state.deathMessage = message;
        state.deathAdvice = deathAdviceForMessage(message);
        state.player.attackUntil = 0;
        state.player.usingItem = null;
        state.player.rangedAim = null;
        state.player.throwableAim = null;
        spawnBurst(state.player.x, state.player.y, '#ff6b6b', 18, 180, state.player.radius * 0.75);
    }
    showToast(message);
}

function deathAdviceForMessage(message) {
    if (message.includes('神经毒')) return '建议：准备毒抗药水/解毒药，优先躲开绿母祭司的特殊毒瓶。';
    if (message.includes('毒')) return '建议：携带解毒药或毒抗药水，穿泥沼护甲可缩短中毒时间。';
    if (message.includes('饥饿')) return '建议：出发前带烤肉、炖汤或浆果，饥饿低时不要长途冲刺。';
    if (message.includes('爆炸')) return '建议：投掷煤火弹后立刻后撤，避免在狭窄室内引爆。';
    if (message.includes('村民') || message.includes('驱逐')) return '建议：不要翻村民箱子或攻击村民；若声誉低，先完成任务恢复关系。';
    if (message.includes('药师')) return '建议：和药师保持距离，看到落点圈后横向移动。';
    if (message.includes('石像') || message.includes('守门')) return '建议：先准备铁甲/盾牌和药水，等石像攻击后再反击。';
    return '建议：升级护甲和武器，带足药水/食物，观察敌人攻击前摇再接近。';
}

function closeInventoryOnPlayerHit() {
    if (!state.inventoryOpen) return;
    state.inventoryOpen = false;
    state.openChest = null;
    state.openIndoorContainer = null;
    state.activeTrader = null;
    state.pendingTrader = null;
    updateInventoryOverlay();
    updateVillagerTradeButton();
    showToast('受到攻击，背包已关闭！');
}

function update(dt, now) {
    if (!state.win && !state.lose) {
        updateItemUse(now);
        updatePlayer(dt, now);
        updatePendingVillagerEntries(now);
        updateAllVillagerHomeHealing(dt, now);
        updateIndoorNpcs(dt, now);
        updateIndoorProjectiles(dt, now);
        if (state.indoor) {
            updateOutdoorWorldWhileIndoor(dt, now);
        } else {
            updateHarvestHold(dt);
            updateBambooTraps(now);
            updateProjectiles(dt, now);
            updateEnemies(dt, now);
            updateOutdoorVillagers(dt, now);
            updateDynamicSpawns(now);
        }
        updateQuest();
    }
    updateParticles(dt);
    updateFloatTexts(dt);
    state.cameraShake = Math.max(0, state.cameraShake - dt * 36);
    state.timeOfDay = (state.timeOfDay + dt / state.dayLength) % 1;
    updateTimeLabel();
    updateCamera();
    render(now);
    requestAnimationFrame(loop);
}

function updateTimeLabel() {
    const label = document.getElementById('time-label');
    if (label) label.textContent = nightAmount() > 0.2 ? '黑夜' : '白天';
}

function updatePlayer(dt, now) {
    const p = state.player;
    updateHunger(dt, now);
    if (state.lose) return;
    updatePoison(dt, now);
    updateCultToxins(dt, now);
    updatePotionEffects(now);
    if (!state.indoor) updateCampHealing(dt, now);
    if (Math.abs(p.knockX) > 1 || Math.abs(p.knockY) > 1) {
        if (state.indoor) moveIndoorPlayer(p, p.knockX * dt, p.knockY * dt);
        else moveCircle(p, p.knockX * dt, p.knockY * dt);
        p.knockX *= Math.pow(0.025, dt);
        p.knockY *= Math.pow(0.025, dt);
    }
    let dx = 0;
    let dy = 0;
    if (keys.has('w') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('s') || keys.has('ArrowDown')) dy += 1;
    if (keys.has('a') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('d') || keys.has('ArrowRight')) dx += 1;
    dx += touchInput.moveX;
    dy += touchInput.moveY;

    if (dx || dy) {
        const dir = normalize(dx, dy);
        if (now < p.dizzyUntil) {
            dx = 0;
            dy = 0;
        }
    }

    if (dx || dy) {
        const dir = normalize(dx, dy);
        const hungerFactor = hungerMoveFactor();
        const sprinting = keys.has('Shift') && p.stamina > 0 && p.hunger > 12;
        const terrain = state.indoor ? { kind: 'indoor' } : terrainInfoAt(p.x, p.y);
        const inWater = terrain.kind === 'water';
        const inMud = terrain.kind === 'mud';
        const inBamboo = terrain.kind === 'bamboo';
        const inJungle = terrain.kind === 'jungle';
        const boost = performance.now() < p.speedBoostUntil ? (p.speedBoostPower || 1.32) : 1;
        p.blocking = isBlocking();
        const blockSlow = p.blocking ? 0.62 : 1;
        const armorMudSlow = inMud && (state.equipment.armor === '铁甲' || state.equipment.armor === '魔晶甲') ? 0.76 : 1;
        const aimSlow = isAimingDirectRanged() ? 0.48 : 1;
        const slowFactor = now < (p.slowUntil || 0) ? 0.5 : 1;
        const terrainSlow = now < (p.jumpPotionUntil || 0) ? 0.82 : 0.58;
        const speed = p.speed * boost * slowFactor * blockSlow * hungerFactor * aimSlow * (sprinting ? 1.55 : 1) * (inWater ? terrainSlow : 1) * (inMud ? terrainSlow : 1) * (inBamboo ? 0.9 : 1) * (inJungle ? 0.84 : 1) * armorMudSlow;
        p.facing = dir;
        if (state.indoor) moveIndoorPlayer(p, dir.x * speed * dt, dir.y * speed * dt);
        else moveCircle(p, dir.x * speed * dt, dir.y * speed * dt);
        if (inWater) {
            const current = waterCurrentAt(p.x, p.y);
            moveCircle(p, current.x * dt, current.y * dt);
            spawnWaterRipple(p.x, p.y + 12);
        }
        const sprintCost = inMud ? -56 : -38;
        p.stamina = clamp(p.stamina + (sprinting ? sprintCost : 24 * hungerStaminaFactor()) * dt, 0, 100);
    } else {
        p.blocking = isBlocking();
        if (!state.indoor && terrainInfoAt(p.x, p.y).kind === 'water') {
            const current = waterCurrentAt(p.x, p.y);
            moveCircle(p, current.x * 0.55 * dt, current.y * 0.55 * dt);
            spawnWaterRipple(p.x, p.y + 12);
        }
        p.stamina = clamp(p.stamina + 30 * hungerStaminaFactor() * dt, 0, 100);
    }

    p.attackDir = currentAimDir();
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (isAimingThrowable() || isAimingDirectRanged()) return;
    if (now < p.dizzyUntil) return;
    if (p.meleeCharge) return;
    if ((mouse.down || keys.has(' ')) && p.attackCooldown <= 0) {
        attack(now);
    } else if (p.attackQueuedUntil > now && p.attackCooldown <= 0) {
        p.attackQueuedUntil = 0;
        attack(now);
    }
}

function updatePotionEffects(now) {
    const p = state.player;
    if (p.regenUntil <= now || now < p.regenTickAt) return;
    p.regenTickAt = now + 1200;
    p.hp = Math.min(p.maxHp, p.hp + 3);
    addFloatText('+3', p.x, p.y - 50, '#9cffb7');
    renderHud();
}

function updateCampHealing(dt, now) {
    const p = state.player;
    if (!state.camp.repaired || p.hp >= p.maxHp) return;
    if (distance(p, state.camp) > state.camp.radius + 115) return;
    p.hp = Math.min(p.maxHp, p.hp + 2.2 * dt);
    if (!p.campHealTextAt || now >= p.campHealTextAt) {
        p.campHealTextAt = now + 1600;
        addFloatText('+营火', p.x, p.y - 54, '#ffd166');
        renderHud();
    }
}

function updateVillageHostility() {
    if (!state.village) return;
    for (const village of allVillages().filter(item => villageReputation(item) <= -3)) {
    if (!village.hostile) {
        village.hostile = true;
        showToast(`${village.tier === 'basic' ? '低级村庄' : '高级村庄'}声誉太低，本村开始驱逐你！`);
    }
    for (const building of village.buildings) {
        building.interiorObjects ||= createIndoorObjects(building.kind, building);
        for (const npc of building.interiorObjects.filter(object => object.kind === 'npc' && object.hp > 0)) {
            setVillagerPlayerAggro(npc);
        }
    }
    for (const npc of state.outdoorVillagers.filter(object => object.kind !== 'totem' && object.hp > 0 && homeVillageFor(object) === village)) {
        setVillagerPlayerAggro(npc);
    }
    }
}

function updateIndoorNpcs(dt, now) {
    if (!state.indoor) return;
    updateVillageHostility();
    for (const npc of state.indoor.objects.filter(object => object.kind === 'npc' && !object.outside)) {
        if ((npc.hp ?? 80) <= 0) continue;
        updateVillagerStatusEffects(npc, dt, now);
        if ((npc.hp ?? 80) <= 0) continue;
        if ((npc.rootedUntil || 0) > now) continue;
        if (npc.role === 'basicElder' && npc.playerAggro && npc.hp < npc.maxHp * 0.35) {
            basicElderExitAndCallForHelp(npc, dt, now);
            continue;
        }
        if (npc.fleeingToGuard || (npc.role !== 'guard' && npc.role !== 'basicElder' && npc.playerAggro && npc.hp < npc.maxHp * 0.3 && !isNpcInGuardHouse(npc))) {
            fleeToGuardHouseFromIndoor(npc, dt);
            continue;
        }
        if (!npc.playerAggro && !npc.animalAggressor && moveIndoorVillagerAwayFromDoor(npc, dt)) continue;
        if (updateCultHealerSupport(npc, dt, now)) continue;
        if (npc.role === 'guard' && nightAmount() > 0.12 && !npc.outside && !npc.playerAggro) {
            npc.mood = 'annoyed';
        }
        if (npc.mood === 'angry') {
            updateAngryIndoorNpc(npc, dt, now);
            continue;
        }
        const nearPlayer = Math.hypot(state.player.x - npc.x, state.player.y - npc.y) < 120;
        if (nearPlayer) {
            npc.facing = state.player.x >= npc.x ? 1 : -1;
            continue;
        }
        if (!npc.targetX || now > npc.nextWanderAt) {
            setVillagerWorkState(npc, now, false);
            npc.targetX = 245 + hash2(now * 0.001, npc.homeY) * (VIEW.width - 490);
            npc.targetY = 205 + hash2(npc.homeX, now * 0.001) * (VIEW.height - 390);
            npc.nextWanderAt = now + 2200 + hash2(npc.targetX, npc.targetY) * 2600;
        }
        const dx = npc.targetX - npc.x;
        const dy = npc.targetY - npc.y;
        const dist = Math.hypot(dx, dy);
            if (dist > 3) {
            moveIndoorNpcSafely(npc, (dx / dist) * 34 * dt, (dy / dist) * 34 * dt);
            npc.facing = dx >= 0 ? 1 : -1;
        }
    }
    updateVillageTotems(dt, now);
}

function updateAngryIndoorNpc(npc, dt, now) {
    const p = state.player;
    escapeIndoorCollision(npc);
    updateBlacksmithFatigue(npc, dt, now);
    updateVillagerPendingAttack(npc, now);
    if (updateVillagerFleeHeal(npc, dt, now)) return;
    const dx = p.x - npc.x;
    const dy = p.y - npc.y;
    const dist = Math.hypot(dx, dy) || 1;
    const chase = normalize(dx, dy);
    npc.facing = dx >= 0 ? 1 : -1;
    const profile = villagerAttackProfile(npc, dist);
    if (npc.role === 'guard' && updateVillagerFleeHeal(npc, dt, now)) return;
    if (npc.role === 'guard' && dist <= profile.range && villagerCanAttack(npc, now)) {
        startVillagerMeleeAttack(npc, profile, now);
        return;
    }
    if (updateVillagerEvasion(npc, dt, now, dist)) return;
    if (npc.role === 'elder' && !activeVillageTotem() && villagerCanAttack(npc, now)) {
        summonVillageTotem(npc, now);
        return;
    }
    if (npc.role === 'elder' && activeVillageTotem()) {
        updateElderBackline(npc, dt, now, dist);
        return;
    }
    if (npc.role === 'cultHerbalist' && villagerCanAttack(npc, now)) {
        commandJungleMonsters(npc, now);
        return;
    }
    if (npc.role === 'cultHealer' && npc.playerAggro && dist < 235 && villagerCanAttack(npc, now)) {
        castCultHealerVines(npc, now);
        return;
    }
    if (['apothecary', 'cultPriest'].includes(npc.role) && dist < 230 && villagerCanAttack(npc, now)) {
        throwPoisonBottle(npc, now);
    }
    if (['apothecary', 'cultPriest', 'cultHerbalist', 'cultHealer'].includes(npc.role) && updateRangedVillagerSpacing(npc, dt, now, dist, 155, 235)) {
        return;
    }
    if (npc.role === 'elder' && dist < profile.range && villagerCanAttack(npc, now)) {
        startVillagerMeleeAttack(npc, profile, now);
        return;
    }
    if (npc.role === 'elder' && dist < 190 && villagerCanAttack(npc, now)) {
        castElderSpell(npc, now);
        return;
    }
    if (npc.role === 'kitchen' && !npc.knifeThrown && npc.hp < 10 && dist < 190 && villagerCanAttack(npc, now)) {
        throwKitchenKnife(npc, now);
        return;
    }
    if (!['apothecary', 'elder', 'cultPriest', 'cultHerbalist', 'cultHealer'].includes(npc.role) || dist > profile.range + 18) {
        const speed = ['blacksmith', 'kitchen'].includes(npc.role) ? 126 : 92;
        moveIndoorNpcSafely(npc, chase.x * speed * dt, chase.y * speed * dt);
    }
    if (!['apothecary', 'elder', 'cultPriest', 'cultHerbalist', 'cultHealer'].includes(npc.role) && dist < profile.range && villagerCanAttack(npc, now)) {
        startVillagerMeleeAttack(npc, profile, now);
    }
}

function fleeToGuardHouseFromIndoor(npc, dt) {
    const guardHouse = nearestGuardHouseForVillager(npc);
    if (!guardHouse || !state.indoor) return;
    npc.fleeingToGuard = true;
    const door = { x: VIEW.width / 2, y: VIEW.height - 58 };
    const dir = normalize(door.x - npc.x, door.y - npc.y);
    moveIndoorNpcSafely(npc, dir.x * 190 * dt, dir.y * 190 * dt);
    npc.facing = dir.x >= 0 ? 1 : -1;
    if (canIndoorNpcExitAtDoor(npc)) {
        const oldBuilding = state.indoor.building;
        removeFromInteriorObjects(npc);
        npc.outside = true;
        npc.homeBuilding = guardHouse;
        npc.x = oldBuilding.doorX;
        npc.y = oldBuilding.doorY + 46;
        npc.returningHome = false;
        npc.fleeingToGuard = true;
        npc.targetX = guardHouse.doorX;
        npc.targetY = guardHouse.doorY;
        if (!state.outdoorVillagers.includes(npc)) state.outdoorVillagers.push(npc);
        showToast(`${npc.label}负伤逃向守卫石屋！`);
    }
}

function canIndoorNpcExitAtDoor(npc) {
    const door = { x: VIEW.width / 2, y: VIEW.height - 58, w: 132, h: 70 };
    return distanceToRect(npc, door) < indoorInteractionRange({ action: 'leave' })
        || (Math.abs(npc.x - VIEW.width / 2) < 86 && npc.y > VIEW.height - 190);
}

function basicElderExitAndCallForHelp(npc, dt, now) {
    basicElderCallVillageForHelp(npc, now);
    if (!state.indoor?.building) return;
    const door = { x: VIEW.width / 2, y: VIEW.height - 58 };
    const dir = normalize(door.x - npc.x, door.y - npc.y);
    moveIndoorNpcSafely(npc, dir.x * 170 * dt, dir.y * 170 * dt);
    npc.facing = dir.x >= 0 ? 1 : -1;
    npc.workState = '呼救';
    npc.workStateUntil = now + 1800;
    if (!canIndoorNpcExitAtDoor(npc)) return;
    const building = state.indoor.building;
    removeFromInteriorObjects(npc);
    npc.outside = true;
    npc.homeBuilding = building;
    npc.x = building.doorX;
    npc.y = building.doorY + 50;
    npc.returningHome = false;
    npc.fleeingToGuard = false;
    setOutdoorVillagerDoorExitTarget(npc, building);
    if (!state.outdoorVillagers.includes(npc)) state.outdoorVillagers.push(npc);
    showToast('低级村长负伤冲出屋子，大声呼唤本村村民！');
}

function basicElderCallVillageForHelp(npc, now = performance.now()) {
    if (now < (npc.nextHelpCallAt || 0)) return;
    npc.nextHelpCallAt = now + 2800;
    npc.calledHelp = true;
    const village = homeVillageFor(npc);
    if (!village) return;
    let count = 0;
    for (const building of village.buildings) {
        building.interiorObjects ||= createIndoorObjects(building.kind, building);
        for (const ally of building.interiorObjects.filter(object => object.kind === 'npc' && object !== npc && object.hp > 0)) {
            setVillagerPlayerAggro(ally);
            ally.returningHome = false;
            ally.fleeingToGuard = false;
            ally.workState = '保护村长';
            ally.workStateUntil = now + 3600;
            if (!ally.outside) scheduleVillagerExit(ally, building, now, 350 + count * 120, `${ally.label}听到村长呼救，冲出了屋子！`);
            count++;
        }
    }
    for (const ally of state.outdoorVillagers.filter(object => object.kind === 'npc' && object !== npc && object.hp > 0 && homeVillageFor(object) === village)) {
        setVillagerPlayerAggro(ally);
        ally.returningHome = false;
        ally.fleeingToGuard = false;
        ally.workState = '保护村长';
        ally.workStateUntil = now + 3600;
        count++;
    }
    if (count > 0) {
        spawnBurst(npc.x, npc.y - 32, '#ffd166', 12, 150, 20);
        addFloatText('呼救', npc.x, npc.y - 58, '#ffd166');
    }
}

function nearestGuardHouseForVillager(npc) {
    return (homeVillageFor(npc)?.buildings || [])
        .filter(building => isGuardBuilding(building))
        .sort((a, b) => distance(npc, a) - distance(npc, b))[0] || null;
}

function isGuardBuilding(building) {
    return building?.kind === 'guard' || building?.kind === 'guardFortress';
}

function isNpcInGuardHouse(npc) {
    return isGuardBuilding(npc.homeBuilding) && !npc.outside;
}

function updateRangedVillagerSpacing(npc, dt, now, dist, minRange, maxRange) {
    const away = normalize(npc.x - state.player.x, npc.y - state.player.y);
    npc.facing = state.player.x >= npc.x ? 1 : -1;
    if (moveRangedVillagerAwayFromTopFurniture(npc, dt)) return true;
    if (moveRangedVillagerOutOfCorner(npc, dt, now)) return true;
    if (moveRangedVillagerToWaypoint(npc, dt, now)) return true;
    if (['elder', 'apothecary'].includes(npc.role) && now >= (npc.nextKiteAt || 0) && dist >= minRange && dist <= maxRange) {
        setRangedVillagerWaypoint(npc, now);
    }
    if (dist < minRange) {
        if (!npc.spacingSide || now >= (npc.nextSpacingSideAt || 0)) {
            npc.spacingSide = hash2(npc.x, npc.y) > 0.5 ? 1 : -1;
            npc.nextSpacingSideAt = now + 1200;
        }
        const side = npc.spacingSide;
        const dir = normalize(away.x * 1.2 + -away.y * side * 0.55, away.y * 1.2 + away.x * side * 0.55);
        moveIndoorNpcSafely(npc, dir.x * 126 * dt, dir.y * 126 * dt);
        return true;
    }
    if (dist > maxRange) {
        moveIndoorNpcSafely(npc, -away.x * 52 * dt, -away.y * 52 * dt);
        return true;
    }
    return false;
}

function setRangedVillagerWaypoint(npc, now) {
    const behind = normalize(-(state.player.facing?.x || 1), -(state.player.facing?.y || 0));
    const fallback = normalize(npc.x - state.player.x, npc.y - state.player.y);
    const anchor = Math.hypot(behind.x, behind.y) > 0.1 ? behind : fallback;
    if (!npc.spacingSide || now >= (npc.nextSpacingSideAt || 0)) {
        npc.spacingSide = hash2(npc.x, npc.y + now * 0.0007) > 0.5 ? 1 : -1;
        npc.nextSpacingSideAt = now + 1600;
    }
    const side = npc.spacingSide;
    const distanceGoal = npc.role === 'elder' ? 190 : 176;
    const lateral = npc.role === 'elder' ? 92 : 76;
    npc.moveTargetX = clamp(state.player.x + anchor.x * distanceGoal + -anchor.y * side * lateral, 280, VIEW.width - 280);
    npc.moveTargetY = clamp(state.player.y + anchor.y * distanceGoal + anchor.x * side * lateral, 270, VIEW.height - 220);
    npc.moveTargetUntil = now + 1400;
    npc.nextKiteAt = now + (npc.role === 'elder' ? 1300 : 1500);
}

function moveRangedVillagerToWaypoint(npc, dt, now) {
    if (!npc.moveTargetUntil || now >= npc.moveTargetUntil) return false;
    const dx = npc.moveTargetX - npc.x;
    const dy = npc.moveTargetY - npc.y;
    if (Math.hypot(dx, dy) < 12) return false;
    const dir = normalize(dx, dy);
    moveIndoorNpcSafely(npc, dir.x * (npc.role === 'elder' ? 104 : 112) * dt, dir.y * (npc.role === 'elder' ? 104 : 112) * dt);
    return true;
}

function moveRangedVillagerAwayFromTopFurniture(npc, dt) {
    const topSafeY = 258;
    if (npc.y >= topSafeY) return false;
    const centerX = VIEW.width / 2;
    const dir = normalize((centerX - npc.x) * 0.18, 1);
    moveIndoorNpcSafely(npc, dir.x * 150 * dt, dir.y * 150 * dt);
    return true;
}

function moveRangedVillagerOutOfCorner(npc, dt, now) {
    const margin = 58;
    const left = 224 + margin;
    const right = VIEW.width - 224 - margin;
    const top = 258;
    const bottom = VIEW.height - 138 - margin;
    const nearX = npc.x < left || npc.x > right;
    const nearY = npc.y < top || npc.y > bottom;
    if (!nearX && !nearY && (npc.stuckTicks || 0) < 3) return false;
    const center = normalize(VIEW.width / 2 - npc.x, 300 - npc.y);
    if (!npc.cornerSide || now >= (npc.nextCornerSideAt || 0)) {
        npc.cornerSide = hash2(npc.x, npc.y) > 0.5 ? 1 : -1;
        npc.nextCornerSideAt = now + 1400;
    }
    const side = npc.cornerSide;
    const tangent = nearX ? { x: 0, y: side } : (nearY ? { x: side, y: 0 } : { x: -center.y * side, y: center.x * side });
    const dir = normalize(center.x * 0.85 + tangent.x * 0.65, center.y * 0.85 + tangent.y * 0.65);
    moveIndoorNpcSafely(npc, dir.x * 138 * dt, dir.y * 138 * dt);
    if ((npc.stuckTicks || 0) > 6) {
        npc.x = lerp(npc.x, VIEW.width / 2, 0.08);
        npc.y = lerp(npc.y, 300, 0.08);
        escapeIndoorCollision(npc);
        npc.stuckTicks = 0;
    }
    return true;
}

function updateVillagerEvasion(npc, dt, now, dist) {
    if (!playerAttackThreatensVillager(npc, now, dist)) return false;
    const dodgeReady = now >= (npc.nextDodgeAt || 0);
    if (!dodgeReady && now >= (npc.evadeUntil || 0)) return false;
    if (dodgeReady) {
        npc.nextDodgeAt = now + ({ elder: 520, apothecary: 760, kitchen: 880, blacksmith: 980 }[npc.role] || 1100);
        npc.evadeUntil = now + ({ elder: 430, apothecary: 340, kitchen: 300, blacksmith: 260 }[npc.role] || 240);
        npc.evadeDir = bestVillagerDodgeDirection(npc);
        npc.attackAnim = { startedAt: now, duration: 260, weapon: '闪避', style: 'evade' };
        addFloatText(npc.role === 'elder' ? '后撤' : '闪避', npc.x, npc.y - 52, '#d8e5f2');
    }
    const speed = { elder: 150, apothecary: 132, kitchen: 118, blacksmith: 104 }[npc.role] || 110;
    moveIndoorNpcSafely(npc, npc.evadeDir.x * speed * dt, npc.evadeDir.y * speed * dt);
    return true;
}

function playerAttackThreatensVillager(npc, now, dist) {
    if (state.player.attackUntil <= now) return false;
    if (dist > currentAttackProfile().range + npc.radius + 34) return false;
    const dir = state.player.attackDir || state.player.facing || { x: 1, y: 0 };
    const dx = npc.x - state.player.x;
    const dy = npc.y - state.player.y;
    const forward = dx * dir.x + dy * dir.y;
    const side = Math.abs(dx * -dir.y + dy * dir.x);
    return forward > -8 && forward < currentAttackProfile().range + npc.radius + 22 && side < npc.radius + 30;
}

function bestVillagerDodgeDirection(npc) {
    const fromPlayer = normalize(npc.x - state.player.x, npc.y - state.player.y);
    if (npc.role === 'elder') return fromPlayer;
    const side = hash2(npc.x, performance.now() * 0.001) > 0.5 ? 1 : -1;
    return normalize(fromPlayer.x * 0.55 + -fromPlayer.y * side, fromPlayer.y * 0.55 + fromPlayer.x * side);
}

function updateElderBackline(npc, dt, now, dist) {
    const away = normalize(npc.x - state.player.x, npc.y - state.player.y);
    npc.facing = state.player.x >= npc.x ? 1 : -1;
    const repositioning = moveRangedVillagerOutOfCorner(npc, dt, now) || updateRangedVillagerSpacing(npc, dt, now, dist, 165, 240);
    if (repositioning && dist < 220 && villagerCanAttack(npc, now)) {
        castElderSpell(npc, now);
        return true;
    }
    if (npc.hp < (npc.maxHp || 120) && now >= (npc.nextElderHealAt || 0)) {
        npc.nextElderHealAt = now + 1800;
        npc.hp = Math.min(npc.maxHp || 120, npc.hp + 6);
        npc.attackAnim = { startedAt: now, duration: 360, weapon: '图腾祝福', style: 'bless' };
        spawnBurst(npc.x, npc.y - 42, '#ffd166', 8, 110, 14);
        addFloatText('+6', npc.x, npc.y - 52, '#9cffb7');
    }
    if (dist < 180 && now >= (npc.nextCommandAt || 0)) {
        castElderCommand(npc, now);
        return true;
    }
    if (dist < 220 && villagerCanAttack(npc, now)) {
        castElderSpell(npc, now);
        return true;
    }
    return true;
}

function castElderCommand(npc, now) {
    npc.nextCommandAt = now + 5200;
    npc.nextAttackAt = Math.max(npc.nextAttackAt || 0, now + 900);
    npc.attackAnim = { startedAt: now, duration: 620, weapon: '村长号令', style: 'command' };
    npc.attackFlashUntil = now + 620;
    const radius = 86;
    const hit = distance(npc, state.player) <= radius + state.player.radius;
    spawnBurst(npc.x, npc.y - 34, '#ffd166', 22, 210, radius * 0.35);
    addFloatText('村长号令', npc.x, npc.y - 62, '#ffd166');
    if (hit) {
        const p = state.player;
        p.dizzyUntil = Math.max(p.dizzyUntil || 0, now + 850);
        p.stamina = Math.max(0, p.stamina - 30);
        const dir = normalize(p.x - npc.x, p.y - npc.y);
        applyPlayerSoftKnockback(dir, 90, 0.35);
        addFloatText('压制', p.x, p.y - 54, '#ffd166');
        showToast('村长号令压制了你，体力下降。');
    } else {
        showToast('村长发出号令，但你离开了范围。');
    }
}

function activeVillageTotem(npc = null) {
    if (npc?.outside) return state.outdoorVillagers.find(object => object.kind === 'totem' && object.hp > 0 && object.ownerRole === npc.role);
    return state.indoor?.objects.find(object => object.kind === 'totem' && object.hp > 0);
}

function removeFromInteriorObjects(entity) {
    for (const building of state.village?.buildings || []) {
        if (!building.interiorObjects) continue;
        building.interiorObjects = building.interiorObjects.filter(object => object !== entity);
    }
    if (state.indoor?.objects) state.indoor.objects = state.indoor.objects.filter(object => object !== entity);
}

function removeFromOutdoorVillagers(entity) {
    state.outdoorVillagers = state.outdoorVillagers.filter(object => object !== entity);
}

function removeExistingTotemsForOwner(npc) {
    state.outdoorVillagers = state.outdoorVillagers.filter(object => !(object.kind === 'totem' && object.owner === npc));
    for (const building of state.village?.buildings || []) {
        if (building.interiorObjects) building.interiorObjects = building.interiorObjects.filter(object => !(object.kind === 'totem' && object.owner === npc));
    }
    if (state.indoor?.objects) state.indoor.objects = state.indoor.objects.filter(object => !(object.kind === 'totem' && object.owner === npc));
}

function summonVillageTotem(npc, now) {
    const indoor = !npc.outside;
    const x = indoor ? clamp(npc.x + (npc.facing === -1 ? -86 : 86), 260, VIEW.width - 260) : clamp(npc.x + (npc.facing === -1 ? -86 : 86), 32, WORLD.width - 32);
    const y = indoor ? clamp(npc.y + 28, 230, VIEW.height - 210) : clamp(npc.y + 28, 32, WORLD.height - 32);
    const totem = { kind: 'totem', label: '村庄图腾', x, y, w: 34, h: 64, radius: 18, hp: 48, maxHp: 48, solid: false, action: 'totem', nextAttackAt: now + 1800, guardUntil: now + 1400, outside: npc.outside, ownerRole: npc.role, owner: npc };
    removeExistingTotemsForOwner(npc);
    if (indoor) {
        state.indoor.objects.push(totem);
    } else {
        state.outdoorVillagers.push(totem);
    }
    npc.nextAttackAt = now + 1800;
    npc.attackAnim = { startedAt: now, duration: 520, weapon: '召唤图腾', style: 'summon' };
    npc.attackFlashUntil = now + 520;
    spawnBurst(x, y - 24, '#ffd166', 18, 180, 24);
    showToast('村长召唤了村庄图腾！');
}

function updateVillageTotems(dt, now) {
    const totems = [
        ...(state.indoor ? state.indoor.objects.filter(object => object.kind === 'totem' && object.hp > 0) : []),
        ...(!state.indoor ? state.outdoorVillagers.filter(object => object.kind === 'totem' && object.hp > 0) : []),
    ];
    for (const totem of totems) {
        if (totem.outside) moveOutdoorVillager(totem, 0, 0);
        else escapeIndoorCollision(totem);
        const ownerThreatened = totem.owner && totem.owner.hp > 0 && (totem.owner.playerAggro || totem.owner.animalAggressor || totem.owner.hurtUntil > now);
        const totemTarget = totem.owner?.animalAggressor || (totem.owner?.playerAggro ? state.player : null);
        if (!totemTarget) continue;
        if (!ownerThreatened || now < (totem.guardUntil || 0)) continue;
        if (now < (totem.nextAttackAt || 0)) continue;
        totem.nextAttackAt = now + 1180;
        const profile = { weapon: '图腾灵光', damage: 5, force: 260, shake: 9, burst: 10, color: '#ffd166', duration: 380, cooldown: 1180, style: 'spell', effect: 'totem' };
        state.indoorProjectiles ||= [];
        state.indoorProjectiles.push({
            kind: 'totemBolt',
            x: totem.x,
            indoor: !totem.outside,
            y: totem.y - 42,
            startX: totem.x,
            startY: totem.y - 42,
            target: totemTarget,
            targetX: totemTarget.x,
            targetY: totemTarget.y - 12,
            startedAt: now,
            duration: 520,
            profile,
            splashRadius: state.player.radius + 16,
        });
        spawnBurst(totem.x, totem.y - 38, '#ffd166', 8, 110, 14);
    }
    if (state.indoor) state.indoor.objects = state.indoor.objects.filter(object => object.kind !== 'totem' || object.hp > 0);
    state.outdoorVillagers = state.outdoorVillagers.filter(object => object.kind !== 'totem' || object.hp > 0);
}

function updateOutdoorVillagers(dt, now) {
    if (!state.village) return;
    updateVillageHostility();
    updatePendingVillagerExits(now);
    updateVillageTotems(dt, now);
    maybeSendVillagersOutside(now);
    for (const npc of state.outdoorVillagers) {
        if (npc.hp <= 0) continue;
        updateVillagerStatusEffects(npc, dt, now);
        if (npc.hp <= 0) continue;
        if (Math.abs(npc.knockX || 0) > 1 || Math.abs(npc.knockY || 0) > 1) {
            moveOutdoorVillager(npc, (npc.knockX || 0) * dt, (npc.knockY || 0) * dt);
            npc.knockX *= Math.pow(0.04, dt);
            npc.knockY *= Math.pow(0.04, dt);
        }
        if ((npc.rootedUntil || 0) > now) {
            if (npc.hurtUntil && now > npc.hurtUntil) npc.hurtUntil = 0;
            continue;
        }
        const building = npc.homeBuilding;
        if (!building) continue;
        const village = building.village || state.village;
        if (updateCultHealerSupport(npc, dt, now)) continue;
        if (updateVineSpeakerAutoControl(npc, now)) continue;
        if (npc.role === 'basicElder' && npc.playerAggro && npc.hp < npc.maxHp * 0.35) {
            basicElderCallVillageForHelp(npc, now);
        }
        if (npc.pendingAttack) {
            updateVillagerPendingAttack(npc, now);
            continue;
        }
        if (npc.villagerAggressor && (npc.villagerAggressor.hp <= 0 || !npc.villagerAggressor.outside || homeVillageFor(npc.villagerAggressor) === village || distance(npc, npc.villagerAggressor) > 700)) {
            npc.villagerAggressor = null;
            if (!npc.playerAggro && !npc.animalAggressor) npc.mood = 'calm';
        }
        const rival = chooseRivalVillagerTarget(npc);
        if (rival) {
            updateVillagerRivalCombat(npc, rival, dt, now);
            continue;
        }
        if (npc.fleeingToGuard || (npc.role !== 'guard' && npc.role !== 'basicElder' && npc.playerAggro && npc.hp < npc.maxHp * 0.3)) {
            const guardHouse = nearestGuardHouseForVillager(npc);
            if (guardHouse) {
                npc.fleeingToGuard = true;
                const dir = normalize(guardHouse.doorX - npc.x, guardHouse.doorY - npc.y);
                moveOutdoorVillager(npc, dir.x * 138 * dt, dir.y * 138 * dt);
                npc.facing = dir.x >= 0 ? 1 : -1;
                if (distance(npc, { x: guardHouse.doorX, y: guardHouse.doorY }) <= 74) {
                    npc.fleeingToGuard = false;
                    npc.homeBuilding = guardHouse;
                    npc.playerAggro = false;
                    npc.animalAggressor = null;
                    npc.mood = 'annoyed';
                    returnOutdoorVillagerHome(npc);
                }
                continue;
            }
        }
        if (npc.animalAggressor?.hp > 0 && distance(npc, npc.animalAggressor) < 560) {
            if (updateOutdoorVillagerCombat(npc, dt, now)) continue;
        } else if (npc.animalAggressor && npc.animalAggressor.hp <= 0) {
            npc.animalAggressor = null;
            if (npc.mood === 'angry' && !npc.playerAggro) npc.mood = 'annoyed';
        }
        if (npc.playerAggro && npc.hp >= npc.maxHp * 0.3) npc.returningHome = false;
        if (shouldOutdoorVillagerReturnHome(npc, now)) npc.returningHome = true;
        const shouldRetreatHome = npc.returningHome || (npc.hp < npc.maxHp * 0.3 && !(npc.role === 'basicElder' && npc.playerAggro));
        if (shouldRetreatHome) {
            npc.returningHome = true;
            const dir = normalize(building.doorX - npc.x, building.doorY - npc.y);
            moveOutdoorVillager(npc, dir.x * 125 * dt, dir.y * 125 * dt);
            npc.facing = dir.x >= 0 ? 1 : -1;
            if (distance(npc, { x: building.doorX, y: building.doorY }) <= 74) {
                returnOutdoorVillagerHome(npc);
            }
            continue;
        }
        if (npc.mood === 'angry' || npc.animalAggressor) {
            if (updateOutdoorVillagerCombat(npc, dt, now)) continue;
        }
        if (updateGuardNightPatrol(npc, dt, now)) continue;
        if (!npc.targetX || now > (npc.nextWanderAt || 0)) {
            setVillagerWorkState(npc, now, true);
            const angle = hash2(npc.x + now * 0.001, npc.y) * Math.PI * 2;
            const radius = 110 + hash2(npc.y, now * 0.001) * 260;
            npc.targetX = clamp(building.doorX + Math.cos(angle) * radius, village.x - village.radius * 1.05, village.x + village.radius * 1.05);
            npc.targetY = clamp(building.doorY + Math.sin(angle) * radius * 0.78, village.y - village.radius * 0.82, village.y + village.radius * 0.82);
            npc.nextWanderAt = now + 1800 + hash2(npc.targetX, npc.targetY) * 2400;
        }
        const dir = normalize(npc.targetX - npc.x, npc.targetY - npc.y);
        if (Math.hypot(npc.targetX - npc.x, npc.targetY - npc.y) < 10) {
            npc.targetX = null;
            npc.targetY = null;
            continue;
        }
        moveOutdoorVillager(npc, dir.x * 58 * dt, dir.y * 58 * dt);
        npc.facing = dir.x >= 0 ? 1 : -1;
    }
    state.outdoorVillagers = state.outdoorVillagers.filter(npc => npc.outside);
}

function updateVillagerRoutinesWhileIndoor(now, dt = 0) {
    if (!state.village) return;
    updatePendingVillagerExits(now);
    updatePendingVillagerEntries(now);
    maybeSendVillagersOutside(now);
    for (const npc of state.outdoorVillagers) {
        if (npc.hp <= 0 || npc.kind === 'totem') continue;
        updateVillagerStatusEffects(npc, dt, now);
        if (npc.hp <= 0) continue;
        if (shouldOutdoorVillagerReturnHome(npc, now)) {
            npc.returningHome = true;
            const building = npc.homeBuilding;
            if (building && distance(npc, { x: building.doorX, y: building.doorY }) <= 74) {
                returnOutdoorVillagerHome(npc);
            }
        }
    }
    state.outdoorVillagers = state.outdoorVillagers.filter(npc => npc.outside);
    for (const npc of state.indoor?.objects || []) {
        if (npc.kind !== 'npc' || npc.hp <= 0) continue;
        updateVillagerStatusEffects(npc, dt, now);
    }
}

function updateOutdoorWorldWhileIndoor(dt, now) {
    if (!state.village) return;
    state.updatingOutdoorWhileIndoor = true;
    try {
        updateOutdoorVillagers(dt, now);
        updateProjectiles(dt, now);
        updateBambooTraps(now);
        updateEnemiesAgainstVillagersOnly(dt, now);
    } finally {
        state.updatingOutdoorWhileIndoor = false;
    }
}

function updateEnemiesAgainstVillagersOnly(dt, now) {
    updateWolfPackRoaming(now);
    for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        updateEnemyPoison(e, dt, now);
        if (e.hp <= 0) continue;
        if (e.attackCooldown > 0) e.attackCooldown -= dt;
        if (e.contactCooldown > 0) e.contactCooldown -= dt;
        if (Math.abs(e.knockX) > 1 || Math.abs(e.knockY) > 1) {
            moveEnemy(e, e.knockX * dt, e.knockY * dt);
            e.knockX *= Math.pow(0.035, dt);
            e.knockY *= Math.pow(0.035, dt);
        }
        if (updateAnimalVillagerConflict(e, dt, now)) continue;
        if (e.retreatUntil > now && e.villagerTarget?.hp > 0) {
            const away = normalize(e.x - e.villagerTarget.x, e.y - e.villagerTarget.y);
            moveEnemy(e, away.x * e.speed * 1.2 * dt, away.y * e.speed * 1.2 * dt);
        }
    }
    separateEnemies();
}

function setVillagerWorkState(npc, now, outside) {
    const jobs = {
        blacksmith: outside ? ['巡看矿石', '修门铰链'] : ['打铁', '磨剑'],
        apothecary: outside ? ['采草药', '晒药瓶'] : ['配药', '整理药架'],
        kitchen: outside ? ['晾食材', '看菜园'] : ['备餐', '熬汤'],
        elder: outside ? ['巡视村口', '查看图腾'] : ['读地图', '写村令'],
        guard: outside ? ['巡逻', '查岗', '看守水井'] : ['整备武器'],
        merchant: outside ? ['招呼客人', '整理货箱'] : ['盘点货物', '数铜币'],
    }[npc.role] || ['巡逻'];
    npc.workState = jobs[Math.floor(hash2(npc.x + now * 0.001, npc.y) * jobs.length)];
    npc.workStateUntil = now + 2600;
}

function shouldOutdoorVillagerReturnHome(npc, now) {
    if (npc.playerAggro || npc.animalAggressor || npc.villagerAggressor || npc.villageWarTargetVillage) return false;
    if (npc.returningHome) return true;
    const village = homeVillageFor(npc);
    if (!village) return false;
    if (distance(npc, village) > village.radius * 0.82) return true;
    if (npc.role === 'guard' && isGuardNightPatrolTime()) return false;
    if (nightAmount() > 0.22) return true;
    if (now < (npc.nextReturnCheckAt || 0)) return false;
    npc.nextReturnCheckAt = now + 4500 + hash2(npc.x, npc.y) * 3500;
    return hash2(npc.x + Math.floor(now / 1000), npc.y) > 0.78;
}

function isGuardNightPatrolTime() {
    return nightAmount() > 0.18;
}

function updateGuardNightPatrol(npc, dt, now) {
    if (npc.role !== 'guard' || !isGuardNightPatrolTime() || npc.hp <= 0 || npc.playerAggro) return false;
    const threat = nearestGuardPatrolThreat(npc);
    if (threat) {
        setVillagerAnimalAggro(npc, threat);
        npc.workState = '发现怪物';
        npc.workStateUntil = now + 1800;
        updateOutdoorVillagerCombat(npc, dt, now);
        return true;
    }
    npc.nightPatrol = true;
    if (!npc.patrolTarget || distance(npc, npc.patrolTarget) < 18 || now > (npc.nextPatrolAt || 0)) {
        npc.patrolTarget = nextGuardPatrolPoint(npc, now);
        npc.targetX = npc.patrolTarget.x;
        npc.targetY = npc.patrolTarget.y;
        npc.nextPatrolAt = now + 5200 + hash2(npc.x, now * 0.001) * 2600;
        npc.workState = guardPatrolLabel(npc.patrolTarget);
        npc.workStateUntil = now + 3600;
    }
    const dir = normalize(npc.targetX - npc.x, npc.targetY - npc.y);
    moveOutdoorVillager(npc, dir.x * 76 * dt, dir.y * 76 * dt);
    npc.facing = dir.x >= 0 ? 1 : -1;
    return true;
}

function nearestGuardPatrolThreat(npc) {
    const village = homeVillageFor(npc);
    if (!village) return null;
    return state.enemies
        .filter(enemy => enemy.hp > 0 && distance(enemy, village) <= village.radius + 260 && distance(enemy, npc) <= 520)
        .sort((a, b) => distance(npc, a) - distance(npc, b))[0] || null;
}

function nextGuardPatrolPoint(npc, now) {
    const points = guardPatrolPoints(npc);
    if (!points.length) return { x: state.village.x, y: state.village.y, label: '巡逻' };
    const start = npc.patrolIndex ?? Math.floor(hash2(npc.x, npc.y) * points.length);
    npc.patrolIndex = (start + 1 + Math.floor(hash2(now * 0.001, npc.x) * 2)) % points.length;
    return points[npc.patrolIndex];
}

function guardPatrolPoints(npc) {
    const village = homeVillageFor(npc) || state.village;
    if (!village) return [];
    const amenities = village.amenities || {};
    const points = [
        village.well ? { x: village.well.x, y: village.well.y + 42, label: '巡查水井' } : null,
        amenities.bell ? { x: amenities.bell.x, y: amenities.bell.y + 36, label: '警钟值守' } : null,
        amenities.noticeBoard ? { x: amenities.noticeBoard.x, y: amenities.noticeBoard.y + 36, label: '巡查告示' } : null,
        ...(amenities.lamps || []).map(lamp => ({ x: lamp.x, y: lamp.y + 28, label: '巡查路灯' })),
        ...village.buildings
            .filter(building => isGuardBuilding(building))
            .map(building => ({ x: building.doorX, y: building.doorY + 72, label: '守卫换岗' })),
    ].filter(Boolean);
    return points;
}

function guardPatrolLabel(point) {
    return point?.label || '夜间巡逻';
}

function updatePendingVillagerExits(now) {
    if (!state.pendingVillagerExits?.length) return;
    for (const exit of state.pendingVillagerExits) {
        if (now < exit.exitAt || exit.npc.outside || exit.npc.hp <= 0) continue;
        removeFromInteriorObjects(exit.npc);
        exit.npc.outside = true;
        exit.npc.returnedHome = false;
        exit.npc.returningHome = false;
        exit.npc.homeBuilding = exit.building;
        exit.npc.x = exit.building.doorX;
        exit.npc.y = exit.building.doorY + 46;
        setOutdoorVillagerDoorExitTarget(exit.npc, exit.building);
        if (!state.outdoorVillagers.includes(exit.npc)) state.outdoorVillagers.push(exit.npc);
        exit.done = true;
        showToast(exit.message || `${exit.npc.label}从门口追出了屋子！`);
    }
    state.pendingVillagerExits = state.pendingVillagerExits.filter(exit => !exit.done);
}

function scheduleVillagerExit(npc, building, now, delay = 700, message = `${npc.label}听到警钟后出了屋子。`) {
    state.pendingVillagerExits ||= [];
    if (npc.outside || npc.hp <= 0 || state.pendingVillagerExits.some(exit => exit.npc === npc)) return;
    state.pendingVillagerExits.push({ npc, building, exitAt: now + delay, message });
}

function moveOutdoorVillager(npc, dx, dy) {
    const oldX = npc.x;
    const oldY = npc.y;
    moveCircle(npc, dx, dy);
    if (Math.hypot(npc.x - oldX, npc.y - oldY) < Math.hypot(dx, dy) * 0.25) {
        npc.x = oldX;
        npc.y = oldY;
        const moved = tryOutdoorVillagerAvoidance(npc, dx, dy);
        if (!moved) {
            setOutdoorVillagerDetour(npc, dx, dy);
            npc.nextWanderAt = Math.min(npc.nextWanderAt || performance.now() + 400, performance.now() + 400);
        }
    }
}

function tryOutdoorVillagerAvoidance(npc, dx, dy) {
    const speed = Math.hypot(dx, dy);
    if (speed < 0.05) return false;
    const dir = normalize(dx, dy);
    const angles = [0.45, -0.45, 0.8, -0.8, 1.15, -1.15, Math.PI / 2, -Math.PI / 2, 2.25, -2.25];
    const options = [
        { x: dx, y: 0 },
        { x: 0, y: dy },
        ...angles.flatMap(angle => {
            const ca = Math.cos(angle);
            const sa = Math.sin(angle);
            const rx = dir.x * ca - dir.y * sa;
            const ry = dir.x * sa + dir.y * ca;
            return [
                { x: rx * speed * 0.92, y: ry * speed * 0.92 },
                { x: rx * speed * 1.35, y: ry * speed * 1.35 },
            ];
        }),
    ];
    return options.some(step => tryOutdoorVillagerStep(npc, step.x, step.y));
}

function tryOutdoorVillagerStep(npc, dx, dy) {
    const oldX = npc.x;
    const oldY = npc.y;
    npc.x = clamp(npc.x + dx, npc.radius, WORLD.width - npc.radius);
    npc.y = clamp(npc.y + dy, npc.radius, WORLD.height - npc.radius);
    if (!collides(npc)) return true;
    npc.x = oldX;
    npc.y = oldY;
    return false;
}

function setOutdoorVillagerDetour(npc, dx, dy) {
    const dir = normalize(dx, dy);
    const side = hash2(npc.x, npc.y + performance.now() * 0.001) > 0.5 ? 1 : -1;
    const detourDistance = 86 + hash2(npc.y, npc.x) * 72;
    const candidates = [
        { x: npc.x - dir.y * side * detourDistance, y: npc.y + dir.x * side * detourDistance },
        { x: npc.x + dir.x * 42 - dir.y * side * detourDistance, y: npc.y + dir.y * 42 + dir.x * side * detourDistance },
        { x: npc.x - dir.x * 36 - dir.y * side * detourDistance * 0.8, y: npc.y - dir.y * 36 + dir.x * side * detourDistance * 0.8 },
    ];
    for (const candidate of candidates) {
        const probe = { x: clamp(candidate.x, npc.radius, WORLD.width - npc.radius), y: clamp(candidate.y, npc.radius, WORLD.height - npc.radius), radius: npc.radius, kind: npc.kind };
        if (!collides(probe)) {
            npc.targetX = probe.x;
            npc.targetY = probe.y;
            npc.nextWanderAt = performance.now() + 900;
            return;
        }
    }
    npc.targetX = null;
    npc.targetY = null;
}

function updateOutdoorVillagerCombat(npc, dt, now) {
    updateBlacksmithFatigue(npc, dt, now);
    if (npc.pendingAttack) {
        updateVillagerPendingAttack(npc, now);
        return true;
    }
    if (npc.villagerAggressor?.hp > 0 && npc.villagerAggressor.outside && homeVillageFor(npc.villagerAggressor) !== homeVillageFor(npc)) {
        return updateVillagerRivalCombat(npc, npc.villagerAggressor, dt, now);
    }
    const animal = chooseVillagerAnimalTarget(npc);
    if (animal) {
        updateVillagerAnimalCounter(npc, animal, dt, now);
        return true;
    }
    const dist = distance(npc, state.player);
    const profile = villagerAttackProfile(npc, dist);
    if (['apothecary', 'elder', 'cultPriest', 'cultHerbalist', 'cultHealer'].includes(npc.role)) {
        if (npc.role === 'elder' && !activeVillageTotem(npc) && villagerCanAttack(npc, now)) {
            summonVillageTotem(npc, now);
            return true;
        }
        if (npc.role === 'elder' && dist < 180 && now >= (npc.nextCommandAt || 0)) {
            castElderCommand(npc, now);
            return true;
        }
        if (dist < 150) {
            const away = normalize(npc.x - state.player.x, npc.y - state.player.y);
            moveOutdoorVillager(npc, away.x * 118 * dt, away.y * 118 * dt);
            npc.facing = state.player.x >= npc.x ? 1 : -1;
        } else if (dist > 235) {
            const dir = normalize(state.player.x - npc.x, state.player.y - npc.y);
            moveOutdoorVillager(npc, dir.x * 62 * dt, dir.y * 62 * dt);
            npc.facing = dir.x >= 0 ? 1 : -1;
        } else if (villagerCanAttack(npc, now) && (npc.role !== 'cultHealer' || npc.playerAggro)) {
            if (npc.role === 'elder') castElderSpell(npc, now);
            else if (npc.role === 'cultHerbalist') commandJungleMonsters(npc, now);
            else if (npc.role === 'cultHealer') castCultHealerVines(npc, now);
            else throwPoisonBottle(npc, now);
        }
        return true;
    }
    if (npc.role === 'basicElder') {
        const dir = normalize(state.player.x - npc.x, state.player.y - npc.y);
        npc.facing = dir.x >= 0 ? 1 : -1;
        if (dist > profile.range + state.player.radius) moveOutdoorVillager(npc, dir.x * 126 * dt, dir.y * 126 * dt);
        else if (villagerCanAttack(npc, now)) startVillagerMeleeAttack(npc, profile, now);
        return true;
    }
    const dir = normalize(state.player.x - npc.x, state.player.y - npc.y);
    npc.facing = dir.x >= 0 ? 1 : -1;
    if (dist > profile.range + state.player.radius) {
        const speed = ['blacksmith', 'kitchen'].includes(npc.role) ? 148 : 112;
        moveOutdoorVillager(npc, dir.x * speed * dt, dir.y * speed * dt);
    } else if (villagerCanAttack(npc, now)) {
        startVillagerMeleeAttack(npc, profile, now);
    }
    return true;
}

function chooseRivalVillagerTarget(npc) {
    if (npc.kind !== 'npc' || npc.hp <= 0 || !npc.outside || npc.returningHome || npc.fleeingToGuard) return null;
    if (npc.playerAggro || npc.animalAggressor) return null;
    const ownVillage = homeVillageFor(npc);
    if (!ownVillage) return null;
    if (npc.villagerAggressor?.hp > 0 && npc.villagerAggressor.outside && homeVillageFor(npc.villagerAggressor) !== ownVillage && distance(npc, npc.villagerAggressor) < 620) {
        return npc.villagerAggressor;
    }
    if (npc.villageWarTargetVillage) {
        const warTarget = nearestVillageWarTarget(npc, npc.villageWarTargetVillage);
        if (warTarget) return warTarget;
        npc.villageWarTargetVillage = null;
    }
    if (nowishThrottle(npc, 'nextRivalScanAt', 420)) return null;
    const rival = state.outdoorVillagers
        .filter(other => other !== npc && other.kind === 'npc' && other.hp > 0 && other.outside && !other.returningHome)
        .filter(other => {
            const otherVillage = homeVillageFor(other);
            if (!otherVillage || otherVillage === ownVillage) return false;
            if (other.playerAggro || other.animalAggressor) return false;
            if (!villagesWillFight(ownVillage, otherVillage, npc, other)) return false;
            return distance(npc, other) < rivalVillagerAggroRange(npc, other, ownVillage, otherVillage);
        })
        .sort((a, b) => distance(npc, a) - distance(npc, b))[0] || null;
    if (rival) mobilizeVillageWar(ownVillage, homeVillageFor(rival), npc, rival);
    return rival;
}

function nowishThrottle(object, key, interval) {
    const now = performance.now();
    if (now < (object[key] || 0)) return true;
    object[key] = now + interval + hash2(object.x, object.y) * interval;
    return false;
}

function rivalVillagerAggroRange(a, b, villageA, villageB) {
    const chance = villageWarChance(villageA, villageB);
    return 180 + chance * 260;
}

function villagesWillFight(villageA, villageB, npcA, npcB) {
    const key = [villageA.seed || villageA.x, villageB.seed || villageB.x].sort().join(':');
    state.villageRelations ||= {};
    if (state.villageRelations[key] !== undefined) return state.villageRelations[key];
    const chance = villageWarChance(villageA, villageB);
    const roll = hash2((villageA.seed || villageA.x) * 0.017 + (npcA?.x || 0) * 0.003, (villageB.seed || villageB.x) * 0.019 + (npcB?.y || 0) * 0.003);
    const fight = roll < chance;
    state.villageRelations[key] = fight;
    return fight;
}

function villageWarChance(villageA, villageB) {
    const tiers = [villageA?.tier || 'advanced', villageB?.tier || 'advanced'];
    if (tiers.includes('jungleCult')) return 0.78;
    if (tiers.includes('fortress')) return 0.36;
    if (tiers.includes('basic') && tiers.some(tier => tier !== 'basic' && tier !== 'fortress' && tier !== 'jungleCult')) return 0.12;
    return 0.18;
}

function nearestVillageWarTarget(npc, enemyVillage) {
    return state.outdoorVillagers
        .filter(other => other !== npc && other.kind === 'npc' && other.hp > 0 && other.outside && homeVillageFor(other) === enemyVillage)
        .sort((a, b) => distance(npc, a) - distance(npc, b))[0] || null;
}

function setVillagerRivalAggro(npc, rival) {
    npc.villagerAggressor = rival;
    npc.animalAggressor = null;
    npc.playerAggro = false;
    npc.mood = 'annoyed';
    npc.returningHome = false;
    if (rival && !rival.villagerAggressor) {
        rival.villagerAggressor = npc;
        rival.playerAggro = false;
        rival.animalAggressor = null;
        rival.mood = 'annoyed';
        rival.returningHome = false;
    }
}

function mobilizeVillageWar(villageA, villageB, starterA, starterB) {
    if (!villageA || !villageB || villageA === villageB) return;
    const key = [villageA.seed || villageA.x, villageB.seed || villageB.x].sort().join(':');
    const now = performance.now();
    state.villageWars ||= {};
    if (state.villageWars[key] && now - state.villageWars[key] < 12000) return;
    state.villageWars[key] = now;
    mobilizeVillageForWar(villageA, villageB, starterB, now);
    mobilizeVillageForWar(villageB, villageA, starterA, now);
    mobilizeControlledMonstersForWar(villageA, villageB, now);
    mobilizeControlledMonstersForWar(villageB, villageA, now);
    showToast(`${villageDisplayName(villageA)} 与 ${villageDisplayName(villageB)} 爆发村战，双方村民全部出动！`);
}

function mobilizeVillageForWar(village, enemyVillage, firstTarget, now) {
    let count = 0;
    for (const building of village.buildings || []) {
        building.interiorObjects ||= createIndoorObjects(building.kind, building);
        for (const npc of building.interiorObjects.filter(object => object.kind === 'npc' && object.hp > 0)) {
            npc.villageWarTargetVillage = enemyVillage;
            npc.returningHome = false;
            npc.fleeingToGuard = false;
            npc.mood = npc.playerAggro ? npc.mood : 'annoyed';
            if (firstTarget?.hp > 0 && homeVillageFor(firstTarget) === enemyVillage) npc.villagerAggressor = firstTarget;
            if (!npc.outside) scheduleVillagerExit(npc, building, now, 250 + count * 90, `${npc.label}听到村战号令，冲出屋子！`);
            count++;
        }
    }
    for (const npc of state.outdoorVillagers.filter(object => object.kind === 'npc' && object.hp > 0 && homeVillageFor(object) === village)) {
        npc.villageWarTargetVillage = enemyVillage;
        npc.returningHome = false;
        npc.fleeingToGuard = false;
        npc.mood = npc.playerAggro ? npc.mood : 'annoyed';
        if (firstTarget?.hp > 0 && homeVillageFor(firstTarget) === enemyVillage) npc.villagerAggressor = firstTarget;
    }
}

function mobilizeControlledMonstersForWar(village, enemyVillage, now) {
    if (village?.tier !== 'jungleCult') return;
    let count = 0;
    for (const enemy of state.enemies.filter(item => item.hp > 0 && item.controlledByCult && isControlledJungleMonster(item))) {
        enemy.controlledWarTargetVillage = enemyVillage;
        enemy.attackTarget = null;
        enemy.villagerTarget = null;
        enemy.retreatUntil = 0;
        count++;
        if (count <= 8) spawnBurst(enemy.x, enemy.y - 8, '#8cff66', 8, 110, enemy.radius * 0.6);
    }
    if (count) addFloatText(`控兽参战 x${count}`, village.x, village.y - 86, '#8cff66');
}

function isVillageWarTarget(npc, target) {
    return npc?.kind === 'npc'
        && target?.kind === 'npc'
        && !!homeVillageFor(npc)
        && !!homeVillageFor(target)
        && homeVillageFor(npc) !== homeVillageFor(target);
}

function updateVillagerRivalCombat(npc, rival, dt, now) {
    if (!rival || rival.hp <= 0 || !rival.outside) {
        npc.villagerAggressor = null;
        return false;
    }
    setVillagerRivalAggro(npc, rival);
    const dist = distance(npc, rival);
    const profile = villagerAttackProfile(npc, dist);
    const dir = normalize(rival.x - npc.x, rival.y - npc.y);
    npc.facing = dir.x >= 0 ? 1 : -1;
    const rangedRole = ['apothecary', 'elder', 'cultPriest', 'cultHerbalist', 'cultHealer'].includes(npc.role);
    if (rangedRole) {
        if (dist < 135) {
            moveOutdoorVillager(npc, -dir.x * 108 * dt, -dir.y * 108 * dt);
        } else if (dist > 230) {
            moveOutdoorVillager(npc, dir.x * 70 * dt, dir.y * 70 * dt);
        } else if (villagerCanAttack(npc, now)) {
            if (npc.role === 'elder') castElderSpellAt(npc, rival, now);
            else if (npc.role === 'cultHerbalist') commandJungleMonsters(npc, now);
            else if (npc.role === 'cultHealer') castCultHealerVines(npc, now, rival);
            else throwPoisonBottleAt(npc, rival, now);
        }
        return true;
    }
    if (dist > profile.range + (rival.radius || 17)) {
        const speed = ['blacksmith', 'kitchen'].includes(npc.role) ? 136 : 104;
        moveOutdoorVillager(npc, dir.x * speed * dt, dir.y * speed * dt);
    } else if (villagerCanAttack(npc, now)) {
        startVillagerMeleeAttack(npc, profile, now, rival);
    }
    return true;
}

function setVillagerPlayerAggro(npc) {
    npc.playerAggro = true;
    npc.animalAggressor = null;
    npc.villagerAggressor = null;
    npc.mood = 'angry';
}

function setVillagerAnimalAggro(npc, animal) {
    if (shouldIgnoreJungleMonster(npc, animal)) {
        npc.animalAggressor = null;
        if (animal?.villagerTarget === npc) animal.villagerTarget = null;
        return;
    }
    npc.animalAggressor = animal;
    npc.playerAggro = false;
    npc.mood = 'angry';
    if (animal) animal.villagerTarget = npc;
}

function chooseVillagerAnimalTarget(npc) {
    const attacker = npc.animalAggressor && npc.animalAggressor.hp > 0 ? npc.animalAggressor : null;
    if (shouldIgnoreJungleMonster(npc, attacker)) {
        npc.animalAggressor = null;
        if (attacker.villagerTarget === npc) attacker.villagerTarget = null;
        return null;
    }
    if (attacker && distance(npc, attacker) < 560) return attacker;
    return state.enemies
        .filter(e => e.hp > 0 && e.villagerTarget === npc && distance(npc, e) < 560)
        .filter(e => !shouldIgnoreJungleMonster(npc, e))
        .sort((a, b) => distance(npc, a) - distance(npc, b))[0] || null;
}

function shouldIgnoreJungleMonster(npc, animal) {
    return !!animal && isControlledJungleMonster(animal) && isJungleCultVillager(npc);
}

function updateVillagerAnimalCounter(npc, animal, dt, now) {
    setVillagerAnimalAggro(npc, animal);
    const dist = distance(npc, animal);
    if (npc.role === 'guard' && isStrongGuardTarget(animal)) {
        updateGuardRangedCombatAgainstStrongTarget(npc, animal, dist, dt, now);
        return;
    }
    const range = npc.role === 'blacksmith' ? 82 : (['apothecary', 'elder', 'cultHealer'].includes(npc.role) ? 190 : 58);
    if (['apothecary', 'elder', 'cultHealer'].includes(npc.role)) {
        if (npc.role === 'cultHealer' && dist <= 235 && villagerCanAttack(npc, now)) {
            castCultHealerVines(npc, now, animal);
            return;
        }
        updateRangedVillagerCombatAgainstTarget(npc, animal, dt, now, npc.role === 'elder' ? 165 : 155, npc.role === 'elder' ? 240 : 225);
        return;
    }
    const dir = normalize(animal.x - npc.x, animal.y - npc.y);
    npc.facing = dir.x >= 0 ? 1 : -1;
    if (dist > range) {
        const speed = ['blacksmith', 'kitchen'].includes(npc.role) ? 136 : 96;
        moveOutdoorVillager(npc, dir.x * speed * dt, dir.y * speed * dt);
        return;
    }
    if (villagerCanAttack(npc, now)) {
        const profile = villagerAttackProfile(npc, dist);
        if (npc.role === 'kitchen' && !npc.knifeThrown && npc.hp < 10) throwKitchenKnifeAt(npc, animal, now);
        else startVillagerMeleeAttack(npc, profile, now, animal);
    }
}

function isStrongGuardTarget(target) {
    if (!target) return false;
    return target.boss || target.kind === 'golem' || (target.maxHp || target.hp || 0) >= 42 || (target.attack || 0) >= 7;
}

function updateGuardRangedCombatAgainstStrongTarget(npc, target, dist, dt, now) {
    const minRange = 165;
    const maxRange = 330;
    const dirToTarget = normalize(target.x - npc.x, target.y - npc.y);
    npc.facing = dirToTarget.x >= 0 ? 1 : -1;
    npc.workState = '远射强敌';
    npc.workStateUntil = now + 1400;
    if (dist < minRange) {
        moveOutdoorVillager(npc, -dirToTarget.x * 118 * dt, -dirToTarget.y * 118 * dt);
        keepVillagerNearVillage(npc);
        return;
    }
    if (dist > maxRange) {
        moveOutdoorVillager(npc, dirToTarget.x * 72 * dt, dirToTarget.y * 72 * dt);
        keepVillagerNearVillage(npc);
        return;
    }
    if (villagerCanAttack(npc, now)) {
        startVillagerMeleeAttack(npc, guardArrowAttackProfile(), now, target);
    }
    keepVillagerNearVillage(npc);
}

function guardArrowAttackProfile() {
    return { weapon: '鹿筋弓', damage: 7, force: 240, shake: 8, burst: 8, color: '#d8e5f2', range: 245, duration: 390, cooldown: 1050, style: 'guardArrow' };
}

function updateRangedVillagerCombatAgainstTarget(npc, target, dt, now, minRange, maxRange) {
    const dist = distance(npc, target);
    const away = normalize(npc.x - target.x, npc.y - target.y);
    npc.facing = target.x >= npc.x ? 1 : -1;
    if (dist <= maxRange && villagerCanAttack(npc, now)) {
        if (npc.role === 'elder') castElderSpellAt(npc, target, now);
        else throwPoisonBottleAt(npc, target, now);
    }
    if (dist < minRange) {
        moveOutdoorVillager(npc, away.x * 118 * dt, away.y * 118 * dt);
    } else if (dist > maxRange) {
        moveOutdoorVillager(npc, -away.x * 68 * dt, -away.y * 68 * dt);
    }
    keepVillagerNearVillage(npc);
}

function keepVillagerNearVillage(npc) {
    const village = homeVillageFor(npc);
    if (!village) return;
    const maxDist = village.radius * 0.9;
    const dx = npc.x - village.x;
    const dy = npc.y - village.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= maxDist) return;
    const dir = normalize(dx, dy);
    npc.x = village.x + dir.x * maxDist;
    npc.y = village.y + dir.y * maxDist;
}

function followPlayerIntoHouse(npc) {
    if (!npc.homeBuilding) return;
    removeFromOutdoorVillagers(npc);
    npc.outside = false;
    npc.returningHome = false;
    npc.x = VIEW.width / 2;
    npc.y = VIEW.height - 178;
    npc.homeBuilding.interiorObjects ||= createIndoorObjects(npc.homeBuilding.kind, npc.homeBuilding);
    if (!npc.homeBuilding.interiorObjects.includes(npc)) npc.homeBuilding.interiorObjects.push(npc);
    if (state.indoor?.building === npc.homeBuilding) {
        if (!state.indoor.objects.includes(npc)) state.indoor.objects.push(npc);
        showToast(`${npc.label}追进了屋子！`);
    }
}

function maybeSendVillagersOutside(now) {
    if (!state.village) return;
    const night = nightAmount() > 0.12;
    for (const village of allVillages()) {
    if (distance(state.player, village) > village.radius + 260) continue;
    for (const building of village.buildings) {
        building.interiorObjects ||= createIndoorObjects(building.kind, building);
        const npc = building.interiorObjects.find(object => object.kind === 'npc');
        if (!npc || npc.outside || npc.hp <= 0 || npc.playerAggro) continue;
        if (npc.role === 'cultHerbalist' && hasUncontrolledJungleCreatureNearby(building, 980)) {
            sendVillagerOutside(building, npc, now);
            npc.workState = '驭使丛林';
            npc.workStateUntil = now + 4200;
            continue;
        }
        if (night && npc.role !== 'guard') continue;
        if (now < (building.nextVillagerOutsideAt || 0)) continue;
        if (night && npc.role === 'guard') {
            sendVillagerOutside(building, npc, now);
            npc.nightPatrol = true;
            npc.workState = '夜间巡逻';
            npc.workStateUntil = now + 4200;
            continue;
        }
        if (state.outdoorVillagers.some(item => item.role === npc.role && homeVillageFor(item) === village)) continue;
        if (hash2(building.x, Math.floor(now / 7000)) < 0.5) continue;
        sendVillagerOutside(building, npc, now);
    }
    }
}

function sendVillagerOutside(building, npc, now) {
    removeFromInteriorObjects(npc);
    npc.outside = true;
    npc.returnedHome = false;
    npc.returningHome = false;
    npc.mood = npc.playerAggro && npc.hp >= npc.maxHp * 0.3 ? 'angry' : 'annoyed';
    npc.homeBuilding = building;
    npc.x = building.doorX;
    npc.y = building.doorY + 34;
    npc.radius ||= 17;
    setOutdoorVillagerDoorExitTarget(npc, building);
    if (!state.outdoorVillagers.includes(npc)) state.outdoorVillagers.push(npc);
    building.nextVillagerOutsideAt = npc.role === 'guard' && nightAmount() > 0.12
        ? now + 8500
        : now + 32000 + hash2(building.x, now * 0.001) * 18000;
}

function returnOutdoorVillagerHome(npc) {
    removeFromOutdoorVillagers(npc);
    npc.outside = false;
    npc.returningHome = false;
    npc.fleeingToGuard = false;
    if (isGuardBuilding(npc.homeBuilding) && npc.role !== 'guard') {
        npc.playerAggro = false;
        npc.animalAggressor = null;
        npc.mood = 'annoyed';
    }
    npc.x = VIEW.width / 2;
    npc.y = VIEW.height - 178;
    setIndoorVillagerDoorEntryTarget(npc);
    const building = npc.homeBuilding;
    if (building) {
        building.interiorObjects ||= createIndoorObjects(building.kind, building);
        if (!building.interiorObjects.includes(npc)) building.interiorObjects.push(npc);
        building.nextVillagerOutsideAt = performance.now() + 22000;
        if (state.indoor?.building === building && !state.indoor.objects.includes(npc)) {
            state.indoor.objects.push(npc);
        }
    }
}

function updateAllVillagerHomeHealing(dt, now) {
    if (!state.village) return;
    for (const village of allVillages()) for (const building of village.buildings) {
        building.interiorObjects ||= createIndoorObjects(building.kind, building);
        for (const npc of building.interiorObjects.filter(object => object.kind === 'npc' && !object.outside && object.hp > 0 && object.hp < object.maxHp && !object.playerAggro && !object.animalAggressor && object.mood !== 'angry')) {
            const rate = npc.hp < npc.maxHp * 0.3 ? 5.5 : 2.2;
            npc.hp = Math.min(npc.maxHp, npc.hp + rate * dt);
            if (now >= (npc.nextHomeHealTextAt || 0)) {
                npc.nextHomeHealTextAt = now + 2200;
                if (state.indoor?.building === building) addFloatText('+休息', npc.x, npc.y - 50, '#9cffb7');
            }
            if (npc.hp >= npc.maxHp && !npc.playerAggro) {
                npc.mood = 'calm';
                npc.returningHome = false;
            }
        }
    }
}

function setOutdoorVillagerDoorExitTarget(npc, building) {
    const away = normalize(building.doorX - building.x, building.doorY - building.y || 1);
    const base = villageHouseExitPoint(building);
    npc.x = base.x;
    npc.y = base.y;
    npc.targetX = base.x + away.x * (isGuardBuilding(building) ? 128 : 82);
    npc.targetY = base.y + away.y * (isGuardBuilding(building) ? 128 : 82);
    npc.nextWanderAt = performance.now() + 900;
}

function setIndoorVillagerDoorEntryTarget(npc) {
    npc.returningHome = false;
    npc.targetX = VIEW.width / 2 + (hash2(npc.homeX || 0, npc.homeY || 0) > 0.5 ? 150 : -150);
    npc.targetY = VIEW.height - 330;
    npc.nextWanderAt = performance.now() + 1000;
}

function moveIndoorVillagerAwayFromDoor(npc, dt) {
    const doorZone = { x: VIEW.width / 2, y: VIEW.height - 122, w: 230, h: 170 };
    if (distanceToRect(npc, doorZone) > 14) return false;
    if (!npc.playerAggro && !npc.animalAggressor) npc.returningHome = false;
    const targetX = npc.targetX && npc.targetY < VIEW.height - 250 ? npc.targetX : VIEW.width / 2 + (npc.x < VIEW.width / 2 ? -160 : 160);
    const targetY = Math.min(npc.targetY || VIEW.height - 330, VIEW.height - 330);
    npc.targetX = targetX;
    npc.targetY = targetY;
    npc.nextWanderAt = Math.max(npc.nextWanderAt || 0, performance.now() + 900);
    const dir = normalize(targetX - npc.x, targetY - npc.y);
    moveIndoorNpcSafely(npc, dir.x * 92 * dt, dir.y * 92 * dt);
    return true;
}

function moveIndoorNpcSafely(npc, dx, dy) {
    if ((npc.rootedUntil || 0) > performance.now()) return;
    const oldX = npc.x;
    const oldY = npc.y;
    moveIndoorEntitySafely(npc, dx, dy);
    npc.x = clamp(npc.x, 230, VIEW.width - 230);
    const combat = npc.playerAggro || npc.animalAggressor || npc.mood === 'angry';
    npc.y = clamp(npc.y, 182, combat ? VIEW.height - 104 : VIEW.height - 170);
    escapeIndoorCollision(npc);
    if (Math.hypot(npc.x - oldX, npc.y - oldY) < Math.hypot(dx, dy) * 0.35) npc.stuckTicks = (npc.stuckTicks || 0) + 1;
    else npc.stuckTicks = 0;
}

function updateVillagerFleeHeal(npc, dt, now) {
    if (!['kitchen', 'apothecary', 'guard'].includes(npc.role)) return false;
    const healThreshold = npc.role === 'guard' ? npc.maxHp : 24;
    if (!npc.healing && npc.hp > 0 && npc.hp < healThreshold && now >= (npc.nextSelfHealAt || 0)) {
        const kitchen = npc.role === 'kitchen';
        const guard = npc.role === 'guard';
    const usedKey = kitchen ? 'meatHealsUsed' : (guard ? 'bandageHealsUsed' : 'potionHealsUsed');
    const maxUses = guard ? 10 : 3;
        if (guard && npc.pendingAttack) return false;
        if ((npc[usedKey] || 0) < maxUses) {
            npc[usedKey] = (npc[usedKey] || 0) + 1;
            npc.healing = {
                type: kitchen ? 'eat' : (guard ? 'bandage' : 'drink'),
                startedAt: now,
                healAt: now + (kitchen ? 1350 : (guard ? 1250 : 1550)),
                amount: kitchen ? 12 : (guard ? 10 : 18),
            };
            npc.attackAnim = { startedAt: now, duration: kitchen ? 1350 : (guard ? 1250 : 1550), weapon: kitchen ? '吃肉回血' : (guard ? '使用绷带' : '治疗药水'), style: kitchen ? 'eat' : (guard ? 'bandage' : 'drink') };
            npc.nextSelfHealAt = now + (guard ? 1800 : 4200);
        }
    }
    if (!npc.healing) return false;
    const away = normalize(npc.x - state.player.x, npc.y - state.player.y);
    npc.facing = state.player.x >= npc.x ? 1 : -1;
    moveIndoorNpcSafely(npc, away.x * 112 * dt, away.y * 112 * dt);
    if (now >= npc.healing.healAt) {
        npc.hp = Math.min(npc.maxHp || 80, npc.hp + npc.healing.amount);
        spawnBurst(npc.x, npc.y - 24, npc.role === 'kitchen' ? '#ffd166' : (npc.role === 'guard' ? '#f8fbff' : '#8cff66'), 12, 150, 15);
        addFloatText(`+${npc.healing.amount}`, npc.x, npc.y - 48, '#9cffb7');
        showToast(npc.role === 'kitchen' ? '厨师吃完肉恢复了生命。' : (npc.role === 'guard' ? '守卫使用绷带恢复了生命。' : '药师喝完治疗药水恢复了生命。'));
        npc.healing = null;
    }
    return true;
}

function villagerCanAttack(npc, now) {
    return !npc.pendingAttack && (!npc.nextAttackAt || now >= npc.nextAttackAt);
}

function startVillagerMeleeAttack(npc, profile, now, target = state.player) {
    if (profile.style === 'guardArrow') return beginGuardArrowCharge(npc, target, now, profile);
    if (npc.role === 'blacksmith') {
        npc.fatigue = Math.min(100, (npc.fatigue || 0) + (profile.style === 'thrust' ? 24 : 18));
        if (npc.fatigue >= 82) {
            npc.tiredUntil = Math.max(npc.tiredUntil || 0, now + 1500);
            npc.nextAttackAt = now + 1450;
            npc.attackAnim = { startedAt: now, duration: 520, weapon: '喘息', style: 'tired' };
            addFloatText('疲劳', npc.x, npc.y - 52, '#ffd166');
            return;
        }
    }
    npc.nextAttackAt = now + profile.cooldown;
    const dir = normalize(target.x - npc.x, target.y - npc.y);
    npc.pendingAttack = {
        profile,
        dir,
        target,
        hitAt: now + profile.duration * 0.48,
    };
    npc.attackAnim = { startedAt: now, duration: profile.duration, weapon: profile.weapon, style: profile.style, dir };
    npc.attackFlashUntil = now + profile.duration;
    if (npc.role === 'guard' && profile.style === 'guardArrow') {
        npc.pendingAttack.hitAt = now + 180;
    }
    if (npc.role === 'blacksmith' && profile.style === 'thrust') {
        const dir = normalize(target.x - npc.x, target.y - npc.y);
        if (state.indoor) moveIndoorNpcSafely(npc, dir.x * 26, dir.y * 26);
        else moveOutdoorVillager(npc, dir.x * 26, dir.y * 26);
    }
}

function updateVillagerPendingAttack(npc, now) {
    if (!npc.pendingAttack || now < npc.pendingAttack.hitAt) return;
    const pending = npc.pendingAttack;
    npc.pendingAttack = null;
    if (pending.guardArrow) {
        const target = pending.target?.hp > 0 ? pending.target : state.player;
        shootGuardArrowAt(npc, target, now, pending.profile, pending.dir);
        return;
    }
    if (villagerMeleeCanHit(npc, pending)) {
        if (pending.target?.kind === 'npc') damageVillagerByVillager(pending.target, npc, pending.profile);
        else if (pending.target && pending.target !== state.player) damageAnimalByVillagerMelee(pending.target, npc, pending.profile);
        else driveOutPlayer(npc, pending.profile);
    } else {
        const target = pending.target || state.player;
        addFloatText('躲开', target.x, target.y - 42, '#d8e5f2');
    }
}

function damageAnimalByVillagerMelee(animal, npc, profile) {
    const damage = profile.damage;
    animal.hp -= damage;
    animal.hurtUntil = performance.now() + 180;
    animal.villagerTarget = npc;
    applyAnimalKnockbackFromVillager(animal, npc, profile.force, profile.style);
    spawnBurst(animal.x, animal.y, npc.role === 'blacksmith' ? '#d8e5f2' : '#ffd166', 16, 190, animal.radius * 0.75);
    addFloatText(`-${damage}`, animal.x, animal.y - 38, '#fff3b0');
    addFloatText('反击', npc.x, npc.y - 52, '#ffd166');
    if (animal.hp <= 0) {
        animal.deathAt = performance.now();
        npc.animalAggressor = null;
        animal.villagerTarget = null;
        if (!npc.playerAggro) npc.mood = 'annoyed';
        spawnBurst(animal.x, animal.y, '#ffffff', 18, 220, animal.radius);
        showToast(`${npc.label} 击退了${animal.name}。`);
    }
}

function damageVillagerByVillager(target, attacker, profile) {
    if (!target || target.hp <= 0 || target.kind !== 'npc') return;
    const now = performance.now();
    const damage = Math.max(1, Math.floor(profile.damage * 0.82));
    target.hp -= damage;
    target.hurtUntil = now + 180;
    target.villagerAggressor = attacker;
    target.animalAggressor = null;
    target.playerAggro = false;
    target.mood = 'annoyed';
    target.returningHome = target.hp < target.maxHp * 0.28;
    attacker.villagerAggressor = target.hp > 0 ? target : null;
    const dir = normalize(target.x - attacker.x, target.y - attacker.y);
    target.knockX = (target.knockX || 0) + dir.x * Math.min(260, profile.force * 0.42);
    target.knockY = (target.knockY || 0) + dir.y * Math.min(260, profile.force * 0.42);
    if (profile.poison || attacker.role === 'cultHunter') poisonCombatTarget(target, now, 3200);
    if (profile.root || attacker.role === 'cultGuard' || attacker.role === 'cultVillager') slowCombatTarget(target, now, attacker.role === 'cultGuard' ? 1100 : 750);
    spawnBurst(target.x, target.y, profile.color || '#ffd166', 12, 160, (target.radius || 17) * 0.7);
    addFloatText(`-${damage}`, target.x, target.y - 42, '#fff3b0');
    addFloatText('村战', attacker.x, attacker.y - 52, '#ffd166');
    if (target.hp <= 0) {
        target.hp = 0;
        target.mood = 'down';
        target.villagerAggressor = null;
        attacker.villagerAggressor = null;
        spawnBurst(target.x, target.y, '#ffffff', 16, 210, target.radius || 17);
        showToast(`${attacker.label} 击倒了${target.label}。`);
    }
}

function applyAnimalKnockbackFromVillager(animal, npc, force, style = '') {
    applyAnimalKnockback(animal, normalize(animal.x - npc.x, animal.y - npc.y), force, style);
}

function applyAnimalKnockback(animal, dir, force, style = '') {
    const styleFactor = style === 'thrust' ? 1.0 : (style === 'slash' ? 0.86 : (style === 'throw' ? 0.95 : 0.72));
    const roleBoost = animal.kind === 'wolf' ? 1.35 : 1;
    const sizeFactor = animal.boss ? 0.35 : (animal.kind === 'boar' || animal.kind === 'golem' ? 0.65 : 1);
    const amount = Math.max(animal.kind === 'wolf' ? 190 : 120, force * styleFactor * sizeFactor * roleBoost);
    animal.knockX = (animal.knockX || 0) + dir.x * amount;
    animal.knockY = (animal.knockY || 0) + dir.y * amount;
}

function villagerMeleeCanHit(npc, pending) {
    const p = pending.target?.hp > 0 ? pending.target : state.player;
    const profile = pending.profile;
    const dx = p.x - npc.x;
    const dy = p.y - npc.y;
    const forward = dx * pending.dir.x + dy * pending.dir.y;
    const side = Math.abs(dx * -pending.dir.y + dy * pending.dir.x);
    return forward > 4 && forward <= profile.range + p.radius && side <= p.radius + (profile.style === 'thrust' ? 10 : 22);
}

function driveOutPlayer(npc, profile = villagerAttackProfile(npc)) {
    const p = state.player;
    const damage = incomingDamageAfterArmor(profile.damage, false);
    p.hp = Math.max(0, p.hp - damage);
    closeInventoryOnPlayerHit();
    p.invincibleUntil = performance.now() + 520;
    const dir = normalize(p.x - npc.x, p.y - npc.y);
    const force = profile.force;
    applyPlayerSoftKnockback(dir, force, ['elder', 'apothecary'].includes(npc.role) ? 0.45 : 1);
    state.cameraShake = Math.max(state.cameraShake, profile.shake);
    spawnBurst(p.x, p.y, profile.color, profile.burst, 150, p.radius * 0.5);
    if (npc.role === 'apothecary') {
        p.poisonUntil = Math.max(p.poisonUntil || 0, performance.now() + 3600);
        p.poisonTickAt = Math.min(p.poisonTickAt || performance.now() + 900, performance.now() + 900);
        addFloatText('中毒', p.x, p.y - 52, '#8cff66');
    }
    if (npc.role === 'cultHunter') {
        poisonCombatTarget(p, performance.now(), 4200);
    } else if (npc.role === 'cultGuard' || npc.role === 'cultVillager') {
        slowCombatTarget(p, performance.now(), npc.role === 'cultGuard' ? 1400 : 900);
    }
    addFloatText(`-${damage}`, p.x, p.y - 36, '#ffb3b3');
    showToast(`${npc.label}用${profile.weapon}驱逐你，生命 -${damage}`);
    if (p.hp <= 0) {
        triggerPlayerDeath('你被愤怒的村民赶倒了。');
    }
    renderHud();
}

function applyPlayerSoftKnockback(dir, force, softness = 1) {
    const immediate = 18 * softness;
    pushIndoorPlayerSafely(dir.x * immediate, dir.y * immediate);
    state.player.knockX += dir.x * force * softness;
    state.player.knockY += dir.y * force * softness;
}

function pushIndoorPlayerSafely(dx, dy) {
    if (state.indoor) moveIndoorPlayer(state.player, dx, dy);
    else moveCircle(state.player, dx, dy);
}

function villagerAttackProfile(npc, dist = Infinity) {
    if (npc.role === 'blacksmith') {
        const tired = performance.now() < (npc.tiredUntil || 0);
        return dist > 62
            ? { weapon: '铁剑突刺', damage: tired ? 9 : 13, force: tired ? 360 : 520, shake: tired ? 10 : 16, burst: 13, color: '#d8e5f2', range: tired ? 88 : 104, duration: tired ? 430 : 330, cooldown: tired ? 1420 : 980, style: 'thrust' }
            : { weapon: '铁剑斩击', damage: tired ? 8 : 11, force: tired ? 320 : 470, shake: tired ? 9 : 15, burst: 12, color: '#d8e5f2', range: tired ? 62 : 72, duration: tired ? 380 : 280, cooldown: tired ? 1180 : 760, style: 'slash' };
    }
    if (npc.role === 'kitchen' && npc.knifeThrown) {
        return { weapon: '手', damage: 5, force: 300, shake: 8, burst: 8, color: '#ff6b6b', range: 50, duration: 230, cooldown: 980, style: 'punch' };
    }
    if (npc.role === 'basicElder') {
        return { weapon: '铁剑', damage: 8, force: 360, shake: 9, burst: 9, color: '#d8e5f2', range: 62, duration: 290, cooldown: 900, style: 'slash' };
    }
    if (npc.role === 'cultHunter') {
        return dist > 92
            ? { weapon: '毒吹箭', damage: 6, force: 160, shake: 6, burst: 10, color: '#8cff66', range: 230, duration: 360, cooldown: 980, style: 'guardArrow' }
            : { weapon: '蛇纹毒矛', damage: 8, force: 360, shake: 9, burst: 10, color: '#8cff66', range: 84, duration: 310, cooldown: 820, style: 'thrust', poison: true };
    }
    if (npc.role === 'cultGuard') {
        return { weapon: '板根锤盾', damage: 10, force: 480, shake: 14, burst: 12, color: '#d8e5f2', range: 66, duration: 350, cooldown: 980, style: 'slash', root: 600 };
    }
    if (npc.role === 'cultVillager') {
        return { weapon: '藤棍', damage: 6, force: 260, shake: 7, burst: 8, color: '#9cffb7', range: 58, duration: 270, cooldown: 860, style: 'slash', root: 450 };
    }
        if (npc.role === 'guard') {
            return dist > 92
            ? { weapon: '鹿筋弓', damage: 7, force: 240, shake: 8, burst: 8, color: '#d8e5f2', range: 245, duration: 390, cooldown: 1050, style: 'guardArrow' }
            : { weapon: '铁剑', damage: 9, force: 430, shake: 11, burst: 10, color: '#d8e5f2', range: 66, duration: 300, cooldown: 780, style: 'slash' };
    }
    return {
        elder: { weapon: '权杖近击', damage: 9, force: 210, shake: 8, burst: 11, color: '#b77dff', range: 70, duration: 310, cooldown: 820, style: 'staff' },
        kitchen: { weapon: '菜刀', damage: 9, force: 410, shake: 13, burst: 10, color: '#d8e5f2', range: 58, duration: 260, cooldown: 900, style: 'cleaver' },
        apothecary: { weapon: '毒药', damage: 6, force: 120, shake: 5, burst: 9, color: '#8cff66', range: 210, duration: 360, cooldown: 1250, style: 'throw' },
    }[npc.role] || { weapon: '手', damage: 5, force: 310, shake: 9, burst: 8, color: '#ff6b6b', range: 54, duration: 240, cooldown: 950, style: 'punch' };
}

function updateBlacksmithFatigue(npc, dt, now) {
    if (npc.role !== 'blacksmith') return;
    npc.fatigue = Math.max(0, (npc.fatigue || 0) - dt * (now < (npc.tiredUntil || 0) ? 28 : 10));
}

function throwPoisonBottle(npc, now) {
    throwPoisonBottleAt(npc, state.player, now);
}

function updateCultHealerSupport(npc, dt, now) {
    if (npc.role !== 'cultHealer' || npc.hp <= 0) return false;
    const healed = tryCultHealerHeal(npc, now);
    if (healed) return true;
    if (npc.playerAggro && distance(npc, state.player) < 235 && villagerCanAttack(npc, now)) {
        castCultHealerVines(npc, now);
        return true;
    }
    return false;
}

function tryCultHealerHeal(npc, now) {
    if (now < (npc.nextHealAt || 0)) return false;
    const target = cultHealerTarget(npc);
    if (!target) return false;
    npc.nextHealAt = now + 1350;
    npc.nextAttackAt = Math.max(npc.nextAttackAt || 0, now + 520);
    npc.attackAnim = { startedAt: now, duration: 520, weapon: '疗藤术', style: 'heal', dir: normalize(target.x - npc.x, target.y - npc.y) };
    npc.attackFlashUntil = now + 520;
    target.hp = Math.min(target.maxHp || target.hp, target.hp + 9);
    spawnBurst(target.x, target.y - 18, '#9cffb7', 14, 150, (target.radius || 17) * 0.75);
    addFloatText('+疗藤', target.x, target.y - 52, '#9cffb7');
    return true;
}

function cultHealerTarget(npc) {
    const village = homeVillageFor(npc) || activeJungleCultVillage;
    const allies = (npc.outside ? state.outdoorVillagers : (state.indoor?.objects || []))
        .filter(item => item !== npc && item.kind === 'npc' && item.hp > 0 && item.hp < (item.maxHp || 80))
        .filter(item => homeVillageFor(item) === village)
        .filter(item => !npc.outside || distance(item, npc) < 320);
    const monsters = npc.outside ? state.enemies
        .filter(enemy => enemy.controlledByCult && enemy.hp > 0 && enemy.hp < enemy.maxHp && distance(enemy, npc) < 360) : [];
    return [...allies, ...monsters].sort((a, b) => (a.hp / (a.maxHp || a.hp)) - (b.hp / (b.maxHp || b.hp)))[0] || null;
}

function castCultHealerVines(npc, now, target = state.player) {
    npc.nextAttackAt = now + 1450;
    npc.attackAnim = { startedAt: now, duration: 520, weapon: '缠藤术', style: 'root', dir: normalize(target.x - npc.x, target.y - npc.y) };
    npc.attackFlashUntil = now + 520;
    if (target === state.player) {
        state.player.slowUntil = Math.max(state.player.slowUntil || 0, now + 2600);
        state.player.dizzyUntil = Math.max(state.player.dizzyUntil || 0, now + 650);
        state.player.stamina = Math.max(0, state.player.stamina - 16);
        addFloatText('藤蔓缠身', state.player.x, state.player.y - 56, '#9cffb7');
    } else if (target?.kind === 'npc') {
        target.rootedUntil = Math.max(target.rootedUntil || 0, now + 1400);
        addFloatText('藤缠', target.x, target.y - 52, '#9cffb7');
    } else if (target?.hp > 0) {
        target.rootedUntil = Math.max(target.rootedUntil || 0, now + 1600);
        target.attackCooldown = Math.max(target.attackCooldown || 0, 0.55);
        target.hp -= 3;
        target.hurtUntil = now + 180;
        addFloatText('藤缠', target.x, target.y - 52, '#9cffb7');
    }
    spawnBurst(target.x, target.y - 10, '#5fae49', 16, 150, (target.radius || 17) * 0.8);
}

function updateVineSpeakerAutoControl(npc, now) {
    if (npc.role !== 'cultHerbalist' || npc.hp <= 0 || !npc.outside) return false;
    if (now < (npc.nextControlCheckAt || 0)) return false;
    npc.nextControlCheckAt = now + 500;
    if (!hasUncontrolledJungleCreatureNearby(npc, 980)) return false;
    if (now < (npc.nextControlAt || 0)) return false;
    npc.nextControlAt = now + 1500;
    commandJungleMonsters(npc, now);
    npc.workState = '驭使丛林';
    npc.workStateUntil = now + 2600;
    return true;
}

function hasUncontrolledJungleCreatureNearby(point, range = 980) {
    return state.enemies.some(enemy => isControlledJungleMonster(enemy)
        && enemy.hp > 0
        && !enemy.controlledByCult
        && distance(enemy, point) < range);
}

function commandJungleMonsters(npc, now) {
    npc.nextAttackAt = now + 1300;
    npc.attackAnim = { startedAt: now, duration: 520, weapon: '驭藤号令', style: 'command' };
    npc.attackFlashUntil = now + 520;
    const attackPlayer = cultControlledMonstersShouldAttackPlayer();
    const commanded = state.enemies
        .filter(enemy => isControlledJungleMonster(enemy) && enemy.hp > 0 && distance(enemy, npc) < 1100)
        .sort((a, b) => distance(a, npc) - distance(b, npc))
        .slice(0, 12);
    if (!commanded.length) {
        const summoned = summonControlledJungleMonster(npc, now, attackPlayer);
        if (summoned) commanded.push(summoned);
    }
    commanded.forEach(enemy => {
        markJungleMonsterControlled(enemy, attackPlayer);
        spawnBurst(enemy.x, enemy.y - 8, '#5fae49', 6, 80, enemy.radius * 0.45);
    });
    spawnBurst(npc.x, npc.y - 36, '#8cff66', 16, 130, 28);
    addFloatText(commanded.length ? (attackPlayer ? `驭使 ${commanded.length}` : `约束 ${commanded.length}`) : '召唤丛林', npc.x, npc.y - 58, '#9cffb7');
}

function summonControlledJungleMonster(npc, now, attackPlayer) {
    if (state.enemies.filter(enemy => isControlledJungleMonster(enemy) && enemy.hp > 0 && distance(enemy, npc) < 1100).length >= 10) return null;
    const village = homeVillageFor(npc) || activeJungleCultVillage;
    const kind = seededUnit(Math.floor(now / 1000), npc.x + npc.y) > 0.58 ? 'vineStalker' : 'jungleSnake';
    for (let i = 0; i < 16; i++) {
        const angle = i / 16 * Math.PI * 2 + seededUnit(npc.x, i) * 0.3;
        const radius = 150 + seededUnit(npc.y, i) * 260;
        const target = {
            x: clamp(npc.x + Math.cos(angle) * radius, 80, WORLD.width - 80),
            y: clamp(npc.y + Math.sin(angle) * radius, 80, WORLD.height - 80),
        };
        const point = terrainInfoAt(target.x, target.y).kind === 'jungle' ? target : nearestJunglePoint(target.x, target.y, village || activeJungleCultVillage || target);
        if (state.enemies.some(enemy => enemy.hp > 0 && distance(enemy, point) < 70)) continue;
        const enemy = makeEnemy(kind, point.x, point.y);
        markJungleMonsterControlled(enemy, attackPlayer);
        state.enemies.push(enemy);
        spawnBurst(point.x, point.y - 10, '#8cff66', 16, 150, enemy.radius);
        return enemy;
    }
    return null;
}

function isControlledJungleMonster(enemy) {
    return enemy.kind === 'jungleSnake' || enemy.kind === 'vineStalker';
}

function isJungleCultControlledMonster(enemy) {
    return isControlledJungleMonster(enemy) && !!enemy.controlledByCult;
}

function markJungleMonsterControlled(enemy, attackPlayer = false) {
    enemy.controlledByCult = true;
    enemy.villagerTarget = null;
    enemy.attackTarget = attackPlayer ? state.player : null;
    enemy.rootedUntil = 0;
    enemy.retreatUntil = 0;
}

function jungleCultControlInfluenceRadius() {
    return Math.max(2200, (activeJungleCultVillage?.radius || 0) + 900);
}

function isInJungleCultControlInfluence(point) {
    return !!activeJungleCultVillage && distance(point, activeJungleCultVillage) < jungleCultControlInfluenceRadius();
}

function cultControlledMonstersShouldAttackPlayer() {
    const village = activeJungleCultVillage;
    if (!village) return false;
    return !!village.cultHerbalistAttacked || jungleCultDislikesPlayer();
}

function jungleCultDislikesPlayer() {
    const village = activeJungleCultVillage;
    if (!village) return false;
    return village.hostile
        || villageReputation(village) <= -3
        || villageNpcList(village).some(npc => npc.hp > 0 && npc.playerAggro);
}

function throwPoisonBottleAt(npc, target, now) {
    const cult = npc.role?.startsWith('cult');
    const variants = cult ? [
        { kind: 'neuroBottle', weapon: '神经毒素', damage: 5, force: 110, shake: 7, burst: 18, color: '#d5ffd8', duration: 390, cooldown: 1500, style: 'throw', effect: 'neuro' },
        { kind: 'hungerBottle', weapon: '饥饿之毒', damage: 2, force: 85, shake: 4, burst: 12, color: '#cde77b', duration: 360, cooldown: 1450, style: 'throw', effect: 'hunger' },
        { kind: 'weakBottle', weapon: '虚弱之毒', damage: 4, force: 100, shake: 5, burst: 14, color: '#9cffb7', duration: 360, cooldown: 1350, style: 'throw', effect: 'weak' },
        { kind: 'rootBottle', weapon: '藤根毒', damage: 4, force: 105, shake: 5, burst: 14, color: '#7dcbe8', duration: 360, cooldown: 1450, style: 'throw', effect: 'root' },
    ] : [
        { kind: 'poisonBottle', weapon: '强毒药剂', damage: 8, force: 130, shake: 6, burst: 16, color: '#8cff66', duration: 360, cooldown: 1250, style: 'throw', effect: 'poison' },
        { kind: 'slowBottle', weapon: '冰蓝迟缓药剂', damage: 4, force: 105, shake: 5, burst: 14, color: '#7dcbe8', duration: 360, cooldown: 1400, style: 'throw', effect: 'slow' },
        { kind: 'blindBottle', weapon: '紫雾眩晕药剂', damage: 3, force: 115, shake: 6, burst: 16, color: '#d94bff', duration: 360, cooldown: 1600, style: 'throw', effect: 'dizzy' },
    ];
    const profile = variants[Math.floor((now / 700 + npc.x) % variants.length)];
    npc.nextAttackAt = now + profile.cooldown;
    npc.attackAnim = { startedAt: now, duration: profile.duration, weapon: profile.weapon, style: 'throw' };
    npc.attackFlashUntil = now + profile.duration;
    state.indoorProjectiles ||= [];
    state.indoorProjectiles.push({
        kind: profile.kind,
        indoor: !!state.indoor,
        npc,
        x: npc.x + (npc.facing === -1 ? -18 : 18),
        y: npc.y - 30,
        startX: npc.x + (npc.facing === -1 ? -18 : 18),
        startY: npc.y - 30,
        target,
        targetX: target.x,
        targetY: target.y - 12,
        startedAt: now,
        duration: 520,
        profile,
        splashRadius: state.player.radius + 26,
        villageWar: isVillageWarTarget(npc, target),
    });
    spawnBurst(npc.x + npc.facing * 18, npc.y - 30, profile.color, 5, 80, 8);
}

function throwKitchenKnife(npc, now) {
    throwKitchenKnifeAt(npc, state.player, now);
}

function throwKitchenKnifeAt(npc, target, now) {
    const profile = { weapon: '孤注一掷菜刀', damage: 22, force: 560, shake: 20, burst: 14, color: '#d8e5f2', duration: 330, cooldown: 1800, style: 'throw' };
    npc.knifeThrown = true;
    npc.nextAttackAt = now + profile.cooldown;
    npc.attackAnim = { startedAt: now, duration: profile.duration, weapon: profile.weapon, style: 'throw' };
    npc.attackFlashUntil = now + profile.duration;
    state.indoorProjectiles ||= [];
    state.indoorProjectiles.push({
        kind: 'kitchenKnife',
        indoor: !!state.indoor,
        npc,
        x: npc.x + npc.facing * 18,
        y: npc.y - 28,
        startX: npc.x + npc.facing * 18,
        startY: npc.y - 28,
        target,
        targetX: target.x,
        targetY: target.y - 8,
        startedAt: now,
        duration: 430,
        profile,
        splashRadius: state.player.radius + 8,
    });
    showToast('厨师孤注一掷，把菜刀扔了出来！');
}

function beginGuardArrowCharge(npc, target, now, profile = villagerAttackProfile(npc, distance(npc, target))) {
    npc.nextAttackAt = now + profile.cooldown;
    npc.attackAnim = { startedAt: now, duration: profile.duration, weapon: profile.weapon, style: 'guardArrowCharge', dir: normalize(target.x - npc.x, target.y - npc.y) };
    npc.attackFlashUntil = now + profile.duration;
    npc.pendingAttack = { profile, target, dir: normalize(target.x - npc.x, target.y - npc.y), hitAt: now + profile.duration * 0.62, guardArrow: true };
}

function shootGuardArrowAt(npc, target, now, profile = villagerAttackProfile(npc, distance(npc, target)), dir = normalize(target.x - npc.x, target.y - npc.y)) {
    npc.attackAnim = { startedAt: now, duration: 180, weapon: profile.weapon, style: 'guardArrowRelease', dir };
    state.indoorProjectiles ||= [];
    state.indoorProjectiles.push({
        kind: 'guardArrow',
        indoor: !!state.indoor,
        npc,
        x: npc.x + (npc.facing === -1 ? -18 : 18),
        y: npc.y - 28,
        startX: npc.x + (npc.facing === -1 ? -18 : 18),
        startY: npc.y - 28,
        target,
        targetX: npc.x + dir.x * 520,
        targetY: npc.y - 10 + dir.y * 520,
        startedAt: now,
        duration: 320,
        profile,
        splashRadius: (target.radius || state.player.radius) + 6,
        villageWar: isVillageWarTarget(npc, target),
    });
    spawnBurst(npc.x + npc.facing * 18, npc.y - 28, '#d8e5f2', 5, 80, 8);
}

function castElderSpell(npc, now) {
    castElderSpellAt(npc, state.player, now);
}

function castElderSpellAt(npc, target, now) {
    const variants = [
        { kind: 'elderSpell', weapon: '权杖法术', damage: 9, force: 165, shake: 7, burst: 12, color: '#b77dff', duration: 430, cooldown: 1050, style: 'spell', effect: 'arcane' },
        { kind: 'elderRoot', weapon: '精准束缚法术', damage: 5, force: 55, shake: 6, burst: 12, color: '#ffd166', duration: 480, cooldown: 1250, style: 'spell', effect: 'root', homing: 0.18 },
    ];
    const profile = variants[Math.floor((now / 900 + npc.y) % variants.length)];
    npc.nextAttackAt = now + profile.cooldown;
    npc.attackAnim = { startedAt: now, duration: profile.duration, weapon: profile.weapon, style: 'spell' };
    npc.attackFlashUntil = now + profile.duration;
    state.indoorProjectiles ||= [];
    state.indoorProjectiles.push({
        kind: profile.kind,
        indoor: !!state.indoor,
        npc,
        x: npc.x + npc.facing * 18,
        y: npc.y - 42,
        startX: npc.x + npc.facing * 18,
        startY: npc.y - 42,
        target,
        targetX: target.x,
        targetY: target.y - 18,
        startedAt: now,
        duration: 620,
        profile,
        splashRadius: profile.effect === 'root' ? state.player.radius + 24 : state.player.radius + 22,
        villageWar: isVillageWarTarget(npc, target),
    });
    spawnBurst(npc.x + npc.facing * 18, npc.y - 42, profile.color, 8, 120, 12);
}

function updateIndoorProjectiles(dt, now) {
    if (!state.indoorProjectiles.length) return;
    for (const projectile of state.indoorProjectiles) {
        if (!!state.indoor !== !!projectile.indoor) continue;
        const previous = { x: projectile.x, y: projectile.y };
        const progress = clamp((now - projectile.startedAt) / projectile.duration, 0, 1);
        const arc = projectile.kind === 'guardArrow' ? 0 : Math.sin(progress * Math.PI) * 26;
        const liveTarget = projectile.target?.hp > 0 ? projectile.target : (projectile.villageWar ? null : state.player);
        if (projectile.villageWar && !liveTarget) {
            projectile.done = true;
            missIndoorProjectile(projectile);
            continue;
        }
        if (projectile.profile?.homing && progress < 0.72) {
            projectile.targetX = lerp(projectile.targetX, liveTarget.x, projectile.profile.homing);
            projectile.targetY = lerp(projectile.targetY, liveTarget.y - 18, projectile.profile.homing);
        }
        projectile.x = lerp(projectile.startX, projectile.targetX, progress);
        projectile.y = lerp(projectile.startY, projectile.targetY, progress) - arc;
        if (Math.random() < 0.75) {
            addParticle({
                x: projectile.x,
                y: projectile.y,
                vx: (Math.random() - 0.5) * 28,
                vy: 18 + Math.random() * 24,
            color: projectile.profile?.color || (Math.random() < 0.5 ? '#8cff66' : '#d94bff'),
                size: 2 + Math.random() * 2,
                life: 0.16,
            });
        }
        const hitRadius = projectile.splashRadius || state.player.radius + 10;
        if ((projectile.kind === 'guardArrow' || projectile.owner === 'player') && indoorProjectileBlockedByWall(previous, projectile)) {
            projectile.done = true;
            impactIndoorProjectileWall(projectile);
            continue;
        }
        if (projectile.owner === 'player') {
            const hit = findIndoorPlayerProjectileHit(projectile, previous);
            if (hit) {
                projectile.done = true;
                applyIndoorPlayerProjectileHit(projectile, hit);
            } else if (progress >= 1) {
                projectile.done = true;
                missIndoorProjectile(projectile);
            }
            continue;
        }
        const directHit = progress < 1 && progress > 0.1 && projectileHitsTarget(projectile, previous, liveTarget, (liveTarget.radius || state.player.radius) + 10);
        const landingHit = progress >= 1 && indoorProjectileLandingHitsPlayer(projectile, hitRadius);
        if (directHit || landingHit) {
            projectile.done = true;
            applyIndoorProjectileHit(projectile);
        } else if (progress >= 1) {
            projectile.done = true;
            missIndoorProjectile(projectile);
        }
    }
    state.indoorProjectiles = state.indoorProjectiles.filter(projectile => !projectile.done);
}

function findIndoorPlayerProjectileHit(projectile, previous) {
    return (state.indoor?.objects || [])
        .filter(object => ['npc', 'totem'].includes(object.kind) && (object.hp ?? 0) > 0)
        .map(object => ({ target: object, d: distanceToSegment(object, previous, projectile), radius: (object.radius || 17) + 10 }))
        .filter(hit => hit.d <= hit.radius)
        .sort((a, b) => a.d - b.d)[0]?.target || null;
}

function applyIndoorPlayerProjectileHit(projectile, target) {
    const now = performance.now();
    const damage = directProjectileDamage(projectile);
    const attackProfile = { name: directProjectileName(projectile), damage, dir: projectile.dir || state.player.facing };
    if (target.kind === 'totem') damageVillageTotem(target, now, attackProfile);
    else damageVillager(target, now, attackProfile);
    if ((projectile.kind === 'poisonArrow' || projectile.kind === 'crossbowPoisonBolt') && target.kind !== 'totem' && target.hp > 0) {
        target.poisonUntil = Math.max(target.poisonUntil || 0, now + 5200);
        target.poisonTickAt = Math.min(target.poisonTickAt || now + 800, now + 800);
        addFloatText('中毒', target.x, target.y - 54, '#9cff7a');
    }
    spawnBurst(projectile.x, projectile.y, projectile.kind === 'poisonArrow' || projectile.kind === 'crossbowPoisonBolt' ? '#8cff66' : '#d8e5f2', projectile.kind === 'slingshotPebble' || projectile.kind === 'slingStone' ? 6 : 12, 85, (target.radius || 17) * 0.55);
}

function projectileHitsTarget(projectile, previous, target, radius) {
    if (!target || target.hp <= 0) return false;
    if (distance(projectile, target) <= radius) return true;
    return distanceToSegment(target, previous, projectile) <= radius;
}

function indoorProjectileBlockedByWall(previous, projectile) {
    if (!state.indoor) return false;
    const length = Math.max(1, distance(previous, projectile));
    const steps = Math.max(1, Math.ceil(length / 8));
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const point = {
            x: lerp(previous.x, projectile.x, t),
            y: lerp(previous.y, projectile.y, t),
            radius: 5,
            kind: 'projectile',
        };
        if (indoorProjectileBlockedAt(point)) return true;
    }
    return false;
}

function indoorProjectileBlockedAt(point) {
    if (indoorWallCollides(point)) return true;
    return state.indoor.objects.some(object => {
        if (!object.solid || object.action === 'leave' || object.kind === 'npc' || object.kind === 'totem') return false;
        return rectCircleOverlap(indoorCollisionRect(object), point);
    });
}

function impactIndoorProjectileWall(projectile) {
    const color = projectile.profile?.color || '#d8e5f2';
    spawnBurst(projectile.x, projectile.y, color, 8, 90, 10);
    addFloatText('被墙挡住', projectile.x, projectile.y - 22, '#d8e5f2');
}

function indoorProjectileLandingHitsPlayer(projectile, hitRadius) {
    if (projectile.villageWar) return indoorProjectileLandingHitsTarget(projectile, hitRadius);
    if (projectile.target && projectile.target !== state.player) {
        const impact = { x: projectile.targetX, y: projectile.targetY + 18 };
        return projectile.target.hp > 0 && Math.hypot(projectile.target.x - impact.x, projectile.target.y - impact.y) <= hitRadius;
    }
    const impact = { x: projectile.targetX, y: projectile.targetY + 18 };
    return Math.hypot(state.player.x - impact.x, state.player.y - impact.y) <= hitRadius;
}

function indoorProjectileLandingHitsTarget(projectile, hitRadius) {
    if (!projectile.target || projectile.target.hp <= 0) return false;
    const impact = { x: projectile.targetX, y: projectile.targetY + 18 };
    return Math.hypot(projectile.target.x - impact.x, projectile.target.y - impact.y) <= hitRadius;
}

function missIndoorProjectile(projectile) {
    const impact = { x: projectile.targetX, y: projectile.targetY + 18 };
    const color = projectile.profile?.color || '#d8e5f2';
    spawnBurst(impact.x, impact.y, color, 10, 130, projectile.kind === 'poisonBottle' ? 18 : 12);
    addFloatText('未命中', impact.x, impact.y - 28, '#d8e5f2');
}

function applyIndoorProjectileHit(projectile) {
    if (projectile.villageWar) {
        if (projectile.target?.hp > 0) damageAnimalByVillagerProjectile(projectile);
        return;
    }
    if (projectile.target && projectile.target !== state.player) {
        damageAnimalByVillagerProjectile(projectile);
        return;
    }
    const p = state.player;
    const profile = projectile.profile;
    const damage = incomingDamageAfterArmor(profile.damage, false);
    p.hp = Math.max(0, p.hp - damage);
    closeInventoryOnPlayerHit();
    if (projectile.profile?.effect === 'poison') {
        p.poisonUntil = Math.max(p.poisonUntil || 0, performance.now() + 6200);
        p.poisonTickAt = Math.min(p.poisonTickAt || performance.now() + 900, performance.now() + 900);
        p.stamina = Math.max(0, p.stamina - 18);
        addFloatText('强毒', p.x, p.y - 52, '#8cff66');
    } else if (projectile.profile?.effect === 'slow') {
        p.speedBoostUntil = Math.min(p.speedBoostUntil || 0, performance.now());
        p.slowUntil = Math.max(p.slowUntil || 0, performance.now() + 15000);
        p.dizzyUntil = Math.max(p.dizzyUntil || 0, performance.now() + 450);
        p.stamina = Math.max(0, p.stamina - 28);
        addFloatText('迟缓 -50%', p.x, p.y - 52, '#7dcbe8');
    } else if (projectile.profile?.effect === 'dizzy' || projectile.profile?.effect === 'root') {
        p.dizzyUntil = Math.max(p.dizzyUntil || 0, performance.now() + (projectile.profile.effect === 'root' ? 1100 : 1050));
        p.stamina = Math.max(0, p.stamina - (projectile.profile.effect === 'root' ? 24 : 38));
        addFloatText(projectile.profile.effect === 'root' ? '束缚' : '眩晕', p.x, p.y - 52, projectile.profile.color);
    } else if (projectile.profile?.effect === 'neuro') {
        p.neuroToxinUntil = Math.max(p.neuroToxinUntil || 0, performance.now() + 5200);
        p.neuroToxinTickAt = Math.min(p.neuroToxinTickAt || performance.now() + 400, performance.now() + 400);
        p.dizzyUntil = Math.max(p.dizzyUntil || 0, performance.now() + 700);
        state.cameraShake = Math.max(state.cameraShake, 13);
        addFloatText('神经毒', p.x, p.y - 52, '#d5ffd8');
    } else if (projectile.profile?.effect === 'hunger') {
        p.hungerToxinUntil = Math.max(p.hungerToxinUntil || 0, performance.now() + 4800);
        p.hunger = clamp(p.hunger - 5, 0, p.maxHunger);
        state.cameraShake = Math.max(state.cameraShake, 7);
        addFloatText('饥饿毒', p.x, p.y - 52, '#cde77b');
    } else if (projectile.profile?.effect === 'weak') {
        p.weakToxinUntil = Math.max(p.weakToxinUntil || 0, performance.now() + 7000);
        state.cameraShake = Math.max(state.cameraShake, 8);
        addFloatText('虚弱毒', p.x, p.y - 52, '#9cffb7');
    }
    const dir = normalize(p.x - projectile.startX, p.y - projectile.startY);
    const soft = ['poison', 'slow', 'dizzy', 'arcane', 'root', 'totem'].includes(profile.effect) ? 0.45 : 1;
    applyPlayerSoftKnockback(dir, profile.force, soft);
    p.invincibleUntil = performance.now() + 520;
    state.cameraShake = Math.max(state.cameraShake, profile.shake);
    spawnBurst(projectile.x, projectile.y, profile.color, 16, 190, 18);
    for (let i = 0; i < 18; i++) {
        addParticle({
            x: projectile.x + (Math.random() - 0.5) * 28,
            y: projectile.y + (Math.random() - 0.5) * 18,
            vx: (Math.random() - 0.5) * 90,
            vy: (Math.random() - 0.5) * 70,
            color: profile.color,
            size: 3 + Math.random() * 3,
            life: 0.35 + Math.random() * 0.2,
        });
    }
    if (projectile.profile?.effect === 'poison') addFloatText('中毒', p.x, p.y - 66, '#8cff66');
    addFloatText(`-${damage}`, p.x, p.y - 36, '#ffb3b3');
    const sourceText = projectile.profile?.weapon || (projectile.kind === 'kitchenKnife' ? '厨师扔出的菜刀' : '村民的攻击');
    showToast(`${sourceText}命中你，生命 -${damage}`);
    if (p.hp <= 0) {
        triggerPlayerDeath('你被药师的毒药击倒了。');
    }
    renderHud();
}

function damageAnimalByVillagerProjectile(projectile) {
    const animal = projectile.target;
    const profile = projectile.profile;
    if (!animal || animal.hp <= 0) return;
    if (animal.kind === 'npc') {
        damageVillagerByVillager(animal, projectile.npc, profile);
        spawnBurst(projectile.x, projectile.y, profile.color, 10, 150, (animal.radius || 17) * 0.6);
        return;
    }
    animal.hp -= profile.damage;
    animal.hurtUntil = performance.now() + 180;
    animal.villagerTarget = projectile.npc;
    applyAnimalKnockback(animal, normalize(animal.x - projectile.startX, animal.y - projectile.startY), profile.force, profile.style);
    spawnBurst(projectile.x, projectile.y, profile.color, 14, 170, animal.radius * 0.65);
    addFloatText(`-${profile.damage}`, animal.x, animal.y - 38, '#fff3b0');
    if (profile.effect === 'poison') {
        animal.poisonUntil = Math.max(animal.poisonUntil || 0, performance.now() + 4200);
        animal.poisonTickAt = Math.min(animal.poisonTickAt || performance.now() + 900, performance.now() + 900);
    }
    if (animal.hp <= 0) {
        animal.deathAt = performance.now();
        showToast(`${projectile.npc?.label || '村民'} 击倒了${animal.name}。`);
    }
}

function updateHunger(dt, now) {
    const p = state.player;
    const moving = keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d')
        || keys.has('ArrowUp') || keys.has('ArrowDown') || keys.has('ArrowLeft') || keys.has('ArrowRight')
        || Math.abs(touchInput.moveX) > 0.05 || Math.abs(touchInput.moveY) > 0.05;
    const idleDrain = 33 / state.dayLength;
    const drain = idleDrain * (1 + (moving ? 0.7 : 0) + (keys.has('Shift') ? 0.8 : 0) + (isAimingDirectRanged() ? 0.35 : 0));
    p.hunger = clamp(p.hunger - drain * dt, 0, p.maxHunger);
    if (p.hunger <= 0) {
        p.hp = 0;
        triggerPlayerDeath('饥饿耗尽，你倒下了。');
        renderHud();
        return;
    }
    if (p.hunger < 18) {
        p.stamina = Math.min(p.stamina, 36);
        if (now > p.nextHungerDizzyAt) {
            p.dizzyUntil = now + 850;
            p.nextHungerDizzyAt = now + 3600 + p.hunger * 80;
            addFloatText('眩晕', p.x, p.y - 54, '#ffd166');
            showToast('太饿了，开始眩晕。');
        }
    } else if (p.hunger < 35) {
        p.stamina = Math.min(p.stamina, 65);
    }
    if (now > (p.hungerTickAt || 0)) {
        p.hungerTickAt = now + 1000;
        renderHud();
    }
}

function hungerMoveFactor() {
    const hunger = state.player.hunger;
    if (hunger < 18) return 0.72;
    if (hunger < 35) return 0.86;
    return 1;
}

function hungerStaminaFactor() {
    const hunger = state.player.hunger;
    if (hunger < 18) return 0.25;
    if (hunger < 35) return 0.55;
    return 1;
}

function updatePoison(dt, now) {
    const p = state.player;
    if (p.poisonUntil <= now) return;
    p.stamina = Math.max(0, p.stamina - 7 * dt);
    if (Math.random() < 0.18) spawnBurst(p.x, p.y - 12, '#8cff66', 1, 45, p.radius * 0.4);
    if (now < p.poisonTickAt) return;
    p.poisonTickAt = now + 1000;
    p.hp = Math.max(0, p.hp - 1);
    addFloatText('-1 毒', p.x, p.y - 46, '#9cff7a');
    if (p.hp <= 0) {
        triggerPlayerDeath('毒素耗尽了你的生命。');
    }
    renderHud();
}

function updateCultToxins(dt, now) {
    const p = state.player;
    if ((p.neuroToxinUntil || 0) > now) {
        if (Math.random() < 0.16) spawnBurst(p.x, p.y - 16, '#d5ffd8', 1, 40, p.radius * 0.35);
        if (now >= (p.neuroToxinTickAt || 0)) {
            p.neuroToxinTickAt = now + 520;
            p.hp = Math.max(0, p.hp - 2);
            p.dizzyUntil = Math.max(p.dizzyUntil || 0, now + 360);
            addFloatText('-2 神经毒', p.x, p.y - 58, '#d5ffd8');
            if (p.hp <= 0) triggerPlayerDeath('神经毒素侵蚀了你的生命。');
            renderHud();
        }
    }
    if ((p.hungerToxinUntil || 0) > now) {
        p.hunger = clamp(p.hunger - 3.5 * dt, 0, p.maxHunger);
        if (Math.random() < 0.04) addFloatText('饥饿毒', p.x, p.y - 58, '#cde77b');
        renderHud();
    }
}

function isBlocking() {
    return !state.inventoryOpen
        && state.equipment.shield !== '无'
        && (keys.has('f') || mouse.blocking)
        && state.player.stamina > 4;
}

function moveCircle(entity, dx, dy) {
    entity.x = clamp(entity.x + dx, entity.radius, WORLD.width - entity.radius);
    if (collides(entity)) entity.x = clamp(entity.x - dx, entity.radius, WORLD.width - entity.radius);
    entity.y = clamp(entity.y + dy, entity.radius, WORLD.height - entity.radius);
    if (collides(entity)) entity.y = clamp(entity.y - dy, entity.radius, WORLD.height - entity.radius);
}

function moveIndoorPlayer(player, dx, dy) {
    const oldX = player.x;
    const oldY = player.y;
    player.x = clamp(player.x + dx, 230, VIEW.width - 230);
    player.y = clamp(player.y + dy, 182, VIEW.height - 170);
    if (indoorCollides(player)) {
        player.x = oldX;
        player.y = oldY;
    }
}

function moveIndoorEntitySafely(entity, dx, dy) {
    const oldX = entity.x;
    const oldY = entity.y;
    entity.x += dx;
    entity.y += dy;
    if (indoorCollides(entity)) {
        entity.x = oldX;
        entity.y = oldY;
        tryIndoorEntityAvoidance(entity, dx, dy);
    }
}

function tryIndoorEntityAvoidance(entity, dx, dy) {
    const speed = Math.hypot(dx, dy);
    if (speed < 0.05) return false;
    const dir = normalize(dx, dy);
    const options = [
        { x: dx, y: 0 },
        { x: 0, y: dy },
        { x: -dir.y * speed, y: dir.x * speed },
        { x: dir.y * speed, y: -dir.x * speed },
        { x: (dir.x - dir.y * 0.65) * speed * 0.72, y: (dir.y + dir.x * 0.65) * speed * 0.72 },
        { x: (dir.x + dir.y * 0.65) * speed * 0.72, y: (dir.y - dir.x * 0.65) * speed * 0.72 },
    ];
    return options.some(step => tryIndoorEntityStep(entity, step.x, step.y));
}

function tryIndoorEntityStep(entity, dx, dy) {
    const oldX = entity.x;
    const oldY = entity.y;
    entity.x += dx;
    entity.y += dy;
    if (!indoorCollides(entity)) return true;
    entity.x = oldX;
    entity.y = oldY;
    return false;
}

function escapeIndoorCollision(entity) {
    if (!state.indoor || !indoorCollides(entity)) return;
    const candidates = [
        [0, 0], [18, 0], [-18, 0], [0, 18], [0, -18],
        [26, 18], [-26, 18], [26, -18], [-26, -18],
        [42, 0], [-42, 0], [0, 42], [0, -42],
    ];
    const origin = { x: entity.x, y: entity.y };
    for (const [ox, oy] of candidates) {
        entity.x = clamp(origin.x + ox, 230, VIEW.width - 230);
        entity.y = clamp(origin.y + oy, 182, VIEW.height - 170);
        if (!indoorCollides(entity)) return;
    }
    entity.x = VIEW.width / 2;
    entity.y = 300;
}

function indoorCollides(entity) {
    if (!state.indoor) return false;
    if (indoorWallCollides(entity)) return true;
    return state.indoor.objects.some(object => object.solid && object.action !== 'leave' && rectCircleOverlap(indoorCollisionRect(object), entity));
}

function indoorCollisionRect(object) {
    if (object.kind === 'npc') return { ...object, w: 0, h: 0 };
    if (['forge', 'potionTable', 'hearth', 'map', 'noticeBoard', 'rack', 'herbRack', 'meatRack', 'shopShelf', 'brokenShelf', 'flag'].includes(object.kind)) {
        return { ...object, h: Math.max(22, object.h * 0.55), y: object.y - object.h * 0.08 };
    }
    if (['chest', 'crate', 'foodCrate'].includes(object.kind)) {
        return { ...object, h: Math.max(24, object.h * 0.62), y: object.y - object.h * 0.06 };
    }
    if (object.kind === 'bed' || object.kind === 'brokenBed') return { ...object, w: object.w * 0.72, h: object.h * 0.72 };
    if (['brokenTable', 'debris'].includes(object.kind)) return { ...object, w: object.w * 0.78, h: object.h * 0.78 };
    if (['coalPile', 'basket', 'cookPot'].includes(object.kind)) return { ...object, w: object.w * 0.72, h: object.h * 0.72 };
    return object;
}

function indoorWallCollides(entity) {
    const left = 196 + 28;
    const right = VIEW.width - 224;
    const top = 132 + 28;
    const bottom = VIEW.height - 138;
    const doorLeft = VIEW.width / 2 - 48;
    const doorRight = VIEW.width / 2 + 48;
    const combatNpc = entity.kind === 'npc' && (entity.playerAggro || entity.animalAggressor || entity.mood === 'angry');
    if (entity.x - entity.radius < left || entity.x + entity.radius > right || entity.y - entity.radius < top) return true;
    if (entity.y + entity.radius > bottom && (entity.x < doorLeft || entity.x > doorRight)) return true;
    if (!combatNpc && entity.y + entity.radius > bottom + 38 && entity.x >= doorLeft && entity.x <= doorRight) return true;
    if (entity.y > VIEW.height - 42) return true;
    return false;
}

function rectCircleOverlap(rect, circle) {
    const closestX = clamp(circle.x, rect.x - rect.w / 2, rect.x + rect.w / 2);
    const closestY = clamp(circle.y, rect.y - rect.h / 2, rect.y + rect.h / 2);
    return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
}

function collides(entity) {
    for (const r of nearbyResources(entity.x, entity.y, 260)) {
        if (!isSolidResource(r)) continue;
        const range = entity.radius + r.radius * resourceCollisionScale(r, entity);
        if (r.hp > 0 && Math.abs(entity.x - r.x) <= range && Math.abs(entity.y - r.y) <= range && distance(entity, r) < range) return true;
    }
    for (const fence of state.placedFences) {
        if (distance(entity, fence) < entity.radius + fence.radius) return true;
    }
    for (const station of state.placedStations) {
        if (distance(entity, station) < entity.radius + station.radius * 0.75) return true;
    }
    if (distance(entity, state.ruins) < entity.radius + state.ruins.radius && !state.ruins.opened) return true;
    for (const village of allVillages()) {
        for (const building of village.buildings) {
            if (isEnemyEntity(entity)) {
                const nearHouse = Math.abs(entity.x - building.x) < entity.radius + building.w * 0.62
                    && Math.abs(entity.y - building.y) < entity.radius + building.h * 0.62;
                if (nearHouse) continue;
            }
            const halfW = building.w * 0.38;
            const frontY = building.y + building.h * 0.28;
            const halfH = building.h * 0.2;
            if (Math.abs(entity.x - building.x) < entity.radius + halfW && Math.abs(entity.y - frontY) < entity.radius + halfH) return true;
        }
        if (village.well && distance(entity, village.well) < entity.radius + village.well.radius) return true;
        if (fortressWallCollides(village, entity)) return true;
    }
    return false;
}

function fortressWallCollides(village, entity) {
    if (village?.tier !== 'fortress') return false;
    const { w, h } = fortressWallSize(village);
    const thickness = fortressWallThickness();
    const gates = fortressGates(village);
    const gateHalf = gates.north.half;
    const closed = isFortressGateClosed();
    const left = village.x - w / 2;
    const right = village.x + w / 2;
    const top = village.y - h / 2;
    const bottom = village.y + h / 2;
    const inNorthGate = !closed && Math.abs(entity.x - village.x) < gateHalf && entity.y < top + thickness * 2.1;
    const inSouthGate = !closed && Math.abs(entity.x - village.x) < gateHalf && entity.y > bottom - thickness * 2.1;
    const inWestGate = !closed && Math.abs(entity.y - village.y) < gateHalf && entity.x < left + thickness * 2.1;
    const inEastGate = !closed && Math.abs(entity.y - village.y) < gateHalf && entity.x > right - thickness * 2.1;
    if (!inNorthGate && rectCircleOverlap({ x: village.x, y: top + thickness / 2, w, h: thickness }, entity)) return true;
    if (!inSouthGate && rectCircleOverlap({ x: village.x, y: bottom - thickness / 2, w, h: thickness }, entity)) return true;
    if (!inWestGate && rectCircleOverlap({ x: left + thickness / 2, y: village.y, w: thickness, h }, entity)) return true;
    if (!inEastGate && rectCircleOverlap({ x: right - thickness / 2, y: village.y, w: thickness, h }, entity)) return true;
    return false;
}

function isSolidResource(item) {
    return [...BIOME_TREE_KINDS, 'rock', 'ore', 'bamboo', 'jungleLeafPlant', 'jungleVine', 'woodFence'].includes(item.kind);
}

function isEnemyEntity(entity) {
    return entity && Number.isFinite(entity.spawnX) && Number.isFinite(entity.spawnY) && 'attackCooldown' in entity;
}

function resourceCollisionScale(item, entity) {
    const treeLike = BIOME_TREE_KINDS.includes(item.kind);
    const enemy = isEnemyEntity(entity);
    if (treeLike) return enemy ? 0.26 : 0.42;
    if (item.kind === 'bamboo') return enemy ? 0.24 : 0.34;
    if (item.kind === 'jungleLeafPlant') return enemy ? 0.18 : 0.36;
    if (item.kind === 'jungleVine') return enemy ? 0.16 : 0.32;
    if (item.kind === 'woodFence') return 0.65;
    if (item.kind === 'rock' || item.kind === 'ore') return enemy ? 0.46 : 0.72;
    return enemy ? 0.5 : 0.72;
}

function updateBambooTraps(now) {
    for (const trap of state.bambooTraps) {
        if (trap.used) continue;
        const target = state.enemies.find(enemy => enemy.hp > 0 && distance(enemy, trap) < enemy.radius + trap.radius);
        if (!target) continue;
        trap.used = true;
        target.hp -= 5;
        target.hurtUntil = now + 220;
        target.rootedUntil = Math.max(target.rootedUntil, now + 1700);
        target.attackCooldown = Math.max(target.attackCooldown, 0.8);
        spawnBurst(target.x, target.y, '#d7f28a', 16, 130, target.radius);
        addFloatText('竹刺', target.x, target.y - 42, '#eaffad');
        if (target.hp <= 0) {
            markSpawnAreaCleared(target.x, target.y, now);
            const drops = grantEnemyDrops(target);
            addFloatText(drops.floatText, target.x, target.y - 56, '#9cffb7');
            showToast(`竹刺陷阱击败 ${target.name}，获得 ${drops.toastText}`);
            renderHud();
        }
    }
}

function tallGrassCoverAt(entity) {
    const now = performance.now();
    if (entity.tallGrassCoverCheckAt && entity.tallGrassCoverCheckAt > now) return !!entity.tallGrassCovered;
    entity.tallGrassCoverCheckAt = now + 180;
    entity.tallGrassCovered = getNearbyTallGrass(entity, entity.radius + 46).some(item => distance(entity, item) < entity.radius + item.radius + 18);
    return entity.tallGrassCovered;
}

function getNearbyTallGrass(entity, radius) {
    if (!state || !state.tallGrassGrid) return [];
    const minX = Math.floor((entity.x - radius) / COVER_GRID_SIZE);
    const maxX = Math.floor((entity.x + radius) / COVER_GRID_SIZE);
    const minY = Math.floor((entity.y - radius) / COVER_GRID_SIZE);
    const maxY = Math.floor((entity.y + radius) / COVER_GRID_SIZE);
    const items = [];
    for (let gy = minY; gy <= maxY; gy++) {
        for (let gx = minX; gx <= maxX; gx++) {
            const cell = state.tallGrassGrid.get(`${gx},${gy}`);
            if (!cell) continue;
            for (const item of cell) {
                if (item.hp > 0 && distance(entity, item) <= radius + item.radius) items.push(item);
            }
        }
    }
    return items;
}

function updateEnemies(dt, now) {
    updateWolfPackRoaming(now);
    state.enemies = state.enemies.filter(enemy => enemy.boss || enemy.hp <= 0 || distance(enemy, state.player) <= ACTIVE_ENEMY_KEEP_DISTANCE);
    for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        updateEnemyPoison(e, dt, now);
        if (e.hp <= 0) continue;
        if (e.attackCooldown > 0) e.attackCooldown -= dt;
        if (e.contactCooldown > 0) e.contactCooldown -= dt;
        if (Math.abs(e.knockX) > 1 || Math.abs(e.knockY) > 1) {
            moveEnemy(e, e.knockX * dt, e.knockY * dt);
            e.knockX *= Math.pow(0.035, dt);
            e.knockY *= Math.pow(0.035, dt);
        }
        const p = state.player;
        const dist = distance(e, p);
        const enemyTerrain = terrainInfoAt(e.x, e.y);
        const playerTerrain = terrainInfoAt(p.x, p.y);
        const ambushing = tallGrassCoverAt(e) && (e.kind === 'wolf' || e.kind === 'scorpion');
        const frogInMud = e.kind === 'frog' && enemyTerrain.kind === 'mud';
        if (e.kind === 'vineStalker' && !e.awakened && !e.hurtUntil) {
            if (dist > 240) {
                e.attackCooldown = Math.max(e.attackCooldown || 0, 0.45);
                continue;
            }
            e.awakened = true;
            e.hurtUntil = now + 180;
            spawnBurst(e.x, e.y - 10, '#5fae49', 14, 90, e.radius * 0.65);
            addFloatText('伏击', e.x, e.y - 48, '#9cffb7');
        }
        if (updateAnimalVillagerConflict(e, dt, now)) {
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            continue;
        }
        if (dist > 1400 && e.kind !== 'wolf' && !e.boss && e.rootedUntil <= now && !e.chargeUntil && !e.leapUntil && !e.swoopUntil) {
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            continue;
        }
        if (e.kind === 'bat' && nightAmount() < 0.18) {
            e.fleeingDaylight = true;
            const away = normalize(e.x - state.player.x + Math.sin(now * 0.004) * 120, e.y - state.player.y - 180);
            moveEnemy(e, away.x * e.speed * 1.45 * dt, away.y * e.speed * 1.45 * dt);
            if (distance(e, state.player) > 980 || e.y < 80 || e.x < 80 || e.x > WORLD.width - 80) e.hp = 0;
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            continue;
        }
        if (updateControlledJungleMonsterCombat(e, dt, now)) {
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            continue;
        }
        if (updateMonsterAgainstControlledMonster(e, dt, now)) {
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            continue;
        }
        if (updateNeutralCultControlledMonster(e, dt, now, dist)) {
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            continue;
        }
        if (isPassiveCreature(e.kind)) {
            updatePassiveCreature(e, dt, now, dist);
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            continue;
        }
        if (e.kind === 'wolf') {
            const handled = updateWolfPackMember(e, dt, now, dist);
            if (e.strikeAt && now >= e.strikeAt) resolveEnemyAttack(e, now);
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            if (handled) continue;
        }
        if (e.retreatUntil > now) {
            const away = normalize(e.x - p.x, e.y - p.y);
            moveEnemy(e, away.x * e.speed * 1.35 * dt, away.y * e.speed * 1.35 * dt);
            continue;
        }
        if (e.rootedUntil > now) {
            if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
            continue;
        }
        if (e.leapUntil > now) {
            const target = enemyAttackTarget(e);
            const progress = clamp((now - e.leapStartAt) / Math.max(1, e.leapUntil - e.leapStartAt), 0, 1);
            const arc = Math.sin(progress * Math.PI);
            e.x = lerp(e.leapStartX, e.leapTargetX, progress);
            e.y = lerp(e.leapStartY, e.leapTargetY, progress) - arc * 10;
            if (e.leapDamage !== false && !e.leapHit && progress > 0.55 && distance(e, target) < e.radius + target.radius + 18) {
                applyEnemyDamageToTarget(e, target, e.attack, '跳扑', now);
                e.leapHit = true;
            }
            if (e.leapDamage !== false && !e.leapHitVillager && progress > 0.55 && tryAccidentalEnemyHitVillager(e, 18, now, '跳扑误伤')) {
                e.leapHitVillager = true;
            }
            if (Math.random() < 0.45) spawnBurst(e.x, e.y + e.radius, '#5ee089', 1, 42, e.radius * 0.3);
            continue;
        } else if (e.leapUntil) {
            e.x = e.leapTargetX;
            e.y = e.leapTargetY;
            e.leapUntil = 0;
            e.leapDamage = true;
            spawnBurst(e.x, e.y, '#5ee089', 10, 110, e.radius);
        }
        if (e.chargeUntil > now) {
            const target = enemyAttackTarget(e);
            moveEnemy(e, e.attackDir.x * e.speed * 3.2 * dt, e.attackDir.y * e.speed * 3.2 * dt);
            if (Math.random() < 0.7) spawnBurst(e.x - e.attackDir.x * 18, e.y - e.attackDir.y * 18, '#c89a6a', 1, 70, e.radius * 0.35);
            if (!e.chargeHit && distance(e, target) < e.radius + target.radius + 10) {
                applyEnemyDamageToTarget(e, target, e.attack + 1, '冲撞', now);
                e.chargeHit = true;
            }
            if (!e.chargeHitVillager && tryAccidentalEnemyHitVillager(e, 12, now, '冲撞误伤')) {
                e.chargeHitVillager = true;
            }
            continue;
        } else if (e.chargeUntil) {
            e.chargeUntil = 0;
            e.attackCooldown = 1.25;
        }
        if (e.swoopUntil > now) {
            const target = enemyAttackTarget(e);
            const progress = clamp((now - e.swoopStartAt) / Math.max(1, e.swoopUntil - e.swoopStartAt), 0, 1);
            e.x = lerp(e.swoopStartX, e.swoopTargetX, progress);
            e.y = lerp(e.swoopStartY, e.swoopTargetY, progress) - Math.sin(progress * Math.PI) * 24;
            if (!e.swoopHit && progress > 0.42 && distance(e, target) < e.radius + target.radius + 24) {
                applyEnemyDamageToTarget(e, target, e.attack, '掠袭', now);
                if (target === state.player || target.kind === 'npc') {
                    drainCombatTargetStamina(target, e.kind === 'meadowMoth' ? 18 : 10);
                    if (e.kind === 'drySandWasp') poisonCombatTarget(target, now, 4200);
                    if (e.kind === 'mineCrystalBat') {
                        target.knockX = (target.knockX || 0) + e.attackDir.x * 220;
                        target.knockY = (target.knockY || 0) + e.attackDir.y * 220;
                    }
                }
                e.swoopHit = true;
            }
            if (!e.swoopHitVillager && progress > 0.42 && tryAccidentalEnemyHitVillager(e, 24, now, '掠袭误伤')) {
                e.swoopHitVillager = true;
            }
            if (Math.random() < 0.35) spawnBurst(e.x, e.y, '#8fb8ff', 1, 70, e.radius);
            continue;
        } else if (e.swoopUntil) {
            e.x = e.swoopTargetX;
            e.y = e.swoopTargetY;
            e.swoopUntil = 0;
            e.attackCooldown = 1.8;
        }
        if (!isPassiveCreature(e.kind) && dist < e.radius + p.radius + 4 && e.contactCooldown <= 0) {
            applyEnemyDamage(e, Math.max(1, e.attack - 1), '碰撞');
            e.contactCooldown = e.kind === 'boar' ? 0.7 : 0.9;
        }
        if (!isPassiveCreature(e.kind) && e.contactCooldown <= 0 && tryAccidentalEnemyHitVillager(e, 4, now, '碰撞误伤')) {
            e.contactCooldown = e.kind === 'boar' ? 0.7 : 0.9;
        }
        if (e.strikeAt && now >= e.strikeAt) {
            resolveEnemyAttack(e, now);
        }

        let aggroRange = 330 + nightAmount() * (e.kind === 'bat' ? 190 : (e.kind === 'shade' ? 190 : 90)) + (ambushing ? 120 : 0) + (frogInMud ? 70 : 0);
        if (e.kind === 'shade') aggroRange += shadeNightPower() * 120;
        if (performance.now() < p.shadowUntil) aggroRange *= 0.38;
        const nightSpeed = 1 + nightAmount() * (e.kind === 'bat' ? 0.35 : (e.kind === 'shade' ? 0.42 : 0.16));
        const biomeSpeed = (ambushing ? 1.16 : 1) * (frogInMud ? 1.22 : 1);
        if (!e.windupUntil && dist < aggroRange) {
            let dir = normalize(p.x - e.x, p.y - e.y);
            if (e.kind === 'wolf' && dist < 170 && e.attackCooldown > 0.25) {
                const tangent = { x: -dir.y * e.circleSide, y: dir.x * e.circleSide };
                dir = normalize(tangent.x * 0.82 + dir.x * 0.18, tangent.y * 0.82 + dir.y * 0.18);
                e.circleDir = dir;
            }
            moveEnemy(e, dir.x * e.speed * nightSpeed * biomeSpeed * dt, dir.y * e.speed * nightSpeed * biomeSpeed * dt);
        } else if (!e.windupUntil && distance(e, { x: e.spawnX, y: e.spawnY }) > 18) {
            const dir = normalize(e.spawnX - e.x, e.spawnY - e.y);
            moveEnemy(e, dir.x * e.speed * 0.42 * dt, dir.y * e.speed * 0.42 * dt);
        }

        if (!e.windupUntil && dist < e.radius + p.radius + e.range && e.attackCooldown <= 0) {
            if (ambushing || frogInMud || playerTerrain.kind === 'mud') e.attackCooldown = -0.01;
            startEnemyAttack(e, now);
        }

        if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
    }
    separateEnemies();
}

function enemyHasActiveSkill(e) {
    const now = performance.now();
    return (e.windupUntil && e.windupUntil > now)
        || (e.leapUntil && e.leapUntil > now)
        || (e.chargeUntil && e.chargeUntil > now)
        || (e.swoopUntil && e.swoopUntil > now)
        || (e.strikeAt && e.strikeAt > 0);
}

function updateControlledJungleMonsterCombat(e, dt, now) {
    if (!isJungleCultControlledMonster(e)) return false;
    const warTarget = chooseControlledMonsterVillageWarTarget(e);
    if (warTarget) {
        updateControlledMonsterAgainstVillager(e, warTarget, dt, now);
        return true;
    }
    const target = chooseControlledMonsterEnemyTarget(e);
    if (!target) return false;
    e.attackTarget = target;
    e.villagerTarget = null;
    e.windupUntil = 0;
    e.strikeAt = 0;
    e.leapUntil = 0;
    e.chargeUntil = 0;
    e.swoopUntil = 0;
    const dist = distance(e, target);
    const dir = normalize(target.x - e.x, target.y - e.y);
    e.facing = dir;
    if (dist > e.radius + target.radius + e.range + 8) {
        moveEnemy(e, dir.x * e.speed * 1.08 * dt, dir.y * e.speed * 1.08 * dt);
    } else if ((e.attackCooldown || 0) <= 0) {
        damageEnemyByControlledMonster(target, e, now);
        e.attackCooldown = e.kind === 'vineStalker' ? 1.25 : 0.85;
        e.retreatUntil = now + (e.kind === 'jungleSnake' ? 260 : 120);
    }
    if (now > (e.nextControlTargetTextAt || 0)) {
        e.nextControlTargetTextAt = now + 1600;
        addFloatText('驱怪', e.x, e.y - 44, '#8cff66');
    }
    return true;
}

function updateMonsterAgainstControlledMonster(e, dt, now) {
    if (isControlledJungleMonster(e) || isPassiveCreature(e.kind) || e.hp <= 0) return false;
    const target = chooseMonsterControlledTarget(e);
    if (!target) return false;
    e.attackTarget = target;
    e.villagerTarget = null;
    const dist = distance(e, target);
    const dir = normalize(target.x - e.x, target.y - e.y);
    e.facing = dir;
    if (dist > e.radius + target.radius + e.range + 8) {
        moveEnemy(e, dir.x * e.speed * 1.08 * dt, dir.y * e.speed * 1.08 * dt);
    } else if ((e.attackCooldown || 0) <= 0 && !e.windupUntil) {
        damageControlledMonsterByEnemy(target, e, now);
        e.attackCooldown = Math.max(0.75, e.kind === 'golem' ? 1.35 : 0.95);
    }
    if (now > (e.nextControlledTargetTextAt || 0)) {
        e.nextControlledTargetTextAt = now + 1800;
        addFloatText('反击受控', e.x, e.y - 44, '#ffd166');
    }
    return true;
}

function chooseMonsterControlledTarget(e) {
    if (e.attackTarget?.controlledByCult && e.attackTarget.hp > 0 && distance(e, e.attackTarget) < 760) return e.attackTarget;
    return state.enemies
        .filter(enemy => enemy !== e && enemy.hp > 0 && enemy.controlledByCult && isControlledJungleMonster(enemy))
        .filter(enemy => distance(e, enemy) < 620)
        .sort((a, b) => distance(e, a) - distance(e, b))[0] || null;
}

function damageControlledMonsterByEnemy(target, attacker, now) {
    const damage = Math.max(1, attacker.attack || 3);
    target.hp -= damage;
    target.hurtUntil = now + 180;
    target.attackTarget = attacker;
    const dir = normalize(target.x - attacker.x, target.y - attacker.y);
    target.knockX = (target.knockX || 0) + dir.x * Math.min(220, 80 + damage * 18);
    target.knockY = (target.knockY || 0) + dir.y * Math.min(220, 80 + damage * 18);
    spawnBurst(target.x, target.y, '#ffd166', 10, 140, target.radius * 0.6);
    addFloatText(`-${damage}`, target.x, target.y - 38, '#ffd166');
    if (target.hp <= 0) {
        target.hp = 0;
        target.deathAt = now;
        target.controlledByCult = false;
        attacker.attackTarget = null;
        spawnBurst(target.x, target.y, '#ffffff', 16, 220, target.radius);
    }
}

function chooseControlledMonsterVillageWarTarget(e) {
    const village = e.controlledWarTargetVillage;
    if (!village) return null;
    if (e.attackTarget?.kind === 'npc' && e.attackTarget.hp > 0 && e.attackTarget.outside && homeVillageFor(e.attackTarget) === village && distance(e, e.attackTarget) < 760) {
        return e.attackTarget;
    }
    const target = state.outdoorVillagers
        .filter(npc => npc.kind === 'npc' && npc.hp > 0 && npc.outside && homeVillageFor(npc) === village)
        .sort((a, b) => distance(e, a) - distance(e, b))[0] || null;
    if (!target) e.controlledWarTargetVillage = null;
    return target;
}

function updateControlledMonsterAgainstVillager(e, target, dt, now) {
    e.attackTarget = target;
    e.villagerTarget = null;
    e.windupUntil = 0;
    e.strikeAt = 0;
    const dist = distance(e, target);
    const dir = normalize(target.x - e.x, target.y - e.y);
    e.facing = dir;
    if (dist > e.radius + target.radius + e.range + 8) {
        moveEnemy(e, dir.x * e.speed * 1.12 * dt, dir.y * e.speed * 1.12 * dt);
    } else if ((e.attackCooldown || 0) <= 0) {
        damageVillagerByControlledMonster(target, e, now);
        e.attackCooldown = e.kind === 'vineStalker' ? 1.25 : 0.85;
    }
}

function damageVillagerByControlledMonster(target, attacker, now) {
    const damage = Math.max(2, attacker.kind === 'vineStalker' ? attacker.attack + 1 : attacker.attack);
    target.hp -= damage;
    target.hurtUntil = now + 180;
    target.villagerAggressor = null;
    target.animalAggressor = attacker;
    target.playerAggro = false;
    target.mood = 'annoyed';
    target.returningHome = false;
    const dir = normalize(target.x - attacker.x, target.y - attacker.y);
    target.knockX = (target.knockX || 0) + dir.x * 150;
    target.knockY = (target.knockY || 0) + dir.y * 150;
    if (attacker.kind === 'jungleSnake') poisonCombatTarget(target, now, 3200);
    else slowCombatTarget(target, now, 900);
    spawnBurst(target.x, target.y, '#8cff66', 12, 150, (target.radius || 17) * 0.7);
    addFloatText(`-${damage}`, target.x, target.y - 42, '#9cffb7');
    if (target.hp <= 0) {
        target.hp = 0;
        target.mood = 'down';
        attacker.attackTarget = null;
        spawnBurst(target.x, target.y, '#ffffff', 16, 220, target.radius || 17);
    }
}

function chooseControlledMonsterEnemyTarget(e) {
    const old = e.attackTarget;
    if (old && old !== state.player && old.kind !== 'npc' && old.hp > 0 && !isControlledJungleMonster(old) && distance(e, old) < 760) return old;
    return state.enemies
        .filter(enemy => enemy !== e && enemy.hp > 0)
        .filter(enemy => !isControlledJungleMonster(enemy) && !isPassiveCreature(enemy.kind))
        .filter(enemy => distance(e, enemy) < 640)
        .sort((a, b) => distance(e, a) - distance(e, b))[0] || null;
}

function damageEnemyByControlledMonster(target, attacker, now) {
    const damage = Math.max(2, attacker.kind === 'vineStalker' ? attacker.attack + 1 : attacker.attack);
    target.hp -= damage;
    target.hurtUntil = now + 180;
    target.attackCooldown = Math.max(target.attackCooldown || 0, 0.35);
    target.windupUntil = 0;
    target.strikeAt = 0;
    const dir = normalize(target.x - attacker.x, target.y - attacker.y);
    target.knockX = (target.knockX || 0) + dir.x * (attacker.kind === 'vineStalker' ? 180 : 120);
    target.knockY = (target.knockY || 0) + dir.y * (attacker.kind === 'vineStalker' ? 180 : 120);
    if (attacker.kind === 'jungleSnake') {
        target.poisonUntil = Math.max(target.poisonUntil || 0, now + 2800);
        target.poisonTickAt = Math.min(target.poisonTickAt || now + 850, now + 850);
    } else {
        target.rootedUntil = Math.max(target.rootedUntil || 0, now + 520);
    }
    spawnBurst(target.x, target.y, attacker.kind === 'jungleSnake' ? '#8cff66' : '#5fae49', 12, 150, target.radius * 0.65);
    addFloatText(`-${damage}`, target.x, target.y - 38, '#9cffb7');
    if (target.hp <= 0) {
        target.hp = 0;
        target.deathAt = now;
        attacker.attackTarget = null;
        spawnBurst(target.x, target.y, '#ffffff', 18, 220, target.radius);
        addFloatText('驱逐', target.x, target.y - 52, '#8cff66');
    }
}

function updateNeutralCultControlledMonster(e, dt, now, playerDist) {
    if (!isJungleCultControlledMonster(e) || cultControlledMonstersShouldAttackPlayer()) return false;
    e.controlledByCult = true;
    e.attackTarget = null;
    e.villagerTarget = null;
    e.windupUntil = 0;
    e.strikeAt = 0;
    e.leapUntil = 0;
    e.chargeUntil = 0;
    e.swoopUntil = 0;
    e.attackCooldown = Math.max(e.attackCooldown || 0, 0.45);
    const home = { x: e.spawnX || e.x, y: e.spawnY || e.y };
    if (playerDist < 145) {
        const away = normalize(e.x - state.player.x, e.y - state.player.y);
        moveEnemy(e, away.x * e.speed * 0.85 * dt, away.y * e.speed * 0.85 * dt);
    } else if (distance(e, home) > 24) {
        const back = normalize(home.x - e.x, home.y - e.y);
        moveEnemy(e, back.x * e.speed * 0.42 * dt, back.y * e.speed * 0.42 * dt);
    }
    if (now > (e.nextNeutralCultTextAt || 0) && playerDist < 180) {
        e.nextNeutralCultTextAt = now + 1800;
        addFloatText('受约束', e.x, e.y - 42, '#9cffb7');
    }
    return true;
}

function enemyAttackTarget(e) {
    if (isJungleCultControlledMonster(e) && cultControlledMonstersShouldAttackPlayer()) return state.player;
    return e.attackTarget?.hp > 0 ? e.attackTarget : state.player;
}

function shouldNeutralizeCultMonsterAgainstPlayer(e) {
    return isJungleCultControlledMonster(e) && !cultControlledMonstersShouldAttackPlayer();
}

function isJungleCultVillager(npc) {
    return homeVillageFor(npc)?.tier === 'jungleCult';
}

function livingCultHerbalist() {
    return villageNpcList(activeJungleCultVillage).some(npc => npc.role === 'cultHerbalist' && npc.hp > 0);
}

function poisonCombatTarget(target, now, duration) {
    if (target === state.player) {
        if (state.equipment.armor === '泥沼护甲') duration = Math.floor(duration * 0.55);
        poisonPlayer(now, duration);
        return;
    }
    target.poisonUntil = Math.max(target.poisonUntil || 0, now + duration);
    target.poisonTickAt = Math.min(target.poisonTickAt || now + 800, now + 800);
    addFloatText('中毒', target.x, target.y - 54, '#9cff7a');
}

function markCultHerbalistAttacked(npc) {
    if (npc?.role !== 'cultHerbalist') return;
    const village = homeVillageFor(npc) || activeJungleCultVillage;
    if (village?.tier === 'jungleCult') village.cultHerbalistAttacked = true;
}

function slowCombatTarget(target, now, duration) {
    if (target === state.player) {
        if (state.equipment.armor === '湿地甲壳甲') duration = Math.floor(duration * 0.5);
        target.slowUntil = Math.max(target.slowUntil || 0, now + duration);
        return;
    }
    target.rootedUntil = Math.max(target.rootedUntil || 0, now + Math.min(duration, 1400));
    addFloatText('迟缓', target.x, target.y - 54, '#d7f28a');
}

function drainCombatTargetStamina(target, amount) {
    if (target === state.player) {
        target.stamina = Math.max(0, target.stamina - amount);
        return;
    }
    target.fatigue = Math.min(100, (target.fatigue || 0) + amount);
}

function applyEnemyDamageToTarget(e, target, damage, verb, now = performance.now()) {
    if (target === state.player) return applyEnemyDamage(e, damage, verb);
    return damageVillagerByAnimal(target, e, now, verb);
}

function updateAnimalVillagerConflict(e, dt, now) {
    if (state.village?.well && !state.village.well.broken && e.boss && distance(e, state.village.well) < e.radius + state.village.well.radius + 26) {
        state.village.well.broken = true;
        state.cameraShake = Math.max(state.cameraShake, 18);
        spawnBurst(state.village.well.x, state.village.well.y, '#8c98a4', 34, 230, 34);
        showToast('Boss 撞坏了村庄水井！');
    }
    if (!state.outdoorVillagers?.length || e.kind === 'bat') return false;
    if (!e.villagerTarget && now < (e.nextVillagerScanAt || 0)) return false;
    e.nextVillagerScanAt = now + (e.kind === 'wolf' ? 180 : (e.kind === 'shade' ? 220 : 360));
    const villagers = state.outdoorVillagers.filter(npc => npc.kind !== 'totem' && npc.hp > 0 && npc.outside);
    if (!villagers.length) return false;
    const target = chooseAnimalVillagerTarget(e, villagers);
    if (!target) {
        if (isPassiveCreature(e.kind)) {
            const near = villagers.find(npc => distance(e, npc) < 120);
            if (near) {
                const away = normalize(e.x - near.x, e.y - near.y);
                moveEnemy(e, away.x * e.speed * 1.15 * dt, away.y * e.speed * 1.15 * dt);
                return true;
            }
        }
        return false;
    }
    e.villagerTarget = target;
    e.attackTarget = target;
    setVillagerAnimalAggro(target, e);
    if (VILLAGER_HOSTILE_MONSTERS.has(e.kind) || e.boss) callVillagersToDefendAgainst(e, target);
    if (enemyHasActiveSkill(e)) {
        resolveActiveEnemySkillAgainstTarget(e, target, dt, now);
        return true;
    }
    const dist = distance(e, target);
    const dir = normalize(target.x - e.x, target.y - e.y);
    if (e.kind === 'wolf' && e.retreatUntil > now) {
        const away = normalize(e.x - target.x, e.y - target.y);
        moveEnemy(e, away.x * e.speed * 1.25 * dt, away.y * e.speed * 1.25 * dt);
        return true;
    }
    if (dist > e.radius + target.radius + e.range) {
        moveEnemy(e, dir.x * e.speed * 1.05 * dt, dir.y * e.speed * 1.05 * dt);
    } else if (e.kind === 'wolf' && (e.attackCooldown || 0) > 0.25 && !e.windupUntil) {
        const originalPlayer = state.player;
        state.player = target;
        try {
            const pack = state.wolfPacks[e.packId];
            const desired = pack ? wolfRoleTarget(e) : target;
            const toTarget = normalize(desired.x - e.x, desired.y - e.y);
            if (distance(e, desired) > 18) moveEnemy(e, toTarget.x * e.speed * 0.85 * dt, toTarget.y * e.speed * 0.85 * dt);
        } finally {
            state.player = originalPlayer;
        }
    } else if ((e.attackCooldown || 0) <= 0 && !e.windupUntil) {
        startEnemyAttack(e, now, target);
    }
    return true;
}

function callVillagersToDefendAgainst(enemy, victim) {
    if (enemy.defenseCallAt && performance.now() - enemy.defenseCallAt < 1800) return;
    enemy.defenseCallAt = performance.now();
    for (const npc of state.outdoorVillagers) {
        if (npc.kind === 'totem' || npc.hp <= 0 || !npc.outside) continue;
        if (shouldIgnoreJungleMonster(npc, enemy)) continue;
        if (distance(npc, victim) > 420 && distance(npc, enemy) > 420) continue;
        npc.animalAggressor = enemy;
        npc.mood = npc.playerAggro ? 'angry' : 'annoyed';
        npc.returningHome = false;
        addFloatText('护村', npc.x, npc.y - 52, '#ffd166');
    }
    showToast(`${enemy.name}袭击村民，附近村民开始护村！`);
}

function resolveActiveEnemySkillAgainstTarget(e, target, dt, now) {
    if (e.strikeAt && now >= e.strikeAt) {
        resolveEnemyAttack(e, now);
        return;
    }
    if (e.leapUntil > now) {
        const progress = clamp((now - e.leapStartAt) / Math.max(1, e.leapUntil - e.leapStartAt), 0, 1);
        const arc = Math.sin(progress * Math.PI);
        e.x = lerp(e.leapStartX, e.leapTargetX, progress);
        e.y = lerp(e.leapStartY, e.leapTargetY, progress) - arc * 10;
        if (e.leapDamage !== false && !e.leapHit && progress > 0.55 && distance(e, target) < e.radius + target.radius + 18) {
            applyEnemyDamageToTarget(e, target, e.attack, '跳扑', now);
            e.leapHit = true;
        }
        return;
    }
    if (e.chargeUntil > now) {
        moveEnemy(e, e.attackDir.x * e.speed * 3.2 * dt, e.attackDir.y * e.speed * 3.2 * dt);
        if (!e.chargeHit && distance(e, target) < e.radius + target.radius + 10) {
            applyEnemyDamageToTarget(e, target, e.attack + 1, '冲撞', now);
            e.chargeHit = true;
        }
        return;
    }
    if (e.swoopUntil > now) {
        const progress = clamp((now - e.swoopStartAt) / Math.max(1, e.swoopUntil - e.swoopStartAt), 0, 1);
        e.x = lerp(e.swoopStartX, e.swoopTargetX, progress);
        e.y = lerp(e.swoopStartY, e.swoopTargetY, progress) - Math.sin(progress * Math.PI) * 24;
        if (!e.swoopHit && progress > 0.42 && distance(e, target) < e.radius + target.radius + 24) {
            applyEnemyDamageToTarget(e, target, e.attack, '掠袭', now);
            e.swoopHit = true;
        }
    }
}

function chooseAnimalVillagerTarget(e, villagers) {
    if (e.villagerTarget?.hp > 0 && e.villagerTarget.outside && distance(e, e.villagerTarget) < 360) {
        return e.villagerTarget;
    }
    if (isPassiveCreature(e.kind)) return null;
    if (isControlledJungleMonster(e)) {
        if (isJungleCultControlledMonster(e) && cultControlledMonstersShouldAttackPlayer()) {
            e.controlledByCult = true;
            e.attackTarget = state.player;
        }
        villagers = villagers.filter(npc => !isJungleCultVillager(npc));
        if (!villagers.length) return null;
    }
    if (!VILLAGER_HOSTILE_MONSTERS.has(e.kind) && !e.boss) return null;
    if (e.kind === 'shade') {
        const range = 300 + shadeNightPower() * 220;
        return villagers
            .map(npc => ({ npc, d: distance(e, npc) }))
            .filter(item => item.d < range)
            .sort((a, b) => a.d - b.d)[0]?.npc || null;
    }
    const nearby = villagers
        .map(npc => ({ npc, d: distance(e, npc) }))
        .filter(item => item.d < 280)
        .sort((a, b) => a.d - b.d);
    if (!nearby.length) return null;
    if (e.kind === 'wolf') {
        const wolves = state.enemies.filter(item => item.kind === 'wolf' && item.hp > 0 && distance(item, e) < 260).length;
        return wolves >= 2 || nearby[0].d < 170 ? nearby[0].npc : null;
    }
    if (e.boss) return nearby[0].d < 360 ? nearby[0].npc : null;
    return nearby[0].d < 280 ? nearby[0].npc : null;
}

function tryAccidentalEnemyHitVillager(e, range, now, verb = '误伤') {
    const target = state.outdoorVillagers
        .filter(npc => npc.kind !== 'totem' && npc.hp > 0 && npc.outside)
        .map(npc => ({ npc, d: distance(e, npc) }))
        .filter(item => item.d < e.radius + item.npc.radius + range)
        .sort((a, b) => a.d - b.d)[0]?.npc;
    if (!target) return false;
    e.villagerTarget = target;
    setVillagerAnimalAggro(target, e);
    damageVillagerByAnimal(target, e, now);
    addFloatText(verb, target.x, target.y - 58, '#ffd166');
    return true;
}

function damageVillagerByAnimal(npc, e, now, verb = '攻击') {
    const damage = Math.max(1, e.attack || (e.kind === 'wolf' ? 4 : 2));
    npc.hp = Math.max(0, (npc.hp ?? 80) - damage);
    npc.hurtUntil = now + 180;
    setVillagerAnimalAggro(npc, e);
    npc.nextAttackAt = Math.min(npc.nextAttackAt || now, now + 220);
    npc.returningHome = npc.hp < (npc.maxHp || 80) * 0.18;
    const dir = normalize(npc.x - e.x, npc.y - e.y);
    const force = monsterKnockbackForce(e, verb);
    npc.knockX = (npc.knockX || 0) + dir.x * force;
    npc.knockY = (npc.knockY || 0) + dir.y * force;
    spawnBurst(npc.x, npc.y, '#ff6b6b', 8, 130, npc.radius * 0.55);
    addFloatText(`-${damage}`, npc.x, npc.y - 42, '#ffb3b3');
    addFloatText(verb, npc.x, npc.y - 58, '#ffd166');
    if (npc.hp <= 0) {
        npc.mood = 'down';
        showToast(`${npc.label} 被${e.name}击倒了。`);
    } else if (e.kind === 'wolf') {
        showToast(`狼群袭击了${npc.label}！`);
    }
    return true;
}

function monsterKnockbackForce(e, verb = '') {
    if (verb.includes('冲撞')) return 380;
    if (verb.includes('跳扑')) return 280;
    if (verb.includes('撕咬')) return 230;
    if (verb.includes('毒刺')) return 210;
    if (verb.includes('蜂针')) return 170;
    if (verb.includes('震地')) return 340;
    return e.kind === 'wolf' ? 230 : (e.kind === 'boar' ? 320 : (e.boss ? 360 : 190));
}

function isPassiveCreature(kind) {
    return kind === 'hare' || kind === 'deer';
}

function updatePassiveCreature(e, dt, now, dist) {
    if (dist < 180 || e.hurtUntil > now) {
        const away = normalize(e.x - state.player.x, e.y - state.player.y);
        moveEnemy(e, away.x * e.speed * 1.25 * dt, away.y * e.speed * 1.25 * dt);
        return;
    }
    const t = now * 0.00045 + e.spawnX * 0.01;
    const target = {
        x: e.spawnX + Math.cos(t) * 110,
        y: e.spawnY + Math.sin(t * 0.8) * 90,
    };
    if (distance(e, target) > 16) {
        const dir = normalize(target.x - e.x, target.y - e.y);
        moveEnemy(e, dir.x * e.speed * 0.28 * dt, dir.y * e.speed * 0.28 * dt);
    }
}

function updateDynamicSpawns(now) {
    if (state.win || state.lose || now < state.nextDynamicSpawnAt) return;
    const night = nightAmount();
    state.nextDynamicSpawnAt = now + (night > 0.2 ? Math.max(650, 1300 - night * 520) : 1800);
    const alive = state.enemies.filter(enemyItem => enemyItem.hp > 0);
    if (alive.length >= Math.round(MAX_ENEMIES * wildernessSettings.monsterDensity)) return;
    const nearby = alive.filter(enemyItem => distance(enemyItem, state.player) < 850);
    if (nearby.length >= Math.round(MAX_NEARBY_ENEMIES * wildernessSettings.monsterDensity) + (night > 0.45 ? 5 : 0)) return;

    if (trySpawnFromDen(now, alive)) return;
    trySpawnAroundPlayer(now, alive);
}

function trySpawnFromDen(now, alive) {
    const candidates = state.spawnDens
        .filter(den => den.nextSpawnAt <= now)
        .filter(den => distance(den, state.player) > DYNAMIC_SPAWN_MIN_DISTANCE && distance(den, state.player) < 1250)
        .filter(den => !isSpawnAreaCooling(den.x, den.y, now))
        .sort((a, b) => distance(a, state.player) - distance(b, state.player));
    for (const den of candidates.slice(0, 4)) {
        const kind = denSpawnKind(den);
        if (!kind) continue;
        const angle = hash2(den.x * 0.04 + now * 0.0001, den.y * 0.04) * Math.PI * 2;
        const point = { x: den.x + Math.cos(angle) * 70, y: den.y + Math.sin(angle) * 70 };
        if (!canDynamicSpawn(kind, point.x, point.y, alive)) continue;
        state.enemies.push(makeEnemy(kind, point.x, point.y));
        den.nextSpawnAt = now + (kind === 'bat' && nightAmount() > 0.25 ? 5200 : (nightAmount() > 0.2 ? 14000 : 24000));
        return true;
    }
    return false;
}

function denSpawnKind(den) {
    if (den.kind === 'bat' && nightAmount() < 0.15) return '';
    if (den.kind === 'scorpion' && nightAmount() > 0.2) return 'scorpion';
    return den.kind;
}

function trySpawnAroundPlayer(now, alive) {
    const night = nightAmount();
    for (let i = 0; i < (night > 0.35 ? 24 : 16); i++) {
        const angle = hash2(now * 0.0002 + i, state.player.x * 0.004 - i) * Math.PI * 2;
        const radius = DYNAMIC_SPAWN_MIN_DISTANCE + hash2(state.player.y * 0.004 + i, now * 0.0003) * (DYNAMIC_SPAWN_MAX_DISTANCE - DYNAMIC_SPAWN_MIN_DISTANCE);
        const x = clamp(state.player.x + Math.cos(angle) * radius, 80, WORLD.width - 80);
        const y = clamp(state.player.y + Math.sin(angle) * radius, 80, WORLD.height - 80);
        if (isSpawnAreaCooling(x, y, now)) continue;
        const kind = chooseDynamicSpawnKind(x, y, night);
        if (!kind || !canDynamicSpawn(kind, x, y, alive)) continue;
        state.enemies.push(makeEnemy(kind, x, y));
        return true;
    }
    return false;
}

function chooseDynamicSpawnKind(x, y, night) {
    const terrain = terrainInfoAt(x, y).kind;
    const n = valueNoise(x * 0.012 + night * 9, y * 0.012 - 3);
    if (night > 0.32 && n > 0.66 && ['grass', 'shore', 'forest', 'mine', 'ruins'].includes(terrain)) return 'bat';
    if (night > 0.62 && n > 0.54 && ['grass', 'shore', 'forest', 'bamboo'].includes(terrain)) return 'bat';
    if (terrain === 'shore') return n > 0.28 ? 'frog' : 'slime';
    if (terrain === 'mud' || terrain === 'swamp') return n > 0.42 ? 'swampMireling' : (n > 0.2 ? 'frog' : '');
    if (terrain === 'dry') return n > 0.52 ? 'drySandWasp' : (night > 0.15 || n > 0.36 ? 'scorpion' : '');
    if (terrain === 'mine') return n > 0.56 ? 'mineCrystalBat' : (night > 0.08 || n > 0.44 ? 'bat' : (n > 0.74 ? 'golem' : ''));
    if (terrain === 'ruins') return n > 0.56 ? 'ruinsBoneGuard' : (night > 0.08 || n > 0.44 ? 'bat' : (n > 0.74 ? 'golem' : ''));
    if (terrain === 'meadow') return n > 0.48 ? 'meadowMoth' : (n > 0.28 ? 'bee' : (n > 0.08 ? 'hare' : ''));
    if (terrain === 'birch') return n > 0.46 ? 'birchStag' : (n > 0.32 ? 'deer' : (n > 0.12 ? 'hare' : ''));
    if (terrain === 'maple') return n > 0.46 ? 'mapleFox' : (n > 0.32 ? 'deer' : (n > 0.12 ? 'hare' : ''));
    if (terrain === 'pine') return n > 0.46 ? 'pineLynx' : (n > 0.32 ? 'deer' : '');
    if (terrain === 'darkForest') return night > 0.08 || n > 0.38 ? 'shade' : '';
    if (terrain === 'jungle') return n > 0.72 ? 'vineStalker' : (n > 0.36 ? 'jungleSnake' : (n > 0.14 ? 'bee' : ''));
    if (terrain === 'reedWetland') return n > 0.32 ? 'reedCrab' : '';
    if (terrain === 'tallgrass') return n > 0.48 ? 'tallgrassRaptor' : (night > 0.12 || n > 0.32 ? 'wolf' : 'slime');
    if (terrain === 'forest') return n > 0.52 ? 'forestBear' : (night > 0.2 && n > 0.28 ? 'wolf' : (n > 0.48 ? 'boar' : ''));
    if (terrain === 'bamboo') return n > 0.52 ? 'bambooPanda' : (night > 0.2 && n > 0.28 ? 'wolf' : (n > 0.48 ? 'boar' : ''));
    if (terrain === 'grass') return n > 0.58 ? 'grassRunner' : (night > 0.22 && n > 0.42 ? 'bat' : (n > 0.52 ? 'slime' : ''));
    return '';
}

function canDynamicSpawn(kind, x, y, alive) {
    if (!canSpawnEnemyAt(kind, x, y, alive)) return false;
    if (distance({ x, y }, state.player) < DYNAMIC_SPAWN_MIN_DISTANCE || distance({ x, y }, state.player) > DYNAMIC_SPAWN_MAX_DISTANCE + 360) return false;
    const localAll = alive.filter(enemyItem => distance(enemyItem, { x, y }) < 420).length;
    return localAll < 8;
}

function spawnCooldownKey(x, y) {
    return `${Math.floor(x / 360)},${Math.floor(y / 360)}`;
}

function isSpawnAreaCooling(x, y, now) {
    return (state.spawnCooldowns.get(spawnCooldownKey(x, y)) || 0) > now;
}

function markSpawnAreaCleared(x, y, now = performance.now()) {
    state.spawnCooldowns.set(spawnCooldownKey(x, y), now + (nightAmount() > 0.2 ? 18000 : 30000));
}

function updateEnemyPoison(e, dt, now) {
    if (!e.poisonUntil || e.poisonUntil <= now) return;
    if (Math.random() < 0.1) spawnBurst(e.x, e.y - 8, '#8cff66', 1, 42, e.radius * 0.35);
    if (now < (e.poisonTickAt || 0)) return;
    e.poisonTickAt = now + 1000;
    e.hp -= 1;
    addFloatText('-1 毒', e.x, e.y - 46, '#9cff7a');
    if (e.hp <= 0) {
        e.deathAt = now;
        markSpawnAreaCleared(e.x, e.y, now);
        const drops = grantEnemyDrops(e);
        addFloatText(drops.floatText, e.x, e.y - 56, '#9cffb7');
        showToast(`毒素击败 ${e.name}，获得 ${drops.toastText}`);
        renderHud();
    }
}

function updateVillagerStatusEffects(npc, dt, now) {
    if (!npc.poisonUntil || npc.poisonUntil <= now) return;
    if (Math.random() < 0.08) spawnBurst(npc.x, npc.y - 8, '#8cff66', 1, 38, (npc.radius || 17) * 0.35);
    if (now < (npc.poisonTickAt || 0)) return;
    npc.poisonTickAt = now + 1000;
    npc.hp = Math.max(0, (npc.hp ?? 80) - 1);
    npc.hurtUntil = now + 160;
    addFloatText('-1 毒', npc.x, npc.y - 46, '#9cff7a');
    if (npc.hp <= 0) {
        npc.mood = 'down';
        npc.solid = false;
        showToast(`${npc.label || '村民'} 被持续效果击倒了。`);
    }
}

function updateWolfPackMember(e, dt, now, dist) {
    const p = state.player;
    const pack = state.wolfPacks[e.packId];
    if (!pack) return false;
    if (dist < 420) pack.alertedUntil = now + 7000;
    const alerted = pack.alertedUntil > now;
    if (!alerted) {
        const home = wolfRoamTarget(e, pack);
        if (distance(e, home) > 18) {
            const dir = normalize(home.x - e.x, home.y - e.y);
            moveEnemy(e, dir.x * e.speed * 0.42 * dt, dir.y * e.speed * 0.42 * dt);
        }
        return true;
    }
    if (e.retreatUntil > now) {
        const away = normalize(e.x - p.x, e.y - p.y);
        moveEnemy(e, away.x * e.speed * 1.25 * dt, away.y * e.speed * 1.25 * dt);
        return true;
    }
    if (e.rootedUntil > now) return true;

    const desired = wolfRoleTarget(e);
    const toTarget = normalize(desired.x - e.x, desired.y - e.y);
    const targetDist = distance(e, desired);
    if (!e.windupUntil && targetDist > 18) {
        const cautious = e.attackCooldown > 0.2 ? 0.85 : 1.05;
        moveEnemy(e, toTarget.x * e.speed * cautious * dt, toTarget.y * e.speed * cautious * dt);
    }
    const biteRange = e.packRole === 'rear' ? 150 : 92;
    const canBite = now >= pack.nextBiteAt && e.attackCooldown <= 0 && dist < biteRange;
    if (!e.windupUntil && canBite) {
        startEnemyAttack(e, now);
        return false;
    }
    return true;
}

function updateWolfPackRoaming(now) {
    for (const pack of Object.values(state.wolfPacks)) {
        const t = now * 0.00008 + pack.phase;
        pack.roamX = clamp(pack.homeX + Math.cos(t) * 260 + Math.sin(t * 1.7) * 90, 120, WORLD.width - 120);
        pack.roamY = clamp(pack.homeY + Math.sin(t * 0.9) * 210 + Math.cos(t * 1.3) * 70, 120, WORLD.height - 120);
    }
}

function wolfRoamTarget(e, pack) {
    const offsets = {
        leader: { x: 0, y: 0 },
        left: { x: -74, y: 58 },
        right: { x: 82, y: 56 },
        rear: { x: 10, y: 128 },
    };
    const offset = offsets[e.packRole] || offsets.leader;
    return { x: pack.roamX + offset.x, y: pack.roamY + offset.y };
}

function wolfRoleTarget(e) {
    const p = state.player;
    const toWolf = normalize(e.x - p.x, e.y - p.y);
    const base = Math.atan2(toWolf.y, toWolf.x);
    const offsets = {
        leader: { angle: 0, radius: 92 },
        left: { angle: -Math.PI * 0.68, radius: 105 },
        right: { angle: Math.PI * 0.68, radius: 105 },
        rear: { angle: Math.PI, radius: 132 },
    };
    const config = offsets[e.packRole] || offsets.leader;
    const angle = base + config.angle;
    const nightBoost = 1 - nightAmount() * 0.18;
    return {
        x: clamp(p.x + Math.cos(angle) * config.radius * nightBoost, e.radius, WORLD.width - e.radius),
        y: clamp(p.y + Math.sin(angle) * config.radius * nightBoost, e.radius, WORLD.height - e.radius),
    };
}

function startEnemyAttack(e, now, target = state.player) {
    if (target === state.player && shouldNeutralizeCultMonsterAgainstPlayer(e)) {
        e.attackTarget = null;
        e.windupUntil = 0;
        e.strikeAt = 0;
        e.attackCooldown = Math.max(e.attackCooldown || 0, 0.65);
        return;
    }
    e.attackTarget = target;
    e.attackDir = normalize(target.x - e.x, target.y - e.y);
    e.chargeHit = false;
    const terrain = terrainInfoAt(e.x, e.y);
    const ambush = tallGrassCoverAt(e) && (e.kind === 'wolf' || e.kind === 'scorpion');
    const mudFrog = terrain.kind === 'mud' && e.kind === 'frog';
    if (e.kind === 'slime') {
        e.windupUntil = now + 460;
        e.strikeAt = now + 360;
    } else if (e.kind === 'frog') {
        e.windupUntil = now + (mudFrog ? 400 : 520);
        e.strikeAt = now + (mudFrog ? 310 : 410);
    } else if (e.kind === 'scorpion') {
        e.windupUntil = now + (ambush ? 180 : 260);
        e.strikeAt = now + (ambush ? 130 : 190);
    } else if (e.kind === 'boar') {
        e.windupUntil = now + 560;
        e.strikeAt = now + 420;
    } else if (e.kind === 'wolf') {
        e.windupUntil = now + (ambush ? 320 : 440);
        e.strikeAt = now + (ambush ? 230 : 320);
    } else if (e.kind === 'bat') {
        e.windupUntil = now + 300;
        e.strikeAt = now + 220;
    } else if (e.kind === 'bee') {
        e.windupUntil = now + 260;
        e.strikeAt = now + 180;
    } else if (e.kind === 'jungleSnake') {
        e.windupUntil = now + 210;
        e.strikeAt = now + 145;
    } else if (e.kind === 'vineStalker') {
        e.windupUntil = now + 620;
        e.strikeAt = now + 430;
    } else if (['grassRunner', 'tallgrassRaptor', 'pineLynx', 'mapleFox', 'birchStag', 'reedCrab'].includes(e.kind)) {
        e.windupUntil = now + (e.kind === 'reedCrab' ? 360 : 300);
        e.strikeAt = now + (e.kind === 'reedCrab' ? 250 : 210);
    } else if (['forestBear', 'bambooPanda', 'ruinsBoneGuard'].includes(e.kind)) {
        e.windupUntil = now + 650;
        e.strikeAt = now + 470;
    } else if (['meadowMoth', 'drySandWasp', 'mineCrystalBat'].includes(e.kind)) {
        e.windupUntil = now + 280;
        e.strikeAt = now + 200;
    } else if (e.kind === 'swampMireling') {
        e.windupUntil = now + 430;
        e.strikeAt = now + 320;
    } else if (e.kind === 'shade') {
        const night = shadeNightPower();
        e.windupUntil = now + (520 - night * 170);
        e.strikeAt = now + (380 - night * 130);
    } else {
        if (e.boss) {
            const roll = hash2(e.x * 0.04 + now * 0.0007, e.y * 0.04);
            e.bossSkill = roll > 0.66 ? 'spikes' : (roll > 0.34 ? 'shockwave' : 'summon');
            e.bossSkillAngle = Math.atan2(e.attackDir.y, e.attackDir.x);
            e.windupUntil = now + (e.bossSkill === 'summon' ? 980 : 820);
            e.strikeAt = now + (e.bossSkill === 'summon' ? 720 : 610);
        } else {
            e.windupUntil = now + 620;
            e.strikeAt = now + 450;
        }
    }
    spawnBurst(e.x, e.y - 12, e.kind === 'golem' ? '#b77dff' : '#ffd166', 5, 80, e.radius * 0.45);
}

function resolveEnemyAttack(e, now) {
    const p = e.attackTarget?.hp > 0 ? e.attackTarget : state.player;
    const targetIsVillager = p !== state.player;
    tryAccidentalEnemyHitVillager(e, e.range + 8, now, '攻击误伤');
    if (e.kind === 'slime') {
        e.leapStartAt = now;
        e.leapUntil = now + 420;
        e.leapStartX = e.x;
        e.leapStartY = e.y;
        e.leapTargetX = clamp(e.x + e.attackDir.x * 125, e.radius, WORLD.width - e.radius);
        e.leapTargetY = clamp(e.y + e.attackDir.y * 125, e.radius, WORLD.height - e.radius);
        e.leapHit = false;
        e.leapHitVillager = false;
        e.leapDamage = true;
        e.attackCooldown = 2.8;
    } else if (e.kind === 'frog') {
        const tongueReach = 132;
        const tongueEnd = { x: e.x + e.attackDir.x * tongueReach, y: e.y + e.attackDir.y * tongueReach };
        e.tongueUntil = now + 260;
        e.tongueTargetX = tongueEnd.x;
        e.tongueTargetY = tongueEnd.y;
        const toPlayer = normalize(e.x - p.x, e.y - p.y);
        const playerForward = (p.x - e.x) * e.attackDir.x + (p.y - e.y) * e.attackDir.y;
        const playerSide = Math.abs((p.x - e.x) * -e.attackDir.y + (p.y - e.y) * e.attackDir.x);
        if (playerForward > 0 && playerForward < tongueReach && playerSide < p.radius + 13) {
            const hit = applyEnemyDamageToTarget(e, p, e.attack, '舌头卷住', now);
            if (hit) {
                p.knockX += toPlayer.x * 520;
                p.knockY += toPlayer.y * 520;
                p.stamina = Math.max(0, p.stamina - 14);
                addFloatText('被拉住', p.x, p.y - 54, '#9cffb7');
            }
        }
        e.leapStartAt = now;
        e.leapUntil = now + 380;
        e.leapStartX = e.x;
        e.leapStartY = e.y;
        const side = hash2(e.x * 0.03 + now * 0.0001, e.y * 0.03) > 0.5 ? 1 : -1;
        const jumpAway = normalize(-e.attackDir.x * 0.9 + -e.attackDir.y * side * 0.45, -e.attackDir.y * 0.9 + e.attackDir.x * side * 0.45);
        e.leapTargetX = clamp(e.x + jumpAway.x * 105, e.radius, WORLD.width - e.radius);
        e.leapTargetY = clamp(e.y + jumpAway.y * 105, e.radius, WORLD.height - e.radius);
        e.leapHit = false;
        e.leapHitVillager = false;
        e.leapDamage = false;
        e.attackCooldown = terrainInfoAt(e.x, e.y).kind === 'mud' ? 1.45 : 2.25;
        spawnBurst(e.x, e.y - 6, '#ff8fc7', 7, 130, e.radius * 0.55);
    } else if (e.kind === 'scorpion') {
        moveEnemy(e, e.attackDir.x * 48, e.attackDir.y * 48);
        if (distance(e, p) < e.radius + p.radius + 18) {
            const hit = applyEnemyDamageToTarget(e, p, e.attack, '毒刺', now);
            if (hit) {
                poisonCombatTarget(p, now, 5200);
                drainCombatTargetStamina(p, 16);
            }
        }
        e.attackCooldown = 1.25;
        e.retreatUntil = now + 360;
        spawnBurst(e.x, e.y, '#8cff66', 10, 135, e.radius * 0.6);
    } else if (e.kind === 'boar') {
        e.chargeUntil = now + 430;
        e.chargeHit = false;
        e.chargeHitVillager = false;
        e.attackCooldown = 1.4;
    } else if (e.kind === 'wolf') {
        moveEnemy(e, e.attackDir.x * 96, e.attackDir.y * 96);
        if (distance(e, p) < e.radius + p.radius + 20) {
            applyEnemyDamageToTarget(e, p, e.attack, '撕咬', now);
        }
        e.retreatUntil = now + 420;
        e.circleSide *= -1;
        e.attackCooldown = 1.55;
        const pack = state.wolfPacks[e.packId];
        if (pack) pack.nextBiteAt = now + 850;
        spawnBurst(e.x, e.y, '#d8e5f2', 8, 130, e.radius * 0.6);
    } else if (e.kind === 'bat') {
        e.swoopStartAt = now;
        e.swoopUntil = now + 520;
        e.swoopStartX = e.x;
        e.swoopStartY = e.y;
        e.swoopTargetX = clamp(p.x + e.attackDir.x * 82, e.radius, WORLD.width - e.radius);
        e.swoopTargetY = clamp(p.y + e.attackDir.y * 82, e.radius, WORLD.height - e.radius);
        e.swoopHit = false;
        e.swoopHitVillager = false;
        e.attackCooldown = 2.1;
        spawnBurst(e.x, e.y, '#8fb8ff', 6, 100, e.radius * 0.6);
    } else if (e.kind === 'bee') {
        moveEnemy(e, e.attackDir.x * 82, e.attackDir.y * 82);
        if (distance(e, p) < e.radius + p.radius + 14) {
            if (applyEnemyDamageToTarget(e, p, e.attack, '蜂针', now)) {
                drainCombatTargetStamina(p, 8);
            }
        }
        e.retreatUntil = now + 320;
        e.attackCooldown = 1.45;
        spawnBurst(e.x, e.y, '#ffd166', 8, 110, e.radius * 0.6);
    } else if (e.kind === 'jungleSnake') {
        moveEnemy(e, e.attackDir.x * 72, e.attackDir.y * 72);
        if (distance(e, p) < e.radius + p.radius + 18) {
            const hit = applyEnemyDamageToTarget(e, p, e.attack, '毒牙咬击', now);
            if (hit) {
                poisonCombatTarget(p, now, 6200);
                drainCombatTargetStamina(p, 10);
                addFloatText('蛇毒', p.x, p.y - 56, '#9cff7a');
            }
        }
        e.retreatUntil = now + 420;
        e.attackCooldown = 1.35;
        spawnBurst(e.x, e.y, '#8cff66', 8, 110, e.radius * 0.55);
    } else if (e.kind === 'vineStalker') {
        const reach = 170;
        const end = { x: e.x + e.attackDir.x * reach, y: e.y + e.attackDir.y * reach };
        e.vineUntil = now + 420;
        e.vineTargetX = end.x;
        e.vineTargetY = end.y;
        const forward = (p.x - e.x) * e.attackDir.x + (p.y - e.y) * e.attackDir.y;
        const side = Math.abs((p.x - e.x) * -e.attackDir.y + (p.y - e.y) * e.attackDir.x);
        if (forward > 0 && forward < reach && side < p.radius + 18) {
            const hit = applyEnemyDamageToTarget(e, p, e.attack, '藤蔓缠绕', now);
            if (hit) {
                slowCombatTarget(p, now, 3200);
                drainCombatTargetStamina(p, 18);
                addFloatText('缠绕', p.x, p.y - 58, '#9cffb7');
            }
        }
        e.rootedUntil = Math.max(e.rootedUntil || 0, now + 360);
        e.attackCooldown = 2.25;
        spawnBurst(e.x, e.y - 10, '#5fae49', 12, 110, e.radius * 0.7);
    } else if (['grassRunner', 'tallgrassRaptor', 'pineLynx', 'mapleFox', 'birchStag'].includes(e.kind)) {
        const dash = e.kind === 'grassRunner' ? 118 : (e.kind === 'birchStag' ? 96 : 88);
        moveEnemy(e, e.attackDir.x * dash, e.attackDir.y * dash);
        if (distance(e, p) < e.radius + p.radius + 22) {
            const verb = e.kind === 'birchStag' ? '角撞' : (e.kind === 'mapleFox' ? '狐影爪' : '迅爪');
            const hit = applyEnemyDamageToTarget(e, p, e.attack, verb, now);
            if (hit && e.kind === 'mapleFox') drainCombatTargetStamina(p, 10);
        }
        e.retreatUntil = now + 360;
        e.attackCooldown = e.kind === 'grassRunner' ? 1.15 : 1.45;
        spawnBurst(e.x, e.y, e.kind === 'mapleFox' ? '#d8a041' : '#fff3b0', 8, 120, e.radius * 0.55);
    } else if (e.kind === 'reedCrab') {
        moveEnemy(e, e.attackDir.x * 42, e.attackDir.y * 42);
        if (distance(e, p) < e.radius + p.radius + 20) {
            const hit = applyEnemyDamageToTarget(e, p, e.attack, '钳夹', now);
            if (hit) {
                slowCombatTarget(p, now, 1300);
                addFloatText('夹住', p.x, p.y - 54, '#d7f28a');
            }
        }
        e.attackCooldown = 1.6;
        spawnBurst(e.x, e.y, '#6f8750', 10, 120, e.radius * 0.55);
    } else if (['forestBear', 'bambooPanda', 'ruinsBoneGuard'].includes(e.kind)) {
        const slamRadius = e.kind === 'ruinsBoneGuard' ? 82 : 96;
        state.cameraShake = Math.max(state.cameraShake, e.kind === 'forestBear' ? 12 : 9);
        spawnBurst(e.x, e.y, e.kind === 'ruinsBoneGuard' ? '#d8d0bd' : '#b98f68', 20, 170, slamRadius * 0.45);
        if (distance(e, p) < slamRadius) {
            applyEnemyDamageToTarget(e, p, e.attack, e.kind === 'ruinsBoneGuard' ? '骨盾震击' : '重掌震地', now);
            p.knockX = (p.knockX || 0) + e.attackDir.x * 220;
            p.knockY = (p.knockY || 0) + e.attackDir.y * 220;
        }
        e.attackCooldown = 2.15;
    } else if (['meadowMoth', 'drySandWasp', 'mineCrystalBat'].includes(e.kind)) {
        e.swoopStartAt = now;
        e.swoopUntil = now + (e.kind === 'mineCrystalBat' ? 560 : 440);
        e.swoopStartX = e.x;
        e.swoopStartY = e.y;
        e.swoopTargetX = clamp(p.x + e.attackDir.x * 70, e.radius, WORLD.width - e.radius);
        e.swoopTargetY = clamp(p.y + e.attackDir.y * 70, e.radius, WORLD.height - e.radius);
        e.swoopHit = false;
        e.swoopHitVillager = false;
        e.attackCooldown = e.kind === 'drySandWasp' ? 1.5 : 1.9;
        spawnBurst(e.x, e.y, e.kind === 'meadowMoth' ? '#ffd166' : (e.kind === 'drySandWasp' ? '#8cff66' : '#7dcbe8'), 8, 110, e.radius * 0.6);
    } else if (e.kind === 'swampMireling') {
        e.leapStartAt = now;
        e.leapUntil = now + 430;
        e.leapStartX = e.x;
        e.leapStartY = e.y;
        e.leapTargetX = clamp(e.x + e.attackDir.x * 112, e.radius, WORLD.width - e.radius);
        e.leapTargetY = clamp(e.y + e.attackDir.y * 112, e.radius, WORLD.height - e.radius);
        e.leapHit = false;
        e.leapHitVillager = false;
        e.leapDamage = true;
        if (distance(e, p) < e.radius + p.radius + 28) slowCombatTarget(p, now, 1800);
        e.attackCooldown = 2.0;
        spawnBurst(e.x, e.y, '#6d5438', 14, 135, e.radius * 0.75);
    } else if (e.kind === 'shade') {
        const night = shadeNightPower();
        const reach = 96 + night * 42;
        const forward = (p.x - e.x) * e.attackDir.x + (p.y - e.y) * e.attackDir.y;
        const side = Math.abs((p.x - e.x) * -e.attackDir.y + (p.y - e.y) * e.attackDir.x);
        spawnBurst(e.x + e.attackDir.x * 52, e.y + e.attackDir.y * 52, night > 0.35 ? '#b77dff' : '#8f6bd8', 16 + Math.floor(night * 10), 130 + night * 80, 32 + night * 20);
        if (forward > 0 && forward < reach && side < p.radius + 22 + night * 10) {
            if (applyEnemyDamageToTarget(e, p, e.attack + 1 + Math.floor(night * 2), night > 0.55 ? '夜影爪' : '暗影爪', now) && !targetIsVillager) {
                p.stamina = Math.max(0, p.stamina - (14 + night * 10));
            }
        }
        e.retreatUntil = now + (260 - night * 80);
        e.attackCooldown = 1.9 - night * 0.55;
    } else {
        if (e.boss) {
            resolveBossGolemSkill(e, now);
            e.strikeAt = 0;
            e.windupUntil = 0;
            return;
        }
        const slamRadius = e.boss ? 145 : 86;
        state.cameraShake = Math.max(state.cameraShake, e.boss ? 24 : 10);
        spawnBurst(e.x, e.y, e.boss ? '#ffd166' : '#b77dff', e.boss ? 42 : 18, e.boss ? 240 : 180, slamRadius * 0.42);
        if (distance(e, p) < slamRadius) applyEnemyDamageToTarget(e, p, e.attack, e.boss ? '王者震地' : '震地', now);
        if (e.boss && !targetIsVillager && distance(e, p) < slamRadius * 0.72) {
            p.knockX += e.attackDir.x * 260;
            p.knockY += e.attackDir.y * 260;
        }
        e.attackCooldown = e.boss ? 1.25 : 1.8;
    }
    e.strikeAt = 0;
    e.windupUntil = 0;
}

function resolveBossGolemSkill(e, now) {
    const p = enemyAttackTarget(e);
    const targetIsVillager = p !== state.player;
    if (e.bossSkill === 'shockwave') {
        const dir = e.attackDir || normalize(p.x - e.x, p.y - e.y);
        state.cameraShake = Math.max(state.cameraShake, 26);
        for (let i = 1; i <= 4; i++) {
            const px = e.x + dir.x * i * 70;
            const py = e.y + dir.y * i * 70;
            spawnBurst(px, py, '#ffd166', 14, 170, 28);
            const side = Math.abs((p.x - e.x) * -dir.y + (p.y - e.y) * dir.x);
            const forward = (p.x - e.x) * dir.x + (p.y - e.y) * dir.y;
            if (forward > 20 && forward < 330 && side < 46) {
                applyEnemyDamageToTarget(e, p, e.attack + 2, '冲击波', now);
                if (targetIsVillager) {
                    p.knockX = (p.knockX || 0) + dir.x * 360;
                    p.knockY = (p.knockY || 0) + dir.y * 360;
                } else {
                    p.knockX += dir.x * 360;
                    p.knockY += dir.y * 360;
                }
                break;
            }
        }
    } else if (e.bossSkill === 'spikes') {
        state.cameraShake = Math.max(state.cameraShake, 22);
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 + now * 0.001;
            const px = p.x + Math.cos(angle) * 42;
            const py = p.y + Math.sin(angle) * 42;
            spawnBurst(px, py, '#b77dff', 12, 160, 16);
        }
        if (distance(e, p) < 260) applyEnemyDamageToTarget(e, p, e.attack + 1, '岩刺', now);
    } else {
        state.cameraShake = Math.max(state.cameraShake, 18);
        spawnBurst(e.x, e.y, '#d8e5f2', 30, 180, 120);
        const existingMinions = state.enemies.filter(item => item.kind === 'golem' && !item.boss && distance(item, e) < 420 && item.hp > 0).length;
        for (let i = 0; i < Math.max(0, 2 - existingMinions); i++) {
            const angle = e.bossSkillAngle + (i ? 0.95 : -0.95);
            const x = clamp(e.x + Math.cos(angle) * 105, 80, WORLD.width - 80);
            const y = clamp(e.y + Math.sin(angle) * 105, 80, WORLD.height - 80);
            const minion = makeEnemy('golem', x, y);
            if (minion) {
                minion.hp = Math.min(minion.hp, 28);
                minion.maxHp = minion.hp;
                state.enemies.push(minion);
            }
        }
    }
    e.bossSkill = '';
    e.attackCooldown = 1.35;
}

function separateEnemies() {
    const alive = state.enemies.filter(item => item.hp > 0);
    for (let i = 0; i < alive.length; i++) {
        for (let j = i + 1; j < alive.length; j++) {
            const a = alive[i];
            const b = alive[j];
            const minDist = a.radius + b.radius + 4;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist >= minDist) continue;
            const push = (minDist - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            if (!a.chargeUntil && !a.leapUntil) {
                a.x = clamp(a.x - nx * push, a.radius, WORLD.width - a.radius);
                a.y = clamp(a.y - ny * push, a.radius, WORLD.height - a.radius);
            }
            if (!b.chargeUntil && !b.leapUntil) {
                b.x = clamp(b.x + nx * push, b.radius, WORLD.width - b.radius);
                b.y = clamp(b.y + ny * push, b.radius, WORLD.height - b.radius);
            }
        }
    }
}

function applyEnemyDamage(e, rawDamage, verb) {
    const p = state.player;
    if (shouldNeutralizeCultMonsterAgainstPlayer(e)) {
        e.attackTarget = null;
        e.windupUntil = 0;
        e.strikeAt = 0;
        e.contactCooldown = Math.max(e.contactCooldown || 0, 1.2);
        if (performance.now() > (e.nextNeutralCultTextAt || 0)) {
            e.nextNeutralCultTextAt = performance.now() + 1800;
            addFloatText('受约束', e.x, e.y - 42, '#9cffb7');
        }
        return false;
    }
    if (performance.now() <= p.invincibleUntil) return false;
    const block = getBlockResult(e, rawDamage, verb);
    const damage = incomingDamageAfterArmor(block.damage, block.blocked);
    if (block.blocked) {
        spawnBurst(p.x + p.attackDir.x * 22, p.y + p.attackDir.y * 22, '#ffd166', 10, 120, 12);
        addFloatText('格挡', p.x, p.y - 42, '#fff3b0');
    }
    if (damage <= 0) {
        p.invincibleUntil = performance.now() + 260;
        p.stamina = Math.max(0, p.stamina - block.staminaCost);
        renderHud();
        return false;
    }
    p.hp = Math.max(0, p.hp - damage);
    closeInventoryOnPlayerHit();
    p.invincibleUntil = performance.now() + 620;
    const dir = normalize(p.x - e.x, p.y - e.y);
    const force = (e.kind === 'boar' ? 430 : (e.kind === 'golem' ? 330 : 260)) * (state.equipment.armor === '厚毛皮衣' ? 0.55 : 1);
    p.knockX += dir.x * force;
    p.knockY += dir.y * force;
    p.stamina = Math.max(0, p.stamina - (e.kind === 'boar' ? 18 : 10) - block.staminaCost);
    state.cameraShake = Math.max(state.cameraShake, e.boss ? 14 : 8);
    spawnBurst(p.x, p.y, '#ff6b6b', 10, 170, p.radius * 0.55);
    addFloatText(`-${damage}`, p.x, p.y - 36, '#ffb3b3');
    showToast(`${e.name}${verb ? ` ${verb}` : ''}命中你，生命 -${damage}`);
    if (p.hp <= 0) {
        triggerPlayerDeath('你倒下了。回到营地重新准备吧。');
    }
    renderHud();
    return true;
}

function incomingDamageAfterArmor(rawDamage, blocked) {
    if (rawDamage <= 0) return 0;
    if (blocked && rawDamage < 1) return 0;
    const reduction = armorReduction() + passiveShieldReduction();
    return Math.max(1, Math.round(rawDamage * (1 - reduction)));
}

function armorReduction() {
    const boost = performance.now() < state.player.ironSkinUntil ? 0.28 : 0;
    const base = state.equipment.armor === '魔晶甲' ? 0.45
        : (state.equipment.armor === '蝎壳甲' ? 0.34
            : (state.equipment.armor === '泥沼护甲' ? 0.36
                : (state.equipment.armor === '湿地甲壳甲' ? 0.28
                    : (state.equipment.armor === '厚毛皮衣' ? 0.22
            : (state.equipment.armor === '铁甲' ? 0.32
                : (state.equipment.armor === '皮甲' ? 0.18
                    : (state.equipment.armor === '兔毛披肩' ? 0.08 : 0)))))));
    return Math.min(0.62, base + boost);
}

function passiveShieldReduction() {
    if (state.equipment.shield === '铁盾') return 0.12;
    if (state.equipment.shield === '木盾') return 0.08;
    return 0;
}

function poisonPlayer(now, duration) {
    const p = state.player;
    if (now < p.poisonResistUntil) {
        addFloatText('抗毒', p.x, p.y - 58, '#d6ff9c');
        return;
    }
    p.poisonUntil = Math.max(p.poisonUntil, now + duration);
    p.poisonTickAt = Math.min(p.poisonTickAt || now + 700, now + 700);
    spawnBurst(p.x, p.y - 10, '#8cff66', 14, 120, p.radius * 0.65);
    addFloatText('中毒', p.x, p.y - 58, '#9cff7a');
    showToast('沙蝎毒刺让你中毒了，持续掉血并消耗体力。');
    renderHud();
}

function getBlockResult(e, rawDamage, verb) {
    const weaponGuard = performance.now() < (state.player.blockUntil || 0) && selectedHotbarItem() === 'shieldClub';
    if (!state.player.blocking && !weaponGuard) return { damage: rawDamage, blocked: false, staminaCost: 0 };
    if (state.equipment.shield === '无' && !weaponGuard) return { damage: rawDamage, blocked: false, staminaCost: 0 };
    if (verb === '震地' && state.equipment.shield !== '铁盾') return { damage: rawDamage, blocked: false, staminaCost: 0 };
    const toEnemy = normalize(e.x - state.player.x, e.y - state.player.y);
    const dot = toEnemy.x * state.player.attackDir.x + toEnemy.y * state.player.attackDir.y;
    if (dot < -0.1) return { damage: rawDamage, blocked: false, staminaCost: 0 };
    const reduction = weaponGuard ? 0.42 : (state.equipment.shield === '铁盾' ? 0.7 : 0.5);
    const staminaCost = weaponGuard ? 5 : (state.equipment.shield === '铁盾' ? 8 : 9);
    if (state.player.stamina < staminaCost) return { damage: rawDamage, blocked: false, staminaCost: 0 };
    return { damage: rawDamage * (1 - reduction), blocked: true, staminaCost };
}

function moveEnemy(e, dx, dy) {
    const startX = e.x;
    const startY = e.y;
    const terrain = terrainInfoAt(e.x, e.y);
    const flying = ['bat', 'bee', 'meadowMoth', 'drySandWasp', 'mineCrystalBat'].includes(e.kind);
    if (!flying && terrain.kind === 'water') {
        const current = waterCurrentAt(e.x, e.y);
        dx = dx * 0.45 + (current.x / 60) * 1.6;
        dy = dy * 0.45 + (current.y / 60) * 1.6;
        if (Math.random() < 0.25) spawnWaterRipple(e.x, e.y + e.radius * 0.5);
    } else if (terrain.kind === 'mud' && e.kind !== 'frog' && !flying) {
        dx *= 0.62;
        dy *= 0.62;
    } else if (terrain.kind === 'bamboo' && !flying) {
        dx *= 0.88;
        dy *= 0.88;
    } else if (isPoorSwimmer(e.kind) && terrainInfoAt(e.x + dx, e.y + dy).kind === 'water') {
        const slideX = terrainInfoAt(e.x + dx, e.y).kind !== 'water';
        const slideY = terrainInfoAt(e.x, e.y + dy).kind !== 'water';
        if (slideX) dy = 0;
        else if (slideY) dx = 0;
        else {
            dx = -dx * 0.35;
            dy = -dy * 0.35;
        }
    }
    if (flying) {
        e.x = clamp(e.x + dx, e.radius, WORLD.width - e.radius);
        e.y = clamp(e.y + dy, e.radius, WORLD.height - e.radius);
        updateEnemyFacingFromMovement(e, startX, startY);
        return;
    }
    const steered = steerEnemyAroundResources(e, dx, dy);
    moveEnemyWithSlide(e, steered.x, steered.y);
    updateEnemyFacingFromMovement(e, startX, startY);
}

function moveEnemyWithSlide(e, dx, dy) {
    if (tryEnemyStep(e, dx, dy) || tryEnemyStep(e, dx, 0) || tryEnemyStep(e, 0, dy)) return;
    const speed = Math.hypot(dx, dy);
    if (speed < 0.05) return;
    const dir = normalize(dx, dy);
    const tangent = { x: -dir.y * speed, y: dir.x * speed };
    if (tryEnemyStep(e, tangent.x, tangent.y) || tryEnemyStep(e, -tangent.x, -tangent.y)) return;
    tryEnemyStep(e, (dir.x + tangent.x / speed) * speed * 0.55, (dir.y + tangent.y / speed) * speed * 0.55)
        || tryEnemyStep(e, (dir.x - tangent.x / speed) * speed * 0.55, (dir.y - tangent.y / speed) * speed * 0.55);
}

function tryEnemyStep(e, dx, dy) {
    const oldX = e.x;
    const oldY = e.y;
    e.x = clamp(e.x + dx, e.radius, WORLD.width - e.radius);
    e.y = clamp(e.y + dy, e.radius, WORLD.height - e.radius);
    if (!collides(e)) return true;
    e.x = oldX;
    e.y = oldY;
    return false;
}

function steerEnemyAroundResources(e, dx, dy) {
    const speed = Math.hypot(dx, dy);
    if (speed < 0.05) return { x: dx, y: dy };
    const moveDir = normalize(dx, dy);
    let steerX = 0;
    let steerY = 0;
    for (const r of nearbyResources(e.x, e.y, 180)) {
        if (!isSolidResource(r) || r.hp <= 0) continue;
        const obstacleRadius = r.radius * resourceCollisionScale(r, e);
        const avoidRadius = e.radius + obstacleRadius + 34;
        const toObstacleX = r.x - e.x;
        const toObstacleY = r.y - e.y;
        if (Math.abs(toObstacleX) > avoidRadius + 52 || Math.abs(toObstacleY) > avoidRadius + 52) continue;
        const ahead = toObstacleX * moveDir.x + toObstacleY * moveDir.y;
        if (ahead < -avoidRadius || ahead > avoidRadius + 52) continue;
        const dist = Math.hypot(toObstacleX, toObstacleY);
        if (dist <= 0.01 || dist > avoidRadius) continue;
        const away = normalize(e.x - r.x, e.y - r.y);
        let tangent = { x: -away.y, y: away.x };
        if (tangent.x * moveDir.x + tangent.y * moveDir.y < 0) tangent = { x: -tangent.x, y: -tangent.y };
        const strength = clamp((avoidRadius - dist) / avoidRadius, 0, 1) * (ahead > 0 ? 1 : 0.35);
        steerX += (away.x * 0.45 + tangent.x * 0.9) * strength;
        steerY += (away.y * 0.45 + tangent.y * 0.9) * strength;
    }
    if (Math.hypot(steerX, steerY) < 0.01) return { x: dx, y: dy };
    const dir = normalize(moveDir.x + steerX, moveDir.y + steerY);
    return { x: dir.x * speed, y: dir.y * speed };
}

function updateEnemyFacingFromMovement(e, startX, startY) {
    const movedX = e.x - startX;
    const movedY = e.y - startY;
    if (Math.hypot(movedX, movedY) < 0.05) return;
    e.facing = normalize(movedX, movedY);
}

function updateCamera() {
    if (state.indoor) {
        camera.x = 0;
        camera.y = 0;
        return;
    }
    camera.x = clamp(state.player.x - VIEW.width / 2, 0, WORLD.width - VIEW.width);
    camera.y = clamp(state.player.y - VIEW.height / 2, 0, WORLD.height - VIEW.height);
    if (state.cameraShake > 0) {
        camera.x = clamp(camera.x + (Math.random() - 0.5) * state.cameraShake, 0, WORLD.width - VIEW.width);
        camera.y = clamp(camera.y + (Math.random() - 0.5) * state.cameraShake, 0, WORLD.height - VIEW.height);
    }
}

function updateParticles(dt) {
    state.particles = state.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.05, dt);
        p.vy *= Math.pow(0.05, dt);
        p.life -= dt;
        return p.life > 0;
    });
}

function updateFloatTexts(dt) {
    state.floatTexts = state.floatTexts.filter(t => {
        t.y -= 42 * dt;
        t.life -= dt;
        return t.life > 0;
    });
}

function interact() {
    if (state.win || state.lose) return;
    if (state.indoor) {
        interactIndoor();
        return;
    }
    const target = nearestInteractable();
    if (!target) {
        showToast('靠近可交互目标后按 E：资源、房门、村民、木箱、营地或废墟。');
        return;
    }

    if (target.type === 'resource') beginHarvest(target.item);
    if (target.type === 'camp') useCamp();
    if (target.type === 'ruins') openRuins();
    if (target.type === 'chest') openChest(target.item);
    if (target.type === 'villageHouse') enterVillageHouse(target.item);
    if (target.type === 'villager') interactOutdoorVillager(target.item);
    if (target.type === 'villageNotice') readVillageNotice(target.item);
    if (target.type === 'villageBell') ringVillageBell(target.item);
    if (target.type === 'greenMotherAltar') interactGreenMotherAltar(target.item);
}

function interactPromptText(target) {
    if (!target) return '';
    if (target.type === 'resource') return `长按 E 采集：${resourceName(target.item.kind)}`;
    if (target.type === 'villageHouse') return `按 E 进入：${target.item.label}`;
    if (target.type === 'villager') return villagerPromptText(target.item);
    if (target.type === 'villageNotice') return '按 E 查看村庄告示';
    if (target.type === 'villageBell') return '按 E 敲响警钟';
    if (target.type === 'greenMotherAltar') return '按 E 阅读绿母祭坛文字';
    if (target.type === 'chest') return '按 E 打开木箱';
    if (target.type === 'camp') return '按 E 使用营地';
    if (target.type === 'ruins') return state.ruins.opened ? '废墟门已打开' : '按 E 打开废墟门';
    return '按 E 互动';
}

function indoorPromptText(object) {
    if (!object) return '';
    if (object.action === 'leave') return '按 E 离开房屋';
    if (object.action === 'steal') return `按 E 打开：${object.label}`;
    if (object.action === 'npc') return villagerPromptText(object);
    if (object.action === 'sleep') return '村民的床，不能睡';
    if (object.action?.startsWith('take') || object.action === 'weaponRack' || object.action === 'takeTrinket') return `按 E 拿取：${object.label}`;
    return `按 E 使用：${object.label}`;
}

function villagerPromptText(npc) {
    if ((npc.hp ?? 80) <= 0) return `${npc.label} 已倒下`;
    if (npc.playerAggro || npc.mood === 'angry') return `${npc.label} 正在战斗`;
    if (npc.animalAggressor) return `${npc.label} 正在护村`;
    if (npc.returningHome) return `${npc.label} 正在回家`;
    if ((npc.hp ?? npc.maxHp) < (npc.maxHp || 80)) return `按 E 关心：${npc.label}（受伤）`;
    const task = state.villageTasks?.[npc.role];
    if (task?.status === 'new') return `按 E 交谈：${npc.label}（可查看任务）`;
    if (task?.status === 'accepted') return `按 E 交谈：${npc.label}（任务进行中）`;
    if (canVillagerTrade(npc.role)) return `按 E 交谈：${npc.label}（可交易）`;
    return `按 E 交谈：${npc.label}`;
}

function nearestInteractable() {
    const p = state.player;
    const specials = [];
    for (const village of allVillages()) {
        village.buildings
            .filter(building => distance(p, { x: building.doorX, y: building.doorY }) <= 86)
            .forEach(building => specials.push({ type: 'villageHouse', item: building, d: distance(p, { x: building.doorX, y: building.doorY }) - 1000 }));
        const notice = village.amenities?.noticeBoard;
        if (notice && distance(p, notice) <= notice.radius + 34) specials.push({ type: 'villageNotice', item: notice, d: distance(p, notice) - 12 });
        const bell = village.amenities?.bell;
        if (bell && distance(p, bell) <= bell.radius + 36) specials.push({ type: 'villageBell', item: bell, d: distance(p, bell) - 10 });
        const altar = village.amenities?.altar;
        if (altar && distance(p, altar) <= altar.radius + 46) specials.push({ type: 'greenMotherAltar', item: altar, d: distance(p, altar) - 18 });
    }
    const resources = nearbyResources(p.x, p.y, 140)
        .filter(item => item.hp > 0 && distance(p, item) <= p.radius + item.radius + 24)
        .map(item => ({ type: 'resource', item, d: distance(p, item) }));
    if (distance(p, state.camp) <= state.camp.radius + 28) specials.push({ type: 'camp', item: state.camp, d: distance(p, state.camp) });
    if (distance(p, state.ruins) <= state.ruins.radius + 34) specials.push({ type: 'ruins', item: state.ruins, d: distance(p, state.ruins) });
    state.outdoorVillagers
        .filter(npc => npc.kind !== 'totem' && npc.hp > 0 && npc.outside && distance(p, npc) <= p.radius + npc.radius + 32)
        .forEach(npc => specials.push({ type: 'villager', item: npc, d: distance(p, npc) }));
    state.placedStations
        .filter(station => station.kind === 'chest' && distance(p, station) <= station.radius + 46)
        .forEach(station => specials.push({ type: 'chest', item: station, d: distance(p, station) }));
    return [...resources, ...specials].sort((a, b) => a.d - b.d)[0] || null;
}

function enterVillageHouse(building) {
    if (isVillageHouseLocked(building)) {
        showToast(`${building.label} 夜里上锁了，等天亮村民出门后再来。`);
        return;
    }
    building.interiorObjects ||= createIndoorObjects(building.kind, building);
    building.interiorObjects.forEach(object => {
        if (object.kind === 'npc') object.homeBuilding ||= building;
    });
    state.openChest = null;
    state.openIndoorContainer = null;
    state.indoorProjectiles = [];
    const exitPoint = villageHouseExitPoint(building);
    state.indoor = {
        building,
        outsideX: exitPoint.x,
        outsideY: exitPoint.y,
        objects: building.interiorObjects,
    };
    state.player.x = VIEW.width / 2;
    state.player.y = VIEW.height - 178;
    bringOutdoorPursuersIntoHouse(building);
    camera.x = 0;
    camera.y = 0;
    showToast(`进入${building.label}。靠近门按 E 离开。`);
}

function isVillageHouseLocked(building) {
    if (building.kind === 'merchant') return false;
    return nightAmount() > 0.12 && !state.indoor && buildingHasLivingResident(building);
}

function buildingHasLivingResident(building) {
    building.interiorObjects ||= createIndoorObjects(building.kind, building);
    const indoorAlive = building.interiorObjects.some(object => object.kind === 'npc' && object.hp > 0);
    if (indoorAlive) return true;
    return state.outdoorVillagers.some(object => object.kind === 'npc' && object.homeBuilding === building && object.hp > 0);
}

function villageHouseExitPoint(building) {
    const away = normalize(building.doorX - building.x, building.doorY - building.y || 1);
    if (building.village?.tier === 'jungleCult') {
        const base = nearestJunglePoint(building.doorX + away.x * 74, building.doorY + away.y * 74, building.village);
        return nearestSafeHouseExitPoint(base, building, away);
    }
    const base = nearestDryVillagePoint(building.doorX + away.x * 84, building.doorY + away.y * 84, state.village || building, 180);
    return nearestSafeHouseExitPoint(base, building, away);
}

function nearestSafeHouseExitPoint(base, building, away) {
    const candidates = [
        base,
        { x: building.doorX + away.x * 96, y: building.doorY + away.y * 96 },
        { x: building.doorX + away.x * 118, y: building.doorY + away.y * 118 },
        { x: building.doorX + away.x * 150, y: building.doorY + away.y * 150 },
        { x: base.x - away.y * 54, y: base.y + away.x * 54 },
        { x: base.x + away.y * 54, y: base.y - away.x * 54 },
    ];
    for (const candidate of candidates) {
        const point = { x: snapToGroundGrid(candidate.x), y: snapToGroundGrid(candidate.y), radius: state.player?.radius || 17 };
        if (!collides(point)) return point;
    }
    return { x: snapToGroundGrid(building.doorX + away.x * 150), y: snapToGroundGrid(building.doorY + away.y * 150) };
}

function leaveVillageHouse() {
    const indoor = state.indoor;
    if (!indoor) return;
    state.openIndoorContainer = null;
    state.indoorProjectiles = [];
    sendIndoorPursuersOutside(indoor);
    const exitPoint = villageHouseExitPoint(indoor.building);
    state.player.x = exitPoint.x;
    state.player.y = exitPoint.y;
    state.indoor = null;
    showToast('离开房屋。');
}

function bringOutdoorPursuersIntoHouse(building) {
    for (const npc of state.outdoorVillagers.filter(item => item.homeBuilding === building && item.hp > 0 && item.playerAggro)) {
        const doorDistance = distance(npc, { x: building.doorX, y: building.doorY });
        if (doorDistance <= 74) {
            enterPursuingVillager(npc, building);
        } else if (!state.pendingVillagerEntries.some(entry => entry.npc === npc)) {
            const travelDelay = clamp(doorDistance / 130, 0.7, 2.6) * 1000;
            state.pendingVillagerEntries.push({ npc, building, enterAt: performance.now() + travelDelay });
            npc.targetX = building.doorX;
            npc.targetY = building.doorY;
        }
    }
    state.outdoorVillagers = state.outdoorVillagers.filter(item => item.outside);
}

function updatePendingVillagerEntries(now) {
    if (!state.indoor || !state.pendingVillagerEntries?.length) return;
    for (const entry of state.pendingVillagerEntries) {
        if (entry.building !== state.indoor.building || entry.npc.hp <= 0 || !entry.npc.outside || !entry.npc.playerAggro) {
            entry.done = true;
            continue;
        }
        if (now < entry.enterAt) continue;
        entry.done = enterPursuingVillager(entry.npc, entry.building);
    }
    state.pendingVillagerEntries = state.pendingVillagerEntries.filter(entry => !entry.done);
    state.outdoorVillagers = state.outdoorVillagers.filter(item => item.outside);
}

function enterPursuingVillager(npc, building) {
    if (!state.indoor || state.indoor.building !== building) return false;
    if (!npc.playerAggro) return false;
    removeFromOutdoorVillagers(npc);
    npc.outside = false;
    npc.returningHome = false;
    npc.fleeingToGuard = false;
    npc.x = VIEW.width / 2;
    npc.y = VIEW.height - 178;
    setIndoorVillagerDoorEntryTarget(npc);
    if (!building.interiorObjects.includes(npc)) building.interiorObjects.push(npc);
    if (!state.indoor.objects.includes(npc)) state.indoor.objects.push(npc);
    showToast(`${npc.label}从门口追进了屋子！`);
    return true;
}

function sendIndoorPursuersOutside(indoor) {
    const building = indoor.building;
    const door = { x: VIEW.width / 2, y: VIEW.height - 58 };
    for (const npc of indoor.objects.filter(object => object.kind === 'npc' && !object.outside && object.mood === 'angry' && object.hp > object.maxHp * 0.35)) {
        const doorDistance = distance(npc, door);
        const doorObject = { x: VIEW.width / 2, y: VIEW.height - 58, w: 72, h: 28 };
        if (distanceToRect(npc, doorObject) < indoorInteractionRange({ action: 'leave' })) {
            removeFromInteriorObjects(npc);
            npc.outside = true;
            npc.returnedHome = false;
            npc.homeBuilding = building;
            npc.x = building.doorX;
            npc.y = building.doorY + 46;
            setOutdoorVillagerDoorExitTarget(npc, building);
            npc.returningHome = false;
            if (!state.outdoorVillagers.includes(npc)) state.outdoorVillagers.push(npc);
            showToast(`${npc.label}从门口追出了屋子！`);
        } else {
            npc.targetX = door.x;
            npc.targetY = door.y;
            npc.nextWanderAt = performance.now() + 1000;
            const travelDelay = clamp(doorDistance / 120, 0.6, 2.4) * 1000;
            if (!state.pendingVillagerExits.some(exit => exit.npc === npc)) {
                state.pendingVillagerExits.push({ npc, building, exitAt: performance.now() + travelDelay });
            }
        }
    }
}

function openChest(chest) {
    state.openChest = chest;
    toggleInventory(true);
    showToast('打开木箱。');
}

function createIndoorObjects(kind, building = null) {
    const topY = 190;
    const topH = 84;
    const moduleAt = (left, width, object) => ({ ...object, x: left + width / 2, y: topY, w: width, h: topH, wallModule: true });
    const common = [
        { kind: 'door', label: '门', x: VIEW.width / 2, y: VIEW.height - 58, w: 72, h: 28, solid: true, action: 'leave' },
        { kind: 'bed', label: '床', x: 720, y: 396, w: 48, h: 84, solid: true, action: 'sleep' },
        moduleAt(576, 80, { kind: 'chest', label: '村民箱子', solid: true, action: 'steal', loot: randomContainerLoot('villager', building), stolen: false }),
        moduleAt(656, 80, { kind: 'chest', label: '小木箱', solid: true, action: 'steal', loot: randomContainerLoot('small', building), stolen: false }),
    ];
    const basicCommon = [
        { kind: 'door', label: '门', x: VIEW.width / 2, y: VIEW.height - 58, w: 72, h: 28, solid: true, action: 'leave' },
        { kind: 'brokenBed', label: '破床', x: 714, y: 392, w: 54, h: 72, solid: true, action: 'sleep' },
        { kind: 'debris', label: '碎木堆', x: 612, y: 336, w: 58, h: 34, solid: true },
        moduleAt(560, 82, { kind: 'brokenShelf', label: '破架子', solid: true }),
    ];
    const byKind = {
        blacksmith: [
            moduleAt(224, 104, { kind: 'forge', label: '熔炉', solid: true, action: 'forge' }),
            moduleAt(328, 160, { kind: 'rack', label: '武器架', solid: true, action: 'weaponRack', storage: { simpleArrow: 6 }, taken: false }),
            { kind: 'npc', role: 'blacksmith', label: '铁匠', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 80, maxHp: 80, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            moduleAt(488, 88, { kind: 'coalPile', label: '煤堆', solid: true, action: 'takeCoal', storage: { coal: 5 }, taken: false }),
            { kind: 'crate', label: '矿石箱', x: 720, y: 316, w: 58, h: 42, solid: true, action: 'steal', loot: randomContainerLoot('ore', building), stolen: false },
        ],
        apothecary: [
            moduleAt(224, 104, { kind: 'potionTable', label: '药水台', solid: true, action: 'potionTable' }),
            moduleAt(328, 160, { kind: 'herbRack', label: '晾草架', solid: true, action: 'takeHerb', storage: { herb: 5 }, taken: false }),
            { kind: 'npc', role: 'apothecary', label: '药师', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 80, maxHp: 80, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            moduleAt(488, 88, { kind: 'basket', label: '草药篮', solid: true, action: 'takeHerb', storage: { herb: 4 }, taken: false }),
            { kind: 'chest', label: '药材箱', x: 720, y: 316, w: 62, h: 44, solid: true, action: 'steal', loot: randomContainerLoot('herb', building), stolen: false, mark: 'herb' },
        ],
        kitchen: [
            moduleAt(224, 104, { kind: 'hearth', label: '火塘', solid: true, action: 'campfire' }),
            moduleAt(328, 160, { kind: 'meatRack', label: '食材架', solid: true, action: 'takeFood', storage: { meat: 4 }, taken: false }),
            { kind: 'npc', role: 'kitchen', label: '厨师', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 80, maxHp: 80, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            moduleAt(488, 88, { kind: 'cookPot', label: '锅', solid: true, action: 'campfire' }),
            { kind: 'foodCrate', label: '食材箱', x: 720, y: 316, w: 64, h: 46, solid: true, action: 'steal', loot: randomContainerLoot('food', building), stolen: false },
        ],
        guard: [
            moduleAt(224, 124, { kind: 'rack', label: '长矛架', solid: true, action: 'takeTrinket', storage: { stoneSpear: 2, simpleArrow: 6 }, taken: false }),
            moduleAt(348, 160, { kind: 'guardSupplies', label: '战斗物资', solid: true, action: 'takeTrinket', storage: { stoneSpear: 1, sinewBow: 1, simpleArrow: 10, bandage: 3, ironSkinPotion: 1 }, taken: false }),
            { kind: 'npc', role: 'guard', label: '守卫', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 100, maxHp: 100, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            { kind: 'crate', label: '武备箱', x: 720, y: 316, w: 62, h: 44, solid: true, action: 'steal', loot: randomContainerLoot('guard', building), stolen: false, mark: 'guard' },
        ],
        guardFortress: [
            moduleAt(208, 120, { kind: 'rack', label: '堡垒武器架', solid: true, action: 'takeTrinket', storage: { stoneSpear: 2, simpleArrow: 10 }, taken: false }),
            moduleAt(328, 150, { kind: 'guardSupplies', label: '堡垒补给', solid: true, action: 'takeTrinket', storage: { sinewBow: 1, simpleArrow: 14, bandage: 4, ironSkinPotion: 1 }, taken: false }),
            { kind: 'npc', role: 'guard', label: '铁堡守卫', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 100, maxHp: 100, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            { kind: 'crate', label: '堡垒武备箱', x: 720, y: 316, w: 64, h: 46, solid: true, action: 'steal', loot: randomContainerLoot('guard', building), stolen: false, mark: 'guard' },
        ],
        merchant: [
            moduleAt(220, 128, { kind: 'shopShelf', label: '商品架', solid: true, action: 'takeTrinket', storage: { berry: 4, bandage: 2, simpleArrow: 8 }, taken: false }),
            moduleAt(348, 128, { kind: 'shopShelf', label: '工具架', solid: true, action: 'takeTrinket', storage: { torch: 2, stoneSpear: 1, potion: 1 }, taken: false }),
            moduleAt(476, 104, { kind: 'shopShelf', label: '钱币架', solid: true, action: 'takeTrinket', storage: { copperCoin: 6 }, taken: false }),
            { kind: 'npc', role: 'merchant', label: '商人', x: 352, y: 294, homeX: 352, homeY: 294, w: 34, h: 46, radius: 17, hp: 70, maxHp: 70, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            { kind: 'crate', label: '钱箱', x: 704, y: 350, w: 58, h: 40, solid: true, action: 'steal', loot: randomContainerLoot('shop', building), stolen: false, mark: 'shop' },
        ],
        basicVillager: [
            moduleAt(246, 108, { kind: 'basket', label: '破篮子', solid: true, action: 'takeTrinket', storage: { berry: 2, fiber: 2 }, taken: false }),
            { kind: 'brokenTable', label: '歪桌子', x: 408, y: 342, w: 68, h: 32, solid: true },
            { kind: 'npc', role: 'unemployed', label: '村民', x: 330, y: 286, homeX: 330, homeY: 286, w: 34, h: 46, radius: 17, hp: 52, maxHp: 52, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            { kind: 'crate', label: '旧木箱', x: 706, y: 330, w: 54, h: 36, solid: true, action: 'steal', loot: randomContainerLoot('basic', building), stolen: false },
        ],
        basicElder: [
            moduleAt(236, 124, { kind: 'brokenShelf', label: '旧木架', solid: true }),
            { kind: 'brokenTable', label: '旧桌子', x: 430, y: 334, w: 76, h: 34, solid: true },
            { kind: 'npc', role: 'basicElder', label: '低级村长', x: 334, y: 282, homeX: 334, homeY: 282, w: 34, h: 46, radius: 17, hp: 86, maxHp: 86, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            { kind: 'crate', label: '村长旧箱', x: 706, y: 326, w: 56, h: 38, solid: true, action: 'steal', loot: randomContainerLoot('elder', building), stolen: false, mark: 'elder' },
        ],
        elder: [
            moduleAt(224, 144, { kind: 'map', label: '地图台', solid: true, action: 'map' }),
            { kind: 'npc', role: 'elder', label: '村长', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 120, maxHp: 120, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            moduleAt(368, 208, { kind: 'flag', label: '村旗', solid: true, action: 'elder' }),
            { kind: 'chest', label: '村长箱子', x: 720, y: 316, w: 62, h: 44, solid: true, action: 'steal', loot: randomContainerLoot('elder', building), stolen: false, mark: 'elder' },
        ],
        unemployed: [
            moduleAt(224, 124, { kind: 'workbenchModule', label: '工作台', solid: true, action: 'workbench' }),
            moduleAt(348, 160, { kind: 'trinketRack', label: '杂物架', solid: true, action: 'takeTrinket', storage: randomTrinketStorage(kind), taken: false }),
            { kind: 'npc', role: 'unemployed', label: '村民', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 62, maxHp: 62, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            moduleAt(508, 68, { kind: 'basket', label: '小篮子', solid: true, action: 'takeTrinket', storage: randomTrinketStorage(`${kind}-basket`), taken: false }),
        ],
        cultPriest: [
            moduleAt(214, 142, { kind: 'jarShelf', label: '毒谱架', solid: true, action: 'takeTrinket', storage: { poisonVial: 5, toxicMushroom: 4, venom: 3, herb: 3, jungleLeaf: 3, vine: 2, antidote: 1 }, taken: false }),
            moduleAt(368, 116, { kind: 'bookshelf', label: '禁毒册架', solid: true, action: 'takeTrinket', storage: { jungleLeaf: 5, toxicMushroom: 3, venom: 2, fang: 2 }, taken: false }),
            { kind: 'npc', role: 'cultPriest', label: '绿母祭司', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 115, maxHp: 115, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            { kind: 'chest', label: '献祭箱', x: 720, y: 316, w: 62, h: 44, solid: true, action: 'steal', loot: randomContainerLoot('herb', building), stolen: false, mark: 'herb' },
        ],
        cultHerbalist: [
            moduleAt(214, 116, { kind: 'bookshelf', label: '藤语书架', solid: true, action: 'takeTrinket', storage: { jungleLeaf: 6, vine: 6, herb: 3 }, taken: false }),
            moduleAt(342, 126, { kind: 'bookshelf', label: '怪物图谱架', solid: true, action: 'takeTrinket', storage: { toxicMushroom: 4, fang: 3, venom: 3, jungleLeaf: 2 }, taken: false }),
            moduleAt(476, 92, { kind: 'readingDesk', label: '藤文书桌', solid: true, action: 'workbench' }),
            { kind: 'npc', role: 'cultHerbalist', label: '藤语者', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 78, maxHp: 78, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            { kind: 'bookshelf', label: '树皮卷架', x: 704, y: 326, w: 60, h: 78, solid: true, action: 'takeTrinket', storage: { buttressWood: 3, jungleLeaf: 5, vine: 4, venom: 2 }, taken: false },
        ],
        cultHealer: [
            moduleAt(214, 112, { kind: 'herbRack', label: '疗藤药架', solid: true, action: 'takeTrinket', storage: { herb: 6, jungleLeaf: 5, vine: 4, salve: 2 }, taken: false }),
            moduleAt(348, 132, { kind: 'potionTable', label: '绿疗台', solid: true, action: 'potionTable' }),
            { kind: 'npc', role: 'cultHealer', label: '丛林疗士', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 88, maxHp: 88, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            moduleAt(500, 88, { kind: 'basket', label: '疗果篮', solid: true, action: 'takeTrinket', storage: { jungleFruit: 5, herb: 3, bandage: 2 }, taken: false }),
        ],
        cultHunter: [
            moduleAt(224, 168, { kind: 'rack', label: '毒矛架', solid: true, action: 'takeTrinket', storage: { poisonArrow: 10, simpleArrow: 10, stoneSpear: 2, venom: 2 }, taken: false }),
            { kind: 'npc', role: 'cultHunter', label: '蛇纹猎手', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 86, maxHp: 86, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
            moduleAt(488, 88, { kind: 'basket', label: '藤篮', solid: true, action: 'takeTrinket', storage: { vine: 6, jungleFruit: 5, jungleLeaf: 4, fang: 2 }, taken: false }),
        ],
        cultGuard: [
            moduleAt(224, 168, { kind: 'rack', label: '根盾架', solid: true, action: 'takeTrinket', storage: { bambooTrap: 3, bandage: 5, vine: 4, buttressWood: 2 }, taken: false }),
            { kind: 'npc', role: 'cultGuard', label: '树根守卫', x: 330, y: 276, homeX: 330, homeY: 276, w: 34, h: 46, radius: 17, hp: 105, maxHp: 105, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
        ],
        cultVillager: [
            moduleAt(246, 108, { kind: 'basket', label: '祭品篮', solid: true, action: 'takeTrinket', storage: { jungleLeaf: 6, vine: 5, jungleFruit: 5, herb: 3 }, taken: false }),
            { kind: 'npc', role: 'cultVillager', label: '献祭教徒', x: 330, y: 286, homeX: 330, homeY: 286, w: 34, h: 46, radius: 17, hp: 64, maxHp: 64, solid: false, action: 'npc', mood: 'calm', nextWanderAt: 0 },
        ],
    };
    const base = ['basicVillager', 'basicElder'].includes(kind) ? basicCommon : common;
    return [...base, ...(byKind[kind] || [])];
}

function randomTrinketStorage(seedKey) {
    const options = [
        { fiber: 3, pebble: 2 },
        { berry: 2, flower: 1 },
        { mushroom: 1, wood: 2 },
        { herb: 1, fiber: 2 },
        { simpleArrow: 2, stone: 1 },
    ];
    return { ...options[Math.floor(seededUnit(String(seedKey).length, 19.6) * options.length) % options.length] };
}

function randomContainerLoot(profile, building = null) {
    const local = villageLocalLootTable(building);
    const products = villageLocalProductTable(local.keys);
    const otherTables = {
        villager: [['copperCoin', 1, 3], ['bandage', 1, 2], ['simpleArrow', 2, 6]],
        small: [['pebble', 2, 6], ['simpleArrow', 2, 6], ['copperCoin', 0, 2]],
        ore: [['coal', 1, 4], ['ore', 1, 4], ['stone', 2, 6], ['ironSkinPotion', 0, 1]],
        herb: [['antidote', 0, 2], ['honeySalve', 0, 1], ['regenPotion', 0, 1]],
        food: [['roastMeat', 1, 3], ['stew', 0, 2], ['honeyRoastMeat', 0, 1]],
        guard: [['simpleArrow', 8, 16], ['bandage', 1, 3], ['stoneSpear', 0, 1], ['sinewBow', 0, 1]],
        shop: [['copperCoin', 4, 10], ['bandage', 1, 3], ['potion', 0, 1], ['simpleArrow', 4, 10]],
        basic: [['copperCoin', 0, 2], ['stone', 0, 3], ['fiber', 1, 4]],
        elder: [['copperCoin', 2, 6], ['antlerCharm', 0, 1], ['speedPotion', 0, 1], ['bandage', 1, 3]],
    };
    const table = [...local.table, ...products, ...(otherTables[profile] || otherTables.villager)];
    const loot = {};
    const localPicks = profile === 'villager' || profile === 'small' || profile === 'basic' ? 4 : 3;
    const otherPicks = profile === 'villager' || profile === 'small' ? 1 : 2;
    const localPool = [...local.table, ...products].sort(() => Math.random() - 0.5);
    const otherPool = (otherTables[profile] || otherTables.villager).slice().sort(() => Math.random() - 0.5);
    for (const [key, min, max] of [...localPool.slice(0, localPicks), ...otherPool.slice(0, otherPicks)]) {
        const amount = min + Math.floor(Math.random() * (max - min + 1));
        if (amount > 0) loot[key] = (loot[key] || 0) + amount;
    }
    if (!Object.keys(loot).length) {
        const [key, min] = table.find(([, value]) => value > 0) || ['berry', 1];
        loot[key] = min;
    }
    return loot;
}

function villageLocalLootTable(building = null) {
    const village = building?.village || state?.indoor?.building?.village || state?.village || CAMP_POSITION;
    const terrainCounts = {};
    [[0, 0], [260, 0], [-260, 0], [0, 260], [0, -260], [520, 120], [-520, 120], [180, 520], [180, -520], [820, 0], [-820, 0], [0, 820], [0, -820]].forEach(([ox, oy]) => {
        const kind = terrainInfoAt(clamp(village.x + ox, 40, WORLD.width - 40), clamp(village.y + oy, 40, WORLD.height - 40)).kind;
        terrainCounts[kind] = (terrainCounts[kind] || 0) + 1;
    });
    const table = [['fiber', 2, 7], ['berry', 1, 5], ['herb', 1, 4], ['wood', 1, 4]];
    const addTerrain = (kind, entries) => { if (terrainCounts[kind]) entries.forEach(entry => table.push(entry)); };
    addTerrain('grass', [['oakWood', 1, 4], ['berry', 2, 6], ['flower', 1, 4]]);
    addTerrain('tallgrass', [['fiber', 4, 10], ['oakWood', 1, 3], ['herb', 1, 4]]);
    addTerrain('forest', [['oakWood', 2, 6], ['mushroom', 1, 4], ['resin', 0, 2], ['hide', 0, 1]]);
    addTerrain('birch', [['birchWood', 2, 6], ['flower', 1, 4], ['berry', 1, 4]]);
    addTerrain('pine', [['pineWood', 2, 6], ['resin', 1, 3], ['mushroom', 1, 4]]);
    addTerrain('maple', [['mapleWood', 2, 6], ['sap', 1, 3], ['berry', 1, 4]]);
    addTerrain('meadow', [['blossomWood', 1, 4], ['flower', 2, 6], ['honey', 0, 2], ['pollenDust', 0, 1]]);
    addTerrain('darkForest', [['darkWood', 1, 4], ['deadWood', 1, 3], ['toxicMushroom', 0, 2], ['shadowShard', 0, 1]]);
    addTerrain('swamp', [['cypressWood', 1, 4], ['mushroom', 1, 4], ['mud', 2, 5], ['lotus', 0, 2]]);
    addTerrain('mud', [['cypressWood', 1, 4], ['mud', 2, 6], ['lotus', 0, 2], ['reedShell', 0, 1]]);
    addTerrain('reedWetland', [['willowWood', 1, 4], ['fiber', 3, 8], ['lotus', 0, 2], ['reedShell', 0, 1]]);
    addTerrain('jungle', [['hardwood', 1, 4], ['buttressWood', 1, 3], ['jungleLeaf', 1, 4], ['vine', 1, 4], ['jungleFruit', 0, 3]]);
    addTerrain('bamboo', [['bamboo', 2, 6], ['bambooShard', 1, 4], ['fiber', 2, 5]]);
    addTerrain('mine', [['stone', 3, 8], ['ore', 1, 4], ['coal', 1, 4], ['ironwood', 0, 2]]);
    addTerrain('ruins', [['elderWood', 1, 3], ['stone', 2, 6], ['crystal', 0, 2], ['boneShard', 0, 1]]);
    addTerrain('dry', [['cactusFruit', 1, 4], ['stone', 2, 6], ['fiber', 1, 4]]);
    addTerrain('shore', [['fiber', 2, 5], ['lotus', 0, 2], ['frogLeg', 0, 1]]);
    return { table, keys: new Set(table.map(([key]) => key)), terrainCounts };
}

function villageLocalProductTable(localKeys) {
    const products = [];
    if (localKeys.has('fiber')) products.push(['bandage', 0, 2], ['simpleArrow', 2, 8]);
    if (localKeys.has('herb')) products.push(['salve', 0, 1], ['potion', 0, 1]);
    if (localKeys.has('honey') || localKeys.has('pollenDust')) products.push(['honeySalve', 0, 1]);
    if (localKeys.has('sap') || localKeys.has('mapleWood')) products.push(['mapleSnack', 0, 2]);
    if (localKeys.has('resin')) products.push(['resinGlue', 0, 2], ['torch', 0, 2]);
    if (localKeys.has('bamboo')) products.push(['bambooShard', 2, 6], ['bambooTrap', 0, 1]);
    if (localKeys.has('ore') || localKeys.has('ironwood')) products.push(['ironSkinPotion', 0, 1]);
    if (localKeys.has('meat')) products.push(['roastMeat', 0, 2]);
    return products;
}

function nearestIndoorObject() {
    if (!state.indoor) return null;
    return state.indoor.objects
        .filter(object => !object.outside)
        .map(object => ({ object, d: distanceToRect(state.player, object) }))
        .filter(item => item.d < indoorInteractionRange(item.object))
        .sort((a, b) => a.d - b.d)[0]?.object || null;
}

function indoorInteractionRange(object) {
    if (object.action === 'totem') return 56;
    if (object.action === 'leave') return 104;
    return 46;
}

function distanceToRect(point, rect) {
    const dx = Math.max(Math.abs(point.x - rect.x) - rect.w / 2, 0);
    const dy = Math.max(Math.abs(point.y - rect.y) - rect.h / 2, 0);
    return Math.hypot(dx, dy);
}

function interactIndoor() {
    const object = nearestIndoorObject();
    if (!object) {
        showToast('靠近门或室内物品后按 E。');
        return;
    }
    switch (object.action) {
        case 'leave':
            leaveVillageHouse();
            break;
        case 'forge':
            showToast('这里可作为锻造台使用。');
            toggleInventory(true);
            break;
        case 'potionTable':
            showToast('这里可作为药水台使用。');
            toggleInventory(true);
            break;
        case 'campfire':
            showToast('这里可烹饪熟食。');
            toggleInventory(true);
            break;
        case 'workbench':
            showToast('这里可作为工作台使用。');
            toggleInventory(true);
            break;
        case 'sleep':
            showToast('这是村民的床，不能随便睡。可以在自己的床卷休息。');
            break;
        case 'steal':
            stealFromIndoorContainer(object);
            break;
        case 'takeCoal':
            takeIndoorResource(object, 'coal', 1, '拿走 1 块煤。');
            break;
        case 'takeHerb':
            takeIndoorResource(object, 'herb', 1, '取下 1 份草药。');
            break;
        case 'takeFood':
            takeIndoorResource(object, 'meat', 1, '从食材架上取下一块生肉。');
            break;
        case 'map':
            showToast('地图标记着矿区、黑森林和废墟的大致方向。');
            break;
        case 'weaponRack':
            takeIndoorResource(object, 'simpleArrow', 1, '从武器架取下 1 支备用箭。');
            break;
        case 'takeTrinket':
            takeTrinketFromRack(object);
            break;
        case 'npc':
            if ((object.hp ?? 80) <= 0) {
                showToast(`${object.label} 已经倒下，无法交谈。`);
                break;
            }
            interactVillageNpc(object.role);
            prepareVillagerTrade(object);
            break;
        case 'elder':
            showToast(`本村声誉：${villageReputation(state.indoor?.building?.village).toFixed(1)}。任务状态：${villageTaskSummary()}。`);
            break;
        case 'totem':
            showToast('村庄图腾正在保护村长。');
            break;
        default:
            showToast(`${object.label} 可以交互，功能后续扩展。`);
    }
}

function stealFromIndoorContainer(object) {
    object.storage ||= { ...(object.loot || {}) };
    object.opened = true;
    const learned = recipeLearningSuffix(learnRecipesFromVillageContainer(object));
    state.openChest = null;
    state.openIndoorContainer = {
        storage: object.storage,
        villageOwned: true,
        ownerObject: object,
        label: object.label,
    };
    toggleInventory(true);
    showToast(`打开${object.label}。拿走物品会降低村庄声誉。${learned}`);
}

function learnRecipesFromVillageContainer(object) {
    if (!object || object.recipeNotesSearched) return [];
    object.recipeNotesSearched = true;
    const source = recipeNoteSourceForObject(object);
    if (!source) return [];
    state.foundRecipeNotes ||= {};
    state.foundRecipeNotes[source] = true;
    return learnRecipesByIds(NOTE_RECIPE_IDS[source] || []);
}

function recipeNoteSourceForObject(object) {
    const kind = state.indoor?.building?.kind || '';
    const mark = object.mark || '';
    if (mark === 'guard' || kind === 'guard' || kind === 'guardFortress') return 'guard';
    if (mark === 'herb' || kind === 'apothecary' || kind === 'cultPriest' || kind === 'cultHerbalist' || kind === 'cultHealer') return 'apothecary';
    if (mark === 'elder' || kind === 'elder' || kind === 'basicElder') return 'elder';
    if (kind === 'blacksmith' || mark === 'ore') return 'blacksmith';
    if (kind === 'unemployed' || kind === 'basicVillager') return 'workbench';
    return '';
}

function lootText(loot = {}) {
    const entries = Object.entries(loot).map(([key, amount]) => `${RESOURCE_LABELS[key] || key} x${amount}`);
    return entries.length ? entries.join('、') : '空的';
}

function takeIndoorResource(object, key, amount, message) {
    object.storage ||= { [key]: amount };
    const available = object.storage[key] || 0;
    if (available <= 0) {
        object.taken = true;
        showToast(`${object.label} 已经空了。`);
        return;
    }
    const moved = Math.min(amount, available);
    if (!addInventoryItem(key, moved)) {
        showToast('背包已满。');
        return;
    }
    object.storage[key] -= moved;
    if (object.storage[key] <= 0) {
        delete object.storage[key];
        object.taken = true;
    }
    const left = object.storage[key] || 0;
    showToast(left > 0 ? `${message} 还剩 ${left}。` : `${message} ${object.label} 已空。`);
    renderHud();
}

function takeTrinketFromRack(object) {
    object.storage ||= {};
    const key = Object.keys(object.storage).find(item => (object.storage[item] || 0) > 0);
    if (!key) {
        object.taken = true;
        showToast(`${object.label} 已经空了。`);
        return;
    }
    takeIndoorResource(object, key, 1, `从${object.label}拿走 1 个${RESOURCE_LABELS[key] || key}。`);
}

function villagerDialogueLines(role) {
    return ({
        blacksmith: [
            '我的炉火不问来路，只认矿石够不够硬。',
            '守卫的矛尖卷了边，村路上的怪物最近越来越多。',
            '铁不是最好的材料，能活着带回来的材料才是。',
            '如果你找到怪物硬爪或晶牙，我能把它们变成真正的武器。',
            '别在我打铁时站太近。火星不长眼，我也不长耐心。',
        ],
        apothecary: [
            '草药有三分救命，七分看你敢不敢喝。',
            '毒和药常常只差一滴水。',
            '如果你被奇怪的绿毒缠上，先别跑，跑得越快毒走得越深。',
            '我不喜欢丛林教派的毒谱，那些东西不像人调出来的。',
            '带来新材料，我可以试着配出更稳的药。',
        ],
        kitchen: [
            '饿着肚子别出村，怪物可不会等你吃完饭。',
            '好肉要慢烤，坏蘑菇要扔远点。',
            '如果战斗打到厨房，我会把菜刀当最后一道菜。',
        ],
        guard: [
            '夜里听见警钟就往亮处跑，别往草里钻。',
            '村外不是没人管，只是有些东西管不过来。',
            '如果另一个村的人带着武器靠近，我们不会先问名字。',
            '丛林里那些绿光，我宁愿当成眼睛看。',
        ],
        elder: [
            '村庄不是房子围起来的地方，而是大家愿意守住的地方。',
            '道路会把人带来，也会把麻烦带来。',
            '低声说，丛林深处那群人从不承认自己迷路。',
            '如果村与村开战，最先倒下的往往不是最弱的人。',
            '你若想改变这里，先弄清楚每个村庄害怕什么。',
            '古老的祭坛从不白白发光。记住这句话。',
        ],
        basicElder: [
            '我们村小，但不是没人撑腰。',
            '别看我老，真出事我还是会第一个喊人。',
            '低级村庄想活下去，就得比大村更谨慎。',
        ],
        merchant: [
            '我卖东西，也买故事。可惜故事不能填饱背包。',
            '铜币会说话，只是穷人听不见。',
            '丛林教派的东西很值钱，但最好别问它们从哪来。',
            '如果你有稀有木料，我能换给你更实用的补给。',
            '真正的商人不会骗你第二次，因为第一次后你就不来了。',
        ],
        unemployed: [
            '我今天本来只想散步，结果听见外面又有怪叫。',
            '如果你要进别人屋子，至少别把箱子翻得太响。',
        ],
        cultPriest: [
            '绿母在根下听见每一次脚步。',
            '你看见的是祭坛，我们听见的是心跳。',
            '毒不是惩罚，是让身体记住丛林的语言。',
            '不要问绿光从何而来。问得太久，绿光也会看见你。',
            '藤语者驱使野兽，疗士缝合伤口，而我负责让大家记得母亲。',
            '若祭坛在夜里变亮，说明有人在别处流血。',
        ],
        cultHerbalist: [
            '嘘，别惊动叶背后的眼睛。',
            '蛇听不懂人话，但听得懂根须的命令。',
            '我不控制它们，我只是把绿母的意思递过去。',
            '如果我倒下，它们会忘记村民，也会忘记仇恨。',
            '未受控的丛林生物靠近时，我必须出去作法。',
            '你若没有招惹教会，我的兽不会咬你。',
        ],
        cultHealer: [
            '别动，伤口里有碎藤，我得先把它哄出来。',
            '疗藤会补命，也会借命。你最好别问借的是谁的。',
            '受控的兽也是村的一部分，它们受伤时也会回到绿光下。',
            '缠住敌人比杀死敌人仁慈，因为绿母喜欢活着的根。',
            '祭司谈信仰，藤语者谈命令，我只听见疼痛。',
            '如果你被我的藤缠住，别挣扎，挣扎会越缠越深。',
        ],
        cultHunter: [
            '蛇纹不是装饰，是提醒我出手要像蛇一样省力。',
            '远处用吹箭，近了用毒矛，别同时拿两样，手会乱。',
            '丛林不会追猎物，丛林只等猎物走错一步。',
            '我的箭头涂过毒谱架上的东西，别用手碰。',
        ],
        cultGuard: [
            '木甲会长进皮肤里，这样才挡得住夜里的爪子。',
            '我站在根墙前，不是因为勇敢，是因为退路已经长满藤。',
            '村战时，根盾先挡人，木锤再问话。',
            '绿母不喜欢门，但她喜欢守门的人。',
        ],
        cultVillager: [
            '我们不修路。路会邀请不该来的脚。',
            '夜里的树灯不是给人看的，是给树看的。',
            '献祭不是死亡，有时只是把名字交给根。',
        ],
    })[role] || ['最近不太平，出门小心。'];
}

function advanceVillagerDialogue(npc) {
    if (!npc) return '';
    const lines = villagerDialogueLines(npc.role);
    const index = npc.dialogueIndex || 0;
    npc.dialogueIndex = (index + 1) % lines.length;
    return lines[index % lines.length];
}

function dialogueSuffixForNpc(npc) {
    if (!npc) return '';
    if (canVillagerTrade(npc.role)) return '（右下角可交易）';
    if (state.villageTasks?.[npc.role]) return '（右下角可查看任务）';
    return '';
}

function interactOutdoorVillager(npc) {
    if ((npc.hp ?? 80) <= 0) {
        showToast(`${npc.label} 已经倒下，无法交谈。`);
        return;
    }
    if (npc.playerAggro || npc.mood === 'angry') {
        showToast(`${npc.label} 正在战斗，暂时无法交谈或交易。`);
        return;
    }
    if (npc.animalAggressor) {
        showToast(`${npc.label} 正在护村，解决威胁后再交谈。`);
        return;
    }
    if (npc.returningHome) {
        showToast(`${npc.label} 正在回家休息。`);
        return;
    }
    const learned = recipeLearningSuffix(learnRecipesFromTeacher(npc.role));
    showToast(`${npc.label}：${advanceVillagerDialogue(npc)}${dialogueSuffixForNpc(npc)}${learned}`);
    prepareVillagerTrade(npc);
}

function interactVillageNpc(role) {
    const task = state.villageTasks[role];
    const name = npcName(role);
    const npc = state.indoor?.objects.find(object => object.kind === 'npc' && object.role === role);
    const taskVillage = villageForTrader(npc);
    const dialogue = advanceVillagerDialogue(npc);
    if (!task) {
        const learned = recipeLearningSuffix(learnRecipesFromTeacher(role));
        showToast(`${name}：${dialogue || '最近不太平，出门小心。'}${dialogueSuffixForNpc(npc)}${learned}`);
        return;
    }
    if (npc && (npc.hp ?? 80) <= 0) {
        showToast(`${name} 已经倒下，无法交谈。`);
        return;
    }
    if (npc?.animalAggressor) {
        showToast(`${name}：我正在护村，等危险过去再说。`);
        return;
    }
    if (npc?.returningHome) {
        showToast(`${name}：我得先回家休息。`);
        return;
    }
    if (villageReputation(taskVillage) < -3) {
        showToast(`${name}：我听说你总翻村里的箱子。先做点正经事，把名声补回来。`);
        if (npc) setVillagerPlayerAggro(npc);
        return;
    }
    if (npc?.mood === 'angry') {
        showToast(`${name}：箱子的事我看见了。下次先问，别直接拿。`);
        npc.mood = 'annoyed';
        return;
    }
    const learned = recipeLearningSuffix(learnRecipesFromTeacher(role));
    if (task.status === 'done') {
        showToast(`${name}：${dialogue} 声誉 ${villageReputation(taskVillage).toFixed(1)}。${dialogueSuffixForNpc(npc)}${learned}`);
        return;
    }
    if (task.status === 'new') {
        showToast(`${name}：${dialogue}${dialogueSuffixForNpc(npc)}${learned}`);
        return;
    }
    if (!hasItems(task.need)) {
        showToast(`${name}：${dialogue} 任务还差：${missingItemsText(task.need)}。${learned}`);
        return;
    }
    showToast(`${name}：${dialogue} 材料齐了，可提交任务。${learned}`);
}

function readVillageNotice(board) {
    const village = allVillages().find(item => item.amenities?.noticeBoard === board) || state.village;
    const guards = (village?.buildings || []).filter(building => isGuardBuilding(building)).length;
    const wounded = [
        ...state.outdoorVillagers,
        ...(village?.buildings || []).flatMap(building => building.interiorObjects || []),
    ].filter(npc => npc.kind === 'npc' && npc.hp > 0 && npc.hp < (npc.maxHp || 80)).length;
    const wellStatus = village?.well?.broken ? '水井损坏' : '水井正常';
    showToast(`告示：本村声誉 ${villageReputation(village).toFixed(1)}；${villageTaskSummary()}；守卫屋 ${guards}；伤员 ${wounded}；${wellStatus}。`);
}

function interactGreenMotherAltar(altar) {
    const now = performance.now();
    if (!altar.confirmSacrificeUntil || now > altar.confirmSacrificeUntil) {
        altar.confirmSacrificeUntil = now + 6500;
        showToast('祭坛刻字：以血润根，以饥养母；愿得绿荫者，再按 E 献祭。');
        spawnBurst(altar.x, altar.y - 28, '#8cff66', 12, 130, 28);
        return;
    }
    altar.confirmSacrificeUntil = 0;
    performGreenMotherSacrifice(altar, now);
}

function performGreenMotherSacrifice(altar, now) {
    const p = state.player;
    if (p.hp <= 28 || p.hunger <= 18) {
        showToast('绿母拒绝虚弱的献祭：你需要更多生命和饥饿值。');
        spawnBurst(altar.x, altar.y - 26, '#7f2630', 10, 120, 24);
        return;
    }
    p.hp = Math.max(1, p.hp - 22);
    p.hunger = clamp(p.hunger - 18, 0, p.maxHunger);
    p.poisonResistUntil = Math.max(p.poisonResistUntil || 0, now + 22000);
    p.nightVisionUntil = Math.max(p.nightVisionUntil || 0, now + 18000);
    p.regenUntil = Math.max(p.regenUntil || 0, now + 8000);
    changeVillageReputation(activeJungleCultVillage, 0.6);
    altar.lastSacrificeAt = now;
    state.cameraShake = Math.max(state.cameraShake, 8);
    spawnBurst(altar.x, altar.y - 30, '#8cff66', 34, 260, 48);
    addFloatText('绿母赐福', p.x, p.y - 60, '#9cffb7');
    showToast('你把血滴在绿母祭坛上。丛林在耳边低语：毒抗、夜视与再生暂时增强。');
    renderHud();
}

function ringVillageBell(bell) {
    const now = performance.now();
    if (now < (bell.lastRungAt || 0) + 9000) {
        showToast('警钟还在回响，稍等一下。');
        return;
    }
    bell.lastRungAt = now;
    spawnBurst(bell.x, bell.y - 34, '#ffd166', 22, 180, 28);
    addFloatText('铛！', bell.x, bell.y - 52, '#ffd166');
    const village = allVillages().find(item => item.amenities?.bell === bell) || state.village;
    if (villageReputation(village) < -1) {
        alertVillageGuardsToPlayer();
        showToast('警钟响起，但你名声太差，守卫把你当成威胁！');
        return;
    }
    const scared = scareVillageEnemies(now, village);
    callVillageGuardsToBell(bell, now, village);
    showToast(scared ? `警钟响起，附近 ${scared} 个怪物被震退，守卫开始集结。` : '警钟响起，守卫开始往村中心集结。');
}

function alertVillageGuardsToPlayer() {
    for (const npc of villageNpcList().filter(item => item.role === 'guard' && item.hp > 0)) {
        setVillagerPlayerAggro(npc);
        if (!npc.outside && npc.homeBuilding) scheduleVillagerExit(npc, npc.homeBuilding, performance.now(), 450);
    }
}

function scareVillageEnemies(now, village = state.village) {
    if (!village) return 0;
    let count = 0;
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0 || distance(enemy, village) > village.radius + 260) continue;
        const away = normalize(enemy.x - village.x, enemy.y - village.y);
        enemy.knockX += away.x * 210;
        enemy.knockY += away.y * 210;
        enemy.retreatUntil = Math.max(enemy.retreatUntil || 0, now + 1800);
        enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, 1.1);
        count++;
    }
    return count;
}

function callVillageGuardsToBell(bell, now, village = state.village) {
    for (const npc of villageNpcList(village).filter(item => item.role === 'guard' && item.hp > 0)) {
        npc.mood = npc.playerAggro ? npc.mood : 'annoyed';
        npc.workState = '警钟集结';
        npc.workStateUntil = now + 5500;
        if (npc.outside) {
            npc.returningHome = false;
            npc.targetX = bell.x + (hash2(npc.x, now) - 0.5) * 90;
            npc.targetY = bell.y + (hash2(npc.y, now) - 0.5) * 70;
            npc.nextWanderAt = now + 4200;
        } else if (npc.homeBuilding) {
            scheduleVillagerExit(npc, npc.homeBuilding, now, 700);
        }
    }
}

function villageNpcList(village = null) {
    const buildings = village ? village.buildings : allVillages().flatMap(item => item.buildings);
    const indoor = (buildings || []).flatMap(building => {
        building.interiorObjects ||= createIndoorObjects(building.kind, building);
        return building.interiorObjects
            .filter(object => object.kind === 'npc')
            .map(object => {
                object.homeBuilding ||= building;
                return object;
            });
    });
    return [...indoor, ...state.outdoorVillagers.filter(object => object.kind === 'npc')];
}

function npcRequestText(role, task) {
    const need = itemListText(task.need);
    return {
        blacksmith: `炉子缺料，帮我带来 ${need}，我能给村里多备些箭。`,
        apothecary: `最近夜里伤员多，草药快用完了。帮我找 ${need}。`,
        kitchen: `锅不能空着，守卫巡夜要吃热的。带来 ${need}。`,
        guard: `巡夜要补给，带来 ${need}，我会给你一些武备。`,
        elder: `村里的旧仪式需要这些东西：${need}。这能稳定大家的心。`,
    }[role] || `帮我带来 ${need}。`;
}

function npcName(role) {
    return { blacksmith: '铁匠', apothecary: '药师', kitchen: '厨师', elder: '村长', basicElder: '低级村长', guard: '守卫', merchant: '商人', unemployed: '村民', cultPriest: '绿母祭司', cultHerbalist: '藤语者', cultHealer: '丛林疗士', cultHunter: '蛇纹猎手', cultGuard: '树根守卫', cultVillager: '献祭教徒' }[role] || '村民';
}

function hasItems(cost) {
    return Object.entries(cost).every(([key, amount]) => availableItemAmount(key) >= amount);
}

function consumeItems(cost) {
    Object.entries(cost).forEach(([key, amount]) => {
        consumeItemAmount(key, amount);
    });
}

function availableItemAmount(key) {
    if (key === 'wood') return WOOD_EQUIVALENTS.reduce((sum, item) => sum + (state.inventory[item] || 0), 0);
    return state.inventory[key] || 0;
}

function consumeItemAmount(key, amount) {
    if (key !== 'wood') {
        state.inventory[key] = Math.max(0, (state.inventory[key] || 0) - amount);
        return;
    }
    let remaining = amount;
    for (const woodKey of WOOD_EQUIVALENTS) {
        if (remaining <= 0) break;
        const used = Math.min(remaining, state.inventory[woodKey] || 0);
        state.inventory[woodKey] = Math.max(0, (state.inventory[woodKey] || 0) - used);
        remaining -= used;
    }
}

function grantItems(items) {
    for (const [key, amount] of Object.entries(items)) {
        if (!addInventoryItem(key, amount)) return false;
    }
    return true;
}

function itemListText(items) {
    return Object.entries(items).map(([key, amount]) => `${RESOURCE_LABELS[key] || key} x${amount}`).join('、');
}

function openVillagerTrade(npc) {
    if (!canVillagerTrade(npc.role) && !state.villageTasks?.[npc.role]) return;
    state.activeTrader = npc;
    state.pendingTrader = null;
    updateVillagerTradeButton();
    state.openChest = null;
    state.openIndoorContainer = null;
    toggleInventory(true);
    renderHud();
}

function prepareVillagerTrade(npc) {
    if ((!canVillagerTrade(npc.role) && !state.villageTasks?.[npc.role]) || npc.playerAggro || npc.mood === 'angry' || npc.hp <= 0) {
        state.pendingTrader = null;
    } else {
        state.pendingTrader = npc;
    }
    updateVillagerTradeButton();
}

function updateVillagerTradeButton() {
    const button = document.getElementById('villager-trade-btn');
    if (!button) return;
    const npc = state.pendingTrader;
    const visible = !!(npc && npc.hp > 0 && !state.inventoryOpen);
    button.classList.toggle('hidden', !visible);
    if (visible) button.textContent = `${canVillagerTrade(npc.role) ? '交易' : '任务'}：${npc.label}`;
}

function canVillagerTrade(role) {
    return role === 'merchant' && !!VILLAGER_TRADES[role];
}

function availableTradesFor(role, village = state.village) {
    return (VILLAGER_TRADES[role] || []).filter(trade => villageReputation(village) >= (trade.minRep || 0));
}

function tradeWithVillager(index) {
    const npc = state.activeTrader;
    if (!npc || npc.hp <= 0) return;
    if (npc.playerAggro || npc.mood === 'angry') {
        showToast(`${npc.label} 不愿交易。`);
        return;
    }
    const village = villageForTrader(npc);
    const trade = availableTradesFor(npc.role, village)[index];
    if (!trade) return;
    if (!hasItems(trade.give)) {
        showToast(`交易材料不足：缺 ${missingItemsText(trade.give)}。`);
        return;
    }
    consumeItems(trade.give);
    if (!grantItems(trade.receive)) {
        grantItems(trade.give);
        showToast('背包已满，交易取消。');
        return;
    }
    changeVillageReputation(village, 0.1);
    showToast(`${npc.label}交易成功：你用 ${itemListText(trade.give)} 换到 ${itemListText(trade.receive)}。`);
    renderHud();
}

function lodgeAtMerchant() {
    const npc = state.activeTrader;
    if (!npc || npc.role !== 'merchant' || npc.hp <= 0) return;
    if (npc.playerAggro || npc.mood === 'angry') {
        showToast(`${npc.label} 不愿让你借宿。`);
        return;
    }
    const cost = 6;
    if ((state.inventory.copperCoin || 0) < cost) {
        showToast(`借宿一晚需要铜币 x${cost}。`);
        return;
    }
    state.inventory.copperCoin -= cost;
    const p = state.player;
    state.timeOfDay = 0.25;
    p.hp = p.maxHp;
    p.stamina = 100;
    p.hunger = Math.min(p.maxHunger, p.hunger + 45);
    p.dizzyUntil = 0;
    p.slowUntil = 0;
    p.poisonUntil = 0;
    p.hungerToxinUntil = 0;
    p.weakToxinUntil = 0;
    p.neuroToxinUntil = 0;
    p.regenUntil = Math.max(p.regenUntil || 0, performance.now() + 6000);
    spawnBurst(p.x, p.y - 18, '#ffd166', 18, 150, 30);
    showToast(`${npc.label}收下铜币 x${cost}，让你借宿到清晨。生命与体力已恢复。`);
    renderHud();
}

function missingItemsText(items) {
    return Object.entries(items)
        .filter(([key, amount]) => availableItemAmount(key) < amount)
        .map(([key, amount]) => `${RESOURCE_LABELS[key] || key} ${availableItemAmount(key)}/${amount}`)
        .join('、');
}

function villageTaskSummary() {
    const counts = Object.values(state.villageTasks).reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {});
    return `可接 ${counts.new || 0} / 进行中 ${counts.accepted || 0} / 已完成 ${counts.done || 0}`;
}

function beginHarvest(node) {
    const p = state.player;
    if (p.harvestTarget !== node) {
        p.harvestTarget = node;
        showToast(`长按 E 采集：${resourceName(node.kind)}。`);
    }
    const blocked = harvestBlockReason(node);
    if (blocked && performance.now() - p.harvestBlockedAt > 900) {
        p.harvestBlockedAt = performance.now();
        showToast(blocked);
        addFloatText('需要工具', node.x, node.y - 28, '#ffb3b3');
    }
}

function updateHarvestHold(dt) {
    const p = state.player;
    if (!keys.has('e') && !touchInput.interact) {
        resetHarvestHold();
        return;
    }
    const target = nearestInteractable();
    if (!target || target.type !== 'resource') {
        resetHarvestHold();
        return;
    }
    const node = target.item;
    beginHarvest(node);
    if (harvestBlockReason(node)) return;

    node.lastHarvestAt = performance.now();
    node.shakeUntil = performance.now() + 120;
    if (Math.random() < 0.28) {
        spawnBurst(node.x, node.y, harvestParticleColor(node), 2, 55, node.radius * 0.55);
    }
    harvest(node, dt);
    if (node.hp <= 0) resetHarvestHold();
}

function resetHarvestHold() {
    state.player.harvestTarget = null;
}

function harvest(node, dt = 0) {
    const power = harvestPower(node) * (dt || 0.016);
    node.lastHarvestAt = performance.now();
    node.hp -= power;
    node.shakeUntil = performance.now() + 220;
    spawnBurst(node.x, node.y, harvestParticleColor(node), 8, 110, node.radius * 0.65);
    if (node.hp <= 0) {
        const amount = harvestAmount(node);
        if (!addInventoryItem(node.gives, amount)) {
            node.hp = 1;
            showToast('背包已满，先丢弃物品或整理快捷栏。');
            renderHud();
            return;
        }
        if (node.kind === 'tallGrass') state.tallGrassGrid = buildTallGrassGrid(state.resources);
        node.deathAt = performance.now();
        addFloatText(`+${amount} ${RESOURCE_LABELS[node.gives]}`, node.x, node.y - 30, '#fff3b0');
        showToast(`采集成功：${RESOURCE_LABELS[node.gives]} x${amount}`);
    } else {
        showToast(`${resourceName(node.kind)} 剩余 ${Math.ceil(Math.max(0, node.hp))}/${node.maxHp}`);
    }
    renderHud();
}

function harvestAmount(node) {
    if (node.kind === 'pebble') return hash2(node.x * 0.13, node.y * 0.13) > 0.5 ? 3 : 2;
    return ({ wood: 4, oakWood: 4, blossomWood: 3, birchWood: 4, pineWood: 4, mapleWood: 4, deadWood: 3, darkWood: 3, cypressWood: 4, willowWood: 3, ironwood: 3, elderWood: 3, buttressWood: 3, hardwood: 3, jungleLeaf: 3, vine: 3, jungleFruit: 3, bamboo: 4, stone: 4, fiber: 3, berry: 3, herb: 2, mushroom: 2, toxicMushroom: 2, flower: 2, lotus: 2, cactusFruit: 2, resin: 2, sap: 2, honey: 2, mud: 3, ore: 4, coal: 3 }[node.gives] || 1);
}

function harvestBlockReason(node) {
    if (node.gives === 'ore' && selectedHotbarItem() !== 'stonePickaxe') return '铁矿太硬，需要手持石镐。';
    if (BIOME_TREE_KINDS.includes(node.kind) && selectedHotbarItem() !== 'stoneAxe') return '整棵树需要手持石斧砍伐。';
    return '';
}

function harvestPower(node) {
    const held = selectedHotbarItem();
    const woodPower = held === 'stoneAxe' ? 2 : 1;
    const stonePower = held === 'stonePickaxe' ? 2 : 1;
    const fiberPower = held === 'stoneSickle' ? 3.2 : 1;
    if (['grass', 'tallGrass', 'reed', 'meadowFlower', 'flower', 'jungleLeafPlant', 'jungleVine', 'jungleOrchid', 'poisonBloom'].includes(node.kind)) return 2.2 * fiberPower;
    if (['herb', 'jungleHerb', 'berry', 'jungleFruitBush', 'mushroom', 'toxicMushroom', 'lotus'].includes(node.kind)) return held === 'stoneSickle' ? 3.4 : 2.2;
    if (node.kind === 'mudClump') return 2.2;
    if (node.kind === 'bamboo') return 1.35 + woodPower * 0.55;
    if (node.kind === 'stump' || STUMP_TREE_KIND[node.kind]) return 0.9 + woodPower * 0.45;
    if (node.gives === 'wood' || node.gives === 'hardwood') return woodPower * 0.95;
    if (node.gives === 'stone') return stonePower * 0.9;
    if (node.gives === 'ore') return stonePower * 0.8;
    return 1;
}

function harvestParticleColor(node) {
    if (['wood', 'hardwood', 'bamboo', 'fiber', 'jungleLeaf', 'vine'].includes(node.gives)) return '#8bd76e';
    if (node.gives === 'jungleFruit') return '#ff9f1c';
    if (node.gives === 'ore') return '#94e3ff';
    if (node.gives === 'mud') return '#6d5438';
    return '#d7d7d7';
}

function useCamp() {
    showToast('待在营火旁会缓慢恢复生命，也可以烹饪熟食。');
    renderHud();
}

function openRuins() {
    if (state.ruins.opened) {
        showToast('废墟门已经打开。Demo 完成！');
        return;
    }
    if (state.inventory.key <= 0) {
        showToast('废墟门紧锁着，需要先合成废墟钥匙。');
        return;
    }
    state.inventory.key -= 1;
    state.ruins.opened = true;
    state.win = true;
    showToast('废墟门开启，荒野营地 Demo 完成！');
    renderHud();
}

function attack(now = performance.now()) {
    const p = state.player;
    if (state.win || state.lose) return;
    if (now < p.dizzyUntil) {
        showToast('饥饿眩晕中，无法攻击。');
        return;
    }
    if (isThrowableItem(selectedHotbarItem())) {
        startThrowableAim(now);
        return;
    }
    if (isDirectRangedItem(selectedHotbarItem())) {
        startDirectRangedAim(now);
        return;
    }
    if (p.usingItem) {
        showToast('正在使用物品，稍等一下。');
        return;
    }
    advanceWeaponCombo(selectedHotbarItem(), now);
    const attackProfile = currentAttackProfile();
    p.pendingMeleeCharge = null;
    if (p.attackCooldown > 0) {
        p.attackQueuedUntil = now + 220;
        return;
    }
    const staminaCost = attackProfile.stamina;
    if (p.stamina < staminaCost) {
        showToast('体力不足，稍等恢复后再攻击。');
        return;
    }
    p.stamina = Math.max(0, p.stamina - staminaCost);
    consumeHungerForAction(staminaCost * 0.015);
    p.attackCooldown = attackProfile.cooldown;
    p.attackUntil = now + (attackProfile.name.includes('蓄力') ? 260 : 160);
    const attackDir = currentAimDir();
    p.attackDir = attackDir;
    p.facing = attackDir;
    if (attackProfile.dart) launchBambooKnifeProjectile(p, attackDir, now);
    const strike = { x: p.x + attackDir.x * p.radius, y: p.y + attackDir.y * p.radius };
    const hits = [];
    if (!state.indoor) {
        for (const e of state.enemies) {
            if (e.hp <= 0) continue;
            const hit = enemyHitByAttack(e, p, attackDir, attackProfile, strike);
            if (hit.hit) {
                hits.push({ type: 'enemy', target: e, dist: hit.dist });
            }
        }
        for (const npc of state.outdoorVillagers.filter(item => item.hp > 0)) {
            const hit = enemyHitByAttack(npc, p, attackDir, attackProfile, strike);
            if (hit.hit) hits.push({ type: 'outdoorVillager', target: npc, dist: hit.dist });
        }
    }
    if (state.indoor) {
        for (const npc of state.indoor.objects.filter(object => ['npc', 'totem'].includes(object.kind) && (object.hp ?? 80) > 0)) {
            npc.radius ||= 17;
            npc.hp ??= 80;
            npc.maxHp ??= 80;
            const hit = enemyHitByAttack(npc, p, attackDir, attackProfile, strike);
            if (hit.hit) hits.push({ type: npc.kind === 'totem' ? 'totem' : 'villager', target: npc, dist: hit.dist });
        }
    }
    spawnAttackParticles(p.x, p.y, attackDir, attackProfile);
    if (!hits.length) {
        addFloatText('挥空', p.x + attackDir.x * 50, p.y + attackDir.y * 50, '#d8e5f2');
        renderHud();
        return;
    }

    hits.sort((a, b) => a.dist - b.dist);
    const maxHits = attackProfile.maxHits || (attackProfile.cleave ? 2 : 1);
    for (const hit of hits.slice(0, maxHits)) {
        if (hit.type === 'villager') damageVillager(hit.target, now, attackProfile);
        else if (hit.type === 'outdoorVillager') damageOutdoorVillager(hit.target, now, attackProfile);
        else if (hit.type === 'totem') damageVillageTotem(hit.target, now, attackProfile);
        else damageEnemy(hit.target, now, attackProfile);
    }
    renderHud();
}

function isThrowableItem(key) {
    return key === 'coalBomb' || key === 'poisonVial';
}

function isDirectRangedItem(key) {
    return key === 'slingshot' || key === 'sinewBow' || !!simpleWeaponDef(key)?.ranged;
}

function isChargeMeleeItem(key) {
    return ['vineStoneHammer', 'resinHammer', 'stoneCoreHammer'].includes(key);
}

function startMeleeCharge(now = performance.now()) {
    const key = selectedHotbarItem();
    if (!isChargeMeleeItem(key) || state.player.attackCooldown > 0) return false;
    state.player.meleeCharge = { key, startedAt: now };
    mouse.down = true;
    resetHarvestHold();
    return true;
}

function releaseMeleeCharge(now = performance.now()) {
    const charge = state.player.meleeCharge;
    if (!charge) return false;
    state.player.meleeCharge = null;
    mouse.down = false;
    keys.delete(' ');
    if ((state.inventory[charge.key] || 0) <= 0) return true;
    state.player.pendingMeleeCharge = {
        key: charge.key,
        amount: meleeChargeAmount(charge, now),
    };
    attack(now);
    return true;
}

function meleeChargeAmount(charge = state.player.meleeCharge, now = performance.now()) {
    if (!charge) return 0;
    return clamp((now - charge.startedAt) / 900, 0, 1);
}

function isAimingThrowable() {
    return !!state.player.throwableAim;
}

function isAimingDirectRanged() {
    return !!state.player.rangedAim;
}

function startThrowableAim(now = performance.now()) {
    const key = selectedHotbarItem();
    if (!isThrowableItem(key) || (state.inventory[key] || 0) <= 0) return;
    if (state.player.throwableAim?.key === key) return;
    state.player.throwableAim = { key, startedAt: now };
    mouse.down = true;
    resetHarvestHold();
}

function releaseThrowable(now = performance.now()) {
    const aim = state.player.throwableAim;
    if (!aim) return false;
    const key = aim.key;
    state.player.throwableAim = null;
    mouse.down = false;
    keys.delete(' ');
    if ((state.inventory[key] || 0) <= 0) return true;
    const target = throwableTargetForAim(aim, now);
    state.inventory[key] -= 1;
    state.projectiles.push({
        kind: key,
        x: state.player.x,
        y: state.player.y - 10,
        startX: state.player.x,
        startY: state.player.y - 10,
        targetX: target.x,
        targetY: target.y,
        startedAt: now,
        duration: key === 'poisonVial' ? 500 : 560,
        exploded: false,
    });
    spawnBurst(state.player.x, state.player.y - 8, key === 'poisonVial' ? '#8cff66' : '#ff9f1c', 6, 90, 10);
    syncHotbarItems();
    renderHud();
    return true;
}

function startDirectRangedAim(now = performance.now()) {
    const key = selectedHotbarItem();
    if (!isDirectRangedItem(key)) return;
    if (state.player.rangedAim?.key === key) return;
    const ammo = directRangedAmmoFor(key);
    if (!ammo) {
        showToast(key === 'slingshot' || key === 'sling' ? `${RESOURCE_LABELS[key]}需要小石子作为弹药。` : `${RESOURCE_LABELS[key]}需要箭矢。`);
        return;
    }
    if (state.player.attackCooldown > 0) return;
    state.player.rangedAim = { key, ammo, startedAt: now };
    state.player.attackDir = currentAimDir();
    mouse.down = true;
    resetHarvestHold();
}

function releaseDirectRanged(now = performance.now()) {
    const aim = state.player.rangedAim;
    if (!aim) return false;
    state.player.rangedAim = null;
    mouse.down = false;
    keys.delete(' ');
    const ammo = directRangedAmmoFor(aim.key, aim.ammo);
    if (!ammo) {
        showToast(aim.key === 'slingshot' || aim.key === 'sling' ? '没有小石子。' : '没有箭矢。');
        return true;
    }
    const held = directRangedCharge(aim, now);
    const p = state.player;
    const rangedDef = simpleWeaponDef(aim.key);
    const cost = rangedDef?.profile?.stamina || (aim.key === 'slingshot' ? 10 : 16);
    if (p.stamina < cost) {
        showToast('体力不足，无法稳定发射。');
        return true;
    }
    const dir = currentAimDirWithSpread(aim, held);
    p.stamina = Math.max(0, p.stamina - cost);
    consumeHungerForAction(cost * 0.018);
    p.attackCooldown = rangedDef?.profile?.cooldown || (aim.key === 'slingshot' ? 0.95 : 0.82);
    p.attackUntil = now + 180 + held * 120;
    p.attackDir = dir;
    p.facing = dir;
    state.inventory[ammo] -= 1;
    const range = rangedDef?.profile?.range
        ? (rangedDef.profile.range * (0.45 + held * 0.55))
        : (aim.key === 'slingshot' ? (150 + held * 240) : (230 + held * 390));
    if (state.indoor) {
        state.indoorProjectiles ||= [];
        state.indoorProjectiles.push({
            kind: directProjectileKindFor(aim.key, ammo),
            owner: 'player',
            indoor: true,
            weapon: aim.key,
            ammo,
            x: p.x,
            y: p.y - 10,
            startX: p.x,
            startY: p.y - 10,
            targetX: clamp(p.x + dir.x * range, 220, VIEW.width - 220),
            targetY: clamp(p.y + dir.y * range, 160, VIEW.height - 74),
            dir,
            charge: held,
            startedAt: now,
            duration: aim.key === 'slingshot' ? 300 + (1 - held) * 140 : 240 + (1 - held) * 120,
            profile: { color: ammo === 'poisonArrow' ? '#8cff66' : '#d8e5f2' },
            splashRadius: 0,
            pierceRemaining: aim.key === 'bambooCrossbow' ? 1 : 0,
        });
        spawnBurst(p.x + dir.x * 14, p.y - 8 + dir.y * 14, aim.key === 'slingshot' || aim.key === 'sling' ? '#d8e5f2' : '#d6a06a', 5, 70, 8);
        syncHotbarItems();
        renderHud();
        return true;
    }
    state.projectiles.push({
        kind: directProjectileKindFor(aim.key, ammo),
        weapon: aim.key,
        ammo,
        x: p.x,
        y: p.y - 10,
        startX: p.x,
        startY: p.y - 10,
        targetX: clamp(p.x + dir.x * range, 24, WORLD.width - 24),
        targetY: clamp(p.y + dir.y * range, 24, WORLD.height - 24),
        dir,
        charge: held,
        startedAt: now,
        duration: aim.key === 'slingshot' ? 300 + (1 - held) * 140 : 240 + (1 - held) * 120,
        pierceRemaining: aim.key === 'bambooCrossbow' ? 1 : 0,
        exploded: false,
    });
    spawnBurst(p.x + dir.x * 14, p.y - 8 + dir.y * 14, aim.key === 'slingshot' || aim.key === 'sling' ? '#d8e5f2' : '#d6a06a', 5, 70, 8);
    syncHotbarItems();
    renderHud();
    return true;
}

function directRangedCharge(aim, now = performance.now()) {
    const fullTime = aim.key === 'slingshot' || aim.key === 'sling' ? 850 : (aim.key === 'bambooCrossbow' ? 1250 : 1050);
    return clamp((now - aim.startedAt) / fullTime, 0.18, 1);
}

function directRangedAmmoFor(key, preferred = '') {
    if (preferred && (state.inventory[preferred] || 0) > 0) return preferred;
    if (key === 'slingshot' || key === 'sling') return (state.inventory.pebble || 0) > 0 ? 'pebble' : '';
    if (key === 'sinewBow' || key === 'bambooCrossbow') {
        if ((state.inventory.poisonArrow || 0) > 0) return 'poisonArrow';
        if ((state.inventory.simpleArrow || 0) > 0) return 'simpleArrow';
    }
    return '';
}

function directProjectileKindFor(weapon, ammo) {
    if (weapon === 'slingshot') return 'slingshotPebble';
    if (weapon === 'sling') return 'slingStone';
    if (weapon === 'bambooCrossbow') return ammo === 'poisonArrow' ? 'crossbowPoisonBolt' : 'crossbowBolt';
    return ammo;
}

function launchBambooKnifeProjectile(player, dir, now = performance.now()) {
    if ((state.inventory.bambooShard || 0) <= 0) {
        addFloatText('缺少竹片', player.x, player.y - 48, '#d8e5f2');
        return false;
    }
    state.inventory.bambooShard -= 1;
    const range = 210;
    const projectile = {
        kind: 'bambooKnife',
        weapon: 'bambooThrowingKnife',
        ammo: '',
        owner: 'player',
        indoor: !!state.indoor,
        x: player.x,
        y: player.y - 10,
        startX: player.x,
        startY: player.y - 10,
        targetX: state.indoor ? clamp(player.x + dir.x * range, 220, VIEW.width - 220) : clamp(player.x + dir.x * range, 24, WORLD.width - 24),
        targetY: state.indoor ? clamp(player.y + dir.y * range, 160, VIEW.height - 74) : clamp(player.y + dir.y * range, 24, WORLD.height - 24),
        dir,
        charge: 0.45,
        startedAt: now,
        duration: 230,
        profile: { color: '#d7f28a' },
        exploded: false,
    };
    if (state.indoor) {
        state.indoorProjectiles ||= [];
        state.indoorProjectiles.push(projectile);
    } else {
        state.projectiles.push(projectile);
    }
    syncHotbarItems();
    renderHud();
    return true;
}

function currentAimDirWithSpread(aim, charge) {
    const dir = currentAimDir();
    const maxSpread = aim.key === 'slingshot' ? 0.22 : (aim.key === 'sling' ? 0.16 : (aim.key === 'bambooCrossbow' ? 0.06 : 0.13));
    const spread = (1 - charge) * maxSpread * (hash2(performance.now() * 0.01, state.player.x * 0.01) - 0.5) * 2;
    const angle = Math.atan2(dir.y, dir.x) + spread;
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

function throwableTargetForAim(aim, now = performance.now()) {
    const dir = currentAimDir();
    const held = clamp((now - aim.startedAt) / 750, 0, 1);
    const distanceAhead = 170 + held * 150;
    return {
        x: clamp(state.player.x + dir.x * distanceAhead, 24, WORLD.width - 24),
        y: clamp(state.player.y + dir.y * distanceAhead, 24, WORLD.height - 24),
        dir,
        held,
    };
}

function updateProjectiles(dt, now) {
    for (const projectile of state.projectiles) {
        if (projectile.exploded) continue;
        const previous = { x: projectile.x, y: projectile.y };
        const progress = clamp((now - projectile.startedAt) / projectile.duration, 0, 1);
        const arc = isDirectProjectile(projectile.kind) ? 0 : Math.sin(progress * Math.PI) * 42;
        projectile.x = lerp(projectile.startX, projectile.targetX, progress);
        projectile.y = lerp(projectile.startY, projectile.targetY, progress) - arc;
        if (isDirectProjectile(projectile.kind)) {
            const hit = findDirectProjectileHit(projectile, previous);
            if (hit) {
                hitDirectProjectileTarget(projectile, hit);
                if (projectileCanPierce(projectile)) {
                    projectile.pierceRemaining -= 1;
                    projectile.hitTargets ||= new Set();
                    projectile.hitTargets.add(hit.target);
                    continue;
                }
                projectile.exploded = true;
                continue;
            }
        }
        if (Math.random() < 0.65) {
        const trailColor = projectile.kind === 'poisonVial'
                ? (Math.random() < 0.5 ? '#8cff66' : '#d94bff')
                : (projectile.kind === 'slingStone' ? '#d8e5f2'
                    : (isDirectProjectile(projectile.kind) ? (projectile.kind.includes('Poison') || projectile.kind === 'poisonArrow' ? '#8cff66' : '#d8e5f2') : (Math.random() < 0.5 ? '#ff9f1c' : '#ffd166')));
            addParticle({
                x: projectile.x,
                y: projectile.y,
                vx: (Math.random() - 0.5) * 30,
                vy: 20 + Math.random() * 30,
                color: trailColor,
                size: 2 + Math.random() * 2,
                life: 0.18,
            });
        }
        if (progress >= 1) {
            projectile.exploded = true;
            resolveProjectileImpact(projectile);
        }
    }
    state.projectiles = state.projectiles.filter(projectile => !projectile.exploded);
}

function findDirectProjectileHit(projectile, previous) {
    const enemyHit = state.enemies
        .filter(enemy => enemy.hp > 0 && !projectile.hitTargets?.has(enemy))
        .map(enemy => ({ type: 'enemy', target: enemy, d: distanceToSegment(enemy, previous, projectile), radius: enemy.radius + 10 }))
        .filter(hit => hit.d <= hit.radius);
    const villagerHit = (state.outdoorVillagers || [])
        .filter(npc => npc.outside && npc.hp > 0 && !projectile.hitTargets?.has(npc))
        .map(npc => ({ type: 'outdoorVillager', target: npc, d: distanceToSegment(npc, previous, projectile), radius: (npc.radius || 17) + 10 }))
        .filter(hit => hit.d <= hit.radius);
    return [...enemyHit, ...villagerHit].sort((a, b) => a.d - b.d)[0] || null;
}

function projectileCanPierce(projectile) {
    return (projectile.kind === 'crossbowBolt' || projectile.kind === 'crossbowPoisonBolt')
        && (projectile.pierceRemaining || 0) > 0;
}

function fireSlingshot(now = performance.now()) {
    const p = state.player;
    if ((state.inventory.pebble || 0) <= 0) {
        showToast('弹弓需要小石子作为子弹。');
        return;
    }
    const cost = 12;
    if (p.stamina < cost) {
        showToast('体力不足，无法拉开弹弓。');
        return;
    }
    const dir = currentAimDir();
    p.stamina = Math.max(0, p.stamina - cost);
    consumeHungerForAction(cost * 0.018);
    p.attackCooldown = 0.95;
    p.attackUntil = now + 260;
    p.attackDir = dir;
    p.facing = dir;
    state.inventory.pebble -= 1;
    state.projectiles.push({
        kind: 'slingshotPebble',
        x: p.x,
        y: p.y - 10,
        startX: p.x,
        startY: p.y - 10,
        targetX: clamp(p.x + dir.x * 360, 24, WORLD.width - 24),
        targetY: clamp(p.y + dir.y * 360, 24, WORLD.height - 24),
        dir,
        startedAt: now,
        duration: 360,
        exploded: false,
    });
    spawnBurst(p.x + dir.x * 14, p.y - 8 + dir.y * 14, '#d8e5f2', 5, 70, 8);
    syncHotbarItems();
    renderHud();
}

function explodeSlingStoneAt(x, y, projectile) {
    const now = performance.now();
    const radius = 54;
    const damage = directProjectileDamage(projectile);
    let hitCount = 0;
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0 || distance(enemy, { x, y }) > radius + enemy.radius) continue;
        enemy.hp -= damage;
        enemy.hurtUntil = now + 160;
        const away = normalize(enemy.x - x, enemy.y - y);
        enemy.knockX += away.x * 260;
        enemy.knockY += away.y * 260;
        spawnBurst(enemy.x, enemy.y, '#d8e5f2', 8, 100, enemy.radius * 0.45);
        addFloatText(`-${damage}`, enemy.x, enemy.y - 36, '#fff3b0');
        if (enemy.hp <= 0) {
            enemy.deathAt = now;
            markSpawnAreaCleared(enemy.x, enemy.y, now);
        }
        hitCount++;
    }
    for (const npc of state.outdoorVillagers || []) {
        if (!npc.outside || npc.hp <= 0 || distance(npc, { x, y }) > radius + (npc.radius || 17)) continue;
        damageOutdoorVillager(npc, now, { name: '投石带落石', damage, dir: normalize(npc.x - x, npc.y - y) });
        hitCount++;
    }
    spawnBurst(x, y, '#d8e5f2', 18, 170, radius * 0.45);
    addFloatText(hitCount ? '碎石' : '落空', x, y - 26, hitCount ? '#fff3b0' : '#d8e5f2');
}

function resolveProjectileImpact(projectile) {
    if (projectile.kind === 'coalBomb') {
        explodeCoalBombAt(projectile.targetX, projectile.targetY);
    } else if (projectile.kind === 'poisonVial') {
        explodePoisonVialAt(projectile.targetX, projectile.targetY);
    } else if (projectile.kind === 'slingStone') {
        explodeSlingStoneAt(projectile.targetX, projectile.targetY, projectile);
    } else if (isDirectProjectile(projectile.kind)) {
        hitDirectProjectileTarget(projectile);
    }
}

function isDirectProjectile(kind) {
    return ['slingshotPebble', 'simpleArrow', 'poisonArrow', 'crossbowBolt', 'crossbowPoisonBolt', 'bambooKnife'].includes(kind);
}

function enemyHitByAttack(e, p, attackDir, attackProfile, strike) {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const forward = dx * attackDir.x + dy * attackDir.y;
    const side = Math.abs(dx * -attackDir.y + dy * attackDir.x);
    if (attackProfile.style === 'thrust') {
        return {
            hit: forward > 10 && forward <= attackProfile.range + e.radius && side <= e.radius + 9,
            dist: forward,
        };
    }
    if (attackProfile.style === 'stab') {
        return {
            hit: forward > 4 && forward <= attackProfile.range + e.radius && side <= e.radius + 7,
            dist: forward,
        };
    }
    if (attackProfile.style === 'chop') {
        const toEnemy = normalize(dx, dy);
        const facingDot = toEnemy.x * attackDir.x + toEnemy.y * attackDir.y;
        const dist = distance(strike, e);
        return {
            hit: dist <= attackProfile.range + e.radius && facingDot > -0.04,
            dist,
        };
    }
    if (attackProfile.style === 'pick') {
        return {
            hit: forward > 6 && forward <= attackProfile.range + e.radius && side <= e.radius + 12,
            dist: forward,
        };
    }
    if (attackProfile.style === 'rope') {
        const start = { x: p.x + attackDir.x * 18, y: p.y + attackDir.y * 18 };
        const end = {
            x: p.x + attackDir.x * attackProfile.range,
            y: p.y + attackDir.y * attackProfile.range,
        };
        const lineDist = distanceToSegment(e, start, end);
        return {
            hit: forward > 18 && forward <= attackProfile.range + e.radius && lineDist <= e.radius + 12,
            dist: forward + lineDist * 0.1,
        };
    }
    const toEnemy = normalize(dx, dy);
    const facingDot = toEnemy.x * attackDir.x + toEnemy.y * attackDir.y;
    const dist = distance(strike, e);
    return {
        hit: dist <= attackProfile.range + e.radius && facingDot > attackProfile.arc,
        dist,
    };
}

function damageEnemy(hit, now, attackProfile = currentAttackProfile()) {
    hit.hp -= attackProfile.damage;
    hit.hurtUntil = now + 160;
    hit.attackCooldown = Math.max(hit.attackCooldown, 0.24);
    hit.windupUntil = 0;
    hit.strikeAt = 0;
    const dir = state.player.attackDir || state.player.facing;
    const knockScale = attackProfile.knock ?? 1;
    hit.knockX += dir.x * (hit.boss ? 130 : 240) * knockScale;
    hit.knockY += dir.y * (hit.boss ? 130 : 240) * knockScale;
    state.cameraShake = Math.max(state.cameraShake, hit.boss ? 12 : 7);
    spawnBurst(hit.x, hit.y, hit.boss ? '#b77dff' : '#ffd166', 14, 220, hit.radius * 0.75);
    addFloatText(`-${attackProfile.damage}`, hit.x, hit.y - 36, '#fff3b0');
    if (attackProfile.poison && hit.kind !== 'golem') {
        hit.poisonUntil = Math.max(hit.poisonUntil || 0, now + 4200);
        hit.poisonTickAt = Math.min(hit.poisonTickAt || now + 900, now + 900);
        spawnBurst(hit.x, hit.y - 8, '#8cff66', 6, 90, hit.radius * 0.45);
    }
    applyPlayerWeaponEffects(hit, now, attackProfile, 'enemy');
    if (hit.hp <= 0) {
        hit.deathAt = now;
        markSpawnAreaCleared(hit.x, hit.y, now);
        const drops = grantEnemyDrops(hit);
        spawnBurst(hit.x, hit.y, '#ffffff', 24, 260, hit.radius);
        addFloatText(drops.floatText, hit.x, hit.y - 52, '#9cffb7');
        showToast(`击败 ${hit.name}，获得 ${drops.toastText}`);
    } else {
        showToast(`${hit.name} 被${attackProfile.name}击中，剩余 ${Math.ceil(Math.max(0, hit.hp))}/${hit.maxHp}`);
    }
}

function applyPlayerWeaponEffects(target, now, attackProfile, targetType) {
    const dir = state.player.attackDir || state.player.facing;
    if (attackProfile.bleed && target.kind !== 'golem') {
        target.poisonUntil = Math.max(target.poisonUntil || 0, now + 3000);
        target.poisonTickAt = Math.min(target.poisonTickAt || now + 700, now + 700);
        addFloatText('流血', target.x, target.y - 50, '#ff6b6b');
    }
    if (attackProfile.burn && target.kind !== 'golem') {
        target.poisonUntil = Math.max(target.poisonUntil || 0, now + 3600);
        target.poisonTickAt = Math.min(target.poisonTickAt || now + 650, now + 650);
        spawnBurst(target.x, target.y - 8, '#ff9f1c', 8, 90, (target.radius || 17) * 0.55);
        addFloatText('点燃', target.x, target.y - 52, '#ffd166');
    }
    if (attackProfile.root) {
        target.rootedUntil = Math.max(target.rootedUntil || 0, now + attackProfile.root);
        addFloatText('定身', target.x, target.y - 54, '#d8e5f2');
    }
    if (attackProfile.stunChance && Math.random() < attackProfile.stunChance) {
        target.rootedUntil = Math.max(target.rootedUntil || 0, now + 650);
        target.attackCooldown = Math.max(target.attackCooldown || 0, 0.55);
        target.windupUntil = 0;
        addFloatText('眩晕', target.x, target.y - 54, '#fff3b0');
    }
    if (attackProfile.interrupt) {
        target.windupUntil = 0;
        target.strikeAt = 0;
        target.chargeUntil = 0;
        target.leapUntil = 0;
        addFloatText('打断', target.x, target.y - 54, '#d8e5f2');
    }
    if (attackProfile.pull) {
        target.knockX = (target.knockX || 0) + -dir.x * 360;
        target.knockY = (target.knockY || 0) + -dir.y * 360;
        addFloatText('拉拽', target.x, target.y - 54, '#d6a06a');
    }
    if (attackProfile.guard) {
        state.player.blocking = true;
        state.player.blockUntil = Math.max(state.player.blockUntil || 0, now + 360);
        addFloatText('稳守', state.player.x, state.player.y - 48, '#d8e5f2');
    }
    if (attackProfile.dart) {
        spawnBurst(target.x - dir.x * 18, target.y - dir.y * 18, '#d8e5f2', 4, 120, 8);
    }
}

function damageVillager(npc, now, attackProfile = currentAttackProfile()) {
    npc.hp ??= 80;
    npc.maxHp ??= 80;
    npc.radius ||= 17;
    if (npc.role === 'blacksmith' && npc.mood === 'angry' && npc.hp > 0 && shouldBlacksmithBlock(npc, now, attackProfile)) {
        const blocked = Math.max(1, Math.floor(attackProfile.damage * 0.35));
        npc.hp -= blocked;
        npc.fatigue = Math.min(100, (npc.fatigue || 0) + 14);
        npc.attackAnim = { startedAt: now, duration: 240, weapon: '铁剑格挡', style: 'block', dir: normalize(state.player.x - npc.x, state.player.y - npc.y) };
        npc.attackFlashUntil = now + 240;
        spawnBurst(npc.x, npc.y - 18, '#d8e5f2', 10, 130, 14);
        addFloatText('格挡', npc.x, npc.y - 46, '#d8e5f2');
        showToast(`铁匠用铁剑格挡，只受到 ${blocked} 点伤害。`);
        if (npc.hp <= 0) {
            npc.hp = 0;
            npc.mood = 'down';
            npc.solid = false;
            grantVillagerEquipmentDrops(npc);
        }
        return;
    }
    npc.hp -= attackProfile.damage;
    npc.hurtUntil = now + 180;
    applyPlayerWeaponEffects(npc, now, attackProfile, 'villager');
    markCultHerbalistAttacked(npc);
    setVillagerPlayerAggro(npc);
    if (['elder', 'apothecary'].includes(npc.role)) {
        npc.moveTargetUntil = 0;
        npc.nextKiteAt = 0;
        setRangedVillagerWaypoint(npc, now);
        npc.evadeUntil = now + (npc.role === 'elder' ? 520 : 420);
        npc.evadeDir = bestVillagerDodgeDirection(npc);
        addFloatText('换位', npc.x, npc.y - 52, '#d8e5f2');
    }
    if (npc.role === 'blacksmith') npc.blockUntil = now + 520 + Math.min(attackProfile.damage, 9) * 80;
    npc.nextAttackAt = Math.min(npc.nextAttackAt || now + 520, now + 520);
    const dir = state.player.attackDir || state.player.facing;
    npc.x = clamp(npc.x + dir.x * 12, 230, VIEW.width - 230);
    npc.y = clamp(npc.y + dir.y * 12, 182, VIEW.height - 170);
    const reputation = changeVillageReputation(state.indoor?.building?.village || homeVillageFor(npc), -1);
    state.cameraShake = Math.max(state.cameraShake, 6);
    spawnBurst(npc.x, npc.y, '#ff6b6b', 12, 190, npc.radius * 0.75);
    addFloatText(`-${attackProfile.damage}`, npc.x, npc.y - 40, '#ffb3b3');
    if (npc.hp <= 0) {
        npc.hp = 0;
        npc.mood = 'down';
        npc.solid = false;
        grantVillagerEquipmentDrops(npc);
        showToast(`${npc.label} 被击倒了。本村声誉 -1（当前 ${reputation.toFixed(1)}）`);
    } else {
        tryVillagerSelfHeal(npc, now);
        showToast(`${npc.label} 被${attackProfile.name}击中，开始驱逐你：${Math.ceil(npc.hp)}/${npc.maxHp}`);
    }
}

function damageOutdoorVillager(npc, now, attackProfile = currentAttackProfile()) {
    npc.hp ??= 80;
    npc.maxHp ??= 80;
    npc.hp -= attackProfile.damage;
    npc.hurtUntil = now + 180;
    applyPlayerWeaponEffects(npc, now, attackProfile, 'villager');
    markCultHerbalistAttacked(npc);
    setVillagerPlayerAggro(npc);
    npc.returningHome = npc.hp < npc.maxHp * 0.3;
    const dir = attackProfile.dir || state.player.attackDir || state.player.facing;
    moveCircle(npc, dir.x * 12, dir.y * 12);
    const reputation = changeVillageReputation(homeVillageFor(npc), -1);
    spawnBurst(npc.x, npc.y, '#ff6b6b', 12, 190, npc.radius * 0.75);
    addFloatText(`-${attackProfile.damage}`, npc.x, npc.y - 40, '#ffb3b3');
    showToast(npc.returningHome ? `${npc.label}重伤后往家里撤退。本村声誉 -1` : `${npc.label}被激怒，开始反击。本村声誉 -1`);
    if (npc.hp <= 0) {
        npc.hp = 0;
        npc.mood = 'down';
        grantVillagerEquipmentDrops(npc);
        showToast(`${npc.label} 被击倒了。`);
    }
}

function grantVillagerEquipmentDrops(npc) {
    if (npc.equipmentDropped) return;
    npc.equipmentDropped = true;
    const drops = villagerEquipmentDrops(npc);
    const entries = Object.entries(drops).filter(([, amount]) => amount > 0);
    if (!entries.length) return;
    const granted = {};
    for (const [key, amount] of entries) {
        if (addInventoryItem(key, amount)) granted[key] = (granted[key] || 0) + amount;
    }
    if (Object.keys(granted).length) {
        addFloatText(`获得 ${itemListText(granted)}`, npc.x, npc.y - 62, '#ffd166');
        showToast(`击败${npc.label}，获得 ${itemListText(granted)}。`);
        renderHud();
    }
}

function villagerEquipmentDrops(npc) {
    return ({
        blacksmith: { ironSword: 1, ironArmor: 1 },
        guard: { ironSword: 1, woodShield: 1, simpleArrow: 6 },
        basicElder: { ironSword: 1 },
        elder: { antlerHorn: 1 },
        kitchen: { bambooThrowingKnife: 1, roastMeat: 1 },
        apothecary: { poisonVial: 1, potion: 1 },
        merchant: { copperCoin: 8, leatherArmor: 1 },
        cultPriest: { poisonVial: 2, antidote: 1 },
        cultHerbalist: { vineStoneHammer: 1, poisonVial: 1 },
        cultHealer: { salve: 2, bandage: 2 },
        cultHunter: { stoneSpear: 1, poisonArrow: 8 },
        cultGuard: { woodShield: 1, leatherArmor: 1 },
        cultVillager: { vineStoneHammer: 1 },
    })[npc.role] || { woodFork: 1 };
}

function shouldBlacksmithBlock(npc, now, attackProfile) {
    if (now >= (npc.blockUntil || 0)) return false;
    if (now < (npc.tiredUntil || 0) || (npc.fatigue || 0) > 72) return false;
    if (npc.pendingAttack) return false;
    const dx = state.player.x - npc.x;
    const dy = state.player.y - npc.y;
    const dist = Math.hypot(dx, dy);
    const facing = npc.facing === -1 ? -1 : 1;
    const inFront = dx * facing > -10;
    const strongHit = attackProfile.damage >= 4;
    return inFront && dist < 92 && (strongHit || npc.hp < 42);
}

function damageVillageTotem(totem, now, attackProfile = currentAttackProfile()) {
    totem.hp -= attackProfile.damage;
    state.cameraShake = Math.max(state.cameraShake, 5);
    spawnBurst(totem.x, totem.y - 18, '#ffd166', 12, 160, 18);
    addFloatText(`-${attackProfile.damage}`, totem.x, totem.y - 48, '#fff3b0');
    if (totem.hp <= 0) {
        totem.hp = 0;
        totem.solid = false;
        spawnBurst(totem.x, totem.y - 20, '#ffffff', 20, 220, 24);
        showToast('村庄图腾被击碎了。');
    } else {
        showToast(`村庄图腾受损：${Math.ceil(totem.hp)}/${totem.maxHp}`);
    }
}

function tryVillagerSelfHeal(npc, now) {
    if (npc.hp <= 0 || npc.hp >= npc.maxHp) return;
    if (['kitchen', 'apothecary'].includes(npc.role) && npc.hp < 24 && !npc.healing) {
        npc.nextSelfHealAt = Math.min(npc.nextSelfHealAt || now, now);
    }
}

function simpleWeaponDef(key) {
    return SIMPLE_WEAPON_DEFS.find(weapon => weapon.id === key) || null;
}

function advanceWeaponCombo(key, now) {
    const p = state.player;
    if (!simpleWeaponDef(key)) {
        p.weaponCombo = null;
        return;
    }
    if (!p.weaponCombo || p.weaponCombo.key !== key || now - p.weaponCombo.at > 900) {
        p.weaponCombo = { key, count: 1, at: now };
    } else {
        p.weaponCombo.count = p.weaponCombo.count % 3 + 1;
        p.weaponCombo.at = now;
    }
}

function simpleWeaponProfile(key) {
    const weapon = simpleWeaponDef(key);
    if (!weapon) return null;
    const profile = { ...weapon.profile, name: weapon.name };
    const combo = state.player.weaponCombo?.key === key ? state.player.weaponCombo.count : 1;
    if (profile.comboRange && combo === 3) {
        profile.range += profile.comboRange;
        profile.damage += 1;
        profile.name = `${weapon.name}三连刺`;
    }
    if (profile.nightBonus && nightAmount() > 0.15) {
        profile.damage += profile.nightBonus;
        if (profile.shadow) profile.maxHits = Math.max(profile.maxHits || 1, 2);
    }
    if (profile.multiStrike) {
        profile.damage *= profile.multiStrike;
        profile.name = `${weapon.name}双击`;
    }
    const pendingCharge = state.player.pendingMeleeCharge;
    if (pendingCharge?.key === key) {
        const charge = pendingCharge.amount;
        profile.damage += Math.round(2 + charge * 4);
        profile.range += Math.round(10 + charge * 18);
        profile.cooldown += 0.12 + charge * 0.18;
        profile.stamina += Math.round(4 + charge * 5);
        profile.root = Math.max(profile.root || 0, 650 + charge * 950);
        profile.cleave = true;
        profile.name = `${weapon.name}蓄力重击`;
    }
    return profile;
}

function currentAttackProfile() {
    const item = selectedHotbarItem();
    const simpleProfile = simpleWeaponProfile(item);
    if (simpleProfile) return simpleProfile;
    const profiles = {
        stoneAxe: { name: '石斧', damage: 3, range: 46, stamina: 14, cooldown: 0.54, arc: 0.1, style: 'chop' },
        stonePickaxe: { name: '石镐', damage: 3, range: 44, stamina: 15, cooldown: 0.58, arc: 0.16, style: 'pick' },
        stoneSickle: { name: '石镰', damage: 2, range: 48, stamina: 11, cooldown: 0.36, arc: 0.12, style: 'slash' },
        stoneSpear: { name: '石矛', damage: 4, range: 90, stamina: 14, cooldown: 0.5, arc: 0.3, style: 'thrust' },
        slingshot: { name: '弹弓', damage: 1, range: 360, stamina: 12, cooldown: 0.95, arc: 0.18, style: 'thrust' },
        bambooSpear: { name: '竹矛', damage: 3, range: 102, stamina: 13, cooldown: 0.54, arc: 0.34, style: 'thrust' },
        antlerSpear: { name: '鹿角矛', damage: 5, range: 108, stamina: 15, cooldown: 0.52, arc: 0.32, style: 'thrust' },
        venomDagger: { name: '毒牙匕首', damage: 3, range: 34, stamina: 9, cooldown: 0.28, arc: 0.06, style: 'stab', poison: true },
        ironSword: { name: '铁剑', damage: 6, range: 62, stamina: 18, cooldown: 0.42, arc: 0.08, style: 'slash', cleave: true },
        crystalBlade: { name: '魔晶剑', damage: 9, range: 72, stamina: 20, cooldown: 0.46, arc: 0.08, style: 'slash', cleave: true },
        sinewBow: { name: '鹿筋弓', damage: 3, range: 86, stamina: 12, cooldown: 0.5, arc: 0.18, style: 'thrust' },
        stoneCoreHammer: { name: '石核锤', damage: 8, range: 50, stamina: 24, cooldown: 0.8, arc: 0.05, style: 'chop' },
        wood: { name: '木头', damage: 1, range: 38, stamina: 10, cooldown: 0.38, arc: 0.16, style: 'club' },
        bamboo: { name: '竹材', damage: 1, range: 50, stamina: 10, cooldown: 0.4, arc: 0.22, style: 'thrust' },
        stone: { name: '石头', damage: 2, range: 30, stamina: 11, cooldown: 0.44, arc: 0.14, style: 'club' },
    };
    const profile = profiles[item] || { name: '拳头', damage: 1, range: 32, stamina: 10, cooldown: 0.34, arc: 0.14, style: 'punch' };
    const weakness = (state.player.weakToxinUntil || 0) > performance.now() ? 0.62 : 1;
    const weakenedProfile = weakness < 1 ? { ...profile, damage: Math.max(1, Math.floor(profile.damage * weakness)), name: `${profile.name}(虚弱)` } : profile;
    const pendingCharge = state.player.pendingMeleeCharge;
    if (pendingCharge?.key === item && item === 'stoneCoreHammer') {
        const charge = pendingCharge.amount;
        return {
            ...weakenedProfile,
            name: '石核锤蓄力重击',
            damage: weakenedProfile.damage + Math.round(3 + charge * 6),
            range: weakenedProfile.range + Math.round(8 + charge * 18),
            stamina: weakenedProfile.stamina + Math.round(5 + charge * 6),
            cooldown: weakenedProfile.cooldown + 0.16 + charge * 0.22,
            cleave: true,
            root: 700 + charge * 1000,
        };
    }
    return weakenedProfile;
}

function grantEnemyDrops(hit) {
    const entries = typeof hit.drop === 'string' ? [[hit.drop, hit.dropAmount]] : Object.entries(hit.drop);
    const received = [];
    for (const [key, spec] of entries) {
        const finalAmount = rollDropAmount(spec, hit);
        if (finalAmount <= 0) continue;
        if (addInventoryItem(key, finalAmount)) received.push(`${RESOURCE_LABELS[key]} x${finalAmount}`);
        else received.push(`${RESOURCE_LABELS[key]}装不下`);
    }
    if (!received.length) received.push('无额外材料');
    return {
        floatText: `+${received[0]}${received.length > 1 ? '…' : ''}`,
        toastText: received.join('、'),
    };
}

function backpackItemKeys() {
    return Object.keys(RESOURCE_LABELS).filter(key => (state.inventory[key] || 0) > 0 && !isHotbarItem(key) && !isEquippedItemKey(key));
}

function isEquippedItemKey(key) {
    return key === equippedItemKey('armor') || key === equippedItemKey('offhand');
}

function hasBackpackSpaceFor(key) {
    return (state.inventory[key] || 0) > 0 || isHotbarItem(key) || backpackItemKeys().length < BACKPACK_SLOT_LIMIT;
}

function addInventoryItem(key, amount = 1) {
    if (amount <= 0) return true;
    if (!hasBackpackSpaceFor(key)) return false;
    state.inventory[key] = (state.inventory[key] || 0) + amount;
    rememberItemDiscovery(key);
    return true;
}

function rememberItemDiscovery(key) {
    state.discoveredMaterials ||= {};
    state.knownRecipes ||= {};
    state.discoveredMaterials[key] = true;
    learnRecipeFromOutputItem(key);
}

function learnRecipeFromOutputItem(key) {
    const learned = [];
    RECIPES.forEach(item => {
        if (recipeOutputKey(item) !== key && item.id !== key) return;
        if (state.knownRecipes[item.id]) return;
        state.knownRecipes[item.id] = true;
        learned.push(item.name);
    });
    return learned;
}

function learnRecipesByIds(ids = []) {
    state.knownRecipes ||= {};
    const learned = [];
    ids.forEach(id => {
        const item = RECIPES.find(recipe => recipe.id === id);
        if (!item || state.knownRecipes[id]) return;
        state.knownRecipes[id] = true;
        learned.push(item.name);
    });
    return learned;
}

function learnRecipesFromTeacher(role) {
    if (!role) return [];
    state.learnedRecipeTeachers ||= {};
    if (state.learnedRecipeTeachers[role]) return [];
    state.learnedRecipeTeachers[role] = true;
    return learnRecipesByIds(TEACHER_RECIPE_IDS[role] || []);
}

function recipeLearningSuffix(names) {
    if (!names?.length) return '';
    return ` 学会配方：${names.slice(0, 3).join('、')}${names.length > 3 ? `等 ${names.length} 种` : ''}。`;
}

function discardInventoryItem(key, amount = 1) {
    if ((state.inventory[key] || 0) <= 0) return;
    const removed = Math.min(amount, state.inventory[key]);
    state.inventory[key] -= removed;
    if (state.inventory[key] <= 0) state.inventory[key] = 0;
    syncHotbarItems();
    showToast(`丢弃 ${RESOURCE_LABELS[key] || key} x${removed}`);
    renderHud();
}

function activeChest() {
    if (state.openIndoorContainer) return state.openIndoorContainer;
    if (!state.openChest || !state.placedStations.includes(state.openChest)) return null;
    if (distance(state.player, state.openChest) > state.openChest.radius + 90) {
        state.openChest = null;
        return null;
    }
    state.openChest.storage ||= {};
    return state.openChest;
}

function chestItemKeys(chest) {
    return Object.keys(RESOURCE_LABELS).filter(key => (chest.storage?.[key] || 0) > 0);
}

function chestHasSpaceFor(chest, key) {
    return (chest.storage?.[key] || 0) > 0 || chestItemKeys(chest).length < CHEST_SLOT_LIMIT;
}

function storeItemInChest(chest, key, amount = 1) {
    if (chest.villageOwned) {
        showToast('不能把物品放进村民的箱子。');
        return;
    }
    if ((state.inventory[key] || 0) <= 0) return;
    if (!chestHasSpaceFor(chest, key)) {
        showToast('木箱已满。');
        return;
    }
    const moved = Math.min(amount, state.inventory[key]);
    state.inventory[key] -= moved;
    chest.storage[key] = (chest.storage[key] || 0) + moved;
    syncHotbarItems();
    showToast(`存入木箱：${RESOURCE_LABELS[key] || key} x${moved}`);
    renderHud();
}

function takeItemFromChest(chest, key, amount = 1) {
    if ((chest.storage?.[key] || 0) <= 0) return;
    const moved = Math.min(amount, chest.storage[key]);
    if (!addInventoryItem(key, moved)) {
        showToast('背包已满，无法取出。');
        return;
    }
    chest.storage[key] -= moved;
    if (chest.storage[key] <= 0) delete chest.storage[key];
    if (chest.villageOwned) {
        if (chest.ownerObject) {
            chest.ownerObject.opened = true;
            if (!chest.ownerObject.stolen) {
                chest.ownerObject.stolen = true;
                const village = state.indoor?.building?.village || state.village;
                const reputation = changeVillageReputation(village, -1);
                const npc = state.indoor?.objects.find(item => item.kind === 'npc');
                if (npc) setVillagerPlayerAggro(npc);
                showToast(`拿走村民箱子里的 ${RESOURCE_LABELS[key] || key} x${moved}。本村声誉 -1（当前 ${reputation.toFixed(1)}）`);
            } else {
                showToast(`继续拿走 ${RESOURCE_LABELS[key] || key} x${moved}。`);
            }
        }
    } else {
        showToast(`取出：${RESOURCE_LABELS[key] || key} x${moved}`);
    }
    renderHud();
}

function rollDropAmount(spec, hit) {
    if (typeof spec === 'number') return spec;
    const chance = spec.chance ?? 1;
    if (!hit.boss && Math.random() > chance) return 0;
    const min = spec.min ?? 0;
    const max = spec.max ?? min;
    return min + Math.floor(Math.random() * (max - min + 1));
}

function weaponCooldown() {
    return currentAttackProfile().cooldown;
}

function weaponStaminaCost() {
    return currentAttackProfile().stamina;
}

function weaponArcDot() {
    return currentAttackProfile().arc;
}

function spawnBurst(x, y, color, count = 8, speed = 120, spread = 0) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = Math.random() * spread;
        const velocity = speed * (0.35 + Math.random() * 0.65);
        addParticle({
            x: x + Math.cos(angle) * offset,
            y: y + Math.sin(angle) * offset * 0.65,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            color,
            size: 2 + Math.random() * 4,
            life: 0.25 + Math.random() * 0.35,
        });
    }
}

function spawnArcParticles(x, y, dir) {
    const base = Math.atan2(dir.y, dir.x);
    for (let i = 0; i < 9; i++) {
        const angle = base - 0.65 + i * 0.16;
        addParticle({
            x: x + Math.cos(angle) * 42,
            y: y + Math.sin(angle) * 42,
            vx: Math.cos(angle) * 80,
            vy: Math.sin(angle) * 80,
            color: '#fff3b0',
            size: 3,
            life: 0.16,
        });
    }
}

function spawnAttackParticles(x, y, dir, attackProfile) {
    if (attackProfile.style === 'thrust' || attackProfile.style === 'stab' || attackProfile.style === 'pick') {
        const count = attackProfile.style === 'stab' ? 5 : 7;
        const color = attackProfile.style === 'pick' ? '#a8b3bd' : '#fff3b0';
        for (let i = 0; i < count; i++) {
            const forward = 28 + i * (attackProfile.range / (count + 1));
            const side = (i % 2 ? 1 : -1) * (2 + i);
            addParticle({
                x: x + dir.x * forward + -dir.y * side,
                y: y + dir.y * forward + dir.x * side,
                vx: dir.x * 140,
                vy: dir.y * 140,
                color,
                size: attackProfile.style === 'pick' ? 4 : 3,
                life: 0.13,
            });
        }
        return;
    }
    spawnArcParticles(x, y, dir);
}

function addFloatText(text, x, y, color) {
    state.floatTexts.push({ text, x, y, color, life: 0.85, indoor: !!state.indoor && !state.updatingOutdoorWhileIndoor });
}

function addParticle(particle) {
    state.particles.push(particle);
    if (state.particles.length > MAX_PARTICLES) {
        state.particles.splice(0, state.particles.length - MAX_PARTICLES);
    }
}

function beginConsumableUse(key) {
    const config = consumableUseConfig(key);
    if (!config) return false;
    if ((state.inventory[key] || 0) <= 0) return true;
    state.player.usingItem = {
        key,
        startedAt: performance.now(),
        finishAt: performance.now() + config.duration,
        duration: config.duration,
    };
    mouse.down = false;
    resetHarvestHold();
    showToast(`${RESOURCE_LABELS[key]} 使用中...`);
    return true;
}

function consumableUseConfig(key) {
    const durations = {
        berry: 650,
        mushroom: 850,
        lotus: 750,
        cactusFruit: 900,
        honey: 650,
        sap: 700,
        meat: 1300,
        frogLeg: 1100,
        rabbitFoot: 1000,
        bandage: 1100,
        potion: 1400,
        salve: 2400,
        antidote: 1200,
        speedPotion: 1400,
        regenPotion: 1500,
        ironSkinPotion: 1500,
        stew: 1700,
        roastMeat: 1600,
        honeySalve: 1200,
        nightVisionPotion: 1300,
        jumpPotion: 1300,
        poisonResistPotion: 1300,
        shadowPotion: 1400,
        strongBandage: 1400,
        mapleSnack: 900,
        honeyRoastMeat: 1700,
    };
    return durations[key] ? { duration: durations[key] } : null;
}

function updateItemUse(now) {
    const use = state.player.usingItem;
    if (!use) return;
    if ((state.inventory[use.key] || 0) <= 0) {
        state.player.usingItem = null;
        return;
    }
    if (now < use.finishAt) {
        if (Math.random() < 0.16) spawnBurst(state.player.x, state.player.y - 18, '#fff3b0', 1, 35, 8);
        return;
    }
    const key = use.key;
    state.player.usingItem = null;
    applyConsumableEffect(key);
    syncHotbarItems();
    renderHud();
}

function applyConsumableEffect(key) {
    const p = state.player;
    switch (key) {
        case 'berry':
            feedPlayer(4);
            state.inventory.berry -= 1;
            showToast('吃下浆果，稍微缓解饥饿。');
            break;
        case 'mushroom':
            feedPlayer(8);
            state.inventory.mushroom -= 1;
            showToast('吃下蘑菇，缓解了一点饥饿。');
            break;
        case 'lotus':
            feedPlayer(3);
            state.inventory.lotus -= 1;
            showToast('吃下莲花，稍微缓解饥饿。');
            break;
        case 'cactusFruit':
            feedPlayer(8);
            p.stamina = Math.min(100, p.stamina + 8);
            state.inventory.cactusFruit -= 1;
            showToast('吃下仙人掌果，补充水分和饥饿。');
            break;
        case 'honey':
            feedPlayer(10);
            p.stamina = Math.min(100, p.stamina + 6);
            state.inventory.honey -= 1;
            showToast('吃下蜂蜜，补充糖分和饥饿。');
            break;
        case 'sap':
            feedPlayer(6);
            state.inventory.sap -= 1;
            showToast('喝下树液，缓解饥饿。');
            break;
        case 'meat':
            feedPlayer(14);
            state.inventory.meat -= 1;
            poisonPlayer(performance.now(), 3200);
            showToast('吃下生肉，缓解饥饿但中毒了。');
            break;
        case 'frogLeg':
            feedPlayer(9);
            state.inventory.frogLeg -= 1;
            poisonPlayer(performance.now(), 2600);
            showToast('生吃蛙腿，缓解饥饿但中毒了。');
            break;
        case 'rabbitFoot':
            feedPlayer(8);
            state.inventory.rabbitFoot -= 1;
            poisonPlayer(performance.now(), 2200);
            showToast('生吃兔腿，缓解饥饿但中毒了。');
            break;
        case 'potion':
            p.hp = Math.min(p.maxHp, p.hp + 35);
            state.inventory.potion -= 1;
            showToast('使用治疗药水，恢复 35 生命。');
            break;
        case 'honeySalve':
            p.hp = Math.min(p.maxHp, p.hp + 30);
            p.regenUntil = performance.now() + 8000;
            p.regenTickAt = performance.now() + 800;
            state.inventory.honeySalve -= 1;
            showToast('使用蜂蜜药膏，恢复 30 生命，并再生 8 秒。');
            break;
        case 'bandage':
            p.hp = Math.min(p.maxHp, p.hp + 12);
            state.inventory.bandage -= 1;
            showToast('使用绷带，恢复 12 生命。');
            break;
        case 'stew':
            p.hp = Math.min(p.maxHp, p.hp + 10);
            feedPlayer(45);
            state.inventory.stew -= 1;
            showToast('喝下蘑菇汤，补充饥饿并少量恢复生命。');
            break;
        case 'salve':
            p.hp = Math.min(p.maxHp, p.hp + 45);
            p.poisonUntil = 0;
            p.poisonTickAt = 0;
            state.inventory.salve -= 1;
            showToast('使用黏液药膏，耗时更久，恢复 45 生命并清除中毒。');
            break;
        case 'antidote':
            p.poisonUntil = 0;
            p.poisonTickAt = 0;
            p.hp = Math.min(p.maxHp, p.hp + 15);
            state.inventory.antidote -= 1;
            showToast('服下解毒药，中毒已解除。');
            break;
        case 'speedPotion':
            p.speedBoostUntil = performance.now() + 25000;
            p.speedBoostPower = 1.55;
            state.inventory.speedPotion -= 1;
            showToast('饮下迅捷药水，25 秒内移动速度大幅提高。');
            break;
        case 'nightVisionPotion':
            p.nightVisionUntil = performance.now() + 35000;
            state.inventory.nightVisionPotion -= 1;
            showToast('饮下夜视药水，35 秒内夜晚视野大幅扩大。');
            break;
        case 'jumpPotion':
            p.speedBoostUntil = Math.max(p.speedBoostUntil, performance.now() + 18000);
            p.speedBoostPower = Math.max(p.speedBoostPower || 1, 1.42);
            p.jumpPotionUntil = performance.now() + 18000;
            state.inventory.jumpPotion -= 1;
            showToast('饮下跳跃药水，18 秒内行动更轻快，水/泥地阻力显著降低。');
            break;
        case 'poisonResistPotion':
            p.poisonResistUntil = performance.now() + 40000;
            p.poisonUntil = 0;
            state.inventory.poisonResistPotion -= 1;
            showToast('饮下毒抗药水，40 秒内免疫中毒并清除当前中毒。');
            break;
        case 'shadowPotion':
            p.shadowUntil = performance.now() + 30000;
            state.inventory.shadowPotion -= 1;
            showToast('饮下暗影药水，30 秒内怪物感知大幅降低。');
            break;
        case 'regenPotion':
            p.regenUntil = performance.now() + 24000;
            p.regenTickAt = performance.now() + 400;
            state.inventory.regenPotion -= 1;
            showToast('饮下再生药水，24 秒内生命会持续恢复。');
            break;
        case 'ironSkinPotion':
            p.ironSkinUntil = performance.now() + 24000;
            state.inventory.ironSkinPotion -= 1;
            showToast('饮下硬皮药水，24 秒内显著减少受到的伤害。');
            break;
        case 'roastMeat':
            p.hp = Math.min(p.maxHp, p.hp + 15);
            feedPlayer(48);
            state.inventory.roastMeat -= 1;
            showToast('吃下烤肉，大量缓解饥饿并少量恢复生命。');
            break;
        case 'strongBandage':
            p.hp = Math.min(p.maxHp, p.hp + 25);
            state.inventory.strongBandage -= 1;
            showToast('使用强效绷带，恢复 25 生命。');
            break;
        case 'mapleSnack':
            feedPlayer(20);
            p.speedBoostUntil = Math.max(p.speedBoostUntil, performance.now() + 5000);
            state.inventory.mapleSnack -= 1;
            showToast('吃下枫糖点心，缓解饥饿并提速。');
            break;
        case 'honeyRoastMeat':
            p.hp = Math.min(p.maxHp, p.hp + 25);
            feedPlayer(65);
            p.regenUntil = Math.max(p.regenUntil, performance.now() + 6000);
            state.inventory.honeyRoastMeat -= 1;
            showToast('吃下蜂蜜烤肉，大量补充饥饿并恢复生命。');
            break;
    }
}

function feedPlayer(amount) {
    const p = state.player;
    p.hunger = Math.min(p.maxHunger, p.hunger + amount);
    if (p.hunger >= 25) p.dizzyUntil = 0;
}

function consumeHungerForAction(amount) {
    const p = state.player;
    p.hunger = clamp(p.hunger - amount, 0, p.maxHunger);
}

function canCraft(item) {
    if (item.owned(state)) return false;
    if (!recipeUnlocked(item)) return false;
    if (requiresCamp(item) && !isNearCamp()) return false;
    if (!hasRequiredStation(item)) return false;
    if (!canReceiveRecipeOutput(item)) return false;
    return Object.entries(item.cost).every(([key, amount]) => availableItemAmount(key) >= amount);
}

function recipeOutputKey(item) {
    return {
        axe: 'stoneAxe',
        pickaxe: 'stonePickaxe',
        sickle: 'stoneSickle',
        spear: 'stoneSpear',
        sword: 'ironSword',
        armor: 'leatherArmor',
    }[item.id] || item.id;
}

function canReceiveRecipeOutput(item) {
    const output = recipeOutputKey(item);
    if (hasBackpackSpaceFor(output)) return true;
    return Object.entries(item.cost).some(([key, amount]) => key !== output && availableItemAmount(key) <= amount && !isHotbarItem(key));
}

function recipeUnlocked(item) {
    if (item.unlock?.length && !item.unlock.every(hasDiscoveredUnlock)) return false;
    if (!item.learn) return true;
    if (state.knownRecipes?.[item.id]) return true;
    if (recipeDiscoveredFromOutput(item)) return true;
    if (item.learn.materials?.length && item.learn.materials.every(hasDiscoveredUnlock)) return true;
    if (item.learn.teachers?.some(role => state.learnedRecipeTeachers?.[role])) return true;
    if (item.learn.note && state.foundRecipeNotes?.[item.learn.note]) return true;
    return false;
}

function hasDiscoveredUnlock(key) {
    return !!state.discoveredMaterials?.[key] || (state.inventory[key] || 0) > 0 || isPlacedOrEquippedUnlock(key);
}

function recipeDiscoveredFromOutput(item) {
    const output = recipeOutputKey(item);
    return (state.inventory[output] || 0) > 0 || (state.inventory[item.id] || 0) > 0 || item.owned(state);
}

function isPlacedOrEquippedUnlock(key) {
    if (key === 'workbench') return (state.inventory.workbench || 0) > 0 || state.placedStations?.some(station => station.kind === 'workbench');
    if (key === 'forge') return (state.inventory.forge || 0) > 0 || state.placedStations?.some(station => station.kind === 'forge') || state.indoor?.building?.kind === 'blacksmith';
    if (key === 'stoneSickle') return (state.inventory.stoneSickle || 0) > 0 || selectedHotbarItem() === 'stoneSickle' || state.equipment.tool === '石镰';
    return false;
}

function unlockRequirementText(item) {
    if (recipeUnlocked(item)) return '';
    if (item.unlock?.length) {
        const missing = item.unlock.filter(key => !hasDiscoveredUnlock(key));
        if (missing.length) return `需发现${missing.map(key => RESOURCE_LABELS[key] || key).join('、')}`;
    }
    const rule = item.learn;
    if (!rule) return '';
    const parts = [];
    if (rule.materials?.length) parts.push(`发现${rule.materials.map(key => RESOURCE_LABELS[key] || key).join('、')}`);
    if (rule.teachers?.length) parts.push(`请教${rule.teachers.map(npcName).join('或')}`);
    if (rule.note) parts.push('找到配方笔记');
    parts.push(`获得${item.name}成品`);
    return `需${parts.join(' / ')}`;
}

function requiresCamp(item) {
    return false;
}

function stationRequirement(item) {
    if (item.station) return item.station;
    if (['stew', 'roastMeat', 'honeyRoastMeat'].includes(item.id)) return 'campfire';
    if (['potion', 'salve', 'antidote', 'speedPotion', 'regenPotion', 'ironSkinPotion'].includes(item.id)) return 'potionTable';
    if (['honeySalve', 'nightVisionPotion', 'jumpPotion', 'poisonResistPotion', 'shadowPotion'].includes(item.id)) return 'potionTable';
    if (['potionTable', 'forge', 'bedroll', 'snare', 'bambooFence', 'bambooTrap', 'coalBomb', 'slingshot', 'campFlag', 'simpleArrow', 'poisonArrow', 'beeDart', 'beehiveBox', 'antlerHorn', 'shadowLantern', 'stoneCoreTotem', 'reedMat', 'resinGlue', 'mapleSnack', 'honeyRoastMeat'].includes(item.id)) return 'workbench';
    if (['sword', 'ironArmor', 'ironShield', 'crystalBlade', 'crystalArmor', 'venomDagger', 'key', 'sinewBow', 'antlerSpear', 'stoneCoreHammer', 'rabbitCloak', 'scorpionArmor', 'thickFurCoat', 'reedShellArmor', 'mireCoreArmor', 'waxTorch'].includes(item.id)) return 'forge';
    return '';
}

function hasRequiredStation(item) {
    const station = stationRequirement(item);
    return !station || isNearStation(station);
}

function isNearStation(kind) {
    if (kind === 'campfire') return isNearCampfire();
    if (state.indoor) {
        if (kind === 'forge' && state.indoor.building.kind === 'blacksmith') return true;
        if (kind === 'potionTable' && state.indoor.building.kind === 'apothecary') return true;
        if (kind === 'workbench' && state.indoor.building.kind === 'unemployed') return true;
    }
    return state.placedStations.some(station => station.kind === kind && distance(state.player, station) <= station.radius + 90);
}

function stationRequirementText(item) {
    const station = stationRequirement(item);
    if (!station || isNearStation(station)) return '';
    return `需靠近${RESOURCE_LABELS[station]}`;
}

function isNearCamp() {
    return distance(state.player, state.camp) <= state.camp.radius + 95;
}

function isNearCampfire() {
    if (state.indoor?.building.kind === 'kitchen') return true;
    if (state.camp.repaired && distance(state.player, state.camp) <= state.camp.radius + 120) return true;
    return state.placedStations.some(station => station.kind === 'campfire' && distance(state.player, station) <= station.radius + 95);
}

function craft(id) {
    const item = RECIPES.find(recipe => recipe.id === id);
    if (!item) return;
    if (requiresCamp(item) && !isNearCamp()) {
        showToast('这个合成需要在营地附近完成。');
        return;
    }
    const stationText = stationRequirementText(item);
    if (stationText) {
        showToast(stationText);
        return;
    }
    if (!canCraft(item)) return;
    Object.entries(item.cost).forEach(([key, amount]) => consumeItemAmount(key, amount));
    item.apply(state);
    state.knownRecipes ||= {};
    state.knownRecipes[item.id] = true;
    rememberItemDiscovery(recipeOutputKey(item));
    showToast(`合成成功：${item.name}`);
    renderHud();
}

function useInventoryItem(key) {
    if ((state.inventory[key] || 0) <= 0) return;
    const p = state.player;
    const simpleWeapon = simpleWeaponDef(key);
    if (simpleWeapon) {
        equipWeapon(simpleWeapon.name, simpleWeapon.profile.damage, simpleWeapon.profile.range, `已装备${simpleWeapon.name}。${simpleWeapon.desc}`);
        renderHud();
        return;
    }
    switch (key) {
        case 'stoneAxe':
            state.equipment.tool = '石斧';
            showToast('已装备石斧。');
            break;
        case 'stonePickaxe':
            state.equipment.tool = '石镐';
            showToast('已装备石镐。');
            break;
        case 'stoneSickle':
            state.equipment.tool = '石镰';
            showToast('已装备石镰。');
            break;
        case 'stoneSpear':
            equipWeapon('石矛', 4, 88, '已装备石矛。');
            break;
        case 'slingshot':
            equipWeapon('弹弓', 1, 360, '已装备弹弓。');
            break;
        case 'bambooSpear':
            equipWeapon('竹矛', 3, 106, '已装备竹矛，攻击距离更长。');
            break;
        case 'venomDagger':
            equipWeapon('毒牙匕首', 3, 42, '已装备毒牙匕首。');
            break;
        case 'ironSword':
            equipWeapon('铁剑', 6, 68, '已装备铁剑。');
            break;
        case 'crystalBlade':
            equipWeapon('魔晶剑', 9, 82, '已装备魔晶剑。');
            break;
        case 'sinewBow':
            equipWeapon('鹿筋弓', 3, 86, '已装备鹿筋弓。');
            break;
        case 'antlerSpear':
            equipWeapon('鹿角矛', 5, 108, '已装备鹿角矛。');
            break;
        case 'stoneCoreHammer':
            equipWeapon('石核锤', 8, 50, '已装备石核锤。');
            break;
        case 'leatherArmor':
            equipArmor('皮甲', 1, '已装备皮甲。');
            break;
        case 'clothArmor':
            equipArmor('布衣', 0, '已装备布衣。');
            break;
        case 'ironArmor':
            equipArmor('铁甲', 2, '已装备铁甲。');
            break;
        case 'crystalArmor':
            equipArmor('魔晶甲', 3, '已装备魔晶甲。');
            break;
        case 'rabbitCloak':
            equipArmor('兔毛披肩', 0, '已装备兔毛披肩。');
            break;
        case 'scorpionArmor':
            equipArmor('蝎壳甲', 2, '已装备蝎壳甲。');
            break;
        case 'thickFurCoat':
            equipArmor('厚毛皮衣', 1, '已装备厚毛皮衣。');
            break;
        case 'reedShellArmor':
            equipArmor('湿地甲壳甲', 2, '已装备湿地甲壳甲。');
            break;
        case 'mireCoreArmor':
            equipArmor('泥沼护甲', 2, '已装备泥沼护甲。');
            break;
        case 'woodShield':
            equipShield('木盾', 1, '已装备木盾。');
            break;
        case 'ironShield':
            equipShield('铁盾', 2, '已装备铁盾。');
            break;
        case 'coalBomb':
            useCoalBomb();
            break;
        case 'poisonVial':
            showToast('按住攻击键瞄准毒药，松开后投出。');
            break;
        case 'campfire':
            placeStation(key);
            break;
        case 'torch':
            placeTorch();
            break;
        case 'waxTorch':
        case 'shadowLantern':
            placeTorchLike(key);
            break;
        case 'bedroll':
            if (distance(state.player, state.camp) > state.camp.radius + 60) {
                showToast('睡袋只能在营地附近使用。');
                return;
            }
            state.timeOfDay = 0.25;
            state.player.hp = state.player.maxHp;
            showToast('你在营地休息到清晨，生命已恢复。');
            break;
        case 'campCharm':
            state.player.maxHp = Math.max(state.player.maxHp, 125);
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
            state.inventory.campCharm -= 1;
            showToast('营地护符生效，最大生命提高。');
            break;
        case 'antlerCharm':
            state.player.maxHp = Math.max(state.player.maxHp, 135);
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15);
            state.inventory.antlerCharm -= 1;
            showToast('鹿角护符生效，最大生命提高。');
            break;
        case 'antlerHorn':
            useAntlerHorn();
            break;
        case 'snare':
            deploySnare();
            break;
        case 'bambooFence':
            placeBambooFence();
            break;
        case 'bambooTrap':
            placeBambooTrap();
            break;
        case 'potionTable':
        case 'workbench':
        case 'forge':
        case 'beehiveBox':
        case 'stoneCoreTotem':
        case 'reedMat':
        case 'chest':
            placeStation(key);
            break;
        case 'campFlag':
            state.player.x = state.camp.x + 85;
            state.player.y = state.camp.y + 42;
            showToast('营地旗帜指引你回到营地。');
            break;
        case 'potion':
        case 'berry':
        case 'mushroom':
        case 'lotus':
        case 'cactusFruit':
        case 'honey':
        case 'sap':
        case 'meat':
        case 'frogLeg':
        case 'rabbitFoot':
        case 'bandage':
        case 'stew':
        case 'salve':
        case 'antidote':
        case 'speedPotion':
        case 'regenPotion':
        case 'ironSkinPotion':
        case 'honeySalve':
        case 'nightVisionPotion':
        case 'jumpPotion':
        case 'poisonResistPotion':
        case 'shadowPotion':
        case 'strongBandage':
        case 'mapleSnack':
        case 'honeyRoastMeat':
        case 'roastMeat':
            if (!beginConsumableUse(key)) return;
            break;
        default:
            return;
    }
    renderHud();
}

function equipWeapon(name, attack, range, message) {
    state.equipment.weapon = name;
    state.equipment.attack = attack;
    state.equipment.range = range;
    if (message) showToast(message);
}

function equipArmor(name, defense, message) {
    state.equipment.armor = name;
    state.equipment.defense = defense + shieldDefense();
    clearHotbarItem(armorKeyForName(name));
    if (message) showToast(message);
}

function equipShield(name, defense, message) {
    state.equipment.shield = name;
    state.equipment.defense = armorDefense() + defense;
    clearHotbarItem(shieldKeyForName(name));
    if (message) showToast(message);
}

function armorKeyForName(name) {
    return { 布衣: 'clothArmor', 皮甲: 'leatherArmor', 铁甲: 'ironArmor', 魔晶甲: 'crystalArmor', 兔毛披肩: 'rabbitCloak', 蝎壳甲: 'scorpionArmor', 厚毛皮衣: 'thickFurCoat', 湿地甲壳甲: 'reedShellArmor', 泥沼护甲: 'mireCoreArmor' }[name] || '';
}

function shieldKeyForName(name) {
    return { 木盾: 'woodShield', 铁盾: 'ironShield' }[name] || '';
}

function armorDefense() {
    if (state.equipment.armor === '魔晶甲') return 3;
    if (state.equipment.armor === '铁甲') return 2;
    if (state.equipment.armor === '皮甲') return 1;
    return 0;
}

function shieldDefense() {
    if (state.equipment.shield === '铁盾') return 2;
    if (state.equipment.shield === '木盾') return 1;
    return 0;
}

function useCoalBomb() {
    showToast('按住攻击键瞄准煤火弹，松开后投出。');
}

function explodeCoalBombAt(x, y) {
    const wet = terrainInfoAt(x, y).kind === 'water';
    const radius = wet ? 82 : 138;
    const maxDamage = wet ? 5 : 10;
    let hitCount = 0;
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const d = distance(enemy, { x, y });
        if (d > radius) continue;
        const damage = Math.max(2, Math.round(maxDamage * (1 - d / radius) + 2));
        enemy.hp -= damage;
        enemy.hurtUntil = performance.now() + 220;
        const knock = normalize(enemy.x - x, enemy.y - y);
        enemy.knockX += knock.x * (wet ? 150 : 280);
        enemy.knockY += knock.y * (wet ? 150 : 280);
        addFloatText(`-${damage}`, enemy.x, enemy.y - 36, '#ffd166');
        if (enemy.hp <= 0) {
            markSpawnAreaCleared(enemy.x, enemy.y);
            const drops = grantEnemyDrops(enemy);
            addFloatText(drops.floatText, enemy.x, enemy.y - 52, '#9cffb7');
        }
        hitCount++;
    }
    for (const npc of state.outdoorVillagers.filter(item => item.hp > 0)) {
        const d = distance(npc, { x, y });
        if (d > radius) continue;
        const damage = Math.max(1, Math.round(maxDamage * 0.45 * (1 - d / radius) + 1));
        damageOutdoorVillager(npc, performance.now(), { name: wet ? '水中煤火弹' : '煤火弹爆炸', damage, dir: normalize(npc.x - x, npc.y - y) });
        hitCount++;
    }
    const playerDist = distance(state.player, { x, y });
    if (playerDist < radius * 0.62) {
        const damage = wet ? 1 : 3;
        state.player.hp = Math.max(0, state.player.hp - damage);
        closeInventoryOnPlayerHit();
        const knock = normalize(state.player.x - x, state.player.y - y);
        state.player.knockX += knock.x * 220;
        state.player.knockY += knock.y * 220;
        addFloatText(`-${damage}`, state.player.x, state.player.y - 44, '#ffb3b3');
        if (state.player.hp <= 0) {
            triggerPlayerDeath('你被爆炸击倒了。');
        }
    }
    state.cameraShake = Math.max(state.cameraShake, wet ? 8 : 18);
    spawnBurst(x, y, wet ? '#9fb3c8' : '#ff9f1c', wet ? 24 : 52, wet ? 160 : 320, radius * 0.55);
    showToast(wet ? '煤火弹落入水中，爆炸被削弱。' : (hitCount ? `煤火弹击中了 ${hitCount} 个敌人。` : '煤火弹爆炸，但没有击中敌人。'));
    renderHud();
}

function explodePoisonVialAt(x, y) {
    const radius = 112;
    let hitCount = 0;
    const now = performance.now();
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0 || enemy.kind === 'golem') continue;
        const d = distance(enemy, { x, y });
        if (d > radius) continue;
        enemy.poisonUntil = Math.max(enemy.poisonUntil || 0, now + 7000);
        enemy.poisonTickAt = Math.min(enemy.poisonTickAt || now + 500, now + 500);
        enemy.hurtUntil = now + 180;
        addFloatText('中毒', enemy.x, enemy.y - 40, '#9cff7a');
        hitCount++;
    }
    for (const npc of state.outdoorVillagers.filter(item => item.hp > 0)) {
        const d = distance(npc, { x, y });
        if (d > radius) continue;
        npc.poisonUntil = Math.max(npc.poisonUntil || 0, now + 7000);
        npc.poisonTickAt = Math.min(npc.poisonTickAt || now + 500, now + 500);
        npc.hurtUntil = now + 180;
        setVillagerPlayerAggro(npc);
        addFloatText('中毒', npc.x, npc.y - 40, '#9cff7a');
        hitCount++;
    }
    spawnBurst(x, y, '#8cff66', 34, 220, radius * 0.5);
    showToast(hitCount ? `毒药让 ${hitCount} 个敌人中毒。` : '毒药碎裂，毒雾没有命中敌人。');
    renderHud();
}

function hitDirectProjectileTarget(projectile, hitInfo = findDirectProjectileHit(projectile, { x: projectile.x, y: projectile.y })) {
    if (!hitInfo?.target) {
        spawnBurst(projectile.x, projectile.y, '#d8e5f2', 8, 70, 10);
        return;
    }
    if (hitInfo.type === 'outdoorVillager') {
        hitOutdoorVillagerWithDirectProjectile(projectile, hitInfo.target);
        return;
    }
    const hit = hitInfo.target;
    const now = performance.now();
    const damage = directProjectileDamage(projectile);
    hit.hp -= damage;
    hit.hurtUntil = now + 160;
    hit.attackCooldown = Math.max(hit.attackCooldown, 0.22);
    if (projectile.kind !== 'slingshotPebble') {
        const knock = projectile.dir || normalize(hit.x - state.player.x, hit.y - state.player.y);
        const force = projectile.kind === 'slingStone' ? 230
            : (projectile.kind === 'crossbowBolt' || projectile.kind === 'crossbowPoisonBolt' ? 190
                : (projectile.kind === 'poisonArrow' ? 80 : 120));
        hit.knockX += knock.x * force;
        hit.knockY += knock.y * force;
    }
    if ((projectile.kind === 'poisonArrow' || projectile.kind === 'crossbowPoisonBolt') && hit.kind !== 'golem') {
        hit.poisonUntil = Math.max(hit.poisonUntil || 0, now + 5200);
        hit.poisonTickAt = Math.min(hit.poisonTickAt || now + 800, now + 800);
        addFloatText('中毒', hit.x, hit.y - 48, '#9cff7a');
    }
    spawnBurst(hit.x, hit.y, projectile.kind === 'poisonArrow' || projectile.kind === 'crossbowPoisonBolt' ? '#8cff66' : '#d8e5f2', projectile.kind === 'slingshotPebble' || projectile.kind === 'slingStone' ? 6 : 12, 70, hit.radius * 0.45);
    addFloatText(`-${damage}`, hit.x, hit.y - 36, '#fff3b0');
    if (hit.hp <= 0) {
        markSpawnAreaCleared(hit.x, hit.y, now);
        const drops = grantEnemyDrops(hit);
        addFloatText(drops.floatText, hit.x, hit.y - 52, '#9cffb7');
        showToast(`${directProjectileName(projectile)}击败 ${hit.name}，获得 ${drops.toastText}`);
    } else {
        showToast(`${directProjectileName(projectile)}击中 ${hit.name}。`);
    }
    renderHud();
}

function hitOutdoorVillagerWithDirectProjectile(projectile, npc) {
    const now = performance.now();
    const damage = directProjectileDamage(projectile);
    damageOutdoorVillager(npc, now, {
        name: directProjectileName(projectile),
        damage,
        dir: projectile.dir || normalize(npc.x - projectile.startX, npc.y - projectile.startY),
    });
    if ((projectile.kind === 'poisonArrow' || projectile.kind === 'crossbowPoisonBolt') && npc.hp > 0) {
        npc.poisonUntil = Math.max(npc.poisonUntil || 0, now + 5200);
        npc.poisonTickAt = Math.min(npc.poisonTickAt || now + 800, now + 800);
        addFloatText('中毒', npc.x, npc.y - 54, '#9cff7a');
    }
    spawnBurst(npc.x, npc.y, projectile.kind === 'poisonArrow' || projectile.kind === 'crossbowPoisonBolt' ? '#8cff66' : '#d8e5f2', 12, 80, (npc.radius || 17) * 0.55);
}

function directProjectileDamage(projectile) {
    if (projectile.kind === 'slingshotPebble') return 1;
    if (projectile.kind === 'slingStone') return Math.max(2, Math.round(1 + (projectile.charge || 0.5) * 3));
    if (projectile.kind === 'bambooKnife') return 1;
    if (projectile.kind === 'crossbowBolt' || projectile.kind === 'crossbowPoisonBolt') return Math.max(4, Math.round(3 + (projectile.charge || 0.5) * 5));
    if (projectile.kind === 'poisonArrow') return 3;
    return Math.max(3, Math.round(2 + (projectile.charge || 0.5) * 4));
}

function directProjectileName(projectile) {
    if (projectile.kind === 'slingshotPebble') return '弹弓石子';
    if (projectile.kind === 'slingStone') return '投石带石子';
    if (projectile.kind === 'bambooKnife') return '竹片飞刀';
    if (projectile.kind === 'crossbowBolt') return '竹弩箭';
    if (projectile.kind === 'crossbowPoisonBolt') return '竹弩毒箭';
    if (projectile.kind === 'poisonArrow') return '毒箭';
    return '箭矢';
}

function deploySnare() {
    const p = state.player;
    const target = state.enemies
        .filter(enemy => enemy.hp > 0 && distance(enemy, p) < 130)
        .sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (!target) {
        showToast('附近没有可困住的野兽。');
        return;
    }
    state.inventory.snare -= 1;
    target.rootedUntil = performance.now() + 2600;
    target.windupUntil = 0;
    target.strikeAt = 0;
    target.chargeUntil = 0;
    target.leapUntil = 0;
    spawnBurst(target.x, target.y, '#ffd166', 18, 120, target.radius);
    addFloatText('束缚', target.x, target.y - 42, '#fff3b0');
    showToast(`${target.name} 被捕兽夹困住了。`);
}

function placeTorch() {
    const preview = placementPreviewForItem('torch');
    if (!preview.valid) {
        showToast(preview.reason || '这里不能放置火把。');
        return;
    }
    state.placedTorches.push({ x: preview.x, y: preview.y });
    state.inventory.torch -= 1;
    spawnBurst(preview.x, preview.y, '#ff9f1c', 8, 70, 12);
    showToast('已放置火把。');
    renderHud();
}

function placeTorchLike(kind) {
    const preview = placementPreviewForItem(kind);
    if (!preview.valid) {
        showToast(preview.reason || '这里不能放置照明物。');
        return;
    }
    state.placedTorches.push({ x: preview.x, y: preview.y, kind });
    state.inventory[kind] -= 1;
    spawnBurst(preview.x, preview.y, kind === 'shadowLantern' ? '#8f6bd8' : '#ff9f1c', 10, 80, 12);
    showToast(`已放置${RESOURCE_LABELS[kind]}。`);
    renderHud();
}

function useAntlerHorn() {
    let affected = 0;
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0 || enemy.boss || distance(enemy, state.player) > 260) continue;
        enemy.retreatUntil = performance.now() + 1800;
        const away = normalize(enemy.x - state.player.x, enemy.y - state.player.y);
        enemy.knockX += away.x * 220;
        enemy.knockY += away.y * 220;
        affected++;
    }
    state.inventory.antlerHorn -= 1;
    spawnBurst(state.player.x, state.player.y - 18, '#d8c08a', 24, 160, 40);
    showToast(affected ? `鹿角号角吓退了 ${affected} 个怪物。` : '鹿角号角响起，但附近没有怪物。');
    renderHud();
}

function placeBambooFence() {
    const preview = placementPreviewForItem('bambooFence');
    if (!preview.valid) {
        showToast(preview.reason || '这里不能放置竹栅栏。');
        return;
    }
    state.inventory.bambooFence -= 1;
    state.placedFences.push({ x: preview.x, y: preview.y, radius: preview.radius });
    spawnBurst(preview.x, preview.y, '#d7f28a', 10, 80, 14);
    showToast('已放置竹栅栏，可阻挡小怪。');
    renderHud();
}

function placeBambooTrap() {
    const preview = placementPreviewForItem('bambooTrap');
    if (!preview.valid) {
        showToast(preview.reason || '竹刺陷阱不能放在这里。');
        return;
    }
    state.inventory.bambooTrap -= 1;
    state.bambooTraps.push({ x: preview.x, y: preview.y, radius: preview.radius, used: false });
    spawnBurst(preview.x, preview.y, '#d7f28a', 10, 90, 16);
    showToast('已布置竹刺陷阱，怪物踩中会受伤并被定住。');
    renderHud();
}

function placeStation(kind) {
    const preview = placementPreviewForItem(kind);
    if (!preview.valid) {
        showToast(preview.reason || '附近没有足够空间放置工作设施。');
        return;
    }
    const station = { kind, x: preview.x, y: preview.y, radius: preview.radius };
    if (kind === 'chest') station.storage = {};
    state.inventory[kind] -= 1;
    state.placedStations.push(station);
    spawnBurst(preview.x, preview.y, kind === 'forge' ? '#ff9f1c' : '#ffd166', 14, 90, 18);
    showToast(kind === 'chest' ? '已放置木箱。' : (kind === 'campfire' ? '已放置营火。靠近它可以烹饪熟食。' : `已放置${RESOURCE_LABELS[kind]}。靠近它可解锁相关合成。`));
    renderHud();
}

function stationPlacementPosition(kind) {
    const radius = kind === 'forge' ? 28 : 24;
    const p = state.player;
    const base = Math.atan2(p.facing.y, p.facing.x);
    const candidates = [
        { angle: base, distance: 48 },
        { angle: base - 0.7, distance: 58 },
        { angle: base + 0.7, distance: 58 },
        { angle: base - 1.35, distance: 64 },
        { angle: base + 1.35, distance: 64 },
    ];
    for (const candidate of candidates) {
        const station = {
            x: clamp(p.x + Math.cos(candidate.angle) * candidate.distance, 24, WORLD.width - 24),
            y: clamp(p.y + Math.sin(candidate.angle) * candidate.distance, 24, WORLD.height - 24),
            radius,
        };
        if (terrainInfoAt(station.x, station.y).kind !== 'water' && !collides(station)) return station;
    }
    return null;
}

function placementPreviewForItem(kind) {
    if (!isPlaceableItem(kind)) return null;
    if (kind === 'potionTable' || kind === 'workbench' || kind === 'forge' || kind === 'beehiveBox' || kind === 'stoneCoreTotem' || kind === 'reedMat' || kind === 'chest' || kind === 'campfire') {
        const pos = stationPlacementPosition(kind);
        if (!pos) return { kind, valid: false, reason: '附近没有足够空间放置工作设施。', ...placementPosition(52), radius: kind === 'forge' ? 28 : 24 };
        return { kind, valid: true, x: pos.x, y: pos.y, radius: kind === 'forge' ? 28 : 24 };
    }
    const distanceAhead = ['torch', 'waxTorch', 'shadowLantern'].includes(kind) ? 34 : (kind === 'bambooFence' ? 38 : 42);
    const radius = ['torch', 'waxTorch', 'shadowLantern'].includes(kind) ? 10 : (kind === 'bambooFence' ? 18 : 24);
    const pos = placementPosition(distanceAhead);
    const probe = { x: pos.x, y: pos.y, radius };
    if (terrainInfoAt(pos.x, pos.y).kind === 'water') return { kind, valid: false, reason: '不能放在深水里。', ...probe };
    if (kind !== 'bambooTrap' && collides(probe)) return { kind, valid: false, reason: '这里被挡住了。', ...probe };
    return { kind, valid: true, ...probe };
}

function isPlaceableItem(kind) {
    return ['torch', 'waxTorch', 'shadowLantern', 'bambooFence', 'bambooTrap', 'potionTable', 'workbench', 'forge', 'beehiveBox', 'stoneCoreTotem', 'reedMat', 'chest', 'campfire'].includes(kind);
}

function placementPosition(distanceAhead) {
    const p = state.player;
    return {
        x: clamp(p.x + p.facing.x * distanceAhead, 24, WORLD.width - 24),
        y: clamp(p.y + p.facing.y * distanceAhead, 24, WORLD.height - 24),
    };
}

function updateQuest() {
    if (state.win || state.lose) return;
    if (state.quest === 'collect-basic' && state.inventory.wood >= 4 && state.inventory.stone >= 4) state.quest = 'craft-tools';
    if (state.quest === 'craft-tools' && state.equipment.tool === '石镐') state.quest = 'mine-ore';
    if (state.quest === 'mine-ore' && state.inventory.ore >= 6) state.quest = 'craft-weapon';
    if (state.quest === 'craft-weapon' && state.equipment.weapon === '铁剑') state.quest = 'defeat-golem';
    if (state.quest === 'defeat-golem' && state.inventory.crystal >= 3) state.quest = 'craft-key';
}

function questText() {
    return {
        'collect-basic': '采集木头和石头，营地已有可用营火。',
        'repair-camp': '营地已有可用营火，继续合成工具。',
        'craft-tools': '合成石斧/石镐，向矿区推进。',
        'mine-ore': '寻找随机生成的矿区采铁矿。',
        'craft-weapon': '合成铁剑，准备挑战守门石像。',
        'defeat-golem': '击败废墟附近的守门石像，获得魔晶。',
        'craft-key': '合成废墟钥匙。',
        'open-ruins': '前往右上角废墟门，按 E 开门。',
    }[state.quest] || '探索荒野。';
}

function renderHud() {
    syncHotbarItems();
    document.getElementById('hp-label').textContent = `${Math.ceil(state.player.hp)}/${state.player.maxHp}`;
    document.getElementById('hp-bar').style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
    document.getElementById('hunger-label').textContent = `${Math.ceil(state.player.hunger)}/${state.player.maxHunger}`;
    document.getElementById('hunger-bar').style.width = `${(state.player.hunger / state.player.maxHunger) * 100}%`;
    document.getElementById('attack-label').textContent = currentAttackProfile().damage;
    document.getElementById('tool-label').textContent = selectedHotbarItem() ? (RESOURCE_LABELS[selectedHotbarItem()] || selectedHotbarItem()) : '徒手';
    document.getElementById('armor-label').textContent = equipmentSummaryText();
    document.getElementById('time-label').textContent = nightAmount() > 0.2 ? '黑夜' : '白天';

    const inventory = document.getElementById('inventory');
    inventory.innerHTML = '';
    inventory.addEventListener('dragover', handleBackpackDragOver);
    inventory.addEventListener('drop', handleBackpackDrop);
    inventory.addEventListener('dragleave', handleBackpackDragLeave);
    const capacity = document.getElementById('inventory-capacity');
    const backpackKeys = backpackItemKeys();
    if (capacity) {
        capacity.textContent = `背包 ${backpackKeys.length}/${BACKPACK_SLOT_LIMIT} 格`;
        capacity.classList.toggle('full', backpackKeys.length >= BACKPACK_SLOT_LIMIT);
    }
    renderEquipmentPanel();
    backpackKeys.forEach(key => {
        const label = RESOURCE_LABELS[key] || key;
        const row = document.createElement('div');
        row.className = 'inventory-row';
        row.classList.toggle('usable', canUseInventoryItem(key));
        row.classList.toggle('selected-for-hotbar', state.selectedBackpackItem === key);
        row.classList.add('draggable');
        row.dataset.itemKey = key;
        row.title = `${label} x${state.inventory[key] || 0}。点击选择后，再点击快捷栏放入。`;
        row.appendChild(createPixelIconElement(key, 'inventory-icon'));
        const name = document.createElement('span');
        name.className = 'inventory-name';
        name.textContent = label;
        row.appendChild(name);
        const count = document.createElement('strong');
        count.textContent = state.inventory[key] || 0;
        row.appendChild(count);
        const actions = document.createElement('div');
        actions.className = 'slot-actions';
        const chest = activeChest();
        if (chest && !chest.villageOwned) {
            const store = document.createElement('button');
            store.type = 'button';
            store.className = 'store-btn';
            store.textContent = '存';
            store.title = '存入木箱 1 个';
            store.addEventListener('click', event => {
                event.stopPropagation();
                storeItemInChest(chest, key, 1);
            });
            actions.appendChild(store);
        }
        const discard = document.createElement('button');
        discard.type = 'button';
        discard.className = 'discard-btn';
        discard.textContent = '丢弃';
        discard.title = '丢弃 1 个';
        discard.addEventListener('click', event => {
            event.stopPropagation();
            discardInventoryItem(key, 1);
        });
        actions.appendChild(discard);
        row.appendChild(actions);
        row.draggable = true;
        row.addEventListener('dragstart', event => {
            state.draggedInventoryItem = key;
            state.draggedHotbarSlot = null;
            event.dataTransfer.setData('text/plain', key);
            event.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
            state.draggedInventoryItem = null;
            state.draggedHotbarSlot = null;
        });
        row.addEventListener('click', () => selectBackpackItemForHotbar(key));
        inventory.appendChild(row);
    });
    for (let i = backpackKeys.length; i < BACKPACK_SLOT_LIMIT; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'inventory-row inventory-slot-empty';
        emptySlot.textContent = '';
        inventory.appendChild(emptySlot);
    }

    renderHotbarDropZone();
    renderChestStorage();
    renderTradePanel();

    const recipes = document.getElementById('recipes');
    recipes.innerHTML = '';
    const visibleRecipes = RECIPES.filter(recipe => recipeHasKnownMaterial(recipe) && recipeStationVisible(recipe));
    const sortedRecipes = visibleRecipes.slice().sort((a, b) => {
        const aCraft = canCraft(a) ? 0 : 1;
        const bCraft = canCraft(b) ? 0 : 1;
        if (aCraft !== bCraft) return aCraft - bCraft;
        const aOwned = a.owned(state) ? 1 : 0;
        const bOwned = b.owned(state) ? 1 : 0;
        return aOwned - bOwned;
    });
    sortedRecipes.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'recipe-btn';
        button.disabled = !canCraft(item);
        const cost = Object.entries(item.cost)
            .map(([key, amount]) => `<span class="cost-chip ${availableItemAmount(key) >= amount ? 'met' : ''}">${pixelIconHtml(key)}<b>${amount}</b></span>`)
            .join('');
        button.innerHTML = `
            <div class="recipe-title"><span>${item.name}</span><small>${item.desc}</small></div>
            <div class="recipe-cost"><span class="recipe-cost-list">${cost}</span><span>${recipeStatusText(item, button.disabled)}</span></div>
        `;
        button.addEventListener('click', () => craft(item.id));
        recipes.appendChild(button);
    });
    if (!recipes.children.length) {
        const empty = document.createElement('div');
        empty.className = 'inventory-empty';
        empty.textContent = '获得材料后会显示相关合成方式';
        recipes.appendChild(empty);
    }

    const objective = document.getElementById('objective-text');
    if (objective) objective.textContent = questText();
    updateInventoryOverlay();
}

function renderEquipmentPanel() {
    const panel = document.getElementById('equipment-panel');
    if (!panel) return;
    panel.innerHTML = '<h3>装备</h3>';
    [
        { type: 'armor', label: '护甲', value: state.equipment.armor === '无' ? '空' : state.equipment.armor, accepts: isArmorKey },
        { type: 'offhand', label: '副手', value: state.equipment.shield === '无' ? '空' : state.equipment.shield, accepts: isShieldKey },
    ].forEach(slotInfo => {
        const slot = document.createElement('div');
        slot.className = 'equipment-slot';
        slot.dataset.slot = slotInfo.type;
        slot.addEventListener('dragover', event => {
            if (!state.draggedInventoryItem || !slotInfo.accepts(state.draggedInventoryItem)) return;
            event.preventDefault();
            slot.classList.add('drop-target');
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('drop-target'));
        slot.addEventListener('drop', event => {
            event.preventDefault();
            slot.classList.remove('drop-target');
            const itemKey = event.dataTransfer.getData('text/plain') || state.draggedInventoryItem;
            if (!slotInfo.accepts(itemKey)) return;
            useInventoryItem(itemKey);
            state.draggedInventoryItem = null;
            renderHud();
        });
        const title = document.createElement('small');
        title.textContent = slotInfo.label;
        slot.appendChild(title);
        const equippedKey = equippedItemKey(slotInfo.type);
        if (equippedKey) slot.appendChild(createPixelIconElement(equippedKey, 'equipment-icon'));
        const value = document.createElement('span');
        value.textContent = slotInfo.value;
        slot.appendChild(value);
        panel.appendChild(slot);
    });
}

function renderChestStorage() {
    const panel = document.getElementById('chest-storage');
    if (!panel) return;
    const chest = activeChest();
    panel.classList.toggle('hidden', !chest);
    panel.innerHTML = '';
    if (!chest) return;
    const keys = chestItemKeys(chest);
    const title = document.createElement('div');
    title.className = 'chest-title';
    title.textContent = `${chest.villageOwned ? chest.label : '木箱'} ${keys.length}/${CHEST_SLOT_LIMIT} 格`;
    panel.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'chest-grid';
    keys.forEach(key => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'inventory-row chest-row trade-row';
        row.appendChild(createPixelIconElement(key, 'inventory-icon'));
        const name = document.createElement('span');
        name.className = 'inventory-name';
        name.textContent = RESOURCE_LABELS[key] || key;
        row.appendChild(name);
        const count = document.createElement('strong');
        count.textContent = chest.storage[key] || 0;
        row.appendChild(count);
        row.addEventListener('click', () => takeItemFromChest(chest, key, 1));
        grid.appendChild(row);
    });
    for (let i = keys.length; i < CHEST_SLOT_LIMIT; i++) {
        const empty = document.createElement('div');
        empty.className = 'inventory-row inventory-slot-empty';
        grid.appendChild(empty);
    }
    panel.appendChild(grid);
}

function renderTradePanel() {
    const panel = document.getElementById('trade-panel');
    if (!panel) return;
    const npc = state.activeTrader;
    const show = !!(state.inventoryOpen && npc && npc.hp > 0 && (canVillagerTrade(npc.role) || state.villageTasks?.[npc.role]));
    panel.classList.toggle('hidden', !show);
    const previousGrid = panel.querySelector('.chest-grid');
    const previousScroll = previousGrid ? previousGrid.scrollTop : (state.tradePanelScrollTop || 0);
    panel.innerHTML = '';
    if (!show) return;
    if (!canVillagerTrade(npc.role)) {
        renderVillagerTaskPanel(panel, npc, previousScroll);
        return;
    }
    const village = villageForTrader(npc);
    const title = document.createElement('div');
    title.className = 'chest-title';
    title.textContent = `${npc.label}交易（本村声誉 ${villageReputation(village).toFixed(1)}）`;
    panel.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'chest-grid';
    grid.addEventListener('scroll', () => {
        state.tradePanelScrollTop = grid.scrollTop;
    });
    if (npc.role === 'merchant') {
        const lodge = document.createElement('button');
        lodge.type = 'button';
        lodge.className = 'inventory-row chest-row trade-row';
        lodge.disabled = (state.inventory.copperCoin || 0) < 6;
        const lodgeText = document.createElement('span');
        lodgeText.className = 'inventory-name';
        lodgeText.textContent = '借宿一晚：铜币 x6（休息到清晨，恢复生命与体力）';
        lodge.appendChild(lodgeText);
        lodge.addEventListener('click', lodgeAtMerchant);
        grid.appendChild(lodge);
    }
    const trades = availableTradesFor(npc.role, village);
    trades.forEach((trade, index) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'inventory-row chest-row';
        row.disabled = !hasItems(trade.give);
        const name = document.createElement('span');
        name.className = 'inventory-name';
        name.textContent = `用 ${itemListText(trade.give)} 交易 ${itemListText(trade.receive)}`;
        row.appendChild(name);
        row.addEventListener('click', () => tradeWithVillager(index));
        grid.appendChild(row);
    });
    if (!trades.length) {
        const empty = document.createElement('div');
        empty.className = 'inventory-row inventory-slot-empty';
        empty.textContent = '声誉不足，没有可用交易。';
        grid.appendChild(empty);
    }
    panel.appendChild(grid);
    grid.scrollTop = previousScroll;
    state.tradePanelScrollTop = previousScroll;
}

function renderVillagerTaskPanel(panel, npc, previousScroll = 0) {
    const task = state.villageTasks?.[npc.role];
    const village = villageForTrader(npc);
    const title = document.createElement('div');
    title.className = 'chest-title';
    title.textContent = `${npc.label}任务（本村声誉 ${villageReputation(village).toFixed(1)}）`;
    panel.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'chest-grid';
    grid.addEventListener('scroll', () => {
        state.tradePanelScrollTop = grid.scrollTop;
    });
    if (!task) {
        const empty = document.createElement('div');
        empty.className = 'inventory-row inventory-slot-empty';
        empty.textContent = '暂时没有任务。';
        grid.appendChild(empty);
    } else {
        const info = document.createElement('div');
        info.className = 'inventory-row chest-row';
        const name = document.createElement('span');
        name.className = 'inventory-name';
        name.textContent = `${task.title || '村民请求'}：${npcRequestText(npc.role, task)}`;
        info.appendChild(name);
        grid.appendChild(info);

        const need = document.createElement('div');
        need.className = 'inventory-row chest-row';
        need.textContent = `需求：${itemListText(task.need)}；奖励：${itemListText(task.reward)}；声誉 +${task.reputation}`;
        grid.appendChild(need);

        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'inventory-row chest-row trade-row';
        const activeRole = acceptedVillageTaskRole();
        action.disabled = (task.status === 'new' && activeRole && activeRole !== npc.role) || (task.status === 'accepted' && !hasItems(task.need));
        action.textContent = villagerTaskActionText(task);
        action.addEventListener('click', () => handleVillagerTaskAction(npc));
        grid.appendChild(action);
    }
    panel.appendChild(grid);
    grid.scrollTop = previousScroll;
    state.tradePanelScrollTop = previousScroll;
}

function villagerTaskActionText(task) {
    if (task.status === 'new') return '领取任务';
    if (task.status === 'accepted') return hasItems(task.need) ? '提交任务并领取奖励' : `还缺：${missingItemsText(task.need)}`;
    return '任务已完成';
}

function acceptedVillageTaskRole() {
    return Object.entries(state.villageTasks || {}).find(([, task]) => task.status === 'accepted')?.[0] || state.activeVillageTaskRole || '';
}

function handleVillagerTaskAction(npc) {
    const task = state.villageTasks?.[npc.role];
    if (!task || npc.hp <= 0 || npc.playerAggro || npc.mood === 'angry') return;
    if (task.status === 'done') {
        showToast(`${npc.label}：这件事已经帮过了。`);
        return;
    }
    if (task.status === 'new') {
        const activeRole = acceptedVillageTaskRole();
        if (activeRole && activeRole !== npc.role) {
            showToast(`你已经接了${npcName(activeRole)}的任务，先完成它再接新的。`);
            renderHud();
            return;
        }
        task.status = 'accepted';
        state.activeVillageTaskRole = npc.role;
        showToast(`${npc.label}：拜托了。${npcRequestText(npc.role, task)} 奖励：${itemListText(task.reward)}。`);
        renderHud();
        return;
    }
    if (!hasItems(task.need)) {
        showToast(`${npc.label}：还差这些：${missingItemsText(task.need)}。`);
        renderHud();
        return;
    }
    consumeItems(task.need);
    if (!grantItems(task.reward)) {
        showToast('背包已满，先清理空间再领奖。');
        renderHud();
        return;
    }
    const completed = (state.villageTaskCompletions[npc.role] || 0) + 1;
    state.villageTaskCompletions[npc.role] = completed;
    state.activeVillageTaskRole = null;
    const reputation = changeVillageReputation(villageForTrader(npc), task.reputation);
    state.villageTasks[npc.role] = nextVillageTask(npc.role, completed) || { ...task, status: 'done' };
    showToast(`${npc.label}：完成得很好。奖励 ${itemListText(task.reward)}，本村声誉 ${reputation.toFixed(1)}。之后还有新的事可以找我。`);
    renderHud();
}

function equippedItemKey(type) {
    if (type === 'offhand') return { 木盾: 'woodShield', 铁盾: 'ironShield' }[state.equipment.shield] || '';
    return { 布衣: 'clothArmor', 皮甲: 'leatherArmor', 铁甲: 'ironArmor', 魔晶甲: 'crystalArmor', 兔毛披肩: 'rabbitCloak', 蝎壳甲: 'scorpionArmor', 厚毛皮衣: 'thickFurCoat', 湿地甲壳甲: 'reedShellArmor', 泥沼护甲: 'mireCoreArmor' }[state.equipment.armor] || '';
}

function equipmentSummaryText() {
    const armor = state.equipment.armor === '无' ? '' : state.equipment.armor;
    const shield = state.equipment.shield === '无' ? '' : state.equipment.shield;
    if (armor && shield) return `${armor}+${shield}`;
    return armor || shield || '无';
}

function isArmorKey(key) {
    return ['clothArmor', 'leatherArmor', 'ironArmor', 'crystalArmor', 'rabbitCloak', 'scorpionArmor', 'thickFurCoat', 'reedShellArmor', 'mireCoreArmor'].includes(key);
}

function isShieldKey(key) {
    return ['woodShield', 'ironShield'].includes(key);
}

function recipeStatusText(item, disabled) {
    if (item.owned(state)) return '已拥有';
    const unlockText = unlockRequirementText(item);
    if (unlockText) return unlockText;
    if (requiresCamp(item) && !isNearCamp()) return '需在营地';
    const stationText = stationRequirementText(item);
    if (stationText) return stationText;
    if (!canReceiveRecipeOutput(item)) return '背包已满';
    return disabled ? '材料不足' : '可合成';
}

function recipeStationVisible(item) {
    return !stationRequirement(item) || hasRequiredStation(item);
}

function renderHotbarDropZone() {
    let zone = document.getElementById('hotbar-drop-zone');
    if (!zone) return;
    zone.innerHTML = '';
    syncHotbarItems();
    state.hotbarItems.forEach((key, index) => {
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = `hotbar-drop-slot${index === state.selectedHotbar ? ' selected' : ''}`;
        slot.dataset.slot = String(index);
        slot.addEventListener('dragover', event => {
            if (!state.draggedInventoryItem) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            slot.classList.add('drop-target');
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('drop-target'));
        slot.addEventListener('drop', event => {
            event.preventDefault();
            slot.classList.remove('drop-target');
            const itemKey = event.dataTransfer.getData('text/plain') || state.draggedInventoryItem;
            assignHotbarItem(index, itemKey);
        });
        slot.addEventListener('click', () => {
            if (state.selectedBackpackItem) {
                assignHotbarItem(index, state.selectedBackpackItem);
                return;
            }
            state.selectedHotbar = index;
            renderHud();
        });
        slot.addEventListener('contextmenu', event => {
            event.preventDefault();
            clearHotbarSlot(index);
        });
        const number = document.createElement('small');
        number.textContent = String(index + 1);
        slot.appendChild(number);
        if (key) {
            slot.draggable = true;
            slot.addEventListener('dragstart', event => {
                state.draggedInventoryItem = key;
                state.draggedHotbarSlot = index;
                event.dataTransfer.setData('text/plain', key);
                event.dataTransfer.effectAllowed = 'move';
            });
            slot.addEventListener('dragend', () => {
                state.draggedInventoryItem = null;
                state.draggedHotbarSlot = null;
            });
            slot.appendChild(createPixelIconElement(key, 'hotbar-drop-icon'));
            const label = document.createElement('span');
            label.textContent = RESOURCE_LABELS[key] || key;
            slot.appendChild(label);
            const count = document.createElement('strong');
            count.textContent = state.inventory[key] || 0;
            slot.appendChild(count);
        }
        zone.appendChild(slot);
    });
}

function handleBackpackDragOver(event) {
    if (state.draggedHotbarSlot === null || state.draggedHotbarSlot === undefined) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('backpack-drop-target');
}

function handleBackpackDrop(event) {
    if (state.draggedHotbarSlot === null || state.draggedHotbarSlot === undefined) return;
    event.preventDefault();
    event.currentTarget.classList.remove('backpack-drop-target');
    moveHotbarItemToBackpack(state.draggedHotbarSlot);
}

function handleBackpackDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    event.currentTarget.classList.remove('backpack-drop-target');
}

function assignHotbarItem(index, itemKey) {
    if (!itemKey || (state.inventory[itemKey] || 0) <= 0) {
        showToast('只能把背包里已有的物品放到快捷栏。');
        return;
    }
    state.hotbarItems = state.hotbarItems.map((key, slotIndex) => key === itemKey && slotIndex !== index ? null : key);
    state.hotbarItems[index] = itemKey;
    selectHotbarSlot(index, false);
    state.draggedInventoryItem = null;
    state.selectedBackpackItem = null;
    showToast(`${RESOURCE_LABELS[itemKey]} 已放到快捷栏 ${index + 1}。`);
    renderHud();
}

function selectBackpackItemForHotbar(key) {
    if (!key || (state.inventory[key] || 0) <= 0) return;
    if (state.selectedBackpackItem === key) {
        state.selectedBackpackItem = null;
        showToast(`取消选择 ${RESOURCE_LABELS[key] || key}。`);
    } else {
        state.selectedBackpackItem = key;
        showToast(`已选择 ${RESOURCE_LABELS[key] || key}，再点击下方快捷栏位置。`);
    }
    renderHud();
}

function clearHotbarSlot(index) {
    if (!state.hotbarItems[index]) return;
    const label = RESOURCE_LABELS[state.hotbarItems[index]] || state.hotbarItems[index];
    state.hotbarItems[index] = null;
    showToast(`${label} 已移回背包显示。`);
    renderHud();
}

function moveHotbarItemToBackpack(index) {
    const key = state.hotbarItems[index];
    if (!key) return;
    state.hotbarItems[index] = null;
    state.draggedInventoryItem = null;
    state.draggedHotbarSlot = null;
    showToast(`${RESOURCE_LABELS[key] || key} 已移回背包。`);
    renderHud();
}

function clearHotbarItem(key) {
    if (!key) return;
    state.hotbarItems = (state.hotbarItems || []).map(item => item === key ? null : item);
    if (state.selectedBackpackItem === key && (state.inventory[key] || 0) <= 0) state.selectedBackpackItem = null;
}

function isHotbarItem(key) {
    return (state.hotbarItems || []).includes(key);
}

function syncHotbarItems() {
    state.hotbarItems = (state.hotbarItems || Array(9).fill(null)).map(key => key && (state.inventory[key] || 0) > 0 ? key : null);
    while (state.hotbarItems.length < 9) state.hotbarItems.push(null);
    if (state.hotbarItems.length > 9) state.hotbarItems.length = 9;
    if (state.selectedBackpackItem && (state.inventory[state.selectedBackpackItem] || 0) <= 0) state.selectedBackpackItem = null;
}

function selectedHotbarItem() {
    syncHotbarItems();
    return (state.hotbarItems || [])[state.selectedHotbar] || null;
}

function selectHotbarSlot(index, notify = true) {
    state.selectedHotbar = clamp(index, 0, 8);
    const item = selectedHotbarItem();
    if (item) autoEquipSelectedItem(item, notify);
    if (notify) renderHud();
}

function autoEquipSelectedItem(key, notify = true) {
    const silent = !notify;
    const simpleWeapon = simpleWeaponDef(key);
    if (simpleWeapon) {
        equipWeapon(simpleWeapon.name, simpleWeapon.profile.damage, simpleWeapon.profile.range, silent ? '' : `手持${simpleWeapon.name}。${simpleWeapon.desc}`);
        return;
    }
    switch (key) {
        case 'stoneAxe':
            state.equipment.tool = '石斧';
            if (!silent) showToast('手持石斧。');
            break;
        case 'stonePickaxe':
            state.equipment.tool = '石镐';
            if (!silent) showToast('手持石镐。');
            break;
        case 'stoneSickle':
            state.equipment.tool = '石镰';
            if (!silent) showToast('手持石镰，收割纤维更快。');
            break;
        case 'stoneSpear':
            equipWeapon('石矛', 4, 88, silent ? '' : '手持石矛。');
            break;
        case 'slingshot':
            equipWeapon('弹弓', 1, 360, silent ? '' : '手持弹弓。');
            break;
        case 'bambooSpear':
            equipWeapon('竹矛', 3, 106, silent ? '' : '手持竹矛。');
            break;
        case 'venomDagger':
            equipWeapon('毒牙匕首', 3, 42, silent ? '' : '手持毒牙匕首。');
            break;
        case 'ironSword':
            equipWeapon('铁剑', 6, 68, silent ? '' : '手持铁剑。');
            break;
        case 'crystalBlade':
            equipWeapon('魔晶剑', 9, 82, silent ? '' : '手持魔晶剑。');
            break;
        case 'sinewBow':
            equipWeapon('鹿筋弓', 3, 86, silent ? '' : '手持鹿筋弓。');
            break;
        case 'antlerSpear':
            equipWeapon('鹿角矛', 5, 108, silent ? '' : '手持鹿角矛。');
            break;
        case 'stoneCoreHammer':
            equipWeapon('石核锤', 8, 50, silent ? '' : '手持石核锤。');
            break;
        case 'leatherArmor':
            equipArmor('皮甲', 1, silent ? '' : '已装备皮甲。');
            break;
        case 'clothArmor':
            equipArmor('布衣', 0, silent ? '' : '已装备布衣。');
            break;
        case 'ironArmor':
            equipArmor('铁甲', 2, silent ? '' : '已装备铁甲。');
            break;
        case 'crystalArmor':
            equipArmor('魔晶甲', 3, silent ? '' : '已装备魔晶甲。');
            break;
        case 'rabbitCloak':
            equipArmor('兔毛披肩', 0, silent ? '' : '已装备兔毛披肩。');
            break;
        case 'scorpionArmor':
            equipArmor('蝎壳甲', 2, silent ? '' : '已装备蝎壳甲。');
            break;
        case 'woodShield':
            equipShield('木盾', 1, silent ? '' : '已装备木盾。');
            break;
        case 'ironShield':
            equipShield('铁盾', 2, silent ? '' : '已装备铁盾。');
            break;
        default:
            if (!silent) showToast(`手持${RESOURCE_LABELS[key] || key}。按 Q 使用可消耗/可放置物。`);
    }
}

function useSelectedHotbarItem() {
    const item = selectedHotbarItem();
    if (!item) {
        showToast('当前快捷栏为空。');
        return;
    }
    if (item === 'stone') {
        makePebblesFromHeldStone();
        return;
    }
    if (!canUseInventoryItem(item)) {
        showToast(`${RESOURCE_LABELS[item]} 不能直接使用。`);
        return;
    }
    if (isEquipmentItem(item)) {
        autoEquipSelectedItem(item);
        renderHud();
        return;
    }
    if (isThrowableItem(item)) {
        showToast('按住攻击键瞄准，松开投出。');
        return;
    }
    if (isPlaceableItem(item)) {
        useInventoryItem(item);
        syncHotbarItems();
        renderHud();
        return;
    }
    useInventoryItem(item);
    syncHotbarItems();
    renderHud();
}

function makePebblesFromHeldStone() {
    if ((state.inventory.stone || 0) <= 0) return;
    if (!hasBackpackSpaceFor('pebble')) {
        showToast('背包已满，无法敲出小石子。');
        return;
    }
    state.inventory.stone -= 1;
    state.inventory.pebble += 3;
    syncHotbarItems();
    showToast('把手上的石头敲成了 3 个小石子。');
    renderHud();
}

function isEquipmentItem(key) {
    return !!simpleWeaponDef(key) || ['stoneAxe', 'stonePickaxe', 'stoneSickle', 'stoneSpear', 'slingshot', 'bambooSpear', 'venomDagger', 'ironSword', 'crystalBlade', 'sinewBow', 'antlerSpear', 'stoneCoreHammer', 'leatherArmor', 'clothArmor', 'ironArmor', 'crystalArmor', 'rabbitCloak', 'scorpionArmor', 'thickFurCoat', 'reedShellArmor', 'mireCoreArmor', 'woodShield', 'ironShield'].includes(key);
}

function createPixelIconElement(key, className = 'pixel-icon') {
    const icon = document.createElement('span');
    icon.className = `pixel-icon ${className}`;
    icon.setAttribute('aria-hidden', 'true');
    const colors = itemIconColors(key);
    pixelIconRects(key).forEach(rect => {
        const cell = document.createElement('span');
        cell.style.left = `${rect[0] * 100 / ITEM_ICON_GRID}%`;
        cell.style.top = `${rect[1] * 100 / ITEM_ICON_GRID}%`;
        cell.style.width = `${rect[2] * 100 / ITEM_ICON_GRID}%`;
        cell.style.height = `${rect[3] * 100 / ITEM_ICON_GRID}%`;
        cell.style.background = colors[rect[4] || 0];
        icon.appendChild(cell);
    });
    return icon;
}

function pixelIconHtml(key) {
    const colors = itemIconColors(key);
    const pixels = pixelIconRects(key)
        .map(rect => `<i style="left:${rect[0] * 100 / ITEM_ICON_GRID}%;top:${rect[1] * 100 / ITEM_ICON_GRID}%;width:${rect[2] * 100 / ITEM_ICON_GRID}%;height:${rect[3] * 100 / ITEM_ICON_GRID}%;background:${colors[rect[4] || 0]}"></i>`)
        .join('');
    return `<span class="pixel-icon recipe-pixel-icon" aria-hidden="true">${pixels}</span>`;
}

function updateInventoryOverlay() {
    const overlay = document.getElementById('inventory-overlay');
    if (!overlay) return;
    overlay.classList.toggle('hidden', !state.inventoryOpen);
    overlay.setAttribute('aria-hidden', state.inventoryOpen ? 'false' : 'true');
    if (!state.inventoryOpen) {
        document.getElementById('chest-storage')?.classList.add('hidden');
        document.getElementById('trade-panel')?.classList.add('hidden');
    }
}

function toggleInventory(force = null) {
    state.inventoryOpen = force === null ? !state.inventoryOpen : !!force;
    if (state.inventoryOpen) updateMobileInventoryScale();
    if (state.inventoryOpen) {
        mouse.down = false;
        state.player.rangedAim = null;
        state.player.throwableAim = null;
        state.player.meleeCharge = null;
        state.player.pendingMeleeCharge = null;
        resetHarvestHold();
    } else {
        state.openIndoorContainer = null;
        state.activeTrader = null;
    }
    updateVillagerTradeButton();
    renderHud();
}

function updateMobileInventoryScale() {
    const scale = Math.min(1, (window.innerWidth - 12) / 1260, (window.innerHeight - 12) / 820);
    document.documentElement.style.setProperty('--mobile-inventory-scale', String(Math.max(0.28, scale)));
}

function canUseInventoryItem(key) {
    return (!!simpleWeaponDef(key) || ['stoneAxe', 'stonePickaxe', 'stoneSickle', 'stoneSpear', 'slingshot', 'bambooSpear', 'ironSword', 'crystalBlade', 'venomDagger', 'sinewBow', 'antlerSpear', 'stoneCoreHammer', 'leatherArmor', 'clothArmor', 'ironArmor', 'crystalArmor', 'rabbitCloak', 'scorpionArmor', 'thickFurCoat', 'reedShellArmor', 'mireCoreArmor', 'woodShield', 'ironShield', 'coalBomb', 'poisonVial', 'campfire', 'torch', 'waxTorch', 'shadowLantern', 'bedroll', 'campCharm', 'antlerCharm', 'snare', 'bambooFence', 'bambooTrap', 'potionTable', 'workbench', 'forge', 'beehiveBox', 'stoneCoreTotem', 'reedMat', 'chest', 'antlerHorn', 'campFlag', 'berry', 'mushroom', 'lotus', 'cactusFruit', 'honey', 'sap', 'meat', 'frogLeg', 'rabbitFoot', 'potion', 'honeySalve', 'nightVisionPotion', 'jumpPotion', 'poisonResistPotion', 'shadowPotion', 'bandage', 'strongBandage', 'stew', 'salve', 'antidote', 'speedPotion', 'regenPotion', 'ironSkinPotion', 'mapleSnack', 'honeyRoastMeat', 'roastMeat'].includes(key)) && (state.inventory[key] || 0) > 0;
}

function recipeHasKnownMaterial(recipe) {
    if (!recipeUnlocked(recipe)) return false;
    return Object.keys(recipe.cost).some(key => availableItemAmount(key) > 0);
}

function itemIconColors(key) {
    return PIXEL_ICON_PALETTES[ITEM_ICON_TYPES[key] || key] || PIXEL_ICON_PALETTES.default;
}

function pixelIconRects(key) {
    const type = ITEM_ICON_TYPES[key] || key;
    const detailed = detailedPixelIconRects(key, type);
    if (detailed) return detailed;
    return scaleIconRects(basePixelIconRects(type));
}

function scaleIconRects(rects) {
    return rects.map(rect => [rect[0] * 1.5, rect[1] * 1.5, rect[2] * 1.5, rect[3] * 1.5, rect[4] || 0]);
}

function detailedPixelIconRects(key, type) {
    const details = {
        bamboo: [[5, 0, 2, 12, 0], [3, 2, 2, 2, 1], [7, 4, 3, 2, 1], [2, 7, 3, 2, 2], [7, 9, 2, 2, 2]],
        bambooShard: [[6, 0, 2, 2, 2], [5, 2, 3, 7, 1], [4, 9, 2, 2, 0], [7, 9, 2, 2, 0], [6, 4, 1, 5, 2]],
        oakWood: [[2, 3, 8, 6, 0], [3, 2, 6, 2, 1], [4, 4, 2, 5, 1], [7, 5, 1, 3, 2], [2, 9, 8, 1, 2]],
        blossomWood: [[3, 3, 7, 6, 0], [4, 2, 5, 2, 1], [3, 8, 7, 2, 1], [5, 4, 2, 2, 2], [8, 5, 2, 2, 2]],
        birchWood: [[3, 2, 6, 8, 1], [2, 4, 8, 2, 0], [4, 3, 2, 1, 2], [7, 6, 2, 1, 2], [4, 9, 5, 1, 0]],
        pineWood: [[5, 1, 3, 9, 0], [3, 3, 7, 2, 1], [2, 6, 9, 2, 1], [6, 2, 1, 8, 2], [4, 10, 5, 1, 1]],
        mapleWood: [[2, 4, 8, 5, 0], [3, 3, 6, 2, 1], [5, 5, 2, 4, 2], [8, 4, 2, 2, 2], [3, 9, 6, 1, 1]],
        deadWood: [[3, 2, 6, 8, 0], [2, 5, 8, 2, 1], [4, 3, 1, 7, 2], [8, 4, 1, 5, 2], [3, 9, 6, 1, 1]],
        darkWood: [[2, 3, 8, 6, 0], [3, 2, 6, 2, 1], [5, 4, 2, 5, 2], [3, 8, 7, 2, 1], [8, 5, 2, 2, 2]],
        cypressWood: [[4, 1, 4, 10, 0], [3, 3, 6, 2, 1], [5, 2, 1, 8, 2], [2, 7, 8, 2, 1], [6, 10, 2, 1, 2]],
        willowWood: [[2, 4, 8, 5, 0], [4, 2, 5, 2, 1], [3, 8, 7, 2, 1], [2, 3, 2, 4, 2], [8, 5, 2, 5, 2]],
        ironwood: [[3, 2, 6, 8, 0], [2, 5, 8, 2, 1], [4, 3, 2, 6, 2], [7, 4, 2, 5, 2], [5, 9, 3, 1, 1]],
        elderWood: [[2, 3, 8, 6, 0], [3, 2, 6, 2, 1], [3, 8, 7, 2, 1], [5, 4, 2, 5, 2], [8, 4, 2, 2, 2], [2, 6, 2, 2, 2]],
        buttressWood: [[5, 2, 2, 8, 0], [3, 5, 6, 2, 1], [1, 8, 4, 2, 0], [7, 8, 4, 2, 0], [4, 3, 1, 7, 2], [7, 4, 1, 6, 2]],
        jungleLeaf: [[5, 4, 2, 7, 0], [2, 2, 5, 4, 1], [6, 1, 5, 5, 1], [3, 7, 7, 2, 2], [6, 3, 1, 6, 2]],
        vine: [[2, 2, 2, 2, 1], [4, 3, 2, 2, 2], [5, 5, 2, 2, 1], [7, 7, 2, 2, 2], [8, 9, 2, 2, 1]],
        jungleFruit: [[3, 5, 2, 5, 0], [7, 4, 2, 5, 0], [4, 2, 3, 3, 1], [6, 6, 4, 4, 1], [5, 5, 2, 2, 2], [8, 3, 2, 2, 2]],
        hardwood: [[3, 2, 6, 8, 0], [4, 2, 2, 8, 1], [7, 3, 1, 6, 2], [2, 5, 8, 1, 2], [2, 9, 8, 1, 1]],
        stone: [[3, 3, 6, 5, 0], [2, 5, 8, 3, 0], [4, 2, 4, 2, 1], [5, 5, 4, 2, 2], [2, 8, 5, 1, 1]],
        pebble: [[2, 7, 3, 2, 0], [6, 4, 3, 2, 1], [8, 8, 2, 2, 2], [3, 4, 2, 2, 2]],
        ore: [[2, 3, 8, 6, 0], [3, 2, 5, 2, 1], [5, 5, 5, 2, 1], [4, 8, 3, 1, 2], [8, 4, 2, 2, 2]],
        coal: [[3, 3, 6, 6, 0], [2, 6, 8, 3, 0], [4, 2, 3, 2, 1], [7, 7, 3, 2, 1]],
        crystal: [[6, 0, 2, 2, 2], [4, 2, 5, 7, 1], [3, 5, 7, 3, 0], [5, 3, 2, 5, 2], [4, 9, 5, 2, 2]],
        fiber: [[2, 8, 8, 2, 0], [3, 3, 1, 6, 1], [6, 2, 1, 7, 1], [9, 4, 1, 5, 2], [4, 5, 5, 1, 2]],
        herb: [[5, 4, 2, 7, 0], [2, 3, 4, 3, 1], [6, 2, 4, 3, 1], [3, 7, 3, 2, 2], [7, 6, 3, 2, 2]],
        flower: [[5, 5, 2, 6, 0], [4, 2, 4, 4, 1], [2, 4, 4, 4, 2], [6, 4, 4, 4, 2], [5, 5, 2, 2, 1]],
        berry: [[4, 5, 2, 6, 0], [7, 4, 2, 6, 0], [3, 3, 3, 3, 1], [6, 2, 3, 3, 1], [7, 6, 3, 3, 2]],
        mushroom: [[3, 4, 7, 3, 1], [2, 5, 9, 3, 1], [5, 8, 3, 3, 0], [4, 3, 2, 1, 2], [8, 5, 2, 1, 2]],
        toxicMushroom: [[3, 4, 7, 3, 1], [2, 5, 9, 3, 1], [5, 8, 3, 3, 0], [4, 4, 2, 2, 2], [8, 6, 2, 2, 2], [6, 5, 1, 1, 2]],
        resin: [[3, 3, 6, 6, 1], [4, 2, 4, 2, 2], [2, 5, 8, 3, 0], [5, 5, 2, 2, 2]],
        resinGlue: [[2, 4, 8, 5, 1], [3, 3, 6, 2, 2], [4, 8, 4, 2, 0], [5, 5, 2, 3, 2]],
        sap: [[6, 1, 2, 2, 2], [5, 3, 4, 3, 1], [4, 6, 6, 4, 0], [5, 9, 4, 2, 2]],
        honey: [[3, 3, 6, 6, 1], [2, 5, 8, 3, 1], [4, 2, 4, 2, 2], [5, 6, 2, 2, 2]],
        beeswax: [[3, 3, 6, 6, 0], [2, 5, 8, 3, 1], [4, 4, 2, 2, 2], [7, 6, 2, 2, 2]],
        beastClaw: [[4, 1, 2, 7, 1], [7, 2, 2, 6, 1], [3, 8, 6, 2, 0], [5, 2, 1, 5, 2], [8, 3, 1, 4, 2]],
        pollenDust: [[3, 3, 2, 2, 1], [7, 2, 2, 2, 2], [5, 5, 2, 2, 1], [2, 7, 2, 2, 2], [8, 8, 2, 2, 1], [5, 9, 2, 1, 2]],
        thickFur: [[2, 3, 8, 5, 0], [3, 2, 6, 2, 1], [2, 7, 8, 2, 1], [4, 4, 1, 4, 2], [7, 3, 1, 5, 2]],
        reedShell: [[3, 2, 6, 2, 2], [2, 4, 8, 5, 0], [3, 5, 6, 2, 1], [4, 8, 4, 2, 2], [2, 6, 2, 2, 1], [8, 6, 2, 2, 1]],
        mireCore: [[3, 3, 6, 6, 0], [4, 2, 4, 2, 1], [4, 7, 4, 2, 1], [5, 4, 2, 2, 2], [3, 6, 6, 1, 2]],
        crystalFang: [[5, 0, 2, 2, 2], [4, 2, 4, 6, 1], [5, 8, 2, 3, 0], [6, 3, 1, 4, 2], [3, 5, 6, 1, 2]],
        boneShard: [[5, 1, 2, 9, 1], [4, 2, 4, 2, 2], [3, 5, 6, 2, 0], [4, 9, 3, 1, 2]],
        potion: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [5, 8, 2, 2, 2]],
        regenPotion: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [5, 5, 2, 2, 2], [6, 4, 1, 4, 2]],
        nightVisionPotion: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [5, 5, 2, 2, 2], [4, 5, 1, 1, 2], [7, 5, 1, 1, 2]],
        jumpPotion: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [5, 3, 2, 2, 2], [4, 8, 4, 2, 2]],
        poisonResistPotion: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [5, 5, 2, 2, 2], [4, 8, 4, 1, 2]],
        shadowPotion: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [5, 4, 2, 5, 2], [3, 7, 6, 2, 0]],
        salve: [[2, 5, 8, 4, 0], [3, 4, 6, 2, 1], [4, 6, 4, 2, 2], [5, 3, 2, 2, 2]],
        honeySalve: [[2, 5, 8, 4, 0], [3, 4, 6, 2, 1], [4, 6, 4, 2, 2], [5, 3, 2, 2, 2], [8, 4, 2, 2, 1]],
        antidote: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [3, 8, 6, 1, 2], [6, 5, 1, 2, 2]],
        speedPotion: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [6, 3, 1, 3, 2], [4, 6, 4, 1, 2]],
        ironSkinPotion: [[4, 1, 4, 2, 2], [3, 3, 6, 7, 0], [4, 4, 4, 4, 1], [4, 5, 4, 2, 2], [5, 7, 2, 2, 2]],
        meat: [[2, 5, 7, 4, 0], [4, 3, 5, 3, 1], [7, 4, 3, 2, 2], [3, 8, 4, 1, 2]],
        roastMeat: [[2, 5, 7, 4, 0], [4, 3, 5, 3, 1], [7, 4, 3, 2, 2], [3, 8, 4, 1, 2], [2, 4, 8, 1, 2]],
        honeyRoastMeat: [[2, 5, 7, 4, 0], [4, 3, 5, 3, 1], [7, 4, 3, 2, 2], [3, 8, 4, 1, 2], [6, 2, 3, 2, 2]],
        stew: [[2, 5, 8, 5, 0], [3, 4, 6, 2, 1], [4, 6, 2, 2, 2], [7, 6, 2, 2, 2], [3, 10, 6, 1, 2]],
        clothArmor: [[3, 1, 6, 2, 1], [2, 3, 8, 6, 0], [4, 4, 4, 4, 2], [3, 9, 2, 2, 1], [7, 9, 2, 2, 1]],
        leatherArmor: [[3, 1, 6, 2, 1], [2, 3, 8, 6, 0], [3, 4, 6, 1, 2], [5, 5, 2, 4, 2], [3, 9, 6, 1, 1]],
        ironArmor: [[3, 1, 6, 2, 1], [2, 3, 8, 6, 0], [3, 4, 6, 1, 2], [4, 5, 4, 4, 2], [2, 8, 8, 1, 1]],
        crystalArmor: [[3, 1, 6, 2, 1], [2, 3, 8, 6, 0], [4, 4, 4, 4, 1], [5, 5, 2, 2, 2], [3, 8, 6, 1, 2]],
        rabbitCloak: [[3, 1, 6, 2, 1], [2, 3, 8, 7, 0], [2, 6, 2, 4, 2], [8, 6, 2, 4, 2], [5, 2, 2, 8, 1]],
        scorpionArmor: [[3, 1, 6, 2, 1], [2, 3, 8, 6, 0], [3, 5, 2, 2, 2], [7, 5, 2, 2, 2], [5, 3, 2, 6, 1]],
        woodShield: [[3, 1, 6, 1, 2], [2, 2, 8, 6, 0], [3, 8, 6, 2, 1], [5, 3, 2, 6, 2]],
        ironShield: [[3, 1, 6, 1, 2], [2, 2, 8, 6, 0], [3, 8, 6, 2, 1], [4, 3, 4, 5, 2], [2, 5, 8, 1, 1]],
        sinewBow: [[2, 1, 3, 10, 0], [4, 2, 3, 2, 1], [5, 5, 2, 2, 1], [4, 8, 3, 2, 1], [8, 2, 1, 8, 2]],
        slingshot: [[5, 6, 2, 5, 0], [3, 2, 2, 5, 0], [7, 2, 2, 5, 0], [4, 5, 4, 1, 1], [5, 7, 2, 2, 2]],
        simpleArrow: [[1, 5, 8, 2, 0], [9, 4, 2, 4, 1], [2, 4, 2, 1, 2], [2, 7, 2, 1, 2]],
        poisonArrow: [[1, 5, 8, 2, 0], [9, 4, 2, 4, 1], [2, 4, 2, 1, 2], [2, 7, 2, 1, 2], [8, 3, 2, 2, 2]],
        beeDart: [[2, 5, 7, 2, 0], [9, 4, 2, 4, 1], [4, 3, 2, 1, 2], [4, 8, 2, 1, 2]],
        woodFork: [[3, 7, 7, 2, 0], [8, 3, 1, 5, 1], [6, 3, 1, 5, 1], [10, 3, 1, 5, 1]],
        stoneBladeSpear: [[2, 8, 7, 2, 0], [8, 5, 2, 4, 1], [9, 3, 2, 3, 2]],
        bambooPike: [[2, 8, 8, 1, 0], [2, 6, 8, 1, 2], [9, 4, 2, 4, 1]],
        boneSpikedClub: [[2, 6, 8, 3, 0], [5, 4, 1, 2, 2], [7, 3, 1, 3, 2], [9, 5, 1, 2, 2]],
        vineStoneHammer: [[2, 7, 7, 2, 0], [8, 4, 3, 5, 1], [7, 5, 5, 1, 2], [7, 8, 5, 1, 2]],
        resinHammer: [[2, 7, 7, 2, 0], [8, 4, 3, 5, 1], [9, 5, 2, 3, 2], [7, 6, 5, 1, 2]],
        shieldClub: [[2, 7, 8, 2, 0], [3, 3, 4, 5, 1], [4, 4, 2, 3, 2]],
        twinStoneDagger: [[4, 1, 1, 5, 1], [3, 6, 2, 2, 0], [8, 3, 1, 5, 1], [7, 8, 2, 2, 0]],
        bambooThrowingKnife: [[3, 2, 2, 7, 1], [5, 4, 1, 3, 2], [7, 3, 2, 6, 1], [9, 5, 1, 2, 2]],
        torchClub: [[4, 5, 2, 6, 0], [4, 2, 4, 3, 1], [5, 0, 2, 3, 2]],
        toxicKnife: [[5, 1, 2, 7, 1], [4, 8, 4, 2, 0], [6, 3, 1, 4, 2]],
        beeNeedleSpear: [[2, 8, 8, 1, 0], [9, 4, 1, 5, 1], [8, 5, 3, 1, 2], [8, 7, 3, 1, 2]],
        antlerFork: [[2, 8, 7, 2, 0], [8, 4, 1, 5, 1], [6, 3, 2, 3, 2], [9, 3, 2, 3, 2], [8, 2, 1, 2, 2]],
        sling: [[3, 2, 2, 7, 0], [7, 2, 2, 7, 0], [4, 8, 4, 2, 1], [5, 6, 2, 2, 2]],
        bambooCrossbow: [[2, 6, 8, 2, 0], [5, 3, 2, 7, 1], [2, 3, 8, 1, 2], [1, 5, 10, 1, 2]],
        ropeSickle: [[2, 7, 2, 2, 0], [4, 6, 2, 1, 2], [6, 7, 2, 1, 2], [8, 5, 2, 1, 2], [9, 3, 2, 3, 1]],
        nailClub: [[2, 6, 8, 3, 0], [5, 4, 1, 2, 1], [8, 3, 1, 3, 1], [9, 7, 1, 2, 1]],
        frogWhip: [[2, 7, 2, 2, 0], [4, 5, 2, 2, 1], [6, 6, 2, 2, 1], [8, 4, 2, 2, 1], [10, 3, 1, 2, 2]],
        scorpionHook: [[2, 7, 7, 2, 0], [8, 4, 2, 4, 1], [10, 3, 1, 3, 2]],
        shadowWoodBlade: [[5, 1, 2, 8, 1], [4, 8, 4, 2, 0], [7, 3, 2, 5, 2], [3, 4, 2, 2, 2]],
    };
    return details[key] || null;
}

function basePixelIconRects(type) {
    if (['sword', 'blade'].includes(type)) return [[4, 0, 1, 1, 2], [4, 1, 1, 1, 1], [3, 2, 2, 1, 1], [3, 3, 1, 2, 1], [2, 5, 3, 1, 0], [1, 6, 2, 1, 0]];
    if (['dagger'].includes(type)) return [[4, 1, 1, 1, 2], [4, 2, 1, 2, 1], [3, 4, 2, 1, 0], [3, 5, 1, 2, 0]];
    if (['sickle'].includes(type)) return [[3, 0, 1, 8, 0], [4, 0, 3, 1, 1], [5, 1, 2, 1, 1], [6, 2, 1, 1, 2], [2, 5, 1, 2, 0]];
    if (['spear'].includes(type)) return [[5, 0, 1, 1, 2], [4, 1, 2, 1, 1], [4, 2, 1, 2, 1], [3, 4, 1, 2, 0], [2, 6, 1, 2, 0]];
    if (['axe'].includes(type)) return [[3, 0, 1, 8, 0], [4, 0, 3, 1, 1], [4, 1, 4, 2, 1], [5, 3, 2, 1, 2], [2, 5, 1, 2, 0]];
    if (['pickaxe'].includes(type)) return [[3, 0, 1, 8, 0], [1, 1, 6, 1, 1], [0, 2, 2, 1, 2], [6, 2, 2, 1, 2], [2, 5, 1, 2, 0]];
    if (['armor'].includes(type)) return [[2, 0, 4, 1, 1], [1, 1, 6, 2, 0], [0, 3, 8, 3, 0], [2, 6, 4, 2, 2], [3, 2, 2, 3, 1]];
    if (['shield'].includes(type)) return [[2, 0, 4, 1, 2], [1, 1, 6, 4, 0], [2, 5, 4, 2, 1], [3, 2, 2, 3, 2]];
    if (['potion', 'salve', 'antidote', 'speed'].includes(type)) return [[3, 0, 2, 1, 2], [2, 1, 4, 1, 0], [1, 2, 6, 5, 1], [2, 3, 4, 2, 2], [2, 6, 4, 1, 0]];
    if (['bandage'].includes(type)) return [[1, 2, 6, 3, 1], [2, 1, 4, 1, 2], [2, 5, 4, 1, 2], [1, 4, 1, 1, 0], [6, 2, 1, 1, 0], [3, 3, 2, 1, 2]];
    if (['torch'].includes(type)) return [[3, 0, 2, 1, 2], [2, 1, 4, 2, 1], [3, 3, 2, 2, 0], [4, 5, 1, 3, 0]];
    if (['bomb'].includes(type)) return [[3, 0, 2, 1, 2], [1, 2, 6, 5, 0], [2, 1, 4, 1, 1], [4, 3, 2, 2, 2]];
    if (['key'].includes(type)) return [[1, 2, 3, 3, 1], [4, 3, 4, 1, 1], [6, 4, 1, 2, 2], [7, 4, 1, 1, 2], [2, 3, 1, 1, 2]];
    if (['meat', 'hide', 'bedroll'].includes(type)) return [[1, 2, 5, 3, 0], [2, 1, 4, 1, 1], [4, 4, 3, 1, 2], [2, 5, 3, 1, 1]];
    if (['fang'].includes(type)) return [[3, 0, 2, 1, 2], [3, 1, 2, 3, 1], [4, 4, 1, 3, 1], [3, 2, 1, 2, 2]];
    if (['shadow'].includes(type)) return [[3, 0, 2, 2, 2], [2, 2, 4, 3, 1], [1, 4, 6, 2, 0], [3, 6, 2, 2, 1], [4, 3, 1, 1, 2]];
    if (['toxicMushroom'].includes(type)) return [[3, 0, 2, 1, 2], [1, 1, 6, 3, 1], [2, 4, 4, 1, 2], [3, 5, 2, 3, 0], [5, 2, 1, 1, 2]];
    if (['fence', 'trap'].includes(type)) return [[0, 2, 8, 1, 1], [0, 5, 8, 1, 1], [2, 0, 1, 8, 0], [5, 0, 1, 8, 0], [3, 3, 2, 1, 2]];
    if (['flag'].includes(type)) return [[2, 0, 1, 8, 0], [3, 0, 4, 3, 1], [3, 3, 2, 1, 2], [1, 7, 3, 1, 0]];
    if (['wood', 'bamboo', 'stone', 'ore', 'coal', 'crystal', 'mud'].includes(type)) return [[1, 2, 6, 3, 0], [2, 1, 4, 1, 1], [4, 4, 3, 1, 2], [1, 5, 4, 1, 0], [3, 3, 2, 1, 1]];
    return [[2, 0, 4, 1, 2], [1, 1, 6, 4, 1], [2, 5, 4, 2, 0], [3, 2, 2, 2, 2]];
}

function drawPixelItemIcon(target, key, x, y, size = 28) {
    const colors = itemIconColors(key);
    const unit = size / ITEM_ICON_GRID;
    target.save();
    target.imageSmoothingEnabled = false;
    for (const rect of pixelIconRects(key)) {
        target.fillStyle = colors[rect[4] || 0];
        target.fillRect(x - size / 2 + rect[0] * unit, y - size / 2 + rect[1] * unit, rect[2] * unit, rect[3] * unit);
    }
    target.restore();
}

function render(now) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    if (state.indoor) {
        drawIndoor(now);
        drawParticles();
        drawFloatTexts();
        drawUiOverlay();
        return;
    }
    drawTerrain();
    drawWorldObjects(now);
    drawTerrainForeground();
    drawParticles();
    drawFloatTexts();
    drawEffects(now);
    drawNightOverlay();
    drawUiOverlay();
}

function worldX(x) { return Math.round(x - camera.x); }
function worldY(y) { return Math.round(y - camera.y); }

function drawIndoor(now) {
    const cultInterior = state.indoor?.building?.village?.tier === 'jungleCult';
    ctx.fillStyle = cultInterior ? '#10170e' : '#18110c';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = cultInterior ? '#3a2a19' : '#5a3a1f';
    ctx.fillRect(196, 132, VIEW.width - 392, VIEW.height - 270);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(214, 150, VIEW.width - 428, VIEW.height - 306);
    ctx.fillStyle = cultInterior ? 'rgba(140, 255, 102, 0.07)' : 'rgba(214, 160, 106, 0.08)';
    for (let x = 220; x < VIEW.width - 220; x += 32) {
        for (let y = 156; y < VIEW.height - 168; y += 32) {
            if ((x + y) % 96 === 0) ctx.fillRect(x + 5, y + 5, 11, 3);
        }
    }
    for (let y = 144; y < VIEW.height - 140; y += 32) {
        ctx.fillStyle = y % 64 ? '#6b4a2f' : '#5a341d';
        ctx.fillRect(206, y, VIEW.width - 412, 4);
    }
    for (let x = 224; x < VIEW.width - 224; x += 64) {
        ctx.fillStyle = 'rgba(214, 160, 106, 0.1)';
        ctx.fillRect(x, 158, 4, VIEW.height - 340);
    }
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(196, 132, VIEW.width - 392, 28);
    ctx.fillRect(196, 132, 28, VIEW.height - 270);
    ctx.fillRect(VIEW.width - 224, 132, 28, VIEW.height - 270);
    ctx.fillRect(196, VIEW.height - 138, VIEW.width - 392, 28);
    ctx.fillStyle = 'rgba(122, 96, 64, 0.42)';
    ctx.fillRect(222, 140, VIEW.width - 444, 6);
    ctx.fillRect(204, 166, 6, VIEW.height - 368);
    ctx.fillRect(VIEW.width - 210, 166, 6, VIEW.height - 368);
    if (cultInterior) drawCultBookhouseDecor();
    state.indoor.objects
        .slice()
        .sort((a, b) => a.y - b.y)
        .forEach(drawIndoorObject);
    drawIndoorPlayer(now);
    drawIndoorProjectiles();
    drawIndoorLighting(now);
    drawItemUseProgress();
    drawIndoorObjectLabels();
    const target = nearestIndoorObject();
    if (target) {
        ctx.fillStyle = 'rgba(8, 14, 21, 0.78)';
        ctx.fillRect(VIEW.width / 2 - 190, VIEW.height - 40, 380, 28);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        const suffix = target.action === 'steal' ? ' / 打开箱子' : '';
        ctx.fillText(`按 E 互动：${target.label}${suffix}`, VIEW.width / 2, VIEW.height - 21);
        ctx.textAlign = 'left';
    }
}

function drawIndoorProjectiles() {
    for (const projectile of state.indoorProjectiles || []) {
        if (!projectile.indoor) continue;
        const markerColor = projectile.profile?.color || (projectile.kind === 'poisonBottle' ? '#8cff66' : (projectile.kind === 'elderSpell' ? '#b77dff' : '#d8e5f2'));
        drawIndoorProjectileTarget(projectile, markerColor);
    if (['poisonBottle', 'slowBottle', 'blindBottle'].includes(projectile.kind)) {
            drawShadow(projectile.x, projectile.y + 14, 15, 4);
            ctx.fillStyle = projectile.profile?.effect === 'slow' ? '#2d4b6b' : (projectile.profile?.effect === 'dizzy' ? '#5d2ea6' : '#2f7f45');
            ctx.fillRect(projectile.x - 6, projectile.y - 8, 12, 16);
            ctx.fillStyle = projectile.profile?.color || '#8cff66';
            ctx.fillRect(projectile.x - 4, projectile.y - 5, 8, 9);
            ctx.fillStyle = '#d94bff';
            ctx.fillRect(projectile.x - 3, projectile.y - 12, 6, 5);
            ctx.fillStyle = 'rgba(140,255,102,0.32)';
            ctx.fillRect(projectile.x - 10, projectile.y + 7, 20, 3);
        } else if (projectile.kind === 'kitchenKnife' || projectile.kind === 'guardArrow' || isDirectProjectile(projectile.kind)) {
            drawShadow(projectile.x, projectile.y + 10, 24, 4);
            ctx.save();
            ctx.translate(projectile.x, projectile.y);
            const angle = (projectile.kind === 'guardArrow' || isDirectProjectile(projectile.kind))
                ? Math.atan2(projectile.targetY - projectile.startY, projectile.targetX - projectile.startX)
                : (performance.now() - projectile.startedAt) * 0.03;
            ctx.rotate(angle);
            ctx.fillStyle = projectile.kind === 'poisonArrow' ? '#8cff66' : '#d8e5f2';
            ctx.fillRect(projectile.kind === 'slingshotPebble' ? -4 : -12, -3, projectile.kind === 'slingshotPebble' ? 8 : 22, 6);
            if (projectile.kind !== 'slingshotPebble') {
                ctx.fillStyle = '#5a341d';
                ctx.fillRect((projectile.kind === 'guardArrow' || isDirectProjectile(projectile.kind)) ? -16 : 8, -2, 10, 4);
            }
            ctx.restore();
        } else if (projectile.kind === 'elderSpell' || projectile.kind === 'elderRoot' || projectile.kind === 'totemBolt') {
            ctx.fillStyle = projectile.profile?.color || '#b77dff';
            ctx.fillRect(projectile.x - 8, projectile.y - 8, 16, 16);
            ctx.fillStyle = projectile.kind === 'totemBolt' ? 'rgba(255,209,102,0.35)' : 'rgba(183,125,255,0.35)';
            ctx.fillRect(projectile.x - 14, projectile.y - 2, 28, 4);
        }
    }
}

function drawOutdoorVillagerProjectile(projectile) {
    const screenProjectile = {
        ...projectile,
        x: worldX(projectile.x),
        y: worldY(projectile.y),
        targetX: worldX(projectile.targetX),
        targetY: worldY(projectile.targetY),
    };
    const markerColor = projectile.profile?.color || '#d8e5f2';
    drawIndoorProjectileTarget(screenProjectile, markerColor);
    if (projectile.kind === 'kitchenKnife' || projectile.kind === 'guardArrow') {
        drawShadow(screenProjectile.x, screenProjectile.y + 10, 24, 4);
        ctx.save();
        ctx.translate(screenProjectile.x, screenProjectile.y);
        const angle = projectile.kind === 'guardArrow'
            ? Math.atan2(projectile.targetY - projectile.startY, projectile.targetX - projectile.startX)
            : (performance.now() - projectile.startedAt) * 0.03;
        ctx.rotate(angle);
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(-12, -3, 22, 6);
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(projectile.kind === 'guardArrow' ? -16 : 8, -2, 10, 4);
        ctx.restore();
        return;
    }
    if (['poisonBottle', 'slowBottle', 'blindBottle'].includes(projectile.kind)) {
        drawShadow(screenProjectile.x, screenProjectile.y + 14, 15, 4);
        ctx.fillStyle = projectile.profile?.effect === 'slow' ? '#2d4b6b' : (projectile.profile?.effect === 'dizzy' ? '#5d2ea6' : '#2f7f45');
        ctx.fillRect(screenProjectile.x - 6, screenProjectile.y - 8, 12, 16);
        ctx.fillStyle = projectile.profile?.color || '#8cff66';
        ctx.fillRect(screenProjectile.x - 4, screenProjectile.y - 5, 8, 9);
        ctx.fillStyle = '#d94bff';
        ctx.fillRect(screenProjectile.x - 3, screenProjectile.y - 12, 6, 5);
        return;
    }
    ctx.fillStyle = projectile.profile?.color || '#b77dff';
    ctx.fillRect(screenProjectile.x - 8, screenProjectile.y - 8, 16, 16);
    ctx.fillStyle = projectile.kind === 'totemBolt' ? 'rgba(255,209,102,0.35)' : 'rgba(183,125,255,0.35)';
    ctx.fillRect(screenProjectile.x - 14, screenProjectile.y - 2, 28, 4);
}

function drawIndoorProjectileTarget(projectile, color) {
    const radius = projectile.splashRadius || 24;
    const pulse = 0.72 + Math.sin(performance.now() / 90) * 0.12;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color === '#8cff66' ? 'rgba(140,255,102,0.14)' : (color === '#b77dff' ? 'rgba(183,125,255,0.12)' : 'rgba(216,229,242,0.12)');
    ctx.lineWidth = 2;
    if (projectile.profile?.effect) {
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(projectile.targetX, projectile.targetY + 18, radius * 1.18, radius * 0.52, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.ellipse(projectile.targetX, projectile.targetY + 18, radius * pulse, radius * 0.42 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(projectile.targetX - 8, projectile.targetY + 18);
    ctx.lineTo(projectile.targetX + 8, projectile.targetY + 18);
    ctx.moveTo(projectile.targetX, projectile.targetY + 10);
    ctx.lineTo(projectile.targetX, projectile.targetY + 26);
    ctx.stroke();
    ctx.restore();
}

function drawIndoorLighting(now) {
    lightCtx.clearRect(0, 0, VIEW.width, VIEW.height);
    lightCtx.globalCompositeOperation = 'source-over';
    lightCtx.fillStyle = 'rgba(10, 6, 3, 0.24)';
    lightCtx.fillRect(0, 0, VIEW.width, VIEW.height);
    const doorGlow = lightCtx.createRadialGradient(VIEW.width / 2, VIEW.height - 120, 14, VIEW.width / 2, VIEW.height - 120, 170);
    doorGlow.addColorStop(0, 'rgba(255, 214, 132, 0.22)');
    doorGlow.addColorStop(0.58, 'rgba(255, 214, 132, 0.08)');
    doorGlow.addColorStop(1, 'rgba(255, 214, 132, 0)');
    lightCtx.fillStyle = doorGlow;
    lightCtx.fillRect(VIEW.width / 2 - 190, VIEW.height - 290, 380, 260);

    lightCtx.globalCompositeOperation = 'destination-out';
    const lights = [
        { x: state.player.x, y: state.player.y, radius: 92, strength: 0.42 },
        { x: VIEW.width / 2, y: VIEW.height - 90, radius: 150, strength: 0.46 },
        ...state.indoor.objects
            .filter(object => ['forge', 'hearth', 'campfire', 'cookPot', 'potionTable', 'readingDesk', 'bookshelf'].includes(object.kind))
            .map(object => ({
                x: object.x,
                y: object.y,
                radius: ['potionTable', 'readingDesk', 'bookshelf'].includes(object.kind) ? 90 : 120,
                strength: ['potionTable', 'readingDesk', 'bookshelf'].includes(object.kind) ? 0.26 : 0.52,
            })),
    ];
    lights.forEach(light => {
        const pulse = 1 + Math.sin(now / 260 + light.x * 0.03) * 0.035;
        const radius = light.radius * pulse;
        const gradient = lightCtx.createRadialGradient(light.x, light.y, 8, light.x, light.y, radius);
        gradient.addColorStop(0, `rgba(255,255,255,${light.strength})`);
        gradient.addColorStop(0.48, `rgba(255,255,255,${light.strength * 0.42})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        lightCtx.fillStyle = gradient;
        lightCtx.beginPath();
        lightCtx.arc(light.x, light.y, radius, 0, Math.PI * 2);
        lightCtx.fill();
    });
    lightCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCanvas, 0, 0);
}

function drawIndoorObjectLabels() {
    const target = nearestIndoorObject();
    if (!target) return;
    ctx.fillStyle = 'rgba(255, 209, 102, 0.18)';
    ctx.fillRect(target.x - target.w / 2 - 4, target.y - target.h / 2 - 4, target.w + 8, target.h + 8);
}

function drawIndoorCozyDecor() {
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(184, 142, 46, 12);
    ctx.fillRect(640, 142, 150, 12);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(198, 136, 8, 8);
    ctx.fillRect(744, 136, 8, 8);
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(190, 452, 86, 18);
    ctx.fillStyle = '#d49a5a';
    ctx.fillRect(202, 446, 18, 8);
    ctx.fillRect(232, 444, 18, 10);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.12)';
    ctx.fillRect(402, 142, 156, 20);
}

function drawCultBookhouseDecor() {
    ctx.fillStyle = 'rgba(31, 107, 63, 0.34)';
    for (let x = 232; x < VIEW.width - 230; x += 82) {
        ctx.fillRect(x, 154, 8, VIEW.height - 328);
        ctx.fillRect(x + 22, 170, 6, 96);
    }
    ctx.fillStyle = '#123d2b';
    ctx.fillRect(232, 166, 132, 10);
    ctx.fillRect(536, 166, 168, 10);
    ctx.fillStyle = '#8cff66';
    ctx.fillRect(288, 158, 10, 10);
    ctx.fillRect(620, 158, 10, 10);
    ctx.fillStyle = 'rgba(140,255,102,0.12)';
    ctx.fillRect(258, 185, 88, 8);
    ctx.fillRect(558, 185, 126, 8);
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(322, 438, 96, 18);
    ctx.fillRect(448, 440, 72, 14);
    ctx.fillStyle = '#d6a06a';
    ctx.fillRect(338, 430, 24, 8);
    ctx.fillRect(372, 428, 18, 10);
    ctx.fillStyle = '#9cffb7';
    ctx.fillRect(468, 432, 28, 5);
}

function drawWallModuleFrame(object) {
    const left = object.x - object.w / 2;
    const top = object.y - object.h / 2;
    ctx.fillStyle = '#3f2a1c';
    ctx.fillRect(left, top, object.w, object.h);
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(left + 1, top + 1, object.w - 2, object.h - 2);
    ctx.fillStyle = '#7a4f2d';
    ctx.fillRect(left + 4, top + 6, object.w - 8, 8);
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(left + 4, top + object.h - 10, object.w - 8, 7);
    ctx.fillStyle = 'rgba(255, 214, 132, 0.1)';
    ctx.fillRect(left + 8, top + 18, object.w - 16, 4);
    ctx.strokeStyle = 'rgba(31, 20, 12, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, object.w, object.h);
}

function wallModuleItemCount(object, key, fallback) {
    if (object.storage && Object.prototype.hasOwnProperty.call(object.storage, key)) return object.storage[key] || 0;
    return object.taken ? 0 : fallback;
}

function visibleStorageKeys(object, preferredKeys) {
    const storage = object.storage || {};
    const preferred = preferredKeys.filter(key => (storage[key] || 0) > 0);
    const extra = Object.keys(storage).filter(key => (storage[key] || 0) > 0 && !preferred.includes(key));
    return [...preferred, ...extra];
}

function expandedStorageIconKeys(object, preferredKeys, limit) {
    const storage = object.storage || {};
    const ordered = visibleStorageKeys(object, preferredKeys);
    const remaining = ordered.map(key => ({ key, amount: Math.max(0, Math.ceil(storage[key] || 0)) })).filter(item => item.amount > 0);
    const icons = [];
    while (icons.length < limit && remaining.some(item => item.amount > 0)) {
        for (const item of remaining) {
            if (item.amount <= 0) continue;
            icons.push(item.key);
            item.amount--;
            if (icons.length >= limit) break;
        }
    }
    return icons;
}

function drawMiniSupplyIcon(key, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (key === 'stoneSpear') {
        ctx.strokeStyle = '#7a4a27';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-18, 18);
        ctx.lineTo(15, -17);
        ctx.stroke();
        ctx.fillStyle = '#a8b3bd';
        ctx.beginPath();
        ctx.moveTo(15, -17);
        ctx.lineTo(26, -25);
        ctx.lineTo(22, -10);
        ctx.closePath();
        ctx.fill();
    } else if (key === 'simpleArrow') {
        ctx.strokeStyle = '#d8e5f2';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(-18, 8 + i * 5);
            ctx.lineTo(18, -8 + i * 5);
            ctx.stroke();
            ctx.fillStyle = '#5a341d';
            ctx.fillRect(-21, 5 + i * 5, 7, 5);
            ctx.fillStyle = '#c5d6df';
            ctx.beginPath();
            ctx.moveTo(18, -8 + i * 5);
            ctx.lineTo(25, -11 + i * 5);
            ctx.lineTo(22, -4 + i * 5);
            ctx.closePath();
            ctx.fill();
        }
    } else if (key === 'sinewBow') {
        ctx.strokeStyle = '#8a5a32';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 22, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.strokeStyle = '#e8ddc6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(0, 22);
        ctx.stroke();
    } else if (key === 'bandage') {
        ctx.fillStyle = '#f5ead8';
        ctx.fillRect(-18, -10, 36, 20);
        ctx.fillStyle = '#d94b5f';
        ctx.fillRect(-4, -10, 8, 20);
        ctx.fillRect(-18, -4, 36, 8);
        ctx.strokeStyle = '#cdbfa8';
        ctx.lineWidth = 2;
        ctx.strokeRect(-18, -10, 36, 20);
    } else if (key === 'ironSkinPotion') {
        ctx.fillStyle = '#66737f';
        ctx.fillRect(-10, -14, 20, 28);
        ctx.fillStyle = '#c5d6df';
        ctx.fillRect(-6, -21, 12, 8);
        ctx.fillStyle = '#8fb8ff';
        ctx.fillRect(-7, -5, 14, 14);
        ctx.fillStyle = 'rgba(248,251,255,0.75)';
        ctx.fillRect(-5, -11, 4, 8);
    } else {
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(-12, -12, 24, 24);
    }
    ctx.restore();
}

function drawMiniShopIcon(key, x, y, scale = 1) {
    if (['stoneSpear', 'simpleArrow', 'bandage'].includes(key)) {
        drawMiniSupplyIcon(key, x, y, scale);
        return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (key === 'copperCoin') {
        ctx.fillStyle = '#b87333';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-3, -6, 6, 12);
    } else if (key === 'berry') {
        ctx.fillStyle = '#d94b5f';
        ctx.fillRect(-10, -4, 9, 9);
        ctx.fillRect(1, -8, 9, 9);
        ctx.fillStyle = '#69e08e';
        ctx.fillRect(-2, -13, 7, 5);
    } else if (key === 'torch') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(-3, -14, 6, 26);
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(-7, -22, 14, 12);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-3, -25, 6, 8);
    } else if (key === 'potion') {
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(-8, -10, 16, 21);
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(-5, -17, 10, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(-5, -5, 4, 9);
    } else {
        drawPixelItemIcon(ctx, key, 0, 0, 22);
    }
    ctx.restore();
}

function drawStoredItemIcons(object, slots, preferredKeys = []) {
    const keys = expandedStorageIconKeys(object, preferredKeys, slots.length);
    if (!keys.length) {
        ctx.fillStyle = 'rgba(0,0,0,0.24)';
        for (const [sx, sy] of slots) ctx.fillRect(sx - 12, sy - 7, 24, 14);
        return;
    }
    keys.slice(0, slots.length).forEach((key, index) => drawMiniShopIcon(key, slots[index][0], slots[index][1], 0.72));
}

function drawBookShelfContents(object, left, top, width, height) {
    const slots = [
        [left + width * 0.22, top + height * 0.34],
        [left + width * 0.42, top + height * 0.32],
        [left + width * 0.62, top + height * 0.35],
        [left + width * 0.30, top + height * 0.68],
        [left + width * 0.52, top + height * 0.66],
        [left + width * 0.72, top + height * 0.68],
        [left + width * 0.82, top + height * 0.34],
        [left + width * 0.16, top + height * 0.68],
    ];
    const keys = expandedStorageIconKeys(object, ['jungleLeaf', 'vine', 'toxicMushroom', 'fang', 'venom', 'buttressWood', 'herb'], slots.length);
    if (!keys.length) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        slots.forEach(([sx, sy]) => ctx.fillRect(sx - 12, sy - 7, 24, 14));
        return;
    }
    keys.slice(0, slots.length).forEach((key, index) => {
        const [sx, sy] = slots[index];
        if (['jungleLeaf', 'vine', 'buttressWood'].includes(key)) {
            ctx.fillStyle = key === 'vine' ? '#5fae49' : (key === 'jungleLeaf' ? '#8cff66' : '#8a5a32');
            ctx.fillRect(sx - 7, sy - 17, 14, 27);
            ctx.fillStyle = '#d6a06a';
            ctx.fillRect(sx - 5, sy - 14, 10, 3);
            ctx.fillRect(sx - 5, sy + 3, 10, 3);
        } else {
            drawMiniShopIcon(key, sx, sy, 0.66);
        }
    });
}

function drawPoisonShelfContents(object, left, top, width, height) {
    const slots = [
        [left + width * 0.16, top + height * 0.34], [left + width * 0.34, top + height * 0.31],
        [left + width * 0.52, top + height * 0.35], [left + width * 0.70, top + height * 0.32],
        [left + width * 0.86, top + height * 0.36], [left + width * 0.20, top + height * 0.68],
        [left + width * 0.40, top + height * 0.66], [left + width * 0.60, top + height * 0.69],
        [left + width * 0.80, top + height * 0.66],
    ];
    const keys = expandedStorageIconKeys(object, ['poisonVial', 'venom', 'toxicMushroom', 'herb', 'jungleLeaf', 'vine', 'antidote', 'fang'], slots.length);
    if (!keys.length) {
        ctx.fillStyle = 'rgba(0,0,0,0.24)';
        slots.forEach(([sx, sy]) => ctx.fillRect(sx - 10, sy - 7, 20, 14));
        return;
    }
    keys.forEach((key, index) => {
        const [sx, sy] = slots[index];
        if (['poisonVial', 'venom', 'antidote'].includes(key)) {
            const color = key === 'poisonVial' ? '#8cff66' : (key === 'venom' ? '#d5ffd8' : '#7dcbe8');
            ctx.fillStyle = '#2d2117';
            ctx.fillRect(sx - 7, sy - 15, 14, 23);
            ctx.fillStyle = color;
            ctx.fillRect(sx - 5, sy - 9, 10, 14);
            ctx.fillStyle = '#f8fbff';
            ctx.fillRect(sx - 4, sy - 17, 8, 5);
        } else {
            drawMiniShopIcon(key, sx, sy, 0.6);
        }
    });
}

function drawWallModuleObject(object) {
    const x = object.x;
    const y = object.y;
    const left = x - object.w / 2;
    const top = y - object.h / 2;
    const bottom = y + object.h / 2;
    drawWallModuleFrame(object);
    if (object.kind === 'forge' || object.kind === 'hearth') {
        ctx.fillStyle = object.kind === 'forge' ? '#2f3945' : '#4a2b17';
        ctx.fillRect(left + 10, top + 14, object.w - 20, object.h - 25);
        ctx.fillStyle = '#66737f';
        for (let yy = top + 20; yy < bottom - 18; yy += 13) ctx.fillRect(left + 16, yy, object.w - 32, 5);
        ctx.fillStyle = '#171d24';
        ctx.fillRect(x - 24, y - 11, 48, 32);
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(x - 16, y - 3, 32, 19);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 7, y - 8, 14, 10);
        if (object.kind === 'hearth') {
            ctx.fillStyle = '#d68a43';
            ctx.fillRect(x - 30, bottom - 22, 60, 8);
        }
    } else if (object.kind === 'potionTable') {
        ctx.fillStyle = '#3a2454';
        ctx.fillRect(left + 10, bottom - 32, object.w - 20, 18);
        ctx.fillStyle = '#7dcbe8';
        ctx.fillRect(x - 31, y - 22, 13, 35);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x - 7, y - 14, 17, 27);
        ctx.fillStyle = '#d94bff';
        ctx.fillRect(x + 19, y - 5, 12, 18);
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(x - 28, y - 28, 7, 5);
        ctx.fillRect(x - 2, y - 20, 7, 5);
        ctx.fillRect(x + 22, y - 11, 6, 4);
    } else if (object.kind === 'readingDesk') {
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(left + 12, bottom - 36, object.w - 24, 18);
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(left + 18, bottom - 48, object.w - 36, 13);
        ctx.fillStyle = '#d6a06a';
        ctx.fillRect(x - 24, y - 18, 22, 8);
        ctx.fillRect(x + 2, y - 20, 24, 8);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x - 2, y - 30, 4, 28);
        ctx.fillStyle = 'rgba(140,255,102,0.32)';
        ctx.fillRect(x - 32, y - 6, 64, 4);
    } else if (object.kind === 'bookshelf') {
        ctx.fillStyle = '#3a2417';
        ctx.fillRect(left + 8, top + 12, object.w - 16, object.h - 22);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(left + 10, top + 23, object.w - 20, 6);
        ctx.fillRect(left + 10, y + 2, object.w - 20, 6);
        ctx.fillRect(left + 10, bottom - 20, object.w - 20, 6);
        drawBookShelfContents(object, left + 8, top + 12, object.w - 16, object.h - 22);
    } else if (object.kind === 'jarShelf') {
        ctx.fillStyle = '#241729';
        ctx.fillRect(left + 8, top + 12, object.w - 16, object.h - 22);
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(left + 10, top + 23, object.w - 20, 6);
        ctx.fillRect(left + 10, y + 2, object.w - 20, 6);
        ctx.fillRect(left + 10, bottom - 20, object.w - 20, 6);
        ctx.fillStyle = 'rgba(140,255,102,0.18)';
        ctx.fillRect(left + 12, top + 14, object.w - 24, object.h - 28);
        drawPoisonShelfContents(object, left + 8, top + 12, object.w - 16, object.h - 22);
    } else if (object.kind === 'rack') {
        const keys = visibleStorageKeys(object, ['stoneSpear', 'simpleArrow', 'sinewBow']);
        const spearCount = wallModuleItemCount(object, 'stoneSpear', keys.length ? 0 : 0);
        const arrowCount = wallModuleItemCount(object, 'simpleArrow', keys.length ? 0 : 6);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(left + 9, top + 16, object.w - 18, 7);
        ctx.fillRect(left + 9, bottom - 22, object.w - 18, 7);
        for (let i = 0; i < Math.max(2, Math.min(4, spearCount)); i++) {
            const px = left + 18 + i * 30;
            drawMiniSupplyIcon('stoneSpear', px + 12, y + 2, 0.72);
        }
        for (let i = 0; i < 6; i++) {
            const px = left + 18 + i * 22;
            const visible = i < arrowCount;
            ctx.strokeStyle = visible ? (i % 2 ? '#d8e5f2' : '#a8b3bd') : 'rgba(0,0,0,0.22)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(px, bottom - 20);
            ctx.lineTo(px + 18, top + 24);
            ctx.stroke();
            ctx.fillStyle = visible ? '#5a341d' : 'rgba(0,0,0,0.18)';
            ctx.fillRect(px - 3, bottom - 26, 8, 9);
        }
        drawStoredItemIcons(object, [[left + 24, top + 42], [left + 54, top + 36], [left + 84, top + 43], [left + 114, top + 36], [left + 144, top + 43], [left + 68, bottom - 38], [left + 118, bottom - 38]], ['stoneSpear', 'simpleArrow', 'sinewBow', 'poisonArrow', 'bambooTrap', 'bandage', 'venom', 'vine', 'buttressWood']);
    } else if (object.kind === 'guardSupplies') {
        const keys = visibleStorageKeys(object, ['stoneSpear', 'sinewBow', 'simpleArrow', 'bandage', 'ironSkinPotion']);
        ctx.fillStyle = '#4a3320';
        ctx.fillRect(left + 8, top + 12, object.w - 16, object.h - 22);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(left + 12, top + 20, object.w - 24, 7);
        ctx.fillRect(left + 12, y + 2, object.w - 24, 7);
        ctx.fillRect(left + 12, bottom - 21, object.w - 24, 7);
        const slots = [
            [left + 34, top + 47],
            [left + 82, top + 45],
            [left + 130, top + 47],
            [left + 56, bottom - 40],
            [left + 108, bottom - 40],
        ];
        if (!keys.length) {
            ctx.fillStyle = 'rgba(0,0,0,0.26)';
            for (const [sx, sy] of slots) ctx.fillRect(sx - 18, sy - 10, 36, 16);
        } else {
            keys.slice(0, slots.length).forEach((key, index) => drawMiniSupplyIcon(key, slots[index][0], slots[index][1], 0.74));
        }
    } else if (object.kind === 'shopShelf') {
        const keys = visibleStorageKeys(object, ['copperCoin', 'berry', 'bandage', 'simpleArrow', 'torch', 'stoneSpear', 'potion']);
        ctx.fillStyle = '#6d4324';
        ctx.fillRect(left + 10, top + 14, object.w - 20, object.h - 24);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(left + 12, top + 24, object.w - 24, 6);
        ctx.fillRect(left + 12, y + 2, object.w - 24, 6);
        ctx.fillRect(left + 12, bottom - 20, object.w - 24, 6);
        const slots = [
            [left + 28, top + 45],
            [left + 58, top + 45],
            [left + 88, top + 45],
            [left + 34, bottom - 38],
            [left + 70, bottom - 38],
        ];
        keys.slice(0, slots.length).forEach((key, index) => drawMiniShopIcon(key, slots[index][0], slots[index][1], 0.82));
    } else if (object.kind === 'brokenShelf') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(left + 10, top + 24, object.w - 30, 6);
        ctx.fillRect(left + 28, bottom - 26, object.w - 38, 6);
        ctx.strokeStyle = '#3f2a1c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(left + 18, top + 20);
        ctx.lineTo(left + 42, bottom - 18);
        ctx.moveTo(left + object.w - 26, top + 18);
        ctx.lineTo(left + object.w - 44, bottom - 20);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(left + 46, y - 8, 36, 10);
    } else if (object.kind === 'herbRack' || object.kind === 'meatRack') {
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(left + 9, top + 15, object.w - 18, 7);
        ctx.fillRect(left + 9, bottom - 20, object.w - 18, 7);
        drawStoredItemIcons(object, [[left + 20, top + 42], [left + 46, top + 50], [left + 72, top + 42], [left + 98, top + 50], [left + 124, top + 42], [left + 150, top + 50], [left + 84, bottom - 38]], object.kind === 'herbRack' ? ['herb', 'toxicMushroom', 'potion'] : ['meat', 'roastMeat', 'stew']);
    } else if (object.kind === 'coalPile') {
        const count = wallModuleItemCount(object, 'coal', 5);
        ctx.fillStyle = '#171d24';
        ctx.fillRect(left + 13, top + 23, object.w - 26, object.h - 40);
        ctx.fillStyle = count > 0 ? '#121820' : '#3b3b32';
        ctx.fillRect(left + 18, bottom - 33, object.w - 36, 21);
        ctx.fillStyle = '#303946';
        for (let i = 0; i < 5; i++) {
            const px = left + 19 + (i % 3) * 18;
            const py = bottom - 36 + Math.floor(i / 3) * 11;
            ctx.fillStyle = i < count ? (i % 2 ? '#303946' : '#1a2028') : 'rgba(0,0,0,0.18)';
            ctx.fillRect(px, py, 15, 9);
        }
    } else if (object.kind === 'basket') {
        ctx.fillStyle = '#4a3320';
        ctx.fillRect(left + 12, top + 20, object.w - 24, object.h - 36);
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - 29, bottom - 44, 58, 30);
        ctx.strokeStyle = '#d49a5a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, bottom - 43, 23, Math.PI, Math.PI * 2);
        ctx.stroke();
        drawStoredItemIcons(object, [[x - 24, bottom - 44], [x - 12, bottom - 52], [x, bottom - 45], [x + 12, bottom - 52], [x + 24, bottom - 44]], ['herb', 'vine', 'jungleFruit', 'jungleLeaf', 'berry', 'fiber', 'fang']);
    } else if (object.kind === 'cookPot') {
        ctx.fillStyle = '#303946';
        ctx.fillRect(left + 13, top + 20, object.w - 26, object.h - 35);
        ctx.fillStyle = '#66737f';
        ctx.fillRect(x - 29, y - 9, 58, 10);
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - 24, y - 1, 48, 29);
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(x - 13, bottom - 25, 26, 7);
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(x - 9, y - 19, 18, 4);
    } else if (object.kind === 'workbenchModule') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(left + 10, bottom - 32, object.w - 20, 18);
        ctx.fillStyle = '#9a6436';
        ctx.fillRect(left + 14, bottom - 41, object.w - 28, 10);
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(x - 30, y - 16, 18, 8);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 3, y - 22, 9, 20);
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x + 18, y - 12, 20, 8);
    } else if (object.kind === 'trinketRack') {
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(left + 10, top + 18, object.w - 20, 7);
        ctx.fillRect(left + 10, bottom - 22, object.w - 20, 7);
        drawStoredItemIcons(object, [[left + 26, y - 8], [left + 54, y + 5], [left + 82, y - 8], [left + 110, y + 5], [left + 138, y - 8]], ['fiber', 'pebble', 'berry', 'flower', 'mushroom', 'wood', 'herb', 'simpleArrow', 'stone']);
    } else if (object.kind === 'map') {
        ctx.fillStyle = '#d6a06a';
        ctx.fillRect(left + 14, top + 14, object.w - 28, object.h - 28);
        ctx.strokeStyle = '#5a341d';
        ctx.strokeRect(left + 21, top + 21, object.w - 42, object.h - 42);
        ctx.strokeStyle = '#3f7f45';
        ctx.beginPath();
        ctx.moveTo(left + 30, y + 4);
        ctx.lineTo(x - 16, y - 7);
        ctx.lineTo(x + 8, y + 7);
        ctx.lineTo(left + object.w - 30, y - 8);
        ctx.stroke();
        ctx.fillStyle = '#d94b5f';
        ctx.fillRect(x + 18, y - 14, 8, 8);
    } else if (object.kind === 'flag') {
        const flagProfile = villageVisualProfile(state.indoor?.building?.village).flag;
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(left + 16, top + 10, 7, object.h - 20);
        ctx.fillRect(left + 16, top + 14, object.w - 32, 7);
        ctx.fillStyle = flagProfile.main;
        ctx.fillRect(left + 27, top + 26, object.w - 45, object.h - 39);
        ctx.fillStyle = flagProfile.trim;
        ctx.fillRect(left + 27, top + 26, object.w - 45, 16);
        ctx.fillStyle = flagProfile.dark;
        ctx.fillRect(left + 27, bottom - 23, object.w - 45, 10);
        ctx.fillStyle = flagProfile.trim;
        ctx.fillRect(x - 22, y - 8, 44, 6);
        ctx.fillRect(x - 5, y - 24, 10, 38);
        for (let dx = -40; dx <= 40; dx += 20) ctx.fillRect(x + dx, bottom - 14, 9, 7);
        ctx.fillStyle = flagProfile.emblem === 'patch' ? '#5a341d' : '#f8fbff';
        if (flagProfile.emblem === 'bar') {
            ctx.fillRect(x - 16, y - 14, 32, 6);
            ctx.fillRect(x - 4, y - 26, 8, 34);
        } else if (flagProfile.emblem === 'patch') {
            ctx.fillRect(x - 18, y - 16, 14, 12);
            ctx.fillRect(x + 6, y + 2, 12, 10);
        } else {
            ctx.fillRect(x - 14, y - 16, 8, 8);
            ctx.fillRect(x + 6, y - 16, 8, 8);
            ctx.fillRect(x - 14, y + 4, 8, 8);
            ctx.fillRect(x + 6, y + 4, 8, 8);
        }
    } else if (object.kind === 'chest') {
        const storage = object.storage || object.loot || {};
        const empty = Object.values(storage).every(amount => amount <= 0);
        ctx.fillStyle = empty ? '#3b2a1b' : '#6d4324';
        ctx.fillRect(left + 8, top + 15, object.w - 16, object.h - 28);
        ctx.fillStyle = empty ? '#4a3320' : '#9a6436';
        ctx.fillRect(left + 11, top + 20, object.w - 22, 24);
        ctx.fillRect(left + 11, bottom - 37, object.w - 22, 22);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(left + 15, top + 26, object.w - 30, 5);
        ctx.fillRect(x - 4, y + 4, 8, 11);
        if (object.opened && !empty) {
            ctx.fillStyle = '#d49a5a';
            ctx.fillRect(left + 12, top + 6, object.w - 24, 10);
        }
    }
}

function drawIndoorPlayer(now) {
    if (state.lose) {
        drawPlayerDeathAnimation(state.player.x, state.player.y, now, true);
        return;
    }
    drawShadow(state.player.x, state.player.y + 1, 34, 8);
    drawSpriteGrounded('player', state.player.x, state.player.y, 4);
    if (state.player.attackUntil > now) {
        drawAttackSlash(state.player.x, state.player.y, state.player.attackDir || state.player.facing, now);
    }
    drawPlayerHandsAndWeapon(state.player.x, state.player.y, state.player, now);
}

function drawPlayerDeathAnimation(x, y, now) {
    const startedAt = state.deathStartedAt || now;
    const progress = clamp((now - startedAt) / 1200, 0, 1);
    const fall = Math.sin(progress * Math.PI * 0.5);
    drawShadow(x, y + 2, 34 + fall * 18, 8 + fall * 4);
    ctx.save();
    ctx.translate(x, y - 18 + fall * 20);
    ctx.rotate((state.player.facing?.x || 1) >= 0 ? fall * Math.PI / 2 : -fall * Math.PI / 2);
    ctx.globalAlpha = 1 - progress * 0.18;
    drawSpriteGrounded('player', 0, 20, 4);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (progress > 0.35) {
        ctx.fillStyle = `rgba(255, 107, 107, ${0.22 * progress})`;
        ctx.fillRect(x - 18 - progress * 8, y + 8, 36 + progress * 16, 5);
    }
    if (progress < 0.95 && Math.random() < 0.2) {
        addParticle({
            x: state.player.x,
            y: state.player.y - 18,
            vx: (Math.random() - 0.5) * 24,
            vy: -10 - Math.random() * 18,
            color: '#ffb3b3',
            size: 2,
            life: 0.35,
        });
    }
}

function villagerAttackProgress(object) {
    if (!object.attackAnim) return 0;
    const progress = clamp((performance.now() - object.attackAnim.startedAt) / object.attackAnim.duration, 0, 1);
    if (progress >= 1) object.attackAnim = null;
    return Math.sin(progress * Math.PI);
}

function villagerVisualVillage(object) {
    return object.homeBuilding?.village || state.indoor?.building?.village || state.village;
}

function villagerClothingColors(object) {
    const village = villagerVisualVillage(object);
    const villageClothes = villageVisualProfile(village).clothing;
    const roleColors = {
        blacksmith: ['#5a341d', '#66737f'],
        apothecary: ['#355d3f', '#69e08e'],
        kitchen: ['#7a3f2a', '#ffd166'],
        guard: ['#303946', '#d8e5f2'],
        merchant: ['#6d4324', '#ffd166'],
        basicElder: ['#5a4632', '#d8e5f2'],
        elder: ['#3f2a1c', '#b77dff'],
        unemployed: ['#4a3a2a', '#d6a06a'],
        cultPriest: ['#123d2b', '#8cff66'],
        cultHerbalist: ['#1f6b3f', '#8cff66'],
        cultHealer: ['#244d2a', '#9cffb7'],
        cultHunter: ['#3a2417', '#ffd166'],
        cultGuard: ['#0f2d22', '#d8e5f2'],
        cultVillager: ['#173b24', '#9cffb7'],
    }[object.role] || ['#5a341d', '#d49a5a'];
    if (village?.tier === 'jungleCult') return roleColors;
    if (village?.tier === 'fortress') return [object.role === 'merchant' ? '#4b3b28' : villageClothes.body, object.role === 'elder' ? '#ffd166' : villageClothes.trim];
    if (village?.tier === 'basic') return [object.role === 'basicElder' ? '#5a4632' : villageClothes.body, object.role === 'basicElder' ? '#d8e5f2' : villageClothes.trim];
    return roleColors;
}

function drawVillageClothingAccent(object, x, y) {
    const village = villagerVisualVillage(object);
    const accent = villageVisualProfile(village).clothing.accent;
    if (village?.tier === 'fortress') {
        ctx.fillStyle = accent;
        ctx.fillRect(x - 13, y - 31, 26, 5);
        ctx.fillRect(x - 10, y - 17, 20, 4);
    } else if (village?.tier === 'jungleCult') {
        ctx.fillStyle = accent;
        ctx.fillRect(x - 13, y - 31, 26, 5);
        ctx.fillRect(x - 15, y - 14, 10, 7);
        ctx.fillRect(x + 5, y - 11, 10, 7);
        ctx.fillStyle = '#0f2d22';
        ctx.fillRect(x - 10, y - 43, 20, 10);
        ctx.fillStyle = '#d6a06a';
        ctx.fillRect(x - 13, y - 49, 26, 4);
        ctx.fillRect(x - 16, y - 37, 5, 12);
        ctx.fillRect(x + 11, y - 37, 5, 12);
        ctx.fillStyle = '#f1dfc3';
        ctx.fillRect(x - 5, y - 40, 3, 3);
        ctx.fillRect(x + 3, y - 40, 3, 3);
        if (object.role === 'cultPriest') {
            ctx.fillStyle = '#8cff66';
            ctx.fillRect(x - 4, y - 58, 8, 14);
            ctx.fillRect(x - 16, y - 52, 32, 4);
        } else if (object.role === 'cultHunter') {
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(x - 17, y - 48, 8, 4);
            ctx.fillRect(x + 9, y - 48, 8, 4);
        } else if (object.role === 'cultGuard') {
            ctx.fillStyle = '#6b3b1f';
            ctx.fillRect(x - 14, y - 27, 28, 27);
            ctx.fillStyle = '#8a5a32';
            ctx.fillRect(x - 11, y - 24, 7, 24);
            ctx.fillRect(x - 2, y - 25, 7, 25);
            ctx.fillRect(x + 7, y - 24, 7, 24);
            ctx.fillStyle = '#d8e5f2';
            ctx.fillRect(x - 15, y - 22, 30, 4);
            ctx.fillRect(x - 12, y - 9, 24, 4);
        }
    } else if (village?.tier === 'basic') {
        ctx.fillStyle = accent;
        ctx.fillRect(x - 11, y - 18, 8, 7);
        ctx.fillRect(x + 3, y - 10, 7, 6);
    } else {
        ctx.fillStyle = accent;
        ctx.fillRect(x - 10, y - 18, 20, 4);
    }
}

function drawCultVillagerCombatArt(object, x, y, attackProgress) {
    const side = object.facing === -1 ? -1 : 1;
    if (object.role === 'cultPriest') {
        ctx.fillStyle = 'rgba(140,255,102,0.42)';
        ctx.fillRect(x - 24, y - 66, 48, 6);
        ctx.fillRect(x - 4, y - 84, 8, 42);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x - 8, y - 76, 16, 10);
    } else if (object.role === 'cultHerbalist') {
        ctx.strokeStyle = '#5fae49';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + side * 8, y - 28);
        ctx.lineTo(x + side * (30 + attackProgress * 12), y - 58 + Math.sin(attackProgress * Math.PI) * 8);
        ctx.stroke();
    } else if (object.role === 'cultHunter') {
        ctx.fillStyle = 'rgba(140,255,102,0.32)';
        ctx.fillRect(x + side * (20 + attackProgress * 18), y - 38, 18, 4);
    } else if (object.role === 'cultGuard') {
        ctx.fillStyle = 'rgba(216,229,242,0.28)';
        ctx.fillRect(x + side * (18 + attackProgress * 12), y - 38, 24, 7);
    } else {
        ctx.fillStyle = 'rgba(156,255,183,0.28)';
        ctx.fillRect(x + side * (14 + attackProgress * 14), y - 35, 24, 5);
    }
}

function cultHeldWeaponMode(object) {
    if (object.attackAnim?.style === 'command') return 'vineStaff';
    if (object.attackAnim?.style === 'heal' || object.attackAnim?.style === 'root') return 'healerVine';
    if (object.attackAnim?.style === 'guardArrow' || object.attackAnim?.weapon?.includes('吹箭')) return 'blowpipe';
    if (object.attackAnim?.weapon?.includes('毒矛') || object.attackAnim?.style === 'thrust') return 'spear';
    if (object.attackAnim?.weapon?.includes('锤盾')) return 'rootHammer';
    if (object.attackAnim?.weapon?.includes('藤棍')) return 'vineClub';
    if (object.role === 'cultPriest') return 'ritualStaff';
    if (object.role === 'cultHerbalist') return 'vineStaff';
    if (object.role === 'cultHealer') return 'healerVine';
    if (object.role === 'cultHunter') return 'blowpipe';
    if (object.role === 'cultGuard') return 'rootHammer';
    if (object.role === 'cultVillager') return 'vineClub';
    return '';
}

function drawCultHeldWeapon(object, handX, handY, side, active, line) {
    const mode = cultHeldWeaponMode(object);
    if (!mode) return false;
    const reach = active * 12;
    if (mode === 'ritualStaff') {
        line(handX, handY + 10, handX + side * 8, handY - 36, '#5a341d', 4);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(handX + side * 6 - 5, handY - 42, 10, 12);
        ctx.fillStyle = '#d5ffd8';
        ctx.fillRect(handX + side * 8 - 2, handY - 38, 4, 4);
    } else if (mode === 'vineStaff') {
        line(handX, handY + 10, handX + side * (24 + reach), handY - 26 - active * 8, '#5fae49', 4);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(handX + side * (20 + reach) - 5, handY - 31 - active * 8, 10, 8);
    } else if (mode === 'healerVine') {
        line(handX, handY + 8, handX + side * (20 + reach), handY - 22 - active * 6, '#9cffb7', 4);
        ctx.fillStyle = '#d5ffd8';
        ctx.fillRect(handX + side * (16 + reach) - 4, handY - 28 - active * 6, 8, 8);
        ctx.fillStyle = '#5fae49';
        ctx.fillRect(handX + side * (23 + reach) - 3, handY - 19 - active * 6, 7, 5);
    } else if (mode === 'blowpipe') {
        line(handX - side * 4, handY - 2, handX + side * (35 + reach), handY - 12, '#5fae49', 4);
        ctx.fillStyle = '#d5ffd8';
        ctx.fillRect(handX + side * (33 + reach) - 3, handY - 15, 6, 6);
    } else if (mode === 'spear') {
        line(handX - side * 8, handY + 9, handX + side * (42 + reach), handY - 12, '#5fae49', 4);
        ctx.fillStyle = '#d8e5f2';
        ctx.beginPath();
        ctx.moveTo(handX + side * (47 + reach), handY - 14);
        ctx.lineTo(handX + side * (34 + reach), handY - 18);
        ctx.lineTo(handX + side * (37 + reach), handY - 6);
        ctx.closePath();
        ctx.fill();
    } else if (mode === 'rootHammer') {
        line(handX, handY + 8, handX + side * (30 + reach), handY - 13, '#8a5a32', 6);
        ctx.fillStyle = '#5fae49';
        ctx.fillRect(handX + side * (25 + reach) - 8, handY - 24, 18, 16);
        ctx.fillStyle = '#2d2117';
        ctx.fillRect(handX - side * 13 - 7, handY - 17, 14, 22);
    } else if (mode === 'vineClub') {
        line(handX, handY + 8, handX + side * (30 + reach), handY - 4, '#9cffb7', 4);
        ctx.fillStyle = '#5fae49';
        ctx.fillRect(handX + side * (20 + reach) - 3, handY - 10, 8, 6);
    }
    return true;
}

function drawVillagerHeldWeapon(object, x, y, attackProgress = 0) {
    if (object.hp <= 0 || object.kind === 'totem') return;
    const side = object.facing === -1 ? -1 : 1;
    const active = object.attackAnim ? attackProgress : 0;
    const handX = x + side * (14 + active * 8);
    const handY = y - 20 - active * 4;
    const line = (x1, y1, x2, y2, color, width = 4) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };
    if (object.role === 'blacksmith') {
        return;
    }
    if (object.role?.startsWith('cult') && drawCultHeldWeapon(object, handX, handY, side, active, line)) {
        return;
    }
    if (object.role === 'guard' || object.role === 'basicElder') {
        line(handX, handY + 8, handX + side * 30, handY - 8, '#d8e5f2', 4);
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(handX - 3, handY + 5, 6, 8);
    } else if (object.role === 'elder') {
        line(handX, handY + 12, handX + side * 12, handY - 30, '#5a341d', 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(handX + side * 8 - 4, handY - 34, 8, 8);
    } else if (object.role === 'apothecary') {
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(handX + side * 2 - 5, handY - 10, 10, 14);
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(handX + side * 2 - 4, handY - 13, 8, 3);
    } else if (object.role === 'kitchen') {
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(handX + side * 4 - 4, handY - 13, 16, 10);
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(handX - 4, handY - 3, 8, 5);
    } else if (object.role === 'merchant') {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(handX - 5, handY - 8, 10, 10);
        ctx.fillStyle = '#6d4324';
        ctx.fillRect(handX - 3, handY - 5, 6, 4);
    } else {
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(handX - 3, handY - 10, 6, 22);
    }
}

function drawIndoorNpc(object) {
    const x = object.x;
    const y = object.y;
    if ((object.hp ?? 80) <= 0) {
        drawShadow(x, y + 1, 34, 8);
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(x - 18, y - 20, 36, 12);
        ctx.fillStyle = '#d6a06a';
        ctx.fillRect(x + 10, y - 22, 14, 10);
        ctx.fillStyle = '#2d2117';
        ctx.fillRect(x + 14, y - 19, 7, 2);
        return;
    }
    drawShadow(x, y + 1, 30, 7);
    const colors = villagerClothingColors(object);
    const attackProgress = villagerAttackProgress(object);
    ctx.fillStyle = '#d6a06a';
    ctx.fillRect(x - 8, y - 42, 16, 16);
    ctx.fillStyle = colors[0];
    ctx.fillRect(x - 11, y - 27, 22, 26);
    ctx.fillStyle = colors[1];
    ctx.fillRect(x - 8, y - 24, 16, 6);
    drawVillageClothingAccent(object, x, y);
    ctx.fillStyle = '#2d2117';
    const face = object.facing === -1 ? -2 : 2;
    ctx.fillRect(x - 4 + face, y - 38, 3, 3);
    ctx.fillRect(x + 4 + face, y - 38, 3, 3);
    drawVillagerHealthBar(object, x, y);
    if (shouldDrawGenericHeldWeapon(object)) drawVillagerHeldWeapon(object, x, y, attackProgress);
    if (object.role?.startsWith('cult') && (object.mood === 'angry' || object.attackAnim)) {
        drawCultVillagerCombatArt(object, x, y, attackProgress);
    }
    if (object.role === 'merchant') {
        drawMerchantOutfit(object, x, y);
    } else if (object.role === 'basicElder') {
        drawBasicElderOutfit(object, x, y, attackProgress);
    } else if (object.role === 'blacksmith') {
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - 13, y - 31, 26, 5);
        if (!object.attackAnim || object.attackAnim.style === 'block') drawBlacksmithSheathedSword(x, y, object);
        if ((object.fatigue || 0) > 45) {
            ctx.fillStyle = 'rgba(255,209,102,0.82)';
            ctx.fillRect(x - 16, y - 58, Math.min(32, (object.fatigue || 0) * 0.32), 4);
        }
        if (object.attackAnim?.style === 'bless') {
            ctx.fillStyle = 'rgba(255,209,102,0.35)';
            ctx.fillRect(x - 18, y - 66, 36, 6);
            ctx.fillRect(x - 4, y - 78, 8, 32);
        }
        if (object.attackAnim) drawBlacksmithSwordArt(x, y, object, attackProgress);
    } else if (object.role === 'elder') {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 9, y - 48, 18, 4);
        if (object.mood === 'angry' || object.attackAnim) {
            const side = object.facing === -1 ? -1 : 1;
            ctx.strokeStyle = '#b77dff';
            ctx.lineWidth = object.attackFlashUntil && performance.now() < object.attackFlashUntil ? 5 : 3;
            ctx.beginPath();
            ctx.moveTo(x + side * 11, y - 22);
            ctx.lineTo(x + side * (27 + attackProgress * 14), y - 46 + attackProgress * 16);
            ctx.stroke();
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(side === 1 ? x + 22 + attackProgress * 10 : x - 29 - attackProgress * 10, y - 50 + attackProgress * 10, 7, 7);
        if (object.attackAnim?.style === 'spell') {
            ctx.fillStyle = 'rgba(183,125,255,0.38)';
            ctx.fillRect(x - 18, y - 64, 36, 6);
            ctx.fillRect(x - 4, y - 80, 8, 38);
            ctx.fillStyle = '#b77dff';
            ctx.fillRect(x - 6, y - 72, 12, 12);
        } else if (object.attackAnim?.style === 'command') {
            ctx.fillStyle = 'rgba(255,209,102,0.42)';
            ctx.fillRect(x - 28, y - 66, 56, 6);
            ctx.fillRect(x - 4, y - 82, 8, 40);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(x - 10, y - 76, 20, 8);
        } else if (object.attackAnim?.style === 'evade') {
            ctx.fillStyle = 'rgba(216,229,242,0.32)';
            ctx.fillRect(x - 20, y - 48, 40, 4);
        }
        }
    } else if (object.role === 'kitchen' && (object.mood === 'angry' || object.attackAnim)) {
        const side = object.facing === -1 ? -1 : 1;
        if (object.attackAnim?.style === 'throw' && object.attackAnim?.weapon?.includes('菜刀')) {
            ctx.fillStyle = '#d8e5f2';
            ctx.fillRect(side === 1 ? x + 16 + attackProgress * 18 : x - 32 - attackProgress * 18, y - 42 - attackProgress * 10, 18, 12);
            ctx.fillStyle = '#5a341d';
            ctx.fillRect(side === 1 ? x + 9 : x - 14, y - 25, 8, 5);
            ctx.fillStyle = 'rgba(216,229,242,0.22)';
            ctx.fillRect(side === 1 ? x + 22 : x - 46, y - 48, 24, 18);
        } else if (object.attackAnim?.style === 'eat') {
            ctx.fillStyle = '#d94b5f';
            ctx.fillRect(side === 1 ? x + 8 : x - 22, y - 38 + attackProgress * 10, 14, 10);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(side === 1 ? x + 10 : x - 20, y - 35 + attackProgress * 10, 10, 3);
            ctx.fillStyle = '#9cffb7';
            ctx.fillRect(x - 12, y - 56, 24, 5);
        } else if (object.knifeThrown) {
            ctx.fillStyle = object.attackFlashUntil && performance.now() < object.attackFlashUntil ? '#ffb3b3' : '#d6a06a';
            ctx.fillRect(side === 1 ? x + 10 + attackProgress * 11 : x - 26 - attackProgress * 11, y - 24, 16, 6);
            ctx.fillStyle = '#7a3f2a';
            ctx.fillRect(x - 13, y - 32, 26, 4);
        } else {
            ctx.fillStyle = '#d8e5f2';
            ctx.fillRect(side === 1 ? x + 12 + attackProgress * 13 : x - 28 - attackProgress * 13, y - 35 + attackProgress * 8, 16, 13);
            ctx.fillStyle = '#5a341d';
            ctx.fillRect(side === 1 ? x + 9 : x - 14, y - 25, 8, 5);
        }
    } else if (object.role === 'apothecary' && (object.mood === 'angry' || object.attackAnim)) {
        const side = object.facing === -1 ? -1 : 1;
        if (object.attackAnim?.style === 'drink') {
            ctx.fillStyle = '#8cff66';
            ctx.fillRect(side === 1 ? x + 6 : x - 18, y - 45 + attackProgress * 12, 12, 16);
            ctx.fillStyle = '#f8fbff';
            ctx.fillRect(side === 1 ? x + 8 : x - 16, y - 49 + attackProgress * 12, 8, 4);
            ctx.fillStyle = '#9cffb7';
            ctx.fillRect(x - 12, y - 56, 24, 5);
        } else {
            const lift = attackProgress * 13;
            ctx.fillStyle = '#8cff66';
            ctx.fillRect(side === 1 ? x + 13 + lift : x - 25 - lift, y - 33 - lift, 12, 16);
            ctx.fillStyle = '#d94bff';
            ctx.fillRect(side === 1 ? x + 15 + lift : x - 23 - lift, y - 29 - lift, 8, 8);
        }
    }
    if (object.role === 'guard') {
        const side = object.facing === -1 ? -1 : 1;
        ctx.fillStyle = 'rgba(190,210,222,0.95)';
        ctx.fillRect(x - 13, y - 33, 26, 15);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 8, y - 31, 16, 3);
        if (!object.attackAnim) {
            ctx.strokeStyle = '#d8e5f2';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - side * 9, y - 28);
            ctx.lineTo(x - side * 25, y - 6);
            ctx.stroke();
        } else if (object.attackAnim.style === 'guardArrowCharge' || object.attackAnim.style === 'guardArrowRelease') {
            const dir = object.attackAnim.dir || { x: side, y: 0 };
            const angle = Math.atan2(dir.y, dir.x);
            ctx.save();
            ctx.translate(x + side * 12, y - 26);
            ctx.rotate(angle);
            const draw = object.attackAnim.style === 'guardArrowCharge' ? attackProgress : 0.2;
            ctx.strokeStyle = '#d6a06a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 15, -1.1, 1.1);
            ctx.stroke();
            ctx.strokeStyle = '#f8fbff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-2, -13);
            ctx.lineTo(-2 - draw * 10, 0);
            ctx.lineTo(-2, 13);
            ctx.stroke();
            ctx.strokeStyle = '#d8e5f2';
            ctx.beginPath();
            ctx.moveTo(-5 - draw * 8, 0);
            ctx.lineTo(18 + (object.attackAnim.style === 'guardArrowRelease' ? attackProgress * 22 : 0), 0);
            ctx.stroke();
            ctx.restore();
        } else if (object.attackAnim.style === 'bandage') {
            ctx.fillStyle = '#f8fbff';
            ctx.fillRect(x - 14, y - 28 + attackProgress * 8, 28, 6);
        } else {
            drawGuardSwordArt(x, y, object, attackProgress);
        }
    }
    if (object.mood === 'angry' && !['blacksmith', 'elder', 'basicElder', 'kitchen', 'apothecary', 'guard'].includes(object.role)) {
        const side = object.facing === -1 ? -1 : 1;
        ctx.fillStyle = object.attackFlashUntil && performance.now() < object.attackFlashUntil ? '#ffb3b3' : '#d6a06a';
        ctx.fillRect(side === 1 ? x + 10 + attackProgress * 12 : x - 26 - attackProgress * 12, y - 24, 16, 6);
    }
    if (object.hurtUntil && performance.now() < object.hurtUntil) {
        ctx.fillStyle = 'rgba(255, 107, 107, 0.45)';
        ctx.fillRect(x - 14, y - 44, 28, 44);
    }
}

function drawVillagerHealthBar(object, x, y) {
    const maxHp = object.maxHp || 80;
    const hp = clamp((object.hp ?? maxHp) / maxHp, 0, 1);
    if (hp >= 1 && !object.hurtUntil && !object.animalAggressor && !object.playerAggro) return;
    ctx.fillStyle = 'rgba(8, 14, 21, 0.72)';
    ctx.fillRect(x - 18, y - 56, 36, 5);
    ctx.fillStyle = hp > 0.45 ? '#9cffb7' : '#ff6b6b';
    ctx.fillRect(x - 18, y - 56, 36 * hp, 5);
    ctx.strokeStyle = '#101820';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 18, y - 56, 36, 5);
    if (object.workState && performance.now() < (object.workStateUntil || 0) && hp >= 1 && !object.animalAggressor && !object.playerAggro) {
        ctx.fillStyle = 'rgba(8,14,21,0.62)';
        ctx.fillRect(x - 28, y - 70, 56, 12);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 10px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(object.workState, x, y - 61);
        ctx.textAlign = 'left';
    }
}

function drawMerchantOutfit(object, x, y) {
    const side = object.facing === -1 ? -1 : 1;
    const bagX = x - side * 14;
    const coinX = x + side * 18;
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(x - 13, y - 47, 26, 5);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 9, y - 50, 18, 4);
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(x - 13, y - 27, 26, 7);
    ctx.fillStyle = '#f4d35e';
    ctx.fillRect(x - 10, y - 24, 20, 4);
    ctx.fillStyle = '#b87333';
    ctx.fillRect(x - 4, y - 23, 8, 8);
    ctx.fillStyle = '#6d4324';
    ctx.fillRect(bagX - 6, y - 20, 12, 18);
    ctx.fillStyle = '#d49a5a';
    ctx.fillRect(bagX - 4, y - 16, 8, 4);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(coinX - 5, y - 24, 9, 12);
    ctx.fillStyle = '#b87333';
    ctx.fillRect(coinX - 4, y - 21, 7, 7);
}

function drawBasicElderOutfit(object, x, y, attackProgress) {
    const side = object.facing === -1 ? -1 : 1;
    ctx.fillStyle = '#6b5333';
    ctx.fillRect(x - 12, y - 48, 24, 5);
    ctx.fillStyle = '#d8e5f2';
    ctx.fillRect(x - 4, y - 45, 8, 3);
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(x - 13, y - 31, 26, 5);
    ctx.fillStyle = '#d8e5f2';
    ctx.fillRect(x - 5, y - 24, 10, 5);
    if (object.attackAnim) {
        drawGuardSwordArt(x, y, object, attackProgress);
        return;
    }
    ctx.strokeStyle = '#c5d6df';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + side * 11, y - 25);
    ctx.lineTo(x + side * 28, y - 6);
    ctx.stroke();
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(x + side * 8 - 3, y - 24, 7, 5);
}

function shouldDrawGenericHeldWeapon(object) {
    if (object.role?.startsWith('cult')) return true;
    if (object.attackAnim || object.mood === 'angry') return false;
    return !['guard', 'basicElder', 'elder', 'kitchen', 'apothecary', 'blacksmith', 'merchant'].includes(object.role);
}

function drawBlacksmithSheathedSword(x, y, object) {
    const side = object.facing === -1 ? -1 : 1;
    ctx.strokeStyle = '#d8e5f2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - side * 10, y - 28);
    ctx.lineTo(x - side * 28, y - 4);
    ctx.stroke();
    ctx.strokeStyle = '#5a341d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - side * 8, y - 25);
    ctx.lineTo(x - side * 14, y - 17);
    ctx.stroke();
}

function drawGuardSwordArt(x, y, object, attackProgress) {
    const dir = object.attackAnim?.dir || { x: object.facing === -1 ? -1 : 1, y: 0 };
    const len = Math.hypot(dir.x, dir.y) || 1;
    const ux = dir.x / len;
    const uy = dir.y / len;
    const handX = x + ux * 10;
    const handY = y - 24 + uy * 4;
    const angle = Math.atan2(uy, ux) - 0.85 + attackProgress * 1.4;
    const tipX = handX + Math.cos(angle) * 36;
    const tipY = handY + Math.sin(angle) * 36;
    ctx.strokeStyle = 'rgba(216,229,242,0.32)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x + ux * 16, y - 27 + uy * 8, 24, Math.atan2(uy, ux) - 0.95, Math.atan2(uy, ux) + 0.45);
    ctx.stroke();
    ctx.strokeStyle = '#d8e5f2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(handX - 4, handY - 3, 8, 6);
}

function drawBlacksmithSwordArt(x, y, object, attackProgress) {
    if (!object.attackAnim) return;
    if (object.attackAnim.style === 'tired') {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 11, y - 50, 22, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x + (object.facing === -1 ? -20 : 14), y - 42, 10, 5);
        return;
    }
    const dir = object.attackAnim?.dir || { x: object.facing === -1 ? -1 : 1, y: 0 };
    const len = Math.hypot(dir.x, dir.y) || 1;
    const ux = dir.x / len;
    const uy = dir.y / len;
    const px = -uy;
    const py = ux;
    const handX = x + ux * 11 + px * 4;
    const handY = y - 25 + uy * 6 + py * 4;
    if (object.attackAnim.style === 'block') {
        ctx.strokeStyle = '#d8e5f2';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - px * 15, y - 35 - py * 6);
        ctx.lineTo(x + px * 15, y - 18 + py * 6);
        ctx.stroke();
        ctx.fillStyle = 'rgba(148,227,255,0.28)';
        ctx.fillRect(x - 18, y - 39, 36, 6);
        return;
    }
    if (object.attackAnim.style === 'thrust') {
        const reach = 30 + attackProgress * 38;
        const tipX = handX + ux * reach;
        const tipY = handY + uy * reach;
        ctx.strokeStyle = 'rgba(148,227,255,0.22)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.strokeStyle = '#d8e5f2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(tipX - 3, tipY - 3, 6, 6);
    } else {
        const angle = Math.atan2(uy, ux);
        const centerX = x + ux * 18;
        const centerY = y - 28 + uy * 10;
        ctx.strokeStyle = 'rgba(216,229,242,0.35)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, angle - 1.15 + attackProgress * 0.45, angle - 0.1 + attackProgress * 0.75);
        ctx.stroke();
        const bladeAngle = angle - 0.75 + attackProgress * 1.25;
        const tipX = handX + Math.cos(bladeAngle) * 42;
        const tipY = handY + Math.sin(bladeAngle) * 42;
        ctx.strokeStyle = '#d8e5f2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
    }
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(handX - 4, handY - 3, 8, 6);
}

function drawVillageTotem(object) {
    const x = object.x;
    const y = object.y;
    drawShadow(x, y + 18, 34, 8);
    ctx.fillStyle = '#4a2b17';
    ctx.fillRect(x - 15, y - 34, 30, 62);
    ctx.fillStyle = '#7a4f2d';
    ctx.fillRect(x - 10, y - 28, 20, 14);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 8, y - 22, 5, 5);
    ctx.fillRect(x + 3, y - 22, 5, 5);
    ctx.fillStyle = '#b77dff';
    ctx.fillRect(x - 4, y - 6, 8, 20);
    ctx.fillStyle = 'rgba(255,209,102,0.28)';
    ctx.fillRect(x - 22, y - 42, 44, 5);
    ctx.fillRect(x - 22, y + 30, 44, 5);
    if (object.hp < object.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x - 18, y - 50, 36, 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 18, y - 50, 36 * Math.max(0, object.hp / object.maxHp), 4);
    }
}

function drawIndoorObject(object) {
    if (object.outside) return;
    const x = object.x;
    const y = object.y;
    drawShadow(x, y + object.h * 0.32, object.w * 0.72, 8);
    if (object.kind === 'door') {
        ctx.fillStyle = '#2d2117';
        ctx.fillRect(x - object.w / 2, y - 8, object.w, 18);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(x - 18, y - 5, 36, 5);
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - 26, y - 12, 7, 22);
        ctx.fillRect(x + 19, y - 12, 7, 22);
        return;
    }
    if (object.kind === 'npc') {
        drawIndoorNpc(object);
        return;
    }
    if (object.kind === 'totem') {
        drawVillageTotem(object);
        return;
    }
    if (object.wallModule) {
        drawWallModuleObject(object);
        return;
    }
    if (object.kind === 'forge' || object.kind === 'hearth') {
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        for (let yy = y - object.h / 2 + 6; yy < y + object.h / 2 - 4; yy += 12) {
            ctx.fillStyle = yy % 24 ? '#48515a' : '#66737f';
            ctx.fillRect(x - object.w / 2 + 6, yy, object.w - 12, 5);
        }
        ctx.fillStyle = '#66737f';
        ctx.fillRect(x - object.w / 2 + 7, y - object.h / 2 + 6, object.w - 14, 7);
        ctx.fillRect(x - object.w / 2 + 7, y + object.h / 2 - 12, object.w - 14, 6);
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(x - 14, y - 8, 28, 16);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 6, y - 10, 12, 8);
        ctx.fillStyle = 'rgba(255, 209, 102, 0.28)';
        ctx.fillRect(x - 22, y - 18, 44, 4);
        if (object.kind === 'hearth') {
            ctx.fillStyle = '#5a341d';
            ctx.fillRect(x - 30, y + 18, 60, 6);
            ctx.fillStyle = '#d68a43';
            ctx.fillRect(x - 8, y - 23, 16, 6);
        }
    } else if (object.kind === 'potionTable') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(x - object.w / 2 + 8, y + object.h / 2 - 24, object.w - 16, 18);
        ctx.fillStyle = '#9a6436';
        ctx.fillRect(x - object.w / 2 + 12, y + object.h / 2 - 32, object.w - 24, 9);
        ctx.fillStyle = '#7dcbe8';
        ctx.fillRect(x - 18, y - 30, 12, 30);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x + 8, y - 22, 14, 18);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 26, y - 14, 7, 9);
        ctx.fillStyle = '#d94bff';
        ctx.fillRect(x - 32, y - 12, 8, 10);
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(x - 15, y - 34, 6, 5);
        ctx.fillRect(x + 12, y - 27, 6, 5);
        ctx.strokeStyle = '#d49a5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - object.w / 2 + 10, y - 16, object.w - 20, 16);
    } else if (object.kind === 'cookPot') {
        if (object.wallModule) {
            ctx.fillStyle = '#3a4652';
            ctx.fillRect(x - object.w / 2 + 10, y - object.h / 2 + 14, object.w - 20, object.h - 24);
            ctx.fillStyle = '#66737f';
            ctx.fillRect(x - object.w / 2 + 18, y - object.h / 2 + 24, object.w - 36, 10);
        }
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - 22, y - 10, 44, 26);
        ctx.fillStyle = '#66737f';
        ctx.fillRect(x - 26, y - 16, 52, 9);
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(x - 12, y + 18, 24, 7);
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(x - 8, y - 20, 16, 4);
    } else if (object.kind === 'chest' || object.kind === 'foodCrate' || object.kind === 'crate') {
        const storage = object.storage || object.loot || {};
        const empty = Object.values(storage).every(amount => amount <= 0);
        if (object.wallModule) {
            const left = x - object.w / 2;
            const top = y - object.h / 2;
            ctx.fillStyle = empty ? '#3b2a1b' : '#6d4324';
            ctx.fillRect(left + 6, top + 9, object.w - 12, object.h - 18);
            ctx.fillStyle = empty ? '#4a3320' : '#9a6436';
            ctx.fillRect(left + 8, top + 13, object.w - 16, 22);
            ctx.fillRect(left + 8, y + 4, object.w - 16, object.h / 2 - 17);
            ctx.fillStyle = '#d49a5a';
            ctx.fillRect(left + 12, top + 18, object.w - 24, 5);
            ctx.fillRect(left + object.w / 2 - 4, top + 42, 8, 10);
            if (object.opened && !empty) {
                ctx.fillStyle = '#d49a5a';
                ctx.fillRect(left + 10, top + 2, object.w - 20, 9);
            }
            return;
        }
        ctx.fillStyle = empty ? '#3b2a1b' : '#5a341d';
        ctx.fillRect(x - 25, y - 13, 50, 26);
        ctx.fillStyle = empty ? '#4a3320' : '#9a6436';
        ctx.fillRect(x - 28, y - 23, 56, 14);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(x - 20, y - 19, 40, 5);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 4, y - 11, 8, 8);
        ctx.fillStyle = object.kind === 'crate' ? '#c5d6df' : (object.kind === 'foodCrate' ? '#d94b5f' : (object.mark === 'elder' ? '#b77dff' : (object.mark === 'herb' ? '#69e08e' : '#d49a5a')));
        if (object.kind === 'crate') {
            ctx.fillRect(x - 18, y - 8, 10, 8);
            ctx.fillRect(x + 8, y + 2, 12, 7);
        } else if (object.kind === 'foodCrate') {
            ctx.fillRect(x - 18, y - 8, 8, 8);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(x + 9, y - 7, 9, 7);
        } else if (object.mark === 'elder') {
            ctx.fillRect(x - 16, y - 8, 32, 5);
            ctx.fillRect(x - 4, y - 13, 8, 13);
        } else if (object.mark === 'herb') {
            ctx.fillRect(x - 15, y - 10, 8, 14);
            ctx.fillRect(x + 6, y - 9, 8, 13);
        }
        if (object.opened && !empty) {
            ctx.fillStyle = '#d49a5a';
            ctx.fillRect(x - 24, y - 30, 48, 8);
        }
    } else if (object.kind === 'brokenBed') {
        ctx.fillStyle = '#3f2a1c';
        ctx.fillRect(x - object.w / 2, y - object.h / 2 + 8, object.w, object.h - 12);
        ctx.fillStyle = '#6b5333';
        ctx.fillRect(x - object.w / 2 + 7, y - object.h / 2 + 14, object.w - 20, 14);
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - object.w / 2 + 12, y - 4, object.w - 25, 8);
        ctx.strokeStyle = '#2d2117';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 18, y + 18);
        ctx.lineTo(x + 20, y - 12);
        ctx.stroke();
    } else if (object.kind === 'brokenTable') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(x - object.w / 2, y - 12, object.w, 18);
        ctx.fillStyle = '#3f2a1c';
        ctx.fillRect(x - object.w / 2 + 8, y + 4, 6, 20);
        ctx.fillRect(x + object.w / 2 - 18, y, 6, 24);
        ctx.strokeStyle = '#2d2117';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 24, y - 13);
        ctx.lineTo(x + 24, y + 6);
        ctx.stroke();
    } else if (object.kind === 'debris') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(x - 26, y - 8, 34, 8);
        ctx.fillRect(x - 8, y + 3, 38, 7);
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - 18, y - 18, 12, 7);
        ctx.fillRect(x + 10, y - 10, 20, 6);
    } else if (object.kind === 'bed') {
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        ctx.fillStyle = '#8fb8ff';
        ctx.fillRect(x - object.w / 2 + 8, y - object.h / 2 + 7, object.w - 16, object.h - 14);
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(x - object.w / 2 + 10, y - object.h / 2 + 9, object.w - 20, 18);
        ctx.fillStyle = 'rgba(39, 54, 74, 0.42)';
        ctx.fillRect(x - object.w / 2 + 10, y - object.h / 2 + 34, object.w - 20, 8);
    } else if (object.kind === 'anvil') {
        ctx.fillStyle = '#66737f';
        ctx.fillRect(x - 22, y - 12, 44, 18);
        ctx.fillRect(x - 12, y + 5, 24, 14);
        ctx.fillStyle = '#c5d6df';
        ctx.fillRect(x - 16, y - 16, 26, 5);
    } else if (object.kind === 'coalPile') {
        if (object.wallModule) {
            ctx.fillStyle = '#4a3320';
            ctx.fillRect(x - object.w / 2 + 8, y - object.h / 2 + 14, object.w - 16, object.h - 22);
        }
        ctx.fillStyle = object.taken ? '#3b3b32' : '#121820';
        ctx.fillRect(x - object.w / 2 + 17, y + 4, object.w - 34, 28);
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - 16, y - 10, 20, 10);
        ctx.fillRect(x + 8, y + 3, 18, 9);
    } else if (object.kind === 'herbRack' || object.kind === 'rack' || object.kind === 'meatRack' || object.kind === 'shopShelf') {
        ctx.fillStyle = object.taken ? '#6b4a2f' : '#d49a5a';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, 6);
        ctx.fillRect(x - object.w / 2, y + object.h / 2 - 7, object.w, 6);
        ctx.fillStyle = '#5a341d';
        for (let i = 0; i < 5; i++) ctx.fillRect(x - object.w / 2 + 12 + i * 36, y - object.h / 2 + 2, 4, object.h - 4);
        const preferred = object.kind === 'shopShelf'
            ? ['copperCoin', 'berry', 'bandage', 'simpleArrow', 'torch', 'stoneSpear', 'potion']
            : (object.kind === 'rack'
                ? ['stoneSpear', 'simpleArrow', 'sinewBow', 'poisonArrow', 'bambooTrap', 'bandage']
                : (object.kind === 'herbRack' ? ['herb', 'toxicMushroom', 'potion'] : ['meat', 'roastMeat', 'stew']));
        drawStoredItemIcons(object, [[x - 70, y - 13], [x - 46, y], [x - 22, y - 13], [x + 2, y], [x + 26, y - 13], [x + 50, y], [x + 74, y - 13]], preferred);
    } else if (object.kind === 'basket') {
        if (object.wallModule) {
            ctx.fillStyle = '#4a3320';
            ctx.fillRect(x - object.w / 2 + 8, y - object.h / 2 + 14, object.w - 16, object.h - 22);
        }
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - 28, y - 18, 56, 34);
        ctx.strokeStyle = '#d49a5a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 16, 22, Math.PI, Math.PI * 2);
        ctx.stroke();
        drawStoredItemIcons(object, [[x - 24, y - 11], [x - 12, y - 17], [x, y - 12], [x + 12, y - 17], [x + 24, y - 11]], ['herb', 'vine', 'jungleFruit', 'jungleLeaf', 'berry', 'fiber', 'fang']);
    } else if (object.kind === 'readingDesk') {
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(x - object.w / 2, y - 12, object.w, 24);
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - object.w / 2 + 8, y - 22, object.w - 16, 12);
        ctx.fillStyle = '#d6a06a';
        ctx.fillRect(x - 24, y - 28, 22, 8);
        ctx.fillRect(x + 2, y - 30, 24, 8);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x - 2, y - 38, 4, 30);
        ctx.fillStyle = '#3a2417';
        ctx.fillRect(x - object.w / 2 + 12, y + 10, 6, 24);
        ctx.fillRect(x + object.w / 2 - 18, y + 10, 6, 24);
    } else if (object.kind === 'map') {
        ctx.fillStyle = '#d6a06a';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        ctx.strokeStyle = '#5a341d';
        ctx.strokeRect(x - object.w / 2 + 6, y - object.h / 2 + 5, object.w - 12, object.h - 10);
        ctx.strokeStyle = '#3f7f45';
        ctx.beginPath();
        ctx.moveTo(x - 42, y + 2);
        ctx.lineTo(x - 18, y - 5);
        ctx.lineTo(x + 5, y + 6);
        ctx.lineTo(x + 36, y - 6);
        ctx.stroke();
    } else if (object.kind === 'flag') {
        const left = x - object.w / 2;
        const top = y - object.h / 2;
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(left + 10, top + 6, 6, object.h - 12);
        ctx.fillRect(left + 8, top + 8, object.w - 16, 7);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(left + 8, top + 2, 10, 5);
        ctx.fillRect(left + 4, top + 6, 10, 11);
        ctx.fillRect(left + object.w - 14, top + 6, 10, 11);
        ctx.fillStyle = '#a42d3f';
        ctx.fillRect(left + 18, top + 18, object.w - 30, object.h - 28);
        ctx.fillStyle = '#d94b5f';
        ctx.fillRect(left + 18, top + 18, object.w - 30, 15);
        ctx.fillStyle = '#7f2034';
        ctx.fillRect(left + 18, top + object.h - 20, object.w - 30, 10);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 20, y - 8, 40, 6);
        ctx.fillRect(x - 5, y - 23, 10, 36);
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(x - 13, y - 15, 8, 8);
        ctx.fillRect(x + 5, y - 15, 8, 8);
        ctx.fillRect(x - 13, y + 3, 8, 8);
        ctx.fillRect(x + 5, y + 3, 8, 8);
        ctx.fillStyle = '#ffd166';
        for (let dx = -36; dx <= 36; dx += 18) {
            ctx.fillRect(x + dx, top + object.h - 7, 8, 7);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(left + 18, top + 15, object.w - 36, 3);
        ctx.fillRect(left + 24, top + 31, object.w - 48, 3);
    } else if (object.kind === 'noticeBoard') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        ctx.fillStyle = '#d6a06a';
        ctx.fillRect(x - object.w / 2 + 8, y - object.h / 2 + 7, object.w - 16, object.h - 14);
        ctx.fillStyle = '#3f2a1c';
        ctx.fillRect(x - 34, y - 12, 28, 4);
        ctx.fillRect(x - 34, y, 48, 4);
        ctx.fillRect(x - 34, y + 12, 36, 4);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(x + 30, y - 15, 10, 10);
    } else if (object.kind === 'bookshelf') {
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(x - object.w / 2 + 5, y - object.h / 2 + 18, object.w - 10, 5);
        ctx.fillRect(x - object.w / 2 + 5, y + 4, object.w - 10, 5);
        ctx.fillRect(x - object.w / 2 + 5, y + object.h / 2 - 16, object.w - 10, 5);
        drawBookShelfContents(object, x - object.w / 2, y - object.h / 2, object.w, object.h);
    } else if (object.kind === 'jarShelf') {
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(x - object.w / 2 + 5, y - object.h / 2 + 18, object.w - 10, 5);
        ctx.fillRect(x - object.w / 2 + 5, y + 4, object.w - 10, 5);
        ctx.fillRect(x - object.w / 2 + 5, y + object.h / 2 - 16, object.w - 10, 5);
        drawPoisonShelfContents(object, x - object.w / 2, y - object.h / 2, object.w, object.h);
    } else {
        ctx.fillStyle = '#7a6040';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
    }
}

function drawTerrain() {
    const startChunkX = Math.floor(camera.x / TERRAIN_CHUNK_SIZE);
    const endChunkX = Math.floor((camera.x + VIEW.width) / TERRAIN_CHUNK_SIZE);
    const startChunkY = Math.floor(camera.y / TERRAIN_CHUNK_SIZE);
    const endChunkY = Math.floor((camera.y + VIEW.height) / TERRAIN_CHUNK_SIZE);
    for (let cy = startChunkY; cy <= endChunkY; cy++) {
        for (let cx = startChunkX; cx <= endChunkX; cx++) {
            const chunk = getTerrainChunk(cx, cy);
            ctx.drawImage(chunk, Math.round(cx * TERRAIN_CHUNK_SIZE - camera.x), Math.round(cy * TERRAIN_CHUNK_SIZE - camera.y));
        }
    }
    drawWaterHighlights(performance.now());
}

function getTerrainChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (terrainChunkCache.has(key)) {
        const cached = terrainChunkCache.get(key);
        terrainChunkCache.delete(key);
        terrainChunkCache.set(key, cached);
        return cached;
    }
    const chunk = document.createElement('canvas');
    chunk.width = TERRAIN_CHUNK_SIZE;
    chunk.height = TERRAIN_CHUNK_SIZE;
    const chunkCtx = chunk.getContext('2d');
    const grid = 32;
    const baseX = cx * TERRAIN_CHUNK_SIZE;
    const baseY = cy * TERRAIN_CHUNK_SIZE;
    for (let y = 0; y < TERRAIN_CHUNK_SIZE; y += grid) {
        for (let x = 0; x < TERRAIN_CHUNK_SIZE; x += grid) {
            const worldTileX = baseX + x;
            const worldTileY = baseY + y;
            const info = terrainInfoAt(worldTileX + grid / 2, worldTileY + grid / 2);
            chunkCtx.fillStyle = info.color;
            chunkCtx.fillRect(x, y, grid, grid);
            drawTerrainDetailAt(chunkCtx, x, y, grid, info, hash2(worldTileX / grid, worldTileY / grid));
        }
    }
    terrainChunkCache.set(key, chunk);
    if (terrainChunkCache.size > MAX_TERRAIN_CHUNKS) {
        terrainChunkCache.delete(terrainChunkCache.keys().next().value);
    }
    return chunk;
}

function terrainInfoAt(x, y) {
    const shapeNoise = biomeShapeNoise(x, y);
    const camp = campRegionWeight(x, y);
    if (camp > 0.46) {
        const campNoise = valueNoise(x * 0.006, y * 0.006);
        return { kind: 'camp', color: mixMany([['#6f5532', camp], ['#3e7f47', Math.max(0, 1 - camp)]], campNoise) };
    }

    const river = riverDistance(x, y);
    const lake = lakeDistance(x, y);
    const water = Math.min(river - 68, lake);
    if (water < 0) return { kind: 'water', color: blendColor('#1f5f92', '#2f8fc7', clamp((-water) / 84, 0, 1)) };
    if (water < 54) return { kind: 'shore', color: blendColor('#6f8750', '#3d8146', water / 54) };
    const village = villageRegionWeight(x, y);
    const road = villageRoadWeight(x, y);
    const cult = jungleCultRegionWeight(x, y);
    if (road > 0.18) {
        const villageNoise = valueNoise(x * 0.009 + 41, y * 0.009 - 17);
        return {
            kind: 'village',
            color: mixMany([
                ['#7a643d', road * 0.7],
                ['#9a7a4a', road * 0.24],
                ['#3f7f45', Math.max(0, 1 - road) * 0.16],
            ], villageNoise),
        };
    }
    if (cult > 0.1) {
        const cultNoise = valueNoise(x * 0.008 + 19, y * 0.008 - 31);
        return { kind: 'jungle', color: mixMany([['#123d2b', 0.62 + cult * 0.28], ['#1f6b3f', 0.32], ['#0f2d22', 0.2]], cultNoise) };
    }

    const climate = climateAt(x, y);
    const regions = worldRegionSet();
    const mine = Math.max(
        climate.rock * 0.56 + climate.height * 0.24,
        weightedRegions(x, y, regions.mine)
    );
    const ruins = weightedRegions(x, y, regions.ruins);
    const swamp = Math.max(
        climate.moisture * 0.55 + (1 - climate.height) * 0.32,
        weightedRegions(x, y, regions.swamp)
    );
    const dry = Math.max(
        (1 - climate.moisture) * 0.64 + climate.temperature * 0.28,
        weightedRegions(x, y, regions.dry)
    );
    const forest = Math.max(
        climate.moisture * 0.48 + (1 - Math.abs(climate.temperature - 0.48)) * 0.24,
        weightedRegions(x, y, regions.forest)
    );
    const birch = weightedRegions(x, y, regions.birch);
    const pine = weightedRegions(x, y, regions.pine);
    const maple = weightedRegions(x, y, regions.maple);
    const meadow = weightedRegions(x, y, regions.meadow);
    const grasslandSuitability = (1 - Math.abs(climate.moisture - 0.48)) * 0.2 + (1 - Math.abs(climate.height - 0.45)) * 0.14;
    const grassland = Math.max(
        weightedRegions(x, y, regions.grassland),
        grasslandSuitability
    );
    const darkForest = weightedRegions(x, y, regions.darkForest);
    const reedWetland = weightedRegions(x, y, regions.reedWetland);
    const jungle = Math.max(
        climate.moisture * 0.5 + climate.temperature * 0.38 + (1 - climate.height) * 0.16,
        weightedRegions(x, y, regions.jungle)
    );
    const waterEdge = clamp(1 - water / 230, 0, 1);
    const noise = valueNoise(x * 0.006, y * 0.006);

    if (ruins + shapeNoise * 0.04 > 0.5) return { kind: 'ruins', color: mixMany([['#38414d', ruins], ['#4f5964', 0.32], ['#2f6b3d', Math.max(0, 1 - ruins)]], noise) };
    if (mine + shapeNoise * 0.05 > 0.54) return { kind: 'mine', color: mixMany([['#58636e', mine], ['#6a604f', 0.2], ['#376d3f', Math.max(0, 1 - mine)]], noise) };
    if (swamp + waterEdge * 0.24 + shapeNoise * 0.06 > 0.62) {
        if (waterEdge > 0.42 && climate.moisture > 0.54) return { kind: 'mud', color: mixMany([['#263f34', swamp], ['#4b3b28', 0.38], ['#2f6d57', 0.24]], noise) };
        return { kind: 'swamp', color: mixMany([['#214b3d', swamp], ['#2f6d57', 0.25], ['#2f6b3d', Math.max(0, 1 - swamp)]], noise) };
    }
    if (dry + shapeNoise * 0.05 > 0.54) return { kind: 'dry', color: mixMany([['#a47a3c', dry], ['#735536', 0.24], ['#3f8f4f', Math.max(0, 1 - dry)]], noise) };
    if (reedWetland + waterEdge * 0.18 + shapeNoise * 0.05 > 0.58) return { kind: 'reedWetland', color: mixMany([['#426d3d', reedWetland], ['#6f8750', 0.32], ['#2f6d57', waterEdge * 0.3]], noise) };
    if (darkForest + shapeNoise * 0.06 > 0.5) return { kind: 'darkForest', color: mixMany([['#1f3328', darkForest], ['#38284b', 0.34], ['#2b4a31', 0.22], ['#17251f', 0.12]], noise) };
    if (jungle + waterEdge * 0.12 + shapeNoise * 0.07 > 0.59) return { kind: 'jungle', color: mixMany([['#123d2b', jungle], ['#1f6b3f', 0.32], ['#2f7041', 0.2], ['#0f2d22', 0.16]], noise) };
    if (pine + shapeNoise * 0.06 > 0.51) return { kind: 'pine', color: mixMany([['#173c2b', pine], ['#24502e', 0.28], ['#30452a', 0.18]], noise) };
    if (maple + shapeNoise * 0.06 > 0.5) return { kind: 'maple', color: mixMany([['#4f7f45', maple], ['#5f8f50', 0.26], ['#6f8a3d', 0.14]], noise) };
    if (birch + shapeNoise * 0.06 > 0.5) return { kind: 'birch', color: mixMany([['#5f9b55', birch], ['#83b86a', 0.26], ['#3f8f4f', 0.22]], noise) };
    if (meadow + shapeNoise * 0.05 > 0.49) return { kind: 'meadow', color: mixMany([['#6fbf55', meadow], ['#9ecf63', 0.28], ['#3f8f4f', 0.25]], noise) };
    if (forest + shapeNoise * 0.07 > 0.47) {
        if (climate.moisture > 0.66 && climate.temperature > 0.42 && valueNoise(x * 0.004 + 18, y * 0.004 - 12) > 0.54) {
            return { kind: 'bamboo', color: mixMany([['#1f6b3f', forest], ['#3b8d49', 0.36], ['#24502e', 0.22]], noise) };
        }
        return { kind: 'forest', color: mixMany([['#1f5a35', forest], ['#2f7041', 0.3], ['#3f8f4f', Math.max(0, 1 - forest)]], noise) };
    }
    if (grassland + shapeNoise * 0.05 > 0.53) {
        return { kind: 'grass', color: mixMany([['#3d8a4a', grassland], ['#5ca54f', 0.24], ['#2f7f45', 0.18]], noise) };
    }
    if (climate.moisture > 0.46 && valueNoise(x * 0.005 - 3, y * 0.005 + 7) > 0.58) {
        return { kind: 'tallgrass', color: blendColor('#2f7f45', '#4e9a4a', noise * 0.45) };
    }
    return { kind: 'grass', color: blendColor('#347d47', '#428c4e', noise * 0.32) };
}

function climateAt(x, y) {
    const nx = x / WORLD.width;
    const ny = y / WORLD.height;
    const broadMoisture = valueNoise(x * 0.0012 + 4, y * 0.0012 - 8);
    const broadTemp = valueNoise(x * 0.001 + 22, y * 0.001 + 6);
    const broadHeight = valueNoise(x * 0.0014 - 12, y * 0.0014 + 16);
    return {
        moisture: clamp(broadMoisture * 0.62 + (1 - nx) * 0.18 + ny * 0.14 + valueNoise(x * 0.003, y * 0.003) * 0.18, 0, 1),
        temperature: clamp(broadTemp * 0.62 + nx * 0.22 + ny * 0.12, 0, 1),
        height: clamp(broadHeight * 0.68 + valueNoise(x * 0.003 - 9, y * 0.003 + 2) * 0.22 + nx * 0.1, 0, 1),
        rock: clamp(valueNoise(x * 0.0017 + 11, y * 0.0017 - 19) * 0.72 + nx * 0.18 + (1 - ny) * 0.1, 0, 1),
    };
}

function worldRegionSet() {
    if (worldRegionsCache && worldRegionsCacheSeed === worldSeed) return worldRegionsCache;
    const forestScale = wildernessSettings.forestScale;
    const jungleScale = wildernessSettings.jungleScale;
    const randomPoint = (salt, margin = 420, minCampDistance = 720) => {
        for (let i = 0; i < 18; i++) {
            const x = margin + seededUnit(salt + i * 11.7, 1.3) * (WORLD.width - margin * 2);
            const y = margin + seededUnit(salt + i * 11.7, 2.9) * (WORLD.height - margin * 2);
            if (distance({ x, y }, CAMP_POSITION) >= minCampDistance) return { x, y };
        }
        const angle = seededUnit(salt, 7.1) * Math.PI * 2;
        const radius = minCampDistance + seededUnit(salt, 8.4) * 1200;
        return {
            x: clamp(CAMP_POSITION.x + Math.cos(angle) * radius, margin, WORLD.width - margin),
            y: clamp(CAMP_POSITION.y + Math.sin(angle) * radius, margin, WORLD.height - margin),
        };
    };
    const makeRegions = (count, salt, radiusMin, radiusMax, margin = 420, minCampDistance = 720) =>
        Array.from({ length: count }, (_, index) => ({
            ...randomPoint(salt + index * 31.37, margin, minCampDistance),
            radius: radiusMin + seededUnit(salt + index * 31.37, 5.6) * (radiusMax - radiusMin),
            seed: salt + index * 4.73 + seededUnit(salt, index + 9) * 8,
        }));
    worldRegionsCache = {
        mine: makeRegions(6, 10, 900, 1280, 520, 780),
        ruins: makeRegions(3, 20, 620, 820, 540, 1000),
        swamp: makeRegions(3, 30, 980, 1320, 420, 620),
        dry: makeRegions(3, 40, 980, 1360, 420, 660),
        forest: makeRegions(Math.max(1, Math.round(6 * forestScale)), 50, 1080 * forestScale, 1540 * forestScale, 360, 420),
        birch: makeRegions(Math.max(1, Math.round(3 * forestScale)), 60, 980 * forestScale, 1260 * forestScale, 420, 560),
        pine: makeRegions(Math.max(1, Math.round(4 * forestScale)), 70, 1060 * forestScale, 1460 * forestScale, 420, 600),
        maple: makeRegions(Math.max(1, Math.round(3 * forestScale)), 80, 1000 * forestScale, 1300 * forestScale, 420, 600),
        meadow: makeRegions(3, 90, 780, 1040, 360, 500),
        grassland: makeRegions(3, 95, 860, 1160, 360, 520),
        darkForest: makeRegions(Math.max(1, Math.round(3 * forestScale)), 100, 1040 * forestScale, 1320 * forestScale, 520, 760),
        jungle: makeRegions(Math.max(1, Math.round(2 * jungleScale)), 105, 1000 * jungleScale, 1320 * jungleScale, 520, 820),
        reedWetland: makeRegions(3, 110, 760, 980, 360, 520),
        village: {
            ...randomPoint(115, 720, 1500),
            radius: 420 + seededUnit(115, 5.6) * 160,
            seed: 115 + seededUnit(115, 9) * 8,
        },
        lakes: makeRegions(3 + Math.floor(seededUnit(119, 1) * 5), 120, 250, 540, 380, 520).map((lake, index) => ({
            ...lake,
            rx: 260 + seededUnit(120 + index * 9, 1) * 280,
            ry: 190 + seededUnit(120 + index * 9, 2) * 180,
        })),
        river: {
            count: 2 + Math.floor(seededUnit(130, 0) * 5),
            mainY: 1500 + seededUnit(130, 1) * 2500,
            mainPhase: seededUnit(130, 2) * Math.PI * 2,
            branchY: 620 + seededUnit(130, 3) * 1500,
            southY: 2800 + seededUnit(130, 4) * 1700,
            verticalX: 1700 + seededUnit(130, 5) * 4500,
            deltaY: 1900 + seededUnit(130, 6) * 1700,
        },
    };
    worldRegionsCacheSeed = worldSeed;
    return worldRegionsCache;
}

function seededUnit(a, b = 0) {
    const n = Math.sin((worldSeed + a * 101.3) * 12.9898 + (b + 78.233) * 37.719) * 43758.5453;
    return n - Math.floor(n);
}

function weightedRegions(x, y, regions, fallback = 0) {
    return Math.max(fallback, ...regions.map(region => naturalRegionWeight(x, y, region.x, region.y, region.radius, region.seed)));
}

function campRegionWeight(x, y) {
    const climate = climateAt(x, y);
    const terrainSuitability = clamp(1 - Math.abs(climate.height - 0.46) * 1.45 - Math.max(0, climate.rock - 0.48) * 0.55, 0.62, 1.12);
    const edgeNoise = (valueNoise(x * 0.005 + 33, y * 0.005 - 18) - 0.5) * 0.24 + biomeShapeNoise(x, y) * 0.12;
    const localRadius = 430 + terrainSuitability * 150 + edgeNoise * 160;
    return naturalRegionWeight(x, y, CAMP_POSITION.x, CAMP_POSITION.y, localRadius, 15.5 + terrainSuitability);
}

function villageRegionWeight(x, y) {
    return villagePathData().villages.reduce((best, data) => {
        const village = data.region;
        return Math.max(best, naturalRegionWeight(x, y, village.x, village.y, village.radius * 0.88, village.seed));
    }, 0);
}

function jungleCultRegionWeight(x, y) {
    const cult = activeJungleCultVillage;
    if (!cult) return 0;
    return naturalRegionWeight(x, y, cult.x, cult.y, cult.radius * 0.84, cult.seed + 22);
}

function villageRoadWeight(x, y) {
    const data = villagePathData();
    const cultEndpoint = roadVillageEndpoint(activeJungleCultVillage);
    const roadVillages = cultEndpoint ? [...data.villages, { region: cultEndpoint, garden: cultEndpoint, layout: null, endpoints: [] }] : data.villages;
    const localRoad = roadVillages.reduce((best, item) => {
        const village = item.region;
        const centerFade = clamp(1 - distance({ x, y }, village) / (village.radius * 0.94), 0, 1);
        const windingY = village.y + Math.sin((x - village.x) * 0.012 + village.seed) * 20;
        const windingX = village.x + Math.sin((y - village.y) * 0.011 - village.seed) * 18;
        const centerRoad = Math.max(1 - Math.abs(y - windingY) / 34, 1 - Math.abs(x - windingX) / 32) * centerFade;
        const gardenPath = clamp(1 - distanceToSegment({ x, y }, village, item.garden) / 34, 0, 1);
        return Math.max(best, centerRoad, gardenPath);
    }, 0);
    const connectors = roadVillages.length > 1
        ? roadVillages.slice(1).map(item => clamp(1 - distanceToSegment({ x, y }, roadVillages[0].region, item.region) / 32, 0, 1))
        : [0];
    const connector = Math.max(...connectors);
    const nearVillage = roadVillages.some(item => distance({ x, y }, item.region) < item.region.radius + 360);
    return Math.max(localRoad, nearVillage ? connector : connector * 0.72);
}

function villagePathData() {
    if (villagePathCache && villagePathCacheSeed === worldSeed) return villagePathCache;
    const primary = dryVillageRegion(worldRegionSet().village);
    const side = seededUnit(primary.seed || 1, 73) > 0.5 ? 1 : -1;
    const secondary = dryVillageRegion({
        x: clamp(primary.x + side * (4600 + seededUnit(primary.seed, 74) * 1200), 1100, WORLD.width - 1100),
        y: clamp(primary.y + (seededUnit(primary.seed, 75) - 0.5) * 2100, 1100, WORLD.height - 1100),
        radius: Math.max(430, primary.radius * 0.9),
        seed: (primary.seed || 1) + 777,
        tier: 'basic',
    });
    const tertiary = dryVillageRegion(fortressVillageTarget(primary, secondary));
    const build = region => {
    const layout = villageLayoutForSeed(region.seed || 1);
    const large = seededUnit(region.seed, 18.8) > 0.54;
    const spacing = large ? 1.28 : 1.08;
    const buildings = expandedVillageBuildings(layout, region.seed || 1, large, region.tier || 'advanced');
    const endpoints = [
        ...buildings.map(building => {
            if (building.cornerX && building.cornerY) {
                const size = fortressWallSize(region);
                const wall = fortressWallThickness();
                return {
                    x: region.x + building.cornerX * (size.w / 2 - building.w / 2 - wall * 0.35),
                    y: region.y + building.cornerY * (size.h / 2 - building.h / 2 - wall * 0.35),
                };
            }
            return {
                x: region.x + Math.cos(building.angle) * building.distance * spacing,
                y: region.y + Math.sin(building.angle) * building.distance * spacing * 0.72,
            };
        }),
        { x: region.x + region.radius * layout.garden.x, y: region.y + region.radius * layout.garden.y },
    ];
    const garden = { x: region.x + region.radius * layout.garden.x, y: region.y + region.radius * layout.garden.y };
    return { region, layout, endpoints, garden };
    };
    villagePathCacheSeed = worldSeed;
    const villages = [build(primary), build(secondary), build(tertiary)];
    villagePathCache = { ...villages[0], villages };
    return villagePathCache;
}

function distanceToSegment(point, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lengthSq = abx * abx + aby * aby || 1;
    const t = clamp(((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq, 0, 1);
    const px = a.x + abx * t;
    const py = a.y + aby * t;
    return Math.hypot(point.x - px, point.y - py);
}

function riverDistance(x, y) {
    const r = worldRegionSet().river;
    const rivers = [];
    rivers.push(Math.abs(y - (r.mainY + Math.sin(x * 0.0024 + r.mainPhase) * 125 + Math.sin(x * 0.006 + r.mainPhase * 0.7) * 42)) * 0.82);
    if (r.count >= 2) rivers.push(Math.abs(y - (r.branchY + Math.sin(x * 0.003 + r.mainPhase + 2.1) * 78 + Math.sin(x * 0.008) * 28))
        + rangePenalty(x, WORLD.width * 0.24, WORLD.width * 0.72) * 1.8);
    if (r.count >= 3) rivers.push(Math.abs(y - (360 + seededUnit(132, 1) * 560 + Math.sin(x * 0.005 + r.mainPhase + 0.8) * 52))
        + rangePenalty(x, WORLD.width * 0.22, WORLD.width * 0.78) * 2.2);
    if (r.count >= 4) rivers.push(Math.abs(y - (r.southY + Math.sin(x * 0.0028 + r.mainPhase + 1.4) * 105))
        + rangePenalty(x, WORLD.width * 0.38, WORLD.width) * 1.5);
    if (r.count >= 5) rivers.push(Math.abs(x - (r.verticalX + Math.sin(y * 0.004 + r.mainPhase) * 95))
        + rangePenalty(y, WORLD.height * 0.18, WORLD.height * 0.7) * 1.6);
    if (r.count >= 6) rivers.push(Math.abs(y - (r.deltaY + Math.sin(x * 0.0026 + r.mainPhase + 3.2) * 120))
        + rangePenalty(x, WORLD.width * 0.08, WORLD.width * 0.55) * 1.15);
    const campDistance = distance({ x, y }, CAMP_POSITION);
    const campAvoidance = campDistance < 620 ? (620 - campDistance) * 0.7 : 0;
    return Math.min(...rivers) + campAvoidance;
}

function lakeDistance(x, y) {
    return Math.min(...worldRegionSet().lakes.map(lake => lakeEdgeDistance(x, y, lake.x, lake.y, lake.rx, lake.ry, lake.seed)));
}

function lakeEdgeDistance(x, y, cx, cy, rx, ry, seed) {
    const angle = Math.atan2(y - cy, x - cx);
    const wobble = 1
        + Math.sin(angle * 3.2 + seed) * 0.08
        + Math.sin(angle * 6.1 + seed * 1.7) * 0.05
        + (valueNoise(x * 0.004 + seed, y * 0.004 - seed) - 0.5) * 0.12;
    const normalized = Math.hypot((x - cx) / (rx * wobble), (y - cy) / (ry * wobble));
    return (normalized - 1) * Math.min(rx, ry);
}

function rangePenalty(value, min, max) {
    if (value < min) return min - value;
    if (value > max) return value - max;
    return 0;
}

function waterCurrentAt(x, y) {
    if (lakeDistance(x, y) < riverDistance(x, y) - 68) {
        const swirl = Math.sin(x * 0.004 + y * 0.003);
        return {
            x: Math.cos(y * 0.006) * 10 + swirl * 6,
            y: Math.sin(x * 0.006) * 10 - swirl * 6,
        };
    }
    return {
        x: 42 + Math.sin(y * 0.012) * 18,
        y: Math.cos(x * 0.006) * 16,
    };
}

function regionWeight(x, y, cx, cy, radius) {
    const d = Math.hypot(x - cx, y - cy);
    return clamp(1 - d / radius, 0, 1);
}

function naturalRegionWeight(x, y, cx, cy, radius, seed = 0) {
    const angle = Math.atan2(y - cy, x - cx);
    const wobble = Math.sin(angle * 3 + seed) * 0.16
        + Math.sin(angle * 5.7 + seed * 1.9) * 0.09
        + (valueNoise(x * 0.0025 + seed, y * 0.0025 - seed) - 0.5) * 0.32;
    const stretchedX = (x - cx) * (1 + Math.sin(seed) * 0.18);
    const stretchedY = (y - cy) * (1 + Math.cos(seed) * 0.16);
    const d = Math.hypot(stretchedX, stretchedY);
    return clamp(1 - d / (radius * (1 + wobble)), 0, 1);
}

function biomeShapeNoise(x, y) {
    return (valueNoise(x * 0.003, y * 0.003) - 0.5)
        + (valueNoise(x * 0.008 + 9, y * 0.008 - 4) - 0.5) * 0.45;
}

function hash2(x, y) {
    const n = Math.sin((x + worldSeed) * 127.1 + (y - worldSeed) * 311.7) * 43758.5453;
    return n - Math.floor(n);
}

function valueNoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const a = hash2(ix, iy);
    const b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1);
    const d = hash2(ix + 1, iy + 1);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function blendColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return `rgb(${Math.round(lerp(ca.r, cb.r, t))}, ${Math.round(lerp(ca.g, cb.g, t))}, ${Math.round(lerp(ca.b, cb.b, t))})`;
}

function hexToRgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function mixMany(entries, noise) {
    let total = 0;
    let r = 0, g = 0, b = 0;
    for (const [color, weight] of entries) {
        const w = Math.max(0, weight);
        const c = hexToRgb(color);
        r += c.r * w;
        g += c.g * w;
        b += c.b * w;
        total += w;
    }
    total = total || 1;
    const shade = 0.88 + noise * 0.18;
    return `rgb(${Math.round((r / total) * shade)}, ${Math.round((g / total) * shade)}, ${Math.round((b / total) * shade)})`;
}

function drawTerrainDetail(x, y, grid, info) {
    const sx = worldX(x);
    const sy = worldY(y);
    const h = hash2(x / grid, y / grid);
    drawTerrainDetailAt(ctx, sx, sy, grid, info, h);
}

function drawTerrainDetailAt(target, sx, sy, grid, info, h) {
    if (info.kind === 'water') return;
    if (info.kind === 'shore') {
        target.fillStyle = h > 0.5 ? 'rgba(230, 206, 145, 0.22)' : 'rgba(70, 105, 65, 0.2)';
        target.fillRect(sx + 6 + (h * 9) % 16, sy + 12, 20, 4);
        return;
    }
    if (info.kind === 'mine') {
        target.fillStyle = 'rgba(20, 24, 29, 0.22)';
        target.fillRect(sx + 6, sy + 8 + h * 12, 12 + h * 14, 4);
        if (h > 0.58) target.fillRect(sx + 22, sy + 24, 7, 6);
        return;
    }
    if (info.kind === 'ruins') {
        target.strokeStyle = 'rgba(18, 24, 34, 0.22)';
        target.lineWidth = 2;
        target.strokeRect(sx + 2, sy + 2, grid - 4, grid - 4);
        if (h > 0.7) {
            target.fillStyle = 'rgba(183, 125, 255, 0.12)';
            target.fillRect(sx + 12, sy + 8, 8, 8);
        }
        return;
    }
    if (info.kind === 'swamp') {
        target.fillStyle = h > 0.5 ? 'rgba(25, 82, 68, 0.28)' : 'rgba(8, 26, 22, 0.22)';
        target.fillRect(sx + 4 + (h * 11) % 12, sy + 14, 22, 6);
        if (h > 0.68) {
            target.fillStyle = 'rgba(180, 120, 190, 0.22)';
            target.fillRect(sx + 17, sy + 8, 6, 6);
        }
        return;
    }
    if (info.kind === 'mud') {
        target.fillStyle = 'rgba(28, 22, 16, 0.24)';
        target.fillRect(sx + 3 + (h * 13) % 16, sy + 12, 24, 7);
        target.fillStyle = 'rgba(78, 100, 64, 0.22)';
        target.fillRect(sx + 8, sy + 22, 4, 8);
        target.fillRect(sx + 21, sy + 9, 3, 10);
        return;
    }
    if (info.kind === 'dry') {
        target.fillStyle = 'rgba(90, 56, 28, 0.24)';
        target.fillRect(sx + 5, sy + 12 + h * 10, 22, 3);
        if (h > 0.62) {
            target.strokeStyle = 'rgba(75, 46, 25, 0.28)';
            target.lineWidth = 2;
            target.beginPath();
            target.moveTo(sx + 10, sy + 22);
            target.lineTo(sx + 16, sy + 18);
            target.lineTo(sx + 24, sy + 25);
            target.stroke();
        }
        return;
    }
    if (info.kind === 'forest') {
        target.fillStyle = h > 0.5 ? 'rgba(32, 22, 12, 0.18)' : 'rgba(132, 87, 43, 0.16)';
        target.fillRect(sx + 7, sy + 18, 14, 5);
        return;
    }
    if (info.kind === 'birch') {
        target.fillStyle = 'rgba(245, 238, 210, 0.24)';
        target.fillRect(sx + 5, sy + 13 + h * 9, 18, 4);
        target.fillStyle = 'rgba(130, 190, 95, 0.18)';
        target.fillRect(sx + 18, sy + 6, 8, 8);
        return;
    }
    if (info.kind === 'pine') {
        target.fillStyle = 'rgba(35, 25, 14, 0.2)';
        target.fillRect(sx + 5, sy + 20, 22, 4);
        target.fillStyle = 'rgba(20, 70, 38, 0.2)';
        target.fillRect(sx + 12, sy + 8 + h * 8, 14, 5);
        return;
    }
    if (info.kind === 'maple') {
        target.fillStyle = h > 0.5 ? 'rgba(94, 145, 64, 0.22)' : 'rgba(160, 170, 74, 0.18)';
        target.fillRect(sx + 4 + h * 6, sy + 12, 22, 5);
        target.fillRect(sx + 12, sy + 23, 12, 4);
        return;
    }
    if (info.kind === 'meadow') {
        drawTinyFlower(target, sx + 7 + h * 14, sy + 10, h > 0.5 ? '#f4d35e' : '#f7a1c4');
        drawTinyFlower(target, sx + 22, sy + 22, h > 0.4 ? '#f7a1c4' : '#d6f5a7');
        target.fillStyle = 'rgba(80, 135, 55, 0.14)';
        target.fillRect(sx + 4, sy + 26, 22, 3);
        return;
    }
    if (info.kind === 'darkForest') {
        target.fillStyle = 'rgba(26, 42, 32, 0.22)';
        target.fillRect(sx + 2, sy + 3, grid - 4, grid - 6);
        target.fillStyle = 'rgba(92, 62, 122, 0.18)';
        target.fillRect(sx + 16, sy + 10 + h * 8, 8, 8);
        target.fillStyle = 'rgba(38, 86, 48, 0.16)';
        target.fillRect(sx + 5, sy + 22, 20, 4);
        return;
    }
    if (info.kind === 'jungle') {
        target.fillStyle = 'rgba(8, 28, 22, 0.24)';
        target.fillRect(sx + 2, sy + 3, grid - 4, grid - 6);
        target.fillStyle = 'rgba(32, 120, 62, 0.2)';
        target.fillRect(sx + 4 + h * 8, sy + 17, 24, 6);
        target.fillStyle = 'rgba(122, 185, 74, 0.22)';
        target.fillRect(sx + 6, sy + 8 + h * 8, 13, 7);
        target.fillRect(sx + 18, sy + 5 + h * 10, 9, 10);
        target.strokeStyle = 'rgba(55, 145, 72, 0.24)';
        target.lineWidth = 2;
        target.beginPath();
        target.moveTo(sx + 6, sy + 27);
        target.quadraticCurveTo(sx + 16, sy + 12, sx + 27, sy + 6 + h * 9);
        target.stroke();
        return;
    }
    if (info.kind === 'reedWetland') {
        target.fillStyle = 'rgba(105, 130, 62, 0.28)';
        target.fillRect(sx + 5, sy + 18, 24, 5);
        target.fillStyle = 'rgba(80, 110, 50, 0.26)';
        target.fillRect(sx + 10, sy + 7, 4, 18);
        target.fillRect(sx + 21, sy + 10, 3, 16);
        return;
    }
    if (info.kind === 'village') {
        target.fillStyle = 'rgba(94, 67, 38, 0.12)';
        target.fillRect(sx + 4 + h * 8, sy + 13, 18, 4);
        target.fillStyle = 'rgba(210, 178, 105, 0.09)';
        target.fillRect(sx + 8 + h * 8, sy + 22, 12, 3);
        if (h > 0.62) {
            target.fillStyle = 'rgba(62, 96, 48, 0.18)';
            target.fillRect(sx + 5, sy + 5, 8, 8);
        }
        return;
    }
    if (info.kind === 'bamboo') {
        target.fillStyle = 'rgba(98, 72, 38, 0.18)';
        target.fillRect(sx + 2, sy + 5, grid - 4, grid - 8);
        target.fillStyle = h > 0.5 ? 'rgba(184, 151, 70, 0.22)' : 'rgba(38, 95, 45, 0.18)';
        target.fillRect(sx + 4 + h * 5, sy + 17, 22, 5);
        target.fillStyle = 'rgba(32, 64, 28, 0.16)';
        target.fillRect(sx + 10, sy + 7 + h * 6, 9, 10);
        target.strokeStyle = 'rgba(116, 165, 70, 0.22)';
        target.lineWidth = 2;
        target.beginPath();
        target.moveTo(sx + 7, sy + 26);
        target.lineTo(sx + 17, sy + 12);
        target.moveTo(sx + 24, sy + 28);
        target.lineTo(sx + 14, sy + 16);
        target.stroke();
        return;
    }
    if (info.kind === 'tallgrass') {
        target.fillStyle = 'rgba(185, 205, 84, 0.12)';
        target.fillRect(sx + 2, sy + 4, grid - 4, grid - 8);
        target.fillStyle = h > 0.55 ? 'rgba(72, 106, 45, 0.2)' : 'rgba(220, 190, 80, 0.16)';
        target.fillRect(sx + 4, sy + 18 + h * 6, 23, 4);
        target.fillStyle = 'rgba(36, 70, 36, 0.13)';
        target.fillRect(sx + 12 + h * 8, sy + 8, 12, 12);
        return;
    }
    target.fillStyle = h > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)';
    target.fillRect(sx + 8, sy + 10 + h * 12, 14, 4);
}

function drawTinyFlower(target, x, y, petalColor) {
    target.fillStyle = '#376f3f';
    target.fillRect(x + 2, y + 4, 2, 6);
    target.fillStyle = petalColor;
    target.fillRect(x, y + 1, 3, 3);
    target.fillRect(x + 4, y + 1, 3, 3);
    target.fillRect(x + 2, y - 1, 3, 3);
    target.fillStyle = '#ffd166';
    target.fillRect(x + 3, y + 2, 2, 2);
}

function drawMeadowFlowerCluster(x, y) {
    const flowers = [
        { x: -12, y: -18, color: '#f7a1c4' },
        { x: -2, y: -24, color: '#f4d35e' },
        { x: 10, y: -17, color: '#d6f5a7' },
        { x: 2, y: -12, color: '#a8d8ff' },
    ];
    for (const flower of flowers) {
        ctx.fillStyle = '#3f7f45';
        ctx.fillRect(x + flower.x + 2, y + flower.y + 5, 2, 12);
        ctx.fillStyle = flower.color;
        ctx.fillRect(x + flower.x, y + flower.y + 2, 3, 3);
        ctx.fillRect(x + flower.x + 4, y + flower.y + 2, 3, 3);
        ctx.fillRect(x + flower.x + 2, y + flower.y, 3, 3);
        ctx.fillRect(x + flower.x + 2, y + flower.y + 4, 3, 3);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + flower.x + 3, y + flower.y + 3, 2, 2);
    }
    ctx.fillStyle = 'rgba(80, 135, 55, 0.24)';
    ctx.fillRect(x - 17, y - 6, 34, 5);
}

function drawWaterHighlights(now) {
    const grid = 40;
    const startX = Math.floor(camera.x / grid) * grid;
    const startY = Math.floor(camera.y / grid) * grid;
    for (let y = startY; y < camera.y + VIEW.height + grid; y += grid) {
        for (let x = startX; x < camera.x + VIEW.width + grid; x += grid) {
            const info = terrainInfoAt(x + grid / 2, y + grid / 2);
            if (info.kind !== 'water') continue;
            const wave = Math.sin((x + now * 0.08) * 0.035 + y * 0.018);
            ctx.fillStyle = wave > 0.35 ? 'rgba(160, 225, 255, 0.28)' : 'rgba(20, 65, 105, 0.18)';
            ctx.fillRect(worldX(x) + 7, worldY(y) + 14 + wave * 3, 24, 3);
        }
    }
}

function spawnWaterRipple(x, y) {
    if (Math.random() > 0.38) return;
    const angle = Math.random() * Math.PI * 2;
    const offset = Math.random() * 14;
    addParticle({
        x: x + Math.cos(angle) * offset,
        y: y + Math.sin(angle) * offset * 0.45,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 8,
        color: 'rgba(170, 230, 255, 0.75)',
        size: 2 + Math.random() * 3,
        life: 0.18 + Math.random() * 0.18,
    });
}

function drawWorldObjects(now) {
    drawDecorations();
    const drawables = [
        ...(isNearView(state.camp, 160) ? [{ y: state.camp.y, draw: () => drawCamp() }] : []),
        ...allVillages().filter(village => isNearView(village, village.radius + 180)).flatMap(village => villageDrawables(village)),
        ...(state.roadLamps || []).filter(lamp => isNearView(lamp, 120)).map(lamp => ({ y: lamp.y, draw: () => drawVillageLamp(lamp) })),
        ...(isNearView(state.ruins, 220) ? [{ y: state.ruins.y, draw: () => drawRuins() }] : []),
        ...state.bambooTraps.filter(t => isNearView(t, 90)).map(t => ({ y: t.y - 2, draw: () => drawBambooTrap(t) })),
        ...state.placedFences.filter(t => isNearView(t, 120)).map(t => ({ y: t.y + 8, draw: () => drawBambooFence(t) })),
        ...state.placedStations.filter(t => isNearView(t, 140)).map(t => ({ y: t.y + 10, draw: () => drawStation(t) })),
        ...state.placedTorches.filter(t => isNearView(t, 120)).map(t => ({ y: t.y, draw: () => drawPlacedTorch(t) })),
        ...state.projectiles.filter(p => isNearView(p, 120)).map(p => ({ y: p.y, draw: () => drawProjectile(p) })),
        ...(state.indoorProjectiles || []).filter(p => !p.indoor && isNearView(p, 160)).map(p => ({ y: p.y, draw: () => drawOutdoorVillagerProjectile(p) })),
        ...visibleResources(180).map(r => ({ y: r.y, draw: () => drawResource(r) })),
        ...(state.roadSigns || []).filter(sign => isNearView(sign, 140)).map(sign => ({ y: sign.y + 18, draw: () => drawRoadSign(sign) })),
        ...state.enemies.filter(e => (e.hp > 0 || (e.deathAt && now - e.deathAt < 1200)) && isNearView(e, 220)).map(e => ({ y: e.y, draw: () => drawEnemy(e, now) })),
        ...state.outdoorVillagers.filter(npc => npc.hp > 0 && isNearView(npc, 160)).map(npc => ({ y: npc.y, draw: () => drawOutdoorVillager(npc, now) })),
        { y: state.player.y, draw: () => drawPlayer(now) },
    ];
    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach(item => item.draw());
}

function drawOutdoorVillager(npc, now) {
    const oldX = npc.x;
    const oldY = npc.y;
    npc.x = worldX(oldX);
    npc.y = worldY(oldY);
    if (npc.kind === 'totem') drawVillageTotem(npc);
    else drawIndoorNpc(npc);
    npc.x = oldX;
    npc.y = oldY;
}

function shouldDrawResource(r) {
    if (r.hp <= 0 && (!r.deathAt || performance.now() - r.deathAt > 1600)) return false;
    if (!isNearView(r, 180)) return false;
    return true;
}

function villageDrawables(village) {
    const items = [];
    if (village.tier === 'fortress') {
        items.push({ y: village.y - village.radius, draw: () => drawFortressVillageGround(village) });
        items.push(...fortressWallDrawables(village));
    }
    village.amenities?.lamps?.forEach(lamp => items.push({ y: lamp.y, draw: () => drawVillageLamp(lamp) }));
    if (village.amenities?.altar) items.push({ y: village.amenities.altar.y + 32, draw: () => drawGreenMotherAltar(village.amenities.altar) });
    if (village.amenities?.flag) items.push({ y: village.amenities.flag.y + 22, draw: () => drawVillageFlag(village.amenities.flag, village) });
    if (village.amenities?.noticeBoard) items.push({ y: village.amenities.noticeBoard.y + 20, draw: () => drawVillageNoticeBoard(village.amenities.noticeBoard) });
    if (village.amenities?.bell) items.push({ y: village.amenities.bell.y + 26, draw: () => drawVillageBell(village.amenities.bell) });
    if (village.well) items.push({ y: village.y + 8, draw: () => drawVillageWell(village.well) });
    village.buildings.forEach(building => items.push({ y: building.y + building.h * 0.5, draw: () => drawVillageHouse(building) }));
    return items;
}

function fortressWallDrawables(village) {
    const { w, h } = fortressWallSize(village);
    const thickness = fortressWallThickness();
    const gateHalf = fortressGates(village).north.half;
    const closed = isFortressGateClosed();
    const left = village.x - w / 2;
    const right = village.x + w / 2;
    const top = village.y - h / 2;
    const bottom = village.y + h / 2;
    const chunk = 58;
    const items = [];
    const push = segment => items.push({ y: segment.sortY, draw: () => drawFortressWallSegment(segment) });
    push({ kind: 'horizontal', edge: 'north', x: left, y: top, w: w / 2 - gateHalf, h: thickness, sortY: top + thickness });
    push({ kind: 'horizontal', edge: 'north', x: village.x + gateHalf, y: top, w: w / 2 - gateHalf, h: thickness, sortY: top + thickness });
    push({ kind: 'horizontal', edge: 'south', x: left, y: bottom - thickness, w: w / 2 - gateHalf, h: thickness, sortY: bottom });
    push({ kind: 'horizontal', edge: 'south', x: village.x + gateHalf, y: bottom - thickness, w: w / 2 - gateHalf, h: thickness, sortY: bottom });
    const addVerticalChunks = (wallX, startY, endY, edge) => {
        for (let y = startY; y < endY; y += chunk) {
            const height = Math.min(chunk, endY - y);
            push({ kind: 'vertical', edge, x: wallX, y, w: thickness, h: height, sortY: y + height });
        }
    };
    addVerticalChunks(left, top + thickness, village.y - gateHalf, 'west');
    addVerticalChunks(left, village.y + gateHalf, bottom - thickness, 'west');
    addVerticalChunks(right - thickness, top + thickness, village.y - gateHalf, 'east');
    addVerticalChunks(right - thickness, village.y + gateHalf, bottom - thickness, 'east');
    if (closed) {
        push({ kind: 'gateHorizontal', x: village.x - gateHalf, y: top + 4, w: gateHalf * 2, h: thickness - 8, sortY: top + thickness });
        push({ kind: 'gateHorizontal', x: village.x - gateHalf, y: bottom - thickness + 4, w: gateHalf * 2, h: thickness - 8, sortY: bottom });
        push({ kind: 'gateVertical', x: left + 4, y: village.y - gateHalf, w: thickness - 8, h: gateHalf * 2, sortY: village.y + gateHalf });
        push({ kind: 'gateVertical', x: right - thickness + 4, y: village.y - gateHalf, w: thickness - 8, h: gateHalf * 2, sortY: village.y + gateHalf });
    } else {
        push({ kind: 'gateMarker', x: village.x - 34, y: top - 6, w: 68, h: 8, sortY: top + thickness });
        push({ kind: 'gateMarker', x: village.x - 34, y: bottom - 2, w: 68, h: 8, sortY: bottom });
        push({ kind: 'gateMarker', x: left - 6, y: village.y - 34, w: 8, h: 68, sortY: village.y + 34 });
        push({ kind: 'gateMarker', x: right - 2, y: village.y - 34, w: 8, h: 68, sortY: village.y + 34 });
    }
    return items;
}

function drawFortressVillageGround(village) {
    const x = worldX(village.x);
    const y = worldY(village.y);
    const { w, h } = fortressWallSize(village);
    const thickness = fortressWallThickness();
    const left = x - w / 2;
    const top = y - h / 2;
    ctx.fillStyle = 'rgba(143, 123, 84, 0.78)';
    ctx.fillRect(left + thickness, top + thickness, w - thickness * 2, h - thickness * 2);
    ctx.strokeStyle = 'rgba(223, 206, 161, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(left + thickness + 10, top + thickness + 10, w - thickness * 2 - 20, h - thickness * 2 - 20);
}

function drawFortressWallSegment(segment) {
    const x = worldX(segment.x);
    const y = worldY(segment.y);
    if (segment.kind === 'gateMarker') {
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(x, y, segment.w, segment.h);
        return;
    }
    if (segment.kind === 'gateHorizontal' || segment.kind === 'gateVertical') {
        ctx.fillStyle = '#4a301f';
        ctx.fillRect(x, y, segment.w, segment.h);
        ctx.strokeStyle = '#8a6040';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, Math.max(0, segment.w - 4), Math.max(0, segment.h - 4));
        return;
    }
    ctx.fillStyle = '#2f3945';
    ctx.fillRect(x, y, segment.w, segment.h);
    ctx.fillStyle = '#6f7780';
    ctx.fillRect(x + 4, y + 4, Math.max(0, segment.w - 8), Math.max(0, segment.h - 8));
    ctx.fillStyle = '#8c98a4';
    if (segment.kind === 'horizontal') {
        ctx.fillStyle = '#303946';
        ctx.fillRect(x + 3, y + 3, Math.max(0, segment.w - 6), 10);
        ctx.fillStyle = '#8c98a4';
        for (let yy = y + 16; yy < y + segment.h - 6; yy += 16) {
            ctx.fillRect(x + 8, yy, Math.max(0, segment.w - 16), 5);
        }
        const capY = segment.edge === 'north' ? y - 6 : y + segment.h - 4;
        ctx.fillStyle = '#66737f';
        for (let px = x + 10; px < x + segment.w - 18; px += 34) {
            ctx.fillRect(px, capY, 18, 12);
        }
        return;
    }
    ctx.fillStyle = '#303946';
    ctx.fillRect(x + 3, y + 3, 10, Math.max(0, segment.h - 6));
    ctx.fillStyle = '#8c98a4';
    for (let yy = y + 10; yy < y + segment.h - 12; yy += 16) {
        ctx.fillRect(x + 8, yy, Math.max(0, segment.w - 16), 5);
    }
    const capX = segment.edge === 'west' ? x - 5 : x + segment.w - 7;
    ctx.fillStyle = '#66737f';
    for (let py = y + 8; py < y + segment.h - 18; py += 34) {
        ctx.fillRect(capX, py, 12, 18);
    }
}

function drawVillageNoticeBoard(board) {
    const x = worldX(board.x);
    const y = worldY(board.y);
    drawShadow(x, y + 12, 54, 9);
    ctx.fillStyle = '#4a2b17';
    ctx.fillRect(x - 27, y - 32, 54, 42);
    ctx.fillStyle = '#d6a06a';
    ctx.fillRect(x - 22, y - 27, 44, 31);
    ctx.fillStyle = '#3f2a1c';
    ctx.fillRect(x - 16, y - 19, 24, 3);
    ctx.fillRect(x - 16, y - 10, 32, 3);
    ctx.fillRect(x - 16, y - 1, 20, 3);
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(x - 18, y + 8, 6, 24);
    ctx.fillRect(x + 12, y + 8, 6, 24);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(x + 12, y - 23, 6, 6);
}

function drawVillageBell(bell) {
    const x = worldX(bell.x);
    const y = worldY(bell.y);
    const ringing = performance.now() < (bell.lastRungAt || 0) + 900;
    drawShadow(x, y + 17, 48, 10);
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(x - 22, y - 28, 6, 56);
    ctx.fillRect(x + 16, y - 28, 6, 56);
    ctx.fillRect(x - 24, y - 30, 48, 7);
    ctx.fillStyle = '#d49a5a';
    ctx.beginPath();
    ctx.moveTo(x - 13, y - 20);
    ctx.lineTo(x + 13, y - 20);
    ctx.lineTo(x + 18, y + 8);
    ctx.lineTo(x - 18, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 9, y + 6, 18, 5);
    if (ringing) {
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - 6, 30, -0.25, Math.PI + 0.25);
        ctx.stroke();
    }
}

function drawVillageLamp(lamp) {
    const x = worldX(lamp.x);
    const y = worldY(lamp.y);
    const night = nightAmount();
    drawShadow(x, y + 12, 20, 6);
    if (lamp.kind === 'cultTreeLamp') {
        drawShadow(x, y + 8, 24, 6);
        ctx.fillStyle = '#3a2417';
        ctx.fillRect(x - 5, y - 38, 10, 48);
        ctx.fillStyle = '#5fae49';
        ctx.fillRect(x - 13, y - 34, 26, 8);
        ctx.fillStyle = night > 0.05 ? '#8cff66' : '#2f7f45';
        ctx.fillRect(x - 7, y - 31, 14, 14);
        ctx.fillStyle = '#d5ffd8';
        if (night > 0.05) ctx.fillRect(x - 3, y - 27, 6, 6);
        if (night > 0.05) {
            ctx.fillStyle = `rgba(140, 255, 102, ${0.12 + night * 0.28})`;
            ctx.fillRect(x - 28, y - 48, 56, 46);
        }
        return;
    }
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(x - 3, y - 30, 6, 42);
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(x - 9, y - 36, 18, 9);
    ctx.fillStyle = night > 0.05 ? '#ffd166' : '#8a5a32';
    ctx.fillRect(x - 6, y - 30, 12, 12);
    if (night > 0.05) {
        ctx.fillStyle = `rgba(255, 209, 102, ${0.12 + night * 0.22})`;
        ctx.fillRect(x - 22, y - 43, 44, 34);
    }
}

function drawGreenMotherAltar(altar) {
    const x = worldX(altar.x);
    const y = worldY(altar.y);
    drawShadow(x, y + 8, 92, 18);
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(x - 42, y - 18, 84, 28);
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(x - 34, y - 26, 68, 14);
    ctx.fillStyle = '#123d2b';
    ctx.fillRect(x - 50, y - 10, 30, 10);
    ctx.fillRect(x + 20, y - 12, 34, 11);
    ctx.fillStyle = '#8cff66';
    ctx.fillRect(x - 10, y - 46, 20, 34);
    ctx.fillRect(x - 24, y - 33, 48, 8);
    ctx.fillStyle = '#d5ffd8';
    ctx.fillRect(x - 4, y - 39, 8, 8);
}

function drawVillageFlag(flag, village) {
    const x = worldX(flag.x);
    const y = worldY(flag.y);
    const profile = villageVisualProfile(village).flag;
    drawShadow(x, y + 10, 44, 8);
    ctx.fillStyle = profile.dark;
    ctx.fillRect(x - 4, y - 66, 8, 78);
    ctx.fillRect(x - 4, y - 62, 48, 7);
    ctx.fillStyle = profile.main;
    ctx.fillRect(x + 6, y - 54, 52, 34);
    ctx.fillStyle = profile.trim;
    ctx.fillRect(x + 6, y - 54, 52, 6);
    ctx.fillRect(x + 6, y - 25, 52, 5);
    if (profile.emblem === 'bar') {
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(x + 18, y - 44, 28, 5);
        ctx.fillRect(x + 28, y - 50, 8, 22);
    } else if (profile.emblem === 'patch') {
        ctx.fillStyle = '#f0d7a1';
        ctx.fillRect(x + 18, y - 45, 12, 10);
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(x + 36, y - 38, 10, 8);
    } else {
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(x + 25, y - 47, 8, 22);
        ctx.fillRect(x + 17, y - 40, 24, 8);
    }
}

function drawRoadSign(sign) {
    const x = worldX(sign.x);
    const y = worldY(sign.y);
    const label = `${sign.label} ${Math.max(1, Math.round(sign.distance / 100))}里`;
    drawShadow(x, y + 11, 42, 7);
    ctx.fillStyle = '#4a2b17';
    ctx.fillRect(x - 3, y - 36, 6, 48);
    ctx.save();
    ctx.translate(x, y - 30);
    ctx.rotate(sign.angle);
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(-8, -10, 78, 20);
    ctx.beginPath();
    ctx.moveTo(70, -14);
    ctx.lineTo(93, 0);
    ctx.lineTo(70, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2d2117';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -10, 78, 20);
    ctx.beginPath();
    ctx.moveTo(70, -14);
    ctx.lineTo(93, 0);
    ctx.lineTo(70, 14);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#f0d7a1';
    ctx.font = 'bold 11px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + Math.cos(sign.angle) * 36, y - 26 + Math.sin(sign.angle) * 36);
    ctx.textAlign = 'left';
}

function drawVillageHouse(building) {
    const x = worldX(building.x);
    const y = worldY(building.y);
    const left = Math.round(x - building.w / 2);
    const top = Math.round(y - building.h / 2);
    const style = villageHouseStyle(building);
    drawShadow(x, y + building.h * 0.38, building.w * 0.82, 14);
    if (building.village?.tier === 'jungleCult') {
        drawCultTreeHouse(building, x, y, left, top, style);
        return;
    }
    if (building.kind === 'guardFortress') {
        drawGuardFortressHouse(building, x, y, left, top, style);
        return;
    }
    if (building.kind === 'basicVillager' || building.kind === 'basicElder') {
        drawBasicVillageHouse(building, x, y, left, top, style);
        return;
    }
    ctx.fillStyle = '#4b3b28';
    ctx.fillRect(left + 8, top + 82, building.w - 16, 10);
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(left + 12, top + 44, building.w - 24, building.h - 42);
    ctx.fillStyle = style.wall;
    ctx.fillRect(left + 18, top + 50, building.w - 36, building.h - 54);
    for (let yy = top + 54; yy < top + building.h - 10; yy += 14) {
        ctx.fillStyle = yy % 28 ? 'rgba(90, 52, 29, 0.45)' : 'rgba(40, 30, 20, 0.35)';
        ctx.fillRect(left + 18, yy, building.w - 36, 4);
    }
    const roof = style.roof;
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(left - 6, top + 48);
    ctx.lineTo(x, top + 2);
    ctx.lineTo(left + building.w + 6, top + 48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(214, 160, 106, 0.22)';
    ctx.fillRect(left + 14, top + 44, building.w - 28, 5);
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(left + 24, top + 35, 18, 5);
    ctx.fillRect(left + building.w - 44, top + 37, 20, 4);
    ctx.fillStyle = '#a38350';
    ctx.fillRect(left + 18, top + 58, 9, 7);
    ctx.fillRect(left + building.w - 29, top + 72, 8, 8);
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(left + 36, top + 67, 5, 34);
    ctx.fillRect(left + building.w - 42, top + 64, 5, 36);
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(x - 14, y + building.h * 0.12, 28, 38);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x + 7, y + building.h * 0.27, 3, 3);
    drawVillageHouseTorch(building.x - 24, building.doorY + 8);
    drawVillageHouseTorch(building.x + 24, building.doorY + 8);
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(left + 14, y + building.h * 0.46, building.w - 28, 7);
    if (building.kind === 'blacksmith') {
        ctx.fillStyle = '#20262d';
        ctx.fillRect(left + building.w - 14, top + 8, 12, 34);
        ctx.fillStyle = 'rgba(80, 80, 80, 0.35)';
        ctx.fillRect(left + building.w - 12, top - 4, 8, 10);
    }
    drawVillageHouseSign(building, x, top, style);
}

function drawCultTreeHouse(building, x, y, left, top, style) {
    drawShadow(x, y + building.h * 0.4, building.w * 0.64, 12);
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(x - 12, top + 18, 24, building.h - 14);
    ctx.fillStyle = '#6b3b1f';
    ctx.fillRect(x - 5, top + 26, 5, building.h - 30);
    ctx.fillStyle = '#0f2d22';
    ctx.fillRect(left + 10, top + 8, building.w - 20, 24);
    ctx.fillStyle = '#123d2b';
    ctx.fillRect(left + 4, top + 24, building.w - 8, 22);
    ctx.fillStyle = '#2f8f4f';
    ctx.fillRect(left + 18, top + 14, building.w - 36, 6);
    ctx.fillStyle = '#3a2417';
    ctx.fillRect(left + 14, top + 46, building.w - 28, building.h - 48);
    ctx.fillStyle = '#5fae49';
    ctx.fillRect(left + 20, top + 54, building.w - 40, 4);
    ctx.fillRect(left + 14, top + 74, building.w - 28, 4);
    ctx.fillStyle = '#1f120b';
    ctx.fillRect(x - 11, y + building.h * 0.1, 22, 30);
    ctx.fillStyle = '#8cff66';
    ctx.fillRect(x + 6, y + building.h * 0.25, 4, 4);
    ctx.fillStyle = '#5fae49';
    ctx.fillRect(left + 8, y + building.h * 0.42, building.w - 16, 5);
    ctx.fillStyle = style.sign;
    ctx.font = 'bold 10px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(style.icon, x, top + 75);
    ctx.textAlign = 'left';
}

function drawGuardFortressHouse(building, x, y, left, top, style) {
    drawShadow(x, y + building.h * 0.4, building.w * 0.9, 16);
    ctx.fillStyle = '#2f3945';
    ctx.fillRect(left + 8, top + 36, building.w - 16, building.h - 34);
    ctx.fillStyle = style.wall;
    ctx.fillRect(left + 18, top + 46, building.w - 36, building.h - 48);
    ctx.fillStyle = '#8c98a4';
    for (let yy = top + 50; yy < top + building.h - 10; yy += 16) ctx.fillRect(left + 18, yy, building.w - 36, 5);
    ctx.fillStyle = '#303946';
    ctx.fillRect(left + 10, top + 22, building.w - 20, 24);
    for (let px = left + 16; px < left + building.w - 16; px += 30) {
        ctx.fillStyle = '#66737f';
        ctx.fillRect(px, top + 12, 18, 16);
    }
    ctx.fillStyle = '#171d24';
    ctx.fillRect(x - 17, y + building.h * 0.11, 34, 44);
    ctx.fillStyle = '#d8e5f2';
    ctx.fillRect(x - 35, top + 66, 18, 8);
    ctx.fillRect(x + 17, top + 66, 18, 8);
    drawVillageHouseTorch(building.x - 30, building.doorY + 10);
    drawVillageHouseTorch(building.x + 30, building.doorY + 10);
    drawVillageHouseSign(building, x, top, style);
}

function drawBasicVillageHouse(building, x, y, left, top, style) {
    ctx.fillStyle = '#3f2a1c';
    ctx.fillRect(left + 14, top + 48, building.w - 28, building.h - 46);
    ctx.fillStyle = style.wall;
    ctx.fillRect(left + 20, top + 55, building.w - 40, building.h - 58);
    ctx.fillStyle = '#6f5a2f';
    ctx.beginPath();
    ctx.moveTo(left - 2, top + 52);
    ctx.lineTo(x, top + 12);
    ctx.lineTo(left + building.w + 2, top + 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(90,52,29,0.45)';
    for (let yy = top + 58; yy < top + building.h - 12; yy += 18) ctx.fillRect(left + 22, yy, building.w - 44, 4);
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(x - 12, y + building.h * 0.12, 24, 34);
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(left + 10, y + building.h * 0.44, building.w - 20, 6);
    drawVillageHouseSign(building, x, top, style);
}

function villageHouseStyle(building) {
    const base = {
        basicElder: { roof: '#6b5333', wall: '#8a6a3d', sign: '#d8e5f2', icon: '⚔' },
        basicVillager: { roof: '#6f5a2f', wall: '#8a6a3d', sign: '#d6a06a', icon: '△' },
        blacksmith: { roof: '#2f3945', wall: '#735536', sign: '#d8e5f2', icon: '⚒' },
        apothecary: { roof: '#355d3f', wall: '#5f7a46', sign: '#8cff66', icon: '+' },
        kitchen: { roof: '#7a3f2a', wall: '#8a5a32', sign: '#ffd166', icon: '♨' },
        guard: { roof: '#3a4652', wall: '#6f7780', sign: '#d8e5f2', icon: '▲' },
        guardFortress: { roof: '#303946', wall: '#6f7780', sign: '#d8e5f2', icon: '▣' },
        merchant: { roof: '#8a5a32', wall: '#9a7a4a', sign: '#ffd166', icon: 'SHOP' },
        elder: { roof: '#3f2a1c', wall: '#6b4a2f', sign: '#b77dff', icon: '◆' },
        unemployed: { roof: '#5a4632', wall: '#7a6040', sign: '#d6a06a', icon: '•' },
        cultPriest: { roof: '#123d2b', wall: '#3a2417', sign: '#8cff66', icon: '✣' },
        cultHerbalist: { roof: '#1f6b3f', wall: '#3a2417', sign: '#d5ffd8', icon: '⌘' },
        cultHealer: { roof: '#244d2a', wall: '#3a2417', sign: '#9cffb7', icon: '✚' },
        cultHunter: { roof: '#173b24', wall: '#3a2417', sign: '#ffd166', icon: '⌁' },
        cultGuard: { roof: '#0f2d22', wall: '#3a2417', sign: '#d8e5f2', icon: '▣' },
        cultVillager: { roof: '#123d2b', wall: '#3a2417', sign: '#9cffb7', icon: '◇' },
    }[building.kind] || { roof: building.roofTone > 0.5 ? '#5a4632' : '#4b3b28', wall: '#7a6040', sign: '#d6a06a', icon: '•' };
    const profile = villageVisualProfile(building.village).building;
    if (building.village?.tier === 'fortress' && building.kind !== 'guardFortress') {
        return { ...base, roof: profile.roof, wall: profile.wall, sign: profile.sign };
    }
    if (building.village?.tier === 'basic') {
        return { ...base, roof: profile.roof, wall: profile.wall, sign: profile.sign };
    }
    return base;
}

function drawVillageHouseSign(building, x, top, style) {
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(x - 15, top + 54, 30, 15);
    ctx.fillStyle = style.sign;
    ctx.font = `bold ${building.kind === 'merchant' ? 9 : 11}px "Microsoft YaHei"`;
    ctx.textAlign = 'center';
    ctx.fillText(style.icon, x, top + 66);
    ctx.textAlign = 'left';
}

function drawVillageHouseTorch(x, y) {
    const sx = worldX(x);
    const sy = worldY(y);
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(sx - 2, sy - 14, 4, 18);
    ctx.fillStyle = '#ff9f1c';
    ctx.fillRect(sx - 5, sy - 22, 10, 10);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(sx - 2, sy - 25, 4, 7);
    if (nightAmount() > 0.05) {
        ctx.fillStyle = 'rgba(255, 209, 102, 0.22)';
        ctx.fillRect(sx - 12, sy - 24, 24, 18);
    }
}

function drawVillageWell(well) {
    const x = worldX(well.x);
    const y = worldY(well.y);
    drawShadow(x, y + 7, 54, 13);
    if (well.broken) {
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - 24, y - 6, 18, 12);
        ctx.fillRect(x + 4, y - 10, 24, 14);
        ctx.fillStyle = '#66737f';
        ctx.fillRect(x - 12, y - 18, 14, 6);
        ctx.fillRect(x + 12, y + 4, 16, 5);
        ctx.fillStyle = 'rgba(31,95,146,0.38)';
        ctx.fillRect(x - 18, y + 8, 38, 5);
        return;
    }
    ctx.fillStyle = '#303946';
    ctx.fillRect(x - 22, y - 12, 44, 25);
    ctx.fillStyle = '#48515a';
    ctx.fillRect(x - 18, y - 17, 36, 10);
    ctx.fillStyle = '#8c98a4';
    ctx.fillRect(x - 23, y - 22, 46, 7);
    ctx.fillStyle = '#1f5f92';
    ctx.fillRect(x - 12, y - 7, 24, 11);
    ctx.fillStyle = 'rgba(216, 229, 242, 0.45)';
    ctx.fillRect(x - 6, y - 8, 12, 2);
    ctx.fillStyle = '#66737f';
    ctx.fillRect(x - 20, y - 10, 6, 6);
    ctx.fillRect(x + 14, y - 10, 6, 6);
}

function drawBambooFence(fence) {
    const x = worldX(fence.x);
    const y = worldY(fence.y);
    drawShadow(x, y + 2, 42, 8);
    ctx.strokeStyle = '#20351f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 16);
    ctx.lineTo(x + 20, y - 20);
    ctx.moveTo(x - 20, y - 4);
    ctx.lineTo(x + 20, y - 8);
    ctx.stroke();
    ctx.strokeStyle = '#9bd86a';
    ctx.lineWidth = 4;
    [-14, 0, 14].forEach(offset => {
        ctx.beginPath();
        ctx.moveTo(x + offset, y + 4);
        ctx.lineTo(x + offset + 3, y - 28);
        ctx.stroke();
    });
}

function drawBambooTrap(trap) {
    const x = worldX(trap.x);
    const y = worldY(trap.y);
    drawShadow(x, y + 2, 34, 7);
    ctx.strokeStyle = trap.used ? 'rgba(100, 80, 48, 0.7)' : '#d7f28a';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 16 + i * 9, y + 2);
        ctx.lineTo(x - 7 + i * 9, y - 18);
        ctx.lineTo(x + 2 + i * 9, y + 2);
        ctx.stroke();
    }
}

function drawSpawnDen(den) {
    const x = worldX(den.x);
    const y = worldY(den.y);
    drawShadow(x, y + 2, 54, 10);
    const colors = {
        frog: ['#1f5f4a', '#8cff66'],
        scorpion: ['#6d4121', '#d68a43'],
        bat: ['#241b3c', '#8fb8ff'],
        wolf: ['#46515d', '#d8e5f2'],
        slime: ['#168b64', '#5ee089'],
    }[den.kind] || ['#38414d', '#ffd166'];
    ctx.fillStyle = colors[0];
    ctx.fillRect(x - 20, y - 12, 40, 16);
    ctx.fillRect(x - 12, y - 22, 24, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 10, y - 16, 20, 9);
    ctx.fillStyle = colors[1];
    ctx.fillRect(x - 18, y - 6, 6, 4);
    ctx.fillRect(x + 12, y - 7, 6, 4);
}

function drawStation(station) {
    const x = worldX(station.x);
    const y = worldY(station.y);
    drawShadow(x, y + 4, station.radius * 2.1, 12);
    if (station.kind === 'potionTable') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(x - 24, y - 22, 48, 24);
        ctx.fillStyle = '#7dcbe8';
        ctx.fillRect(x - 14, y - 42, 10, 20);
        ctx.fillRect(x + 7, y - 36, 12, 14);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x - 12, y - 30, 6, 7);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 10, y - 30, 7, 5);
    } else if (station.kind === 'workbench') {
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(x - 28, y - 28, 56, 28);
        ctx.fillStyle = '#9a6436';
        ctx.fillRect(x - 24, y - 34, 48, 10);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(x - 20, y - 31, 16, 4);
        ctx.fillRect(x + 6, y - 31, 14, 4);
    } else if (station.kind === 'chest') {
        ctx.fillStyle = '#5a341d';
        ctx.fillRect(x - 25, y - 26, 50, 26);
        ctx.fillStyle = '#9a6436';
        ctx.fillRect(x - 28, y - 36, 56, 14);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(x - 20, y - 32, 40, 5);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 4, y - 24, 8, 8);
    } else if (station.kind === 'campfire') {
        drawSpriteGrounded('campfire', x, y + 4, 4);
    } else {
        ctx.fillStyle = '#3d4650';
        ctx.fillRect(x - 28, y - 30, 56, 30);
        ctx.fillStyle = '#20262d';
        ctx.fillRect(x - 18, y - 42, 36, 14);
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(x - 12, y - 25, 24, 12);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 6, y - 23, 12, 7);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(RESOURCE_LABELS[station.kind], x, y + 18);
    ctx.textAlign = 'left';
}

function drawPlacedTorch(torch) {
    const x = worldX(torch.x);
    const y = worldY(torch.y);
    drawShadow(x, y + 1, 18, 5);
    ctx.fillStyle = COLORS.trunk;
    ctx.fillRect(x - 3, y - 24, 6, 25);
    ctx.fillStyle = COLORS.fire1;
    ctx.fillRect(x - 5, y - 34, 10, 10);
    ctx.fillStyle = COLORS.fire2;
    ctx.fillRect(x - 2, y - 38, 5, 10);
}

function drawProjectile(projectile) {
    const x = worldX(projectile.x);
    const y = worldY(projectile.y);
    drawShadow(x, y + 16, 18, 6);
    if (projectile.kind === 'coalBomb') {
        ctx.fillStyle = '#161b22';
        ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(x + 3, y - 11, 5, 5);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 5, y - 14, 3, 4);
    } else if (projectile.kind === 'poisonVial') {
        ctx.fillStyle = '#3b1d54';
        ctx.fillRect(x - 5, y - 8, 10, 14);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x - 3, y - 4, 6, 8);
        ctx.fillStyle = '#d94bff';
        ctx.fillRect(x - 2, y - 11, 4, 3);
    } else if (projectile.kind === 'slingshotPebble') {
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(x - 3, y - 3, 6, 6);
        ctx.fillStyle = '#7b8794';
        ctx.fillRect(x - 1, y - 4, 3, 2);
    } else if (projectile.kind === 'simpleArrow' || projectile.kind === 'poisonArrow') {
        const dir = projectile.dir || normalize(projectile.targetX - projectile.startX, projectile.targetY - projectile.startY);
        const angle = Math.atan2(dir.y, dir.x);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = projectile.kind === 'poisonArrow' ? '#8cff66' : '#d8e5f2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();
        ctx.fillStyle = projectile.kind === 'poisonArrow' ? '#8cff66' : '#c5d6df';
        ctx.fillRect(10, -3, 6, 6);
        ctx.fillStyle = '#d6a06a';
        ctx.fillRect(-14, -4, 5, 3);
        ctx.fillRect(-14, 1, 5, 3);
        ctx.restore();
    }
}

function isNearView(item, margin = 0) {
    return item.x >= camera.x - margin
        && item.x <= camera.x + VIEW.width + margin
        && item.y >= camera.y - margin
        && item.y <= camera.y + VIEW.height + margin;
}

function drawCamp() {
    const x = worldX(state.camp.x);
    const y = worldY(state.camp.y);
    const groundY = y + 8;
    drawShadow(x, groundY, 76, 18);
    drawSpriteGrounded('campfire', x, groundY, 5);
    ctx.fillStyle = state.camp.repaired ? '#ffd166' : '#9fb3c8';
    ctx.font = 'bold 14px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(state.camp.repaired ? '营地篝火' : '破损篝火', x, y + 54);
}

function drawRuins() {
    const x = worldX(state.ruins.x);
    const y = worldY(state.ruins.y);
    const groundY = y + 24;
    drawShadow(x, groundY, 150, 26);
    drawSpriteGrounded('ruins', x, groundY, 6);
    if (state.ruins.opened) {
        ctx.fillStyle = 'rgba(183, 125, 255, 0.55)';
        ctx.fillRect(x - 18, y - 6, 36, 58);
    }
}

function drawResource(r) {
    const x = worldX(r.x);
    const y = worldY(r.y);
    if (r.hp <= 0) {
        drawResourceDeathAnimation(r, x, y);
        return;
    }
    const shake = r.shakeUntil && performance.now() < r.shakeUntil ? Math.sin(performance.now() / 18) * 3 : 0;
    const sprite = r.kind === 'tree' ? 'tree' : (r.kind === 'rock' ? 'rock' : (r.kind === 'ore' ? 'ore' : (SPRITES[r.kind] ? r.kind : null)));
    const showBar = r.hp < r.maxHp && performance.now() - (r.lastHarvestAt || 0) < 1800;
    if (sprite) {
        const scale = r.kind === 'tree' ? 5.8 : (r.kind === 'ore' ? 3.5 : 3.2);
        const groundY = y + (r.kind === 'tree' ? 6 : 0);
        drawShadow(x, groundY, r.radius * (r.kind === 'tree' ? 1.28 : 1.72), r.radius * (r.kind === 'tree' ? 0.38 : 0.4));
        if (r.kind === 'ore' || r.kind === 'rock') drawGroundContact(x, y, r.kind);
        drawSpriteGrounded(sprite, x + shake, groundY, scale);
    } else {
        drawGatherablePatch(r, x + shake, y);
    }
    if (showBar) drawMiniBar(x, y + 16, r.hp / r.maxHp, '#ffd166');
}

function drawResourceDeathAnimation(r, x, y) {
    const progress = clamp((performance.now() - (r.deathAt || performance.now())) / 1400, 0, 1);
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (BIOME_TREE_KINDS.includes(r.kind)) {
        ctx.translate(x, y + 6);
        ctx.rotate(-0.8 * progress);
        drawShadow(0, 8, r.radius * 0.95, 5);
        drawScaledTreeByKind(r.kind, -progress * 18, 0);
    } else {
        ctx.fillStyle = r.gives === 'stone' || r.gives === 'ore' ? '#66737f' : harvestParticleColor(r);
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(x - 18 + i * 8, y + 8 + Math.sin(i) * 3, 5, 4);
        }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawHardwoodTree(r, x, y) {
    const groundY = y + 6;
    drawShadow(x, groundY, r.radius * 1.48, r.radius * 0.42);
    drawScaledTreeByKind('hardwoodTree', x, groundY);
}

function drawJungleLeafPlant(r, x, y) {
    drawShadow(x, y + 4, 44, 9);
    const offset = hash2(r.x * 0.031, r.y * 0.031) > 0.5 ? 3 : -3;
    ctx.fillStyle = '#0f3d28';
    ctx.fillRect(x - 4, y - 30, 8, 34);
    const leaves = [
        [-30, -31, 34, 7, -1],
        [-24, -24, 28, 7, -1],
        [2, -38, 36, 8, 1],
        [6, -30, 30, 8, 1],
        [-38, -14, 38, 8, -1],
        [-30, -6, 30, 8, -1],
        [0, -17, 42, 8, 1],
        [6, -9, 34, 8, 1],
    ];
    leaves.forEach(([lx, ly, lw, lh, dir], index) => {
        ctx.fillStyle = index % 2 ? '#2fa35a' : '#1f7f45';
        ctx.fillRect(x + lx + offset * dir, y + ly, lw, lh);
        ctx.fillRect(x + lx + offset * dir + (dir < 0 ? 6 : 0), y + ly - 5, Math.max(8, lw - 10), 5);
        ctx.fillStyle = '#69e08e';
        ctx.fillRect(x + lx + offset * dir + 5, y + ly + 3, Math.max(6, lw - 12), 2);
    });
}

function drawJungleVine(r, x, y) {
    drawShadow(x, y + 3, 38, 7);
    const flip = hash2(r.x * 0.02, r.y * 0.02) > 0.5 ? 1 : -1;
    ctx.fillStyle = '#8cff66';
    drawPixelVineSegment(x - 18, y - 42, flip);
    drawPixelVineSegment(x + 14, y - 44, -flip);
    ctx.fillStyle = '#8cff66';
    ctx.fillRect(x - 16 + flip * 2, y - 28, 8, 5);
    ctx.fillRect(x + 8 - flip * 2, y - 18, 8, 5);
}

function drawPixelVineSegment(x, y, dir) {
    const steps = [
        [0, 0], [4 * dir, 7], [0, 14], [-4 * dir, 21], [0, 28], [4 * dir, 36], [0, 44],
    ];
    ctx.fillStyle = '#5fae49';
    steps.forEach(([ox, oy]) => ctx.fillRect(x + ox - 2, y + oy, 5, 8));
    ctx.fillStyle = '#2f7f45';
    steps.forEach(([ox, oy], index) => {
        if (index % 2) ctx.fillRect(x + ox + dir * 3, y + oy + 3, 6, 4);
    });
}

function drawJungleFruitBush(r, x, y) {
    drawShadow(x, y + 2, 36, 8);
    ctx.fillStyle = '#1f5f34';
    ctx.fillRect(x - 18, y - 28, 36, 10);
    ctx.fillRect(x - 24, y - 20, 48, 13);
    ctx.fillRect(x - 18, y - 8, 36, 10);
    ctx.fillStyle = '#2fa35a';
    ctx.fillRect(x - 26, y - 14, 52, 8);
    ctx.fillRect(x - 14, y - 31, 28, 5);
    ctx.fillStyle = '#ff7a3d';
    ctx.fillRect(x - 12, y - 22, 7, 7);
    ctx.fillRect(x + 6, y - 16, 7, 7);
    ctx.fillRect(x - 1, y - 8, 6, 6);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 2, y - 25, 5, 5);
}

function drawJungleHerb(r, x, y) {
    drawShadow(x, y + 1, 30, 6);
    ctx.fillStyle = '#17613a';
    ctx.fillRect(x - 3, y - 26, 6, 29);
    ctx.fillStyle = '#69e08e';
    ctx.fillRect(x - 19, y - 20, 18, 7);
    ctx.fillRect(x + 1, y - 24, 20, 7);
    ctx.fillRect(x - 15, y - 9, 15, 6);
    ctx.fillRect(x + 1, y - 13, 16, 6);
    ctx.fillStyle = '#d5ffd8';
    ctx.fillRect(x - 5, y - 32, 10, 8);
    ctx.fillRect(x - 2, y - 36, 4, 4);
}

function drawButtressRoot(r, x, y) {
    const groundY = y + 6;
    drawShadow(x, groundY, r.radius * 1.42, r.radius * 0.42);
    drawScaledTreeByKind('buttressRoot', x, groundY);
}

function drawJungleOrchid(r, x, y) {
    drawShadow(x, y + 1, 28, 6);
    ctx.fillStyle = '#17613a';
    ctx.fillRect(x - 2, y - 27, 4, 29);
    ctx.fillStyle = '#2fa35a';
    ctx.fillRect(x - 16, y - 14, 14, 6);
    ctx.fillRect(x + 2, y - 18, 16, 6);
    ctx.fillRect(x - 11, y - 7, 10, 5);
    ctx.fillRect(x + 1, y - 9, 11, 5);
    ctx.fillStyle = '#f4a6d7';
    ctx.fillRect(x - 9, y - 33, 8, 8);
    ctx.fillRect(x + 1, y - 34, 8, 8);
    ctx.fillRect(x - 4, y - 39, 8, 7);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 1, y - 31, 3, 3);
}

function drawPoisonBloom(r, x, y) {
    drawShadow(x, y + 1, 30, 7);
    ctx.fillStyle = '#1f5f34';
    ctx.fillRect(x - 3, y - 24, 6, 25);
    ctx.fillStyle = '#8cff66';
    ctx.fillRect(x - 16, y - 24, 14, 7);
    ctx.fillRect(x + 2, y - 24, 14, 7);
    ctx.fillRect(x - 12, y - 14, 10, 6);
    ctx.fillRect(x + 2, y - 14, 10, 6);
    ctx.fillStyle = '#d94bff';
    ctx.fillRect(x - 10, y - 35, 20, 9);
    ctx.fillRect(x - 6, y - 42, 12, 8);
    ctx.fillRect(x - 12, y - 30, 24, 6);
    ctx.fillStyle = '#241330';
    ctx.fillRect(x - 3, y - 33, 6, 5);
    ctx.fillRect(x - 5, y - 27, 10, 3);
}

function drawGatherablePatch(r, x, y) {
    if (r.kind === 'hardwoodTree') {
        drawHardwoodTree(r, x, y);
        return;
    }
    if (r.kind === 'buttressRoot') {
        drawButtressRoot(r, x, y);
        return;
    }
    if (r.kind === 'jungleLeafPlant') {
        drawJungleLeafPlant(r, x, y);
        return;
    }
    if (r.kind === 'jungleVine') {
        drawJungleVine(r, x, y);
        return;
    }
    if (r.kind === 'jungleFruitBush') {
        drawJungleFruitBush(r, x, y);
        return;
    }
    if (r.kind === 'jungleHerb') {
        drawJungleHerb(r, x, y);
        return;
    }
    if (r.kind === 'jungleOrchid') {
        drawJungleOrchid(r, x, y);
        return;
    }
    if (r.kind === 'poisonBloom') {
        drawPoisonBloom(r, x, y);
        return;
    }
    if (BIOME_TREE_KINDS.includes(r.kind) && !['tree', 'hardwoodTree', 'buttressRoot'].includes(r.kind)) {
        drawVariantTree(r, x, y);
        return;
    }
    if (STUMP_TREE_KIND[r.kind]) {
        drawTreeStump(r, x, y);
        return;
    }
    if (r.kind === 'resinPatch' || r.kind === 'sapPatch') {
        drawShadow(x, y + 1, 22, 6);
        ctx.fillStyle = r.kind === 'resinPatch' ? '#5a341d' : '#6b3b1f';
        ctx.fillRect(x - 9, y - 20, 18, 20);
        ctx.fillStyle = r.kind === 'resinPatch' ? '#ffb84d' : '#d68a43';
        ctx.fillRect(x - 4, y - 16, 7, 10);
        ctx.fillRect(x + 3, y - 8, 4, 6);
        return;
    }
    if (r.kind === 'beehive') {
        drawShadow(x, y + 1, 30, 7);
        ctx.fillStyle = '#7a4b13';
        ctx.fillRect(x - 14, y - 28, 28, 22);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 10, y - 25, 20, 4);
        ctx.fillRect(x - 12, y - 17, 24, 4);
        ctx.fillRect(x - 8, y - 9, 16, 3);
        ctx.fillStyle = '#2b1a0a';
        ctx.fillRect(x - 3, y - 16, 6, 6);
        return;
    }
    if (r.kind === 'meadowFlower') {
        drawShadow(x, y + 1, 32, 7);
        drawMeadowFlowerCluster(x, y);
        return;
    }
    if (r.kind === 'bamboo') {
        const variant = Math.floor(hash2(r.x * 0.03, r.y * 0.03) * 4);
        const sprite = getBambooSprite(variant);
        ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height + 8);
        return;
    }
    if (r.kind === 'mudClump') {
        drawShadow(x, y + 1, 24, 7);
        ctx.fillStyle = '#4b3b28';
        ctx.fillRect(x - 14, y - 8, 28, 9);
        ctx.fillStyle = '#6d5438';
        ctx.fillRect(x - 9, y - 12, 17, 6);
        ctx.fillStyle = 'rgba(150, 120, 70, 0.35)';
        ctx.fillRect(x - 4, y - 10, 8, 2);
        return;
    }
    if (r.kind === 'tallGrass') {
        drawTallGrassClump(r, x, y, false);
        return;
    }
    if (r.kind === 'stump') {
        drawShadow(x, y + 1, 32, 8);
        ctx.fillStyle = COLORS.bark;
        ctx.fillRect(x - 15, y - 13, 30, 17);
        ctx.fillStyle = COLORS.trunk;
        ctx.fillRect(x - 12, y - 18, 24, 9);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(x - 5, y - 16, 10, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x - 2, y - 15, 5, 2);
        return;
    }
    if (r.kind === 'woodFence') {
        drawShadow(x, y + 1, 28, 6);
        ctx.strokeStyle = '#20351f';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x - 14, y - 12);
        ctx.lineTo(x + 14, y - 14);
        ctx.moveTo(x - 14, y - 1);
        ctx.lineTo(x + 14, y - 3);
        ctx.stroke();
        ctx.strokeStyle = '#8a5a32';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 5);
        ctx.lineTo(x - 6, y - 22);
        ctx.moveTo(x + 8, y + 5);
        ctx.lineTo(x + 6, y - 22);
        ctx.stroke();
        return;
    }
    if (r.kind === 'reed') {
        drawShadow(x, y + 1, 24, 6);
        ctx.fillStyle = '#5d7b3a';
        ctx.fillRect(x - 12, y - 27, 4, 28);
        ctx.fillRect(x - 1, y - 34, 4, 35);
        ctx.fillRect(x + 10, y - 24, 4, 25);
        ctx.fillStyle = '#c79649';
        ctx.fillRect(x - 2, y - 38, 6, 8);
        return;
    }
    if (r.kind === 'lotus') {
        drawShadow(x, y + 1, 30, 7);
        ctx.fillStyle = '#2f7f58';
        ctx.fillRect(x - 15, y - 8, 30, 8);
        ctx.fillStyle = '#f4a6d7';
        ctx.fillRect(x - 8, y - 22, 6, 10);
        ctx.fillRect(x + 2, y - 22, 6, 10);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 3, y - 16, 6, 5);
        return;
    }
    if (r.kind === 'cactus') {
        drawShadow(x, y + 1, 24, 7);
        ctx.fillStyle = '#1d6b47';
        ctx.fillRect(x - 5, y - 40, 10, 40);
        ctx.fillRect(x - 16, y - 27, 10, 8);
        ctx.fillRect(x + 6, y - 22, 12, 8);
        ctx.fillStyle = '#58c47a';
        ctx.fillRect(x - 2, y - 36, 3, 32);
        ctx.fillStyle = '#ff6b9a';
        ctx.fillRect(x - 8, y - 32, 6, 6);
        return;
    }
    if (r.kind === 'mushroom') {
        drawShadow(x, y + 1, 26, 7);
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(x - 4, y - 16, 8, 15);
        ctx.fillStyle = '#d94b5f';
        ctx.fillRect(x - 13, y - 25, 26, 11);
        ctx.fillStyle = '#f8a6b3';
        ctx.fillRect(x - 9, y - 28, 18, 5);
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(x - 7, y - 23, 4, 3);
        ctx.fillRect(x + 5, y - 22, 4, 3);
        return;
    }
    if (r.kind === 'toxicMushroom') {
        drawShadow(x, y + 1, 26, 7);
        ctx.fillStyle = '#d9f5bc';
        ctx.fillRect(x - 4, y - 15, 8, 14);
        ctx.fillStyle = '#6f2a8a';
        ctx.fillRect(x - 13, y - 24, 26, 11);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x - 10, y - 27, 20, 5);
        ctx.fillRect(x - 7, y - 22, 4, 3);
        ctx.fillRect(x + 5, y - 21, 4, 3);
        ctx.fillStyle = '#d94bff';
        ctx.fillRect(x - 1, y - 29, 3, 4);
        return;
    }
    drawShadow(x, y + 1, 28, 6);
    if (r.kind === 'pebble') {
        drawShadow(x, y + 1, 20, 5);
        ctx.fillStyle = COLORS.stone2;
        ctx.fillRect(x - 8, y - 7, 16, 8);
        ctx.fillStyle = COLORS.stone1;
        ctx.fillRect(x - 5, y - 9, 8, 3);
        return;
    }
    if (r.kind === 'berry') {
        ctx.fillStyle = COLORS.grass2;
        ctx.fillRect(x - 16, y - 18, 32, 18);
        ctx.fillStyle = COLORS.grass1;
        ctx.fillRect(x - 10, y - 26, 20, 13);
        ctx.fillStyle = COLORS.berry;
        ctx.fillRect(x - 9, y - 22, 5, 5);
        ctx.fillRect(x + 5, y - 19, 5, 5);
        ctx.fillRect(x - 1, y - 28, 5, 5);
    } else if (r.kind === 'herb') {
        ctx.fillStyle = COLORS.herb;
        ctx.fillRect(x - 3, y - 26, 6, 27);
        ctx.fillRect(x - 15, y - 18, 13, 6);
        ctx.fillRect(x + 2, y - 22, 15, 6);
        ctx.fillStyle = '#d5ffd8';
        ctx.fillRect(x - 2, y - 29, 4, 5);
    } else if (r.kind === 'flower') {
        ctx.fillStyle = COLORS.grass1;
        ctx.fillRect(x - 2, y - 24, 4, 25);
        drawTinyFlower(ctx, x - 8, y - 25, COLORS.flower1);
        drawTinyFlower(ctx, x + 7, y - 28, COLORS.flower2);
    } else {
        ctx.fillStyle = COLORS.grass1;
        ctx.fillRect(x - 14, y - 17, 5, 18);
        ctx.fillRect(x - 4, y - 24, 5, 25);
        ctx.fillRect(x + 8, y - 16, 5, 17);
        ctx.fillStyle = COLORS.grass2;
        ctx.fillRect(x - 9, y - 24, 6, 6);
        ctx.fillRect(x + 4, y - 28, 6, 6);
    }
}

function drawVariantTree(r, x, y) {
    const groundY = y + 6;
    drawShadow(x, groundY, r.radius * 1.28, r.radius * 0.38);
    drawScaledTreeByKind(r.kind, x, groundY);
}

function treePalette(kind) {
    const palettes = {
        tree: { outline: '#20351f', leaf1: '#2eb872', leaf3: '#73e29b', trunk: '#8a5a32', bark: '#5a341d' },
        birchTree: { outline: '#20351f', leaf1: '#8fcf68', leaf3: '#d6f5a7', trunk: '#f1ead3', bark: '#2d2a25' },
        pineTree: { outline: '#143f22', leaf1: '#1f5a35', leaf3: '#3f8f4f', trunk: '#5a341d', bark: '#3b2417' },
        mapleTree: { outline: '#20351f', leaf1: '#5f8f45', leaf3: '#b88745', trunk: '#6b3b1f', bark: '#3d2417' },
        deadTree: { outline: '#2d2117', leaf1: '#5a4632', leaf3: '#7a6040', trunk: '#5a4632', bark: '#2d2117' },
        darkTree: { outline: '#07150f', leaf1: '#102f22', leaf3: '#1f5a35', trunk: '#342819', bark: '#151f16' },
        grassOakTree: { outline: '#20351f', leaf1: '#4f9f45', leaf3: '#8fcf68', trunk: '#6b3b1f', bark: '#3d2417' },
        meadowBlossomTree: { outline: '#3f4525', leaf1: '#78b95a', leaf3: '#bfe889', trunk: '#7a4b2a', bark: '#4f321d' },
        forestOakTree: { outline: '#17251f', leaf1: '#245f35', leaf3: '#63bf69', trunk: '#5a341d', bark: '#2d2117' },
        swampCypressTree: { outline: '#17251f', leaf1: '#28583f', leaf3: '#6f8750', trunk: '#46351f', bark: '#1f2d1d' },
        reedWillowTree: { outline: '#20351f', leaf1: '#6f9f55', leaf3: '#c6e07b', trunk: '#5b4a2d', bark: '#2d2a1d' },
        mineIronwoodTree: { outline: '#1f2428', leaf1: '#4f5964', leaf3: '#b77dff', trunk: '#3f3f3f', bark: '#1f2428' },
        ruinsElderTree: { outline: '#1f2428', leaf1: '#4f5964', leaf3: '#b77dff', trunk: '#4a4036', bark: '#2f3945' },
        hardwoodTree: { outline: '#0f2d22', leaf1: '#123d2b', leaf3: '#2f8f4f', trunk: '#3a2417', bark: '#6b3b1f' },
        buttressRoot: { outline: '#0f2d22', leaf1: '#123d2b', leaf3: '#1f6b3f', trunk: '#3a2417', bark: '#8a5a32' },
    };
    return palettes[kind] || palettes.tree;
}

function drawTreeStump(r, x, y) {
    const treeKind = STUMP_TREE_KIND[r.kind] || 'tree';
    const palette = treePalette(treeKind);
    const wide = treeKind === 'forestOakTree' || treeKind === 'hardwoodTree' || treeKind === 'buttressRoot';
    drawShadow(x, y + 1, wide ? 38 : 30, wide ? 9 : 7);
    ctx.fillStyle = palette.bark;
    ctx.fillRect(x - (wide ? 15 : 12), y - 16, wide ? 30 : 24, 16);
    ctx.fillStyle = palette.trunk;
    ctx.fillRect(x - (wide ? 12 : 9), y - 20, wide ? 24 : 18, 9);
    ctx.fillStyle = palette.leaf3;
    ctx.fillRect(x - (wide ? 7 : 5), y - 18, wide ? 14 : 10, 3);
    ctx.fillStyle = palette.bark;
    if (treeKind === 'birchTree') {
        ctx.fillRect(x - 11, y - 12, 7, 2);
        ctx.fillRect(x + 3, y - 8, 7, 2);
    } else if (treeKind === 'pineTree') {
        ctx.fillRect(x - 3, y - 23, 6, 5);
    } else if (treeKind === 'buttressRoot') {
        ctx.fillRect(x - 28, y - 6, 18, 5);
        ctx.fillRect(x + 10, y - 6, 20, 5);
    } else if (treeKind === 'swampCypressTree' || treeKind === 'reedWillowTree') {
        ctx.fillRect(x - 18, y - 5, 13, 4);
        ctx.fillRect(x + 7, y - 5, 15, 4);
    } else if (treeKind === 'mineIronwoodTree' || treeKind === 'ruinsElderTree') {
        ctx.fillRect(x - 10, y - 11, 20, 3);
        ctx.fillStyle = palette.leaf3;
        ctx.fillRect(x + 8, y - 18, 4, 5);
    }
}

function drawScaledTreeByKind(kind, x, y) {
    ctx.save();
    ctx.translate(x, y);
    drawTreeByKind(kind, 0, 0);
    ctx.restore();
}

function drawTreeByKind(kind, x, y) {
    const palette = treePalette(kind);
    const scale = kind === 'tree' ? 5.8 : (kind === 'hardwoodTree' ? 6.35 : (kind === 'buttressRoot' ? 6.2 : 6.1));
    drawTreeSpriteWithPalette(x, y, scale, palette, TREE_VARIANT_SPRITES[kind]);
}

const TREE_VARIANT_SPRITES = {
    grassOakTree: [
        '.......oooo.......',
        '......oooooo......',
        '....oolllllloo....',
        '..oollllLllllloo..',
        '.olllllllllllllllo.',
        'ollllLlllllllllllo',
        'olllllllllllLllllo',
        '.olllllllllllllllo.',
        '..oolllllLlllloo..',
        '....oolllttlloo...',
        '.......tttt.......',
        '......ttTTtt......',
        '.....otttttto.....',
        '.......tttt.......',
        '.......tttt.......',
        '..................',
    ],
    meadowBlossomTree: [
        '.......ooLoo......',
        '......oooooo......',
        '....oolllLlloo....',
        '..oollllllllLloo..',
        '.olllLllllllllllo.',
        'olllllllllLllllllo',
        '.olllLllllllllllo.',
        '..oolllllLlllloo..',
        '....oolllllloo....',
        '.......tttt.......',
        '......ttTTtt......',
        '.......tttt.......',
        '.......tttt.......',
        '.......tttt.......',
        '..................',
    ],
    forestOakTree: [
        '.......oooo.......',
        '......oooooo......',
        '....oolllllloo....',
        '..oollllLllllloo..',
        '.olllllllllllllllo.',
        'ollllLlllllllllllo',
        'olllllllllllLllllo',
        '.olllllllllllllllo.',
        '..oollllLllllloo..',
        '....oollttlloo....',
        '......tttTTtt......',
        '.....otttTTttto....',
        '....ootttttttoo....',
        '.......tttt........',
        '.......tttt........',
        '..................',
    ],
    birchTree: [
        '......oo...oo.....',
        '.....ooo..oooo....',
        '...oollloolllloo..',
        '..olllllllLllllo..',
        '.olllLllllllllllo.',
        '..ollllllllllloo..',
        '....oolllooloo....',
        '......ttttt.......',
        '......tTTtt.......',
        '.....tttTtt.......',
        '.....TttTtt.......',
        '....ttttTttt......',
        '.....ttttt........',
        '.....ttttt........',
        '.....ttttt........',
        '..................',
    ],
    pineTree: [
        '........oo........',
        '.......oLLo.......',
        '......oLLLLo......',
        '......oLLLLo......',
        '.....oLLLLLLo.....',
        '....oLLLLLLLLo....',
        '...oollllllllloo..',
        '..oollllllllllloo.',
        '.oollllllllllllloo',
        '...oollllllllloo..',
        '......oottoo......',
        '.......tttt.......',
        '.......tTtt.......',
        '.......tttt.......',
        '.......tttt.......',
        '..................',
    ],
    mapleTree: [
        '.......oLoo.......',
        '......oooooo......',
        '....oolllLlloo....',
        '..oollLlllllloo...',
        '.ollllllllllllllo.',
        '..olllLllllllLlo..',
        '...oolllllllloo...',
        '.....oolllloo.....',
        '.......ttt........',
        '......ttTTtt......',
        '.....otttttto.....',
        '.......ttt........',
        '.......ttt........',
        '..................',
    ],
    deadTree: [
        '........T.........',
        '....T...T....T....',
        '.....T..t...T.....',
        '..T...Ttt..T......',
        '...T..tttT........',
        '.....ttTTt..T.....',
        '....tttTTttT......',
        '....tttTTtt.......',
        '...T.ttTTt........',
        '......ttTt........',
        '......ttTt........',
        '.....ttTTt........',
        '.....ttTTt........',
        '......ttt.........',
        '......ttt.........',
        '..................',
    ],
    darkTree: [
        '.......oooo.......',
        '......oooooo......',
        '....oollllllloo...',
        '..oolllLlllllloo..',
        '.ollllllllllllllo.',
        '..olllLllllLlllo..',
        '...oollllllllloo..',
        '.....oollllloo....',
        '......ttTTtt......',
        '.....otttttto.....',
        '.......tttt.......',
        '.......tttt.......',
        '..................',
    ],
    swampCypressTree: [
        '........oo........',
        '.......olLo.......',
        '......ollllo......',
        '......ollllo......',
        '.....ollllllo.....',
        '....oolllllloo....',
        '.....ollllllo.....',
        '......ollllo......',
        '......ttTtt.......',
        '......ttTtt.......',
        '.....tttTttt......',
        '....ottTTttto.....',
        '......ttTtt.......',
        '......ttTtt.......',
        '..................',
    ],
    reedWillowTree: [
        '.......oooo.......',
        '.....oooooooo.....',
        '...oollllllllloo..',
        '..ollllLlllllllo..',
        '.ollllllllllllllo.',
        '..oolllllllllloo..',
        '....oollllllloo...',
        '..L..LtttL..L.....',
        '..L..LttTL..L.....',
        '.L...ttTTt...L....',
        '.....ttTTt........',
        '.....ttttt........',
        '.....ttttt........',
        '.....ttttt........',
        '..................',
    ],
    mineIronwoodTree: [
        '.......oooo.......',
        '......oooooo......',
        '....oolllllloo....',
        '...olllLlllllo....',
        '..olllllllllllo...',
        '....oollllloo.....',
        '......otttto......',
        '.....tttTTtt......',
        '.....ttTTTtt......',
        '.....tttTTtt......',
        '......ttttt.......',
        '......ttttt.......',
        '......ttttt.......',
        '..................',
    ],
    ruinsElderTree: [
        '...T....oo....T...',
        '..T...oolloo...T..',
        '..T..oollllloo.T..',
        '....ollllLlllo....',
        '...oolllllllloo...',
        '..T..oolllloo..T..',
        '......tttTtt......',
        '....T.ttTTtt.T....',
        '.....ttTTTtt......',
        '...T...ttt...T....',
        '......tttt........',
        '......tttt........',
        '......tttt........',
        '..................',
    ],
    hardwoodTree: [
        '.......oooo.......',
        '......oooooo......',
        '....oolllllloo....',
        '..oolllLlllllloo..',
        '.olllllllllllllllo.',
        '..ollllLlllllloo..',
        '....oolllllLoo....',
        '......oolloo......',
        '.......ttt........',
        '.......tTt........',
        '......ttTt........',
        '......tTTt........',
        '......ttTt........',
        '.....tttTt........',
        '.....ttTTt........',
        '....otttTtto......',
        '.....tttTt........',
        '.....ttttt........',
    ],
    buttressRoot: [
        '.......oooo.......',
        '......oooooo......',
        '....oolllLlloo....',
        '...ollllllllllo...',
        '..ollllLllllllo...',
        '...oollllllloo....',
        '.....oollloo......',
        '.......ttt........',
        '......ttTt........',
        '......tTTt........',
        '......ttTt........',
        '.....ottTtto......',
        '....oottTttoo.....',
        '...oo.ttTtt.oo....',
        '..oo..ttTtt..oo...',
        '.oo...ttttt...oo..',
    ],
};

function drawHardwoodPixelTree(x, y) {
    const config = { trunk: '#3a2417', bark: '#6b3b1f', leaf: '#123d2b', leaf2: '#1f6b3f', leaf3: '#2f8f4f' };
    drawOrganicTrunk(x, y, [
        [0, 0, -4, -30, 5, -58, 0, -92, 18],
        [0, -48, -24, -63, -39, -79, -51, -102, 8],
        [1, -55, 27, -69, 45, -86, 58, -108, 8],
        [0, -68, -4, -87, 4, -105, 0, -126, 7],
    ], config);
    drawOrganicCanopy(x, y - 118, [
        [-42, 3, 50, 25, config.leaf],
        [-8, -22, 55, 30, config.leaf2],
        [38, 2, 48, 24, config.leaf],
        [-24, 26, 66, 25, '#0f3d28'],
        [24, 25, 58, 24, config.leaf3],
        [0, 5, 72, 29, '#145033'],
    ], '#0f2d22');
    ctx.fillStyle = 'rgba(140,255,102,0.16)';
    ctx.fillRect(x - 32, y - 88, 64, 5);
}

function drawButtressPixelTree(x, y) {
    const config = { trunk: '#3a2417', bark: '#8a5a32', leaf: '#123d2b', leaf2: '#1f6b3f', leaf3: '#2f8f4f' };
    drawOrganicTrunk(x, y, [
        [0, 0, -3, -25, 3, -47, 0, -74, 15],
        [0, -42, -19, -53, -30, -67, -38, -84, 6],
        [1, -44, 20, -56, 31, -69, 40, -87, 6],
    ], config);
    drawOrganicCanopy(x, y - 86, [
        [-30, -3, 36, 19, config.leaf],
        [-2, -18, 38, 22, config.leaf2],
        [27, -1, 34, 18, config.leaf],
        [-9, 16, 48, 19, config.leaf3],
    ], '#0f2d22');
    drawRootClaws(x, y, '#5a341d', [[-38, 2], [-24, -5], [25, -5], [39, 2]]);
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(x - 4, y - 44, 6, 38);
}

const TREE_PIXEL_PALETTE = {
    tree: { o: '#20351f', l: '#2eb872', L: '#73e29b', t: '#8a5a32', T: '#5a341d' },
    grassOakTree: { o: '#20351f', l: '#4f9f45', L: '#b8e88c', t: '#6b3b1f', T: '#3d2417', a: '#d6a85b' },
    meadowBlossomTree: { o: '#3f4525', l: '#78b95a', L: '#bfe889', t: '#7a4b2a', T: '#4f321d', f: '#f4a6d7', F: '#ffd6ec' },
    forestOakTree: { o: '#17251f', l: '#245f35', L: '#63bf69', t: '#5a341d', T: '#2d2117', h: '#21150e' },
    birchTree: { o: '#20351f', l: '#9ddc76', L: '#f0ffd2', t: '#f1ead3', T: '#2d2a25' },
    pineTree: { o: '#143f22', l: '#1f5a35', L: '#73e29b', t: '#5a341d', T: '#3b2417' },
    mapleTree: { o: '#20351f', l: '#4f8f45', L: '#b88745', t: '#6b3b1f', T: '#3d2417', r: '#c85a2a' },
    deadTree: { o: '#2d2117', l: '#3b2d22', L: '#7a6040', t: '#5a4632', T: '#2d2117' },
    darkTree: { o: '#07150f', l: '#102f22', L: '#1f5a35', t: '#342819', T: '#151f16', p: '#5c3f82' },
    swampCypressTree: { o: '#17251f', l: '#28583f', L: '#9aaa69', t: '#46351f', T: '#1f2d1d', m: '#6f8750', R: '#4b3b28' },
    reedWillowTree: { o: '#20351f', l: '#6f9f55', L: '#c6e07b', t: '#5b4a2d', T: '#2d2a1d', m: '#9ecf63', R: '#c79649' },
    mineIronwoodTree: { o: '#1f2428', l: '#4f5964', L: '#d7bcff', t: '#3f3f3f', T: '#1f2428', c: '#b77dff', M: '#7c8790' },
    ruinsElderTree: { o: '#1f2428', l: '#4f5964', L: '#d7bcff', t: '#4a4036', T: '#2f3945', c: '#b77dff', p: '#d7bcff' },
    hardwoodTree: { o: '#0f2d22', l: '#123d2b', L: '#2f8f4f', t: '#3a2417', T: '#6b3b1f' },
    buttressRoot: { o: '#0f2d22', l: '#123d2b', L: '#1f6b3f', t: '#3a2417', T: '#8a5a32', R: '#5a341d' },
};

const TREE_PIXEL_ROWS = {
    tree: SPRITES.tree.rows,
    grassOakTree: [
        '.........ooooooo.........',
        '......ooollllllooo.......',
        '....oollllLlllllloo......',
        '...ollllllLllllllllo.....',
        '..ollllLllllllllllLlo....',
        '.olllllllllllllllllllo...',
        '..olllllllLllllllLlllo...',
        '...olllllllllllllllllo...',
        '....ooolllllallllooo....',
        '.......ootttTtttoo.......',
        '.......otttTTttto........',
        '......ottttTTtttto.......',
        '.....oootttTTtttooo......',
        '....oo....ttt....oo......',
        '..........ttt............',
    ],
    meadowBlossomTree: [
        '.........ooFoooo.........',
        '......oolllfllloo........',
        '....oollLllllllLloo......',
        '...ollllflllFllllllo.....',
        '..ollLllllllllllfLLlo....',
        '.olllllflllllllllllllo...',
        '..ollllllllFllllllfllo...',
        '...oolllflllllllllloo....',
        '.....ooolllllllFooo......',
        '........otttTtto.........',
        '.......otttTTttto........',
        '......ottttTTtttto.......',
        '..........ttt............',
        '..........ttt............',
    ],
    forestOakTree: [
        '........ooooooo..........',
        '.....ooolllllllooo.......',
        '...oolllllLllllllloo.....',
        '..ollllllllllllllllllo....',
        '.ollllLlllllllllllllllo...',
        'ollllllllllllllllllllllo..',
        'olllllllLllllllllLlllllo..',
        '.olllllllllllllllllllllo..',
        '..oollllllllLlllllllooo...',
        '....ooolllllhllllooo......',
        '.......ootttTTttoo........',
        '......ottttTTtttto........',
        '....ooottttTTttttooo......',
        '..oo....tttTTtt....oo.....',
        '........tttTTtt...........',
    ],
    birchTree: [
        '.......ooo...ooo.........',
        '.....oollloooLlloo.......',
        '....olLllllllLllllo......',
        '...olllllllolllllllo.....',
        '....oollloooolllloo......',
        '......tt...tt...tt.......',
        '......tT...Tt...tT.......',
        '.....ttt...tt...ttt......',
        '.....Ttt...tT...Ttt......',
        '....tttt...tt...tttt.....',
        '....tTtt...Tt...tTtt.....',
        '....tttt...tt...tttt.....',
        '.....tt....tt....tt......',
    ],
    pineTree: [
        '............o............',
        '...........oLo...........',
        '..........oLLLo..........',
        '.........oLLLLLo.........',
        '........oLLLLLLLo........',
        '.......oLLLLLLLLLo.......',
        '......oolllllllloo.......',
        '.....oolllllllllloo......',
        '....oolllllllllllloo.....',
        '...oolllllllllllllloo....',
        '..oolllllllllllllllloo...',
        '..........ttTtt..........',
        '..........ttTtt..........',
        '.........tttTttt.........',
    ],
    mapleTree: [
        '........ooLrLoo..........',
        '.....oollLlllLloo........',
        '...oollllrllllllloo......',
        '..ollllLlllllrlllllo.....',
        '.ollllrlllllllllLlllo....',
        '..olllllllrllllllLllo....',
        '...oolllLlllllrllloo.....',
        '.....ooolllLlllooo.......',
        '........otttTtto.........',
        '.......otttTTttto........',
        '......ottttTTtttto.......',
        '.....o...ttt...o.........',
        '.........ttt............',
    ],
    deadTree: [
        '..........T..............',
        '.....T...Tt....T.........',
        '......T..tt...T..........',
        '...T...Tttt..T...........',
        '....T..ttTttT............',
        '......tttTtt.............',
        '.....tttTTttt............',
        '....tttTTTTtt............',
        '.....tttTTtt.............',
        '......ttTTt..............',
        '......ttTtt..............',
        '.....LLtttL..............',
    ],
    darkTree: [
        '...........opoo..........',
        '......ooollllllooo.......',
        '....oolllLllllLlloo......',
        '...olllllpllllllllo......',
        '..olllllllllllllllllo.....',
        '...oolllLllllLllloo......',
        '.....ooolllllllooo.......',
        '........otttTtto.........',
        '.......otttTTttto........',
        '......ottttTTtttto.......',
        '......p..ttt..p..........',
        '.........ttt............',
    ],
    swampCypressTree: [
        '..........ooo............',
        '........oollloo..........',
        '.......olllllllo.........',
        '......ollLlllllo.........',
        '.......ollllllo..........',
        '.....m..otttto..m........',
        '....m...tttTtt...m.......',
        '...m....ttTTtt....m......',
        '..m.....ttTTtt.....m.....',
        '........ttTTtt...........',
        '....R...ttTTtt...R.......',
        '..RR....ttTTtt....RR.....',
        '.RR.....tttttt.....RR....',
    ],
    reedWillowTree: [
        '.......ooolllooo.........',
        '.....oolllllLlloo........',
        '....ollllllllLlllo.......',
        '...olllLllllllllllo......',
        '....oolllllllllloo.......',
        '..m..m..m.tt.m..m..m.....',
        '..m..m..m.tt.m..m..m.....',
        '.m...m..ttTtt..m...m.....',
        '.m..m...ttTtt...m..m.....',
        '.......ttTTtt...........',
        '...R...ttTTtt...R.......',
        '.......tttttt...........',
    ],
    mineIronwoodTree: [
        '........oooccoo..........',
        '......oolllllloo.........',
        '.....olllcLlllllo........',
        '......ollllllloo.........',
        '........otttto...........',
        '.......tttMTtt..........',
        '......ttMMTMMtt.........',
        '......tttMTttt..........',
        '.....tttMMTttt..........',
        '........ttTtt...........',
        '......c.ttTtt.c.........',
        '........ttttt...........',
    ],
    ruinsElderTree: [
        '.....c.....T.....c.......',
        '......T..oooloo..T.......',
        '...T...oolllllloo........',
        '....T.ollcLlllllo...T....',
        '......oollllllloo..T.....',
        '...T....tttTtt...T.......',
        '....T..ttTTTtt..T........',
        '......ttTTpTTtt..........',
        '.....tttTTTTttt..........',
        '....T...ttTtt...T........',
        '........ttttt............',
    ],
    hardwoodTree: [
        '........oollllloo........',
        '.....oolllllllllloo......',
        '...oollllLllllllllloo....',
        '..ollllllllllllllllllo...',
        '.olllLllllllllllllLlllo..',
        '..oollllllllllllllllloo..',
        '....oolllLllllllLloo.....',
        '.......otttTTttto........',
        '......ottttTTtttto.......',
        '.....otttttTTttttto......',
        '....ootttttTTtttttoo.....',
        '.......ttttTTttt.........',
    ],
    buttressRoot: [
        '........oollllloo........',
        '......oolllLlllloo.......',
        '.....ollllllllllllo......',
        '......oolllllllloo.......',
        '........otttTtto.........',
        '.......otttTTttto........',
        '......ottttTTtttto.......',
        '.....RRtttTTtttRR........',
        '...RRR.tttTTttt.RRR......',
        '.RRR...tttTTttt...RRR....',
        '.......ttttttt...........',
    ],
};

function drawTreePixelSprite(kind, centerX, groundY) {
    const rows = TREE_PIXEL_ROWS[kind] || TREE_PIXEL_ROWS.tree;
    const palette = TREE_PIXEL_PALETTE[kind] || TREE_PIXEL_PALETTE.tree;
    const scale = kind === 'tree' ? 5.8 : (kind === 'forestOakTree' || kind === 'hardwoodTree' ? 4.8 : 4.6);
    const bounds = pixelRowsBounds(rows);
    const visibleWidth = (bounds.maxCol - bounds.minCol + 1) * scale;
    const originX = centerX - visibleWidth / 2 - bounds.minCol * scale;
    const originY = groundY - bounds.maxRow * scale - scale;
    for (let row = 0; row < rows.length; row++) {
        const line = rows[row];
        for (let col = 0; col < line.length; col++) {
            const key = line[col];
            if (key === '.' || key === ' ') continue;
            ctx.fillStyle = palette[key] || '#ffffff';
            ctx.fillRect(Math.round(originX + col * scale), Math.round(originY + row * scale), Math.ceil(scale), Math.ceil(scale));
        }
    }
}

function pixelRowsBounds(rows) {
    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;
    rows.forEach((line, row) => {
        for (let col = 0; col < line.length; col++) {
            if (line[col] === '.' || line[col] === ' ') continue;
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
        }
    });
    return { minRow, maxRow, minCol, maxCol };
}

function drawPineTree(x, y, config) {
    drawShadow(x, y + 2, 42, 9);
    drawOrganicTrunk(x, y, [[0, 0, -2, -24, 2, -50, 0, -82, 10]], config);
    [
        [y - 96, 15, 30],
        [y - 78, 24, 42],
        [y - 58, 31, 54],
    ].forEach(([top, half, height], index) => {
        drawPixelConiferLayer(x, top, half, height, index === 0 ? config.leaf2 : config.leaf, '#143f22');
        drawPixelBlob(x - half * 0.25, top + height * 0.45, half * 0.22, 4, config.leaf3, 4);
    });
}

function drawGrassOakTree(x, y, config) {
    drawOrganicTrunk(x, y, [
        [0, 0, -5, -28, 4, -52, 0, -74, 16],
        [0, -36, -18, -52, -31, -64, -38, -78, 7],
        [1, -42, 18, -58, 32, -66, 43, -82, 7],
    ], config);
    drawOrganicCanopy(x, y - 86, [
        [-32, 0, 36, 22, config.leaf],
        [-8, -18, 42, 26, config.leaf2],
        [26, -2, 36, 22, config.leaf],
        [-16, 16, 52, 24, config.leaf],
        [12, 16, 48, 22, config.leaf3],
    ], '#20351f');
    drawAcorns(x, y, [[-28, -65], [30, -70], [7, -55]]);
}

function drawBirchTree(x, y, config) {
    [[-12, 0, -16, -25, -10, -52, -18, -82], [2, 0, 5, -28, 1, -58, 8, -92], [15, 0, 13, -23, 20, -46, 21, -75]].forEach((line, index) => {
        drawPixelBezier(x + line[0], y + line[1], x + line[2], y + line[3], x + line[4], y + line[5], x + line[6], y + line[7], index === 1 ? 9 : 7, config.trunk);
        for (let step = 0; step < 5; step++) {
            const yy = y - 16 - step * 13 - index * 3;
            drawPixelLine(x + line[0] - 4 + (step % 2) * 5, yy, x + line[0] + 4 + (step % 2) * 4, yy + 2, 2, config.bark);
        }
    });
    drawOrganicCanopy(x, y - 89, [
        [-28, -4, 28, 17, config.leaf],
        [-9, -18, 31, 19, config.leaf3],
        [18, -3, 28, 17, config.leaf],
        [-17, 14, 38, 18, config.leaf2],
        [12, 15, 34, 16, config.leaf],
    ], '#20351f');
}

function drawMeadowBlossomTree(x, y, config) {
    drawOrganicTrunk(x, y, [
        [0, 0, 5, -23, -5, -45, 3, -67, 11],
        [0, -37, -21, -49, -31, -61, -38, -75, 5],
        [2, -42, 20, -55, 34, -63, 40, -78, 5],
    ], config);
    drawOrganicCanopy(x, y - 82, [
        [-29, -4, 33, 19, config.leaf],
        [-6, -20, 35, 21, '#bfe889'],
        [23, -2, 34, 19, config.leaf],
        [-12, 17, 46, 20, config.leaf2],
        [14, 14, 41, 19, '#a8d978'],
    ], '#3f4525');
    [
        [-30, -86, '#f4a6d7'], [-12, -99, '#ffd6ec'], [11, -91, '#ffb8df'],
        [32, -78, '#f4a6d7'], [-20, -64, '#ffd6ec'], [4, -72, '#fff0a8'],
        [18, -58, '#ffd6ec'], [-2, -90, '#f4a6d7'],
    ].forEach(([ox, oy, color]) => drawTinyFlower(ctx, x + ox, y + oy, color));
}

function drawForestOakTree(x, y, config) {
    drawShadow(x, y + 3, 70, 14);
    drawOrganicTrunk(x, y, [
        [0, 0, -7, -28, 8, -55, 0, -87, 22],
        [-2, -48, -26, -61, -43, -77, -55, -96, 9],
        [1, -54, 28, -67, 46, -82, 58, -104, 9],
        [0, -67, -10, -85, -2, -101, 0, -119, 8],
    ], config);
    drawOrganicCanopy(x, y - 112, [
        [-43, 1, 50, 27, config.leaf],
        [-10, -24, 55, 31, config.leaf2],
        [39, 1, 47, 25, config.leaf],
        [-30, 25, 65, 26, '#1f4f30'],
        [22, 26, 59, 25, config.leaf3],
        [0, 5, 72, 30, config.leaf],
    ], '#17251f');
    ctx.fillStyle = '#21150e';
    ctx.fillRect(x - 9, y - 45, 10, 4);
    ctx.fillRect(x - 11, y - 41, 14, 10);
    ctx.fillRect(x - 7, y - 31, 8, 4);
    drawRootClaws(x, y, config.trunk, [[-35, -6], [-18, -3], [22, -4], [39, -7]]);
}

function drawSwampCypressTree(x, y, config) {
    drawShadow(x, y + 3, 48, 12);
    drawOrganicTrunk(x, y, [
        [0, 0, -3, -32, 5, -63, -1, -101, 17],
        [-2, -52, -18, -69, -24, -83, -30, -99, 5],
        [3, -60, 19, -73, 28, -88, 34, -106, 5],
    ], config);
    drawOrganicCanopy(x, y - 101, [
        [-18, -6, 24, 20, config.leaf],
        [2, -14, 26, 22, config.leaf2],
        [-8, 12, 30, 19, config.leaf],
        [14, 12, 24, 17, config.leaf3],
    ], '#17251f');
    drawHangingMoss(x, y, config.leaf2, [[-24, -85, 32], [-8, -70, 40], [12, -83, 35], [27, -68, 28]]);
    drawRootClaws(x, y, '#4b3b28', [[-31, -3], [-18, -9], [21, -8], [34, -4]]);
}

function drawReedWillowTree(x, y, config) {
    drawShadow(x, y + 2, 58, 10);
    drawPixelBezier(x - 4, y, x + 12, y - 28, x - 13, y - 56, x + 8, y - 82, 10, config.trunk);
    drawOrganicCanopy(x, y - 98, [
        [-33, -4, 42, 20, config.leaf],
        [1, -11, 43, 22, config.leaf2],
        [-18, 11, 49, 20, config.leaf],
        [20, 10, 38, 18, config.leaf3],
    ], '#20351f');
    ctx.strokeStyle = config.leaf2;
    for (let i = -5; i <= 5; i++) {
        const sx = x + i * 9;
        drawPixelBezier(sx, y - 83 + Math.abs(i) * 2, sx - 4, y - 64, sx + 6, y - 46, sx - 2, y - 25, 4, config.leaf2);
    }
    ctx.fillStyle = '#c79649';
    ctx.fillRect(x - 36, y - 18, 5, 16);
    ctx.fillRect(x + 32, y - 20, 5, 18);
}

function drawMineIronwoodTree(x, y, config) {
    drawShadow(x, y + 2, 46, 10);
    drawOrganicTrunk(x, y, [
        [0, 0, 2, -24, -5, -48, 1, -74, 15],
        [0, -44, -16, -55, -22, -68, -27, -83, 5],
        [1, -50, 16, -61, 24, -72, 31, -88, 5],
    ], config);
    [[-13, -56, 14, -52], [-11, -35, 13, -32], [-9, -69, 9, -66]].forEach(([x1, y1, x2, y2]) => {
        drawPixelLine(x + x1, y + y1, x + x2, y + y2, 4, '#7c8790');
    });
    drawOrganicCanopy(x, y - 92, [
        [-20, -4, 27, 17, config.leaf],
        [4, -15, 29, 18, '#5e6872'],
        [18, 3, 25, 16, config.leaf],
        [-2, 13, 34, 16, '#3f4852'],
    ], '#1f2428');
    drawCrystals(x, y, [[-22, -94], [18, -82], [2, -111], [-7, -72]], config.leaf2);
}

function drawRuinsElderTree(x, y, config) {
    drawShadow(x, y + 3, 56, 12);
    drawPixelBezier(x - 6, y, x + 10, y - 22, x - 13, y - 50, x + 3, y - 78, 11, config.trunk);
    [[0, -49, -30, -76], [2, -60, 27, -89], [-3, -35, 25, -45], [-5, -72, -10, -101]].forEach(([sx, sy, ex, ey]) => {
        drawPixelLine(x + sx, y + sy, x + ex, y + ey, 5, config.bark);
    });
    drawOrganicCanopy(x, y - 94, [
        [-28, -5, 35, 17, config.leaf],
        [8, -16, 33, 18, '#626b77'],
        [31, 6, 28, 15, config.leaf],
        [-12, 22, 45, 17, '#3f4852'],
    ], '#1f2428');
    drawCrystals(x, y, [[-20, -92], [25, -66], [0, -47]], config.leaf2);
    ctx.fillStyle = '#d7bcff';
    ctx.fillRect(x - 3, y - 48, 6, 3);
    ctx.fillRect(x - 1, y - 39, 3, 6);
}

function drawOrganicTrunk(x, y, segments, config) {
    segments.forEach(([sx, sy, c1x, c1y, c2x, c2y, ex, ey, width], index) => {
        drawPixelBezier(x + sx, y + sy, x + c1x, y + c1y, x + c2x, y + c2y, x + ex, y + ey, width, index === 0 ? config.trunk : config.bark);
        if (index === 0) {
            drawPixelBezier(x + sx + 2, y + sy - 4, x + c1x + 2, y + c1y, x + c2x - 1, y + c2y, x + ex + 1, y + ey + 8, Math.max(3, width * 0.28), config.bark);
        }
    });
}

function drawOrganicCanopy(x, y, blobs, outline) {
    blobs.forEach(([ox, oy, rx, ry]) => {
        drawPixelBlob(x + ox, y + oy, rx + 3, ry + 3, outline);
    });
    blobs.forEach(([ox, oy, rx, ry, color], index) => {
        drawPixelBlob(x + ox, y + oy, rx, ry, color);
        drawPixelBlob(x + ox - rx * 0.22, y + oy - ry * 0.28, rx * 0.34, ry * 0.18, 'rgba(255,255,255,0.12)', 4);
    });
}

function drawAcorns(x, y, points) {
    points.forEach(([ox, oy]) => {
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(Math.round(x + ox - 3), Math.round(y + oy - 3), 6, 7);
        ctx.fillStyle = '#d6a85b';
        ctx.fillRect(x + ox - 3, y + oy - 5, 6, 2);
    });
}

function drawHangingMoss(x, y, color, strands) {
    strands.forEach(([ox, oy, length], index) => {
        drawPixelBezier(x + ox, y + oy, x + ox - 4, y + oy + length * 0.35, x + ox + 5, y + oy + length * 0.65, x + ox + (index % 2 ? 3 : -3), y + oy + length, 3, color);
    });
}

function drawRootClaws(x, y, color, roots) {
    roots.forEach(([ex, ey]) => {
        drawPixelBezier(x, y - 4, x + ex * 0.2, y - 9, x + ex * 0.55, y + ey - 4, x + ex, y + ey, 6, color);
    });
}

function drawCrystals(x, y, points, color) {
    points.forEach(([ox, oy]) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + ox - 2, y + oy - 8, 4, 4);
        ctx.fillRect(x + ox - 4, y + oy - 4, 8, 8);
        ctx.fillRect(x + ox - 2, y + oy + 4, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + ox - 1, y + oy - 4, 2, 2);
    });
}

function drawPixelLine(x1, y1, x2, y2, width, color) {
    const step = 4;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / step));
    const size = Math.max(2, Math.round(width));
    ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = lerp(x1, x2, t);
        const y = lerp(y1, y2, t);
        ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }
}

function drawPixelBezier(x0, y0, x1, y1, x2, y2, x3, y3, width, color) {
    const step = 4;
    const lengthGuess = Math.abs(x3 - x0) + Math.abs(y3 - y0);
    const steps = Math.max(8, Math.ceil(lengthGuess / step));
    const size = Math.max(2, Math.round(width));
    ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt ** 3 * x0 + 3 * mt ** 2 * t * x1 + 3 * mt * t ** 2 * x2 + t ** 3 * x3;
        const y = mt ** 3 * y0 + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y3;
        ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }
}

function drawPixelBlob(cx, cy, rx, ry, color, step = 5) {
    ctx.fillStyle = color;
    const pixel = Math.max(3, Math.round(step));
    for (let yy = -ry; yy <= ry; yy += pixel) {
        const normalized = yy / Math.max(1, ry);
        const rowWidth = Math.floor(rx * Math.sqrt(Math.max(0, 1 - normalized * normalized)) / pixel) * pixel;
        if (rowWidth <= 0) continue;
        ctx.fillRect(Math.round(cx - rowWidth), Math.round(cy + yy), rowWidth * 2, pixel);
    }
}

function drawPixelConiferLayer(cx, top, half, height, color, outline) {
    const pixel = 5;
    ctx.fillStyle = outline;
    for (let yy = 0; yy <= height; yy += pixel) {
        const t = yy / height;
        const rowWidth = Math.round((half * Math.sin(t * Math.PI * 0.72)) / pixel) * pixel + pixel;
        ctx.fillRect(Math.round(cx - rowWidth - 2), Math.round(top + yy - 2), rowWidth * 2 + 4, pixel + 4);
    }
    ctx.fillStyle = color;
    for (let yy = 0; yy <= height; yy += pixel) {
        const t = yy / height;
        const rowWidth = Math.round((half * Math.sin(t * Math.PI * 0.72)) / pixel) * pixel;
        if (rowWidth <= 0) continue;
        ctx.fillRect(Math.round(cx - rowWidth), Math.round(top + yy), rowWidth * 2, pixel);
    }
}

function drawPixelStyleTree(x, y, config, kind) {
    const scale = config.flatTop ? 4.5 : (config.droop ? 4.75 : 5);
    const crownY = y - config.h;
    drawTreeSpriteWithPalette(x, y + 2, scale, {
        outline: '#20351f',
        leaf1: config.leaf,
        leaf3: config.leaf3 || config.leaf2,
        trunk: config.trunk,
        bark: config.bark,
    });

    if (kind === 'birchTree') {
        ctx.fillStyle = config.bark;
        for (let yy = y - 42; yy < y - 8; yy += 11) {
            ctx.fillRect(x - 7, yy, 6, 2);
            ctx.fillRect(x + 2, yy + 4, 6, 2);
        }
    }
    if (config.flatTop) {
        ctx.fillStyle = '#20351f';
        ctx.fillRect(x - 40, crownY + 10, 80, 16);
        ctx.fillStyle = config.leaf;
        ctx.fillRect(x - 37, crownY + 12, 74, 12);
        ctx.fillStyle = config.leaf2;
        ctx.fillRect(x - 25, crownY + 15, 22, 4);
        ctx.fillRect(x + 7, crownY + 14, 25, 4);
    }

    if (config.droop) {
        ctx.strokeStyle = config.leaf2;
        ctx.lineWidth = 3;
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            const sx = x + i * 10;
            ctx.moveTo(sx, crownY + 32);
            ctx.lineTo(sx + (i % 2) * 4, crownY + 58 + Math.abs(i) * 3);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(150, 120, 70, 0.45)';
        ctx.fillRect(x - 18, y - 7, 9, 5);
        ctx.fillRect(x + 10, y - 5, 12, 5);
    }
    if (config.blossoms) {
        drawTinyFlower(ctx, x - 20, crownY + 9, config.leaf2);
        drawTinyFlower(ctx, x + 18, crownY + 19, config.leaf3);
        drawTinyFlower(ctx, x + 2, crownY - 6, config.leaf2);
        drawTinyFlower(ctx, x - 5, crownY + 33, '#ffd6ec');
    }
    if (kind === 'forestOakTree') {
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - 26, y - 36, 10, 6);
        ctx.fillRect(x + 19, y - 44, 8, 6);
    }
    if (config.crystals) {
        ctx.fillStyle = config.leaf3;
        ctx.fillRect(x - 19, crownY + 15, 5, 8);
        ctx.fillRect(x + 16, crownY + 6, 5, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 17, crownY + 16, 2, 2);
        ctx.fillRect(x + 18, crownY + 7, 2, 2);
    }
}

function drawTreeSpriteWithPalette(centerX, groundY, scale, palette, rows = null) {
    const sprite = rows ? { rows } : SPRITES.tree;
    const bounds = rows ? pixelRowsBounds(rows) : spriteVisibleBounds(sprite);
    const visibleWidth = (bounds.maxCol - bounds.minCol + 1) * scale;
    const originX = centerX - visibleWidth / 2 - bounds.minCol * scale;
    const originY = groundY - bounds.maxRow * scale - scale;
    const colorForKey = {
        o: palette.outline,
        l: palette.leaf1,
        L: palette.leaf3,
        t: palette.trunk,
        T: palette.bark,
        f: palette.flower || '#f4a6d7',
        F: palette.flower2 || '#ffd6ec',
        r: palette.redLeaf || '#c85a2a',
        h: palette.hole || '#21150e',
        c: palette.crystal || '#b77dff',
        m: palette.moss || palette.leaf3,
        R: palette.root || palette.bark,
    };
    for (let row = 0; row < sprite.rows.length; row++) {
        const line = sprite.rows[row];
        for (let col = 0; col < line.length; col++) {
            const key = line[col];
            if (key === '.') continue;
            ctx.fillStyle = colorForKey[key] || '#ffffff';
            ctx.fillRect(Math.round(originX + col * scale), Math.round(originY + row * scale), Math.ceil(scale), Math.ceil(scale));
        }
    }
}

function drawMapleTree(x, y, config) {
    drawOrganicTrunk(x, y, [
        [0, 0, 2, -26, -5, -48, 0, -72, 11],
        [0, -36, -20, -49, -30, -65, -38, -83, 6],
        [1, -40, 22, -53, 32, -69, 41, -88, 6],
        [0, -52, -6, -68, -4, -86, 1, -104, 5],
    ], config);
    drawOrganicCanopy(x, y - 97, [
        [-31, 0, 35, 20, '#4f8f45'],
        [-8, -18, 37, 23, '#6f9f4f'],
        [24, -1, 34, 20, config.leaf],
        [-12, 18, 45, 20, config.leaf2],
        [14, 19, 40, 18, '#b88745'],
        [0, -35, 24, 16, config.leaf3],
    ], '#20351f');
    ctx.fillStyle = 'rgba(180, 90, 42, 0.72)';
    [[-24, -91], [23, -83], [-5, -111], [8, -68]].forEach(([ox, oy]) => {
        ctx.fillRect(x + ox - 4, y + oy - 2, 8, 4);
        ctx.fillRect(x + ox - 2, y + oy - 4, 4, 8);
    });
}

function drawDeadTree(x, y, config) {
    drawPixelBezier(x, y, x - 3, y - 20, x + 4, y - 42, x - 2, y - 64, 8, config.trunk);
    [
        [x - 2, y - 42, x - 24, y - 58],
        [x, y - 52, x + 24, y - 68],
        [x - 2, y - 30, x - 18, y - 38],
        [x + 1, y - 35, x + 18, y - 42],
        [x - 3, y - 61, x - 12, y - 78],
    ].forEach(branch => drawPixelLine(branch[0], branch[1], branch[2], branch[3], 4, config.bark));
    ctx.fillStyle = 'rgba(40, 28, 20, 0.6)';
    ctx.fillRect(x - 5, y - 22, 6, 12);
    ctx.fillStyle = config.leaf2;
    ctx.fillRect(x - 22, y - 43, 8, 4);
    ctx.fillRect(x + 14, y - 50, 7, 4);
}

function drawDarkTree(x, y, config) {
    drawOrganicTrunk(x, y, [
        [0, 0, -6, -21, 8, -47, 0, -74, 13],
        [-1, -42, -24, -56, -33, -72, -41, -92, 7],
        [1, -48, 23, -61, 33, -76, 44, -96, 7],
        [0, -59, -5, -75, -2, -91, 4, -110, 5],
    ], config);
    drawOrganicCanopy(x, y - 101, [
        [-27, 4, 34, 18, '#102f22'],
        [-6, -17, 38, 22, '#173b2a'],
        [23, 1, 33, 18, '#102f22'],
        [-10, 20, 45, 18, '#0b241a'],
        [12, 18, 38, 17, config.leaf2],
    ], '#07150f');
    ctx.fillStyle = 'rgba(183, 125, 255, 0.25)';
    ctx.fillRect(x - 32, y - 78, 64, 3);
    ctx.fillRect(x - 24, y - 84, 48, 3);
    ctx.fillRect(x - 24, y - 70, 48, 3);
    ctx.fillRect(x - 35, y - 76, 4, 7);
    ctx.fillRect(x + 31, y - 76, 4, 7);
}

function drawBambooCane(x, groundY, width, height, seed) {
    const lean = Math.sin(seed * 8) * 3;
    const topX = x + lean;
    const yTop = groundY - height;
    const gradient = ctx.createLinearGradient(x - width / 2, groundY, x + width / 2, groundY);
    gradient.addColorStop(0, '#2f7a38');
    gradient.addColorStop(0.5, '#8dcf57');
    gradient.addColorStop(1, '#1d5a2b');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#143f22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, groundY);
    ctx.lineTo(topX - width / 2, yTop);
    ctx.lineTo(topX + width / 2, yTop);
    ctx.lineTo(x + width / 2, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(20, 70, 24, 0.72)';
    ctx.lineWidth = 2;
    for (let y = groundY - 14; y > yTop + 6; y -= 15) {
        const t = (groundY - y) / height;
        const cx = x + lean * t;
        ctx.beginPath();
        ctx.moveTo(cx - width / 2, y);
        ctx.lineTo(cx + width / 2, y - 1);
        ctx.stroke();
    }

    ctx.strokeStyle = '#7fcf55';
    ctx.lineWidth = 3;
    [
        { y: 0.24, side: -1 },
        { y: 0.42, side: 1 },
        { y: 0.62, side: -1 },
        { y: 0.78, side: 1 },
    ].forEach(branch => {
        const by = groundY - height * branch.y;
        const bx = x + lean * branch.y;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + branch.side * 13, by - 8, bx + branch.side * 28, by - 5);
        ctx.stroke();
        ctx.fillStyle = 'rgba(142, 211, 82, 0.78)';
        ctx.fillRect(bx + branch.side * 24, by - 10, branch.side * 10, 5);
        ctx.fillRect(bx + branch.side * 18, by - 3, branch.side * 12, 4);
    });
}

function getBambooSprite(variant) {
    const key = String(variant);
    if (vegetationSpriteCache.bamboo.has(key)) return vegetationSpriteCache.bamboo.get(key);
    const sprite = document.createElement('canvas');
    sprite.width = 96;
    sprite.height = 150;
    const target = sprite.getContext('2d');
    target.imageSmoothingEnabled = false;
    drawBambooSprite(target, variant);
    vegetationSpriteCache.bamboo.set(key, sprite);
    return sprite;
}

function drawBambooSprite(target, variant) {
    const baseX = 44;
    const groundY = 140;
    target.fillStyle = 'rgba(0, 0, 0, 0.22)';
    target.beginPath();
    target.ellipse(baseX, groundY - 2, 18, 5, 0, 0, Math.PI * 2);
    target.fill();
    const seed = 0.23 + variant * 0.19;
    drawBambooCaneOn(target, baseX - 8, groundY, 7, 104 + seed * 18, seed);
    drawBambooCaneOn(target, baseX + 8, groundY + 2, 6, 92 + seed * 16, seed + 1.7);
    if (variant !== 0) drawBambooCaneOn(target, baseX + 19, groundY + 3, 5, 76 + seed * 14, seed + 3.1);
}

function drawBambooCaneOn(target, x, groundY, width, height, seed) {
    const lean = Math.sin(seed * 8) * 3;
    const topX = x + lean;
    const yTop = groundY - height;
    const gradient = target.createLinearGradient(x - width / 2, groundY, x + width / 2, groundY);
    gradient.addColorStop(0, '#2f7a38');
    gradient.addColorStop(0.5, '#8dcf57');
    gradient.addColorStop(1, '#1d5a2b');
    target.fillStyle = gradient;
    target.strokeStyle = '#143f22';
    target.lineWidth = 2;
    target.beginPath();
    target.moveTo(x - width / 2, groundY);
    target.lineTo(topX - width / 2, yTop);
    target.lineTo(topX + width / 2, yTop);
    target.lineTo(x + width / 2, groundY);
    target.closePath();
    target.fill();
    target.stroke();
    target.strokeStyle = 'rgba(20, 70, 24, 0.72)';
    target.lineWidth = 2;
    for (let y = groundY - 14; y > yTop + 6; y -= 15) {
        const t = (groundY - y) / height;
        const cx = x + lean * t;
        target.beginPath();
        target.moveTo(cx - width / 2, y);
        target.lineTo(cx + width / 2, y - 1);
        target.stroke();
    }
    target.strokeStyle = '#7fcf55';
    target.lineWidth = 3;
    [
        { y: 0.28, side: -1 },
        { y: 0.5, side: 1 },
        { y: 0.72, side: -1 },
    ].forEach(branch => {
        const by = groundY - height * branch.y;
        const bx = x + lean * branch.y;
        target.beginPath();
        target.moveTo(bx, by);
        target.quadraticCurveTo(bx + branch.side * 11, by - 7, bx + branch.side * 23, by - 5);
        target.stroke();
        target.fillStyle = 'rgba(142, 211, 82, 0.78)';
        target.fillRect(bx + branch.side * 20, by - 9, branch.side * 9, 5);
    });
}

function drawTallGrassClump(r, x, y, foreground) {
    const variant = Math.floor(hash2(r.x * 0.04, r.y * 0.04) * 6);
    const sprite = getTallGrassSprite(variant, foreground);
    ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height + 8);
}

function getTallGrassSprite(variant, foreground) {
    const key = `${foreground ? 'front' : 'base'}:${variant}`;
    if (vegetationSpriteCache.tallGrass.has(key)) return vegetationSpriteCache.tallGrass.get(key);
    const sprite = document.createElement('canvas');
    sprite.width = 64;
    sprite.height = 72;
    const target = sprite.getContext('2d');
    target.imageSmoothingEnabled = false;
    drawTallGrassSprite(target, variant, foreground);
    vegetationSpriteCache.tallGrass.set(key, sprite);
    return sprite;
}

function drawTallGrassSprite(target, variant, foreground) {
    const x = 32;
    const y = 62;
    if (!foreground) {
        target.fillStyle = 'rgba(0, 0, 0, 0.18)';
        target.beginPath();
        target.ellipse(x, y - 2, 19, 4, 0, 0, Math.PI * 2);
        target.fill();
    }
    const seed = 0.19 + variant * 0.137;
    const layers = foreground
        ? [
            { count: 4, width: 2, alpha: 0.42, height: 34, color: [42, 91, 42], y: 6 },
            { count: 3, width: 2, alpha: 0.5, height: 42, color: [143, 180, 74], y: 4 },
        ]
        : [
            { count: 4, width: 3, alpha: 0.2, height: 28, color: [33, 72, 36], y: 8 },
            { count: 5, width: 2, alpha: 0.36, height: 36, color: [48, 112, 52], y: 5 },
            { count: 3, width: 2, alpha: 0.44, height: 46, color: [164, 196, 82], y: 2 },
        ];
    layers.forEach((layer, layerIndex) => {
        for (let i = 0; i < layer.count; i++) {
            const t = i / Math.max(1, layer.count - 1);
            const wave = Math.sin(seed * 9 + i * 1.37 + layerIndex * 2.4);
            const spread = -22 + t * 44 + wave * 4;
            const height = layer.height + ((i * 17 + Math.floor(seed * 41) + layerIndex * 9) % 18);
            const lean = Math.sin(seed * 13 + i * 0.83 + layerIndex) * (6 + layerIndex);
            const baseY = y + layer.y + Math.sin(i * 1.9 + seed) * 3;
            const [r1, g1, b1] = layer.color;
            target.strokeStyle = `rgba(${r1}, ${g1}, ${b1}, ${layer.alpha})`;
            target.lineWidth = layer.width;
            target.beginPath();
            target.moveTo(x + spread, baseY);
            target.bezierCurveTo(
                x + spread + lean * 0.15,
                baseY - height * 0.35,
                x + spread + lean * 0.55,
                baseY - height * 0.72,
                x + spread + lean,
                baseY - height
            );
            target.stroke();
            if ((i + layerIndex) % 8 === 0) {
                target.fillStyle = `rgba(218, 187, 96, ${foreground ? 0.58 : 0.42})`;
                target.fillRect(x + spread + lean - 1, baseY - height - 6, 3, 8);
            }
        }
    });
    if (!foreground) {
        target.fillStyle = 'rgba(24, 58, 30, 0.24)';
        target.fillRect(x - 20, y - 8, 40, 6);
        target.fillStyle = 'rgba(200, 172, 86, 0.12)';
        target.fillRect(x - 12 + seed * 6, y - 15, 20, 3);
    }
}

function drawEnemy(e, now) {
    const x = worldX(e.x);
    const y = worldY(e.y);
    if (e.hp <= 0) {
        drawEnemyDeathAnimation(e, x, y, now);
        return;
    }
    const leapProgress = e.leapUntil > now ? clamp((now - e.leapStartAt) / Math.max(1, e.leapUntil - e.leapStartAt), 0, 1) : 0;
    const leapLift = e.leapUntil > now ? Math.sin(leapProgress * Math.PI) * 18 : 0;
    const swoopProgress = e.swoopUntil > now ? clamp((now - e.swoopStartAt) / Math.max(1, e.swoopUntil - e.swoopStartAt), 0, 1) : 0;
    const flying = ['bat', 'bee', 'meadowMoth', 'drySandWasp', 'mineCrystalBat'].includes(e.kind);
    const flyLift = flying ? 16 + Math.sin(now / 90) * 6 + Math.sin(swoopProgress * Math.PI) * 18 : 0;
    const chargeLean = e.chargeUntil > now ? 8 : 0;
    const spriteScale = e.kind === 'scorpion' ? 2.55 : (e.kind === 'golem' && e.boss ? 4.15 : 3.2);
    const bounce = Math.sin(now / 140) * (e.kind === 'slime' ? 3 : 1.2) - leapLift - flyLift;
    const concealed = e.kind !== 'bat' && e.kind !== 'bee' && tallGrassCoverAt(e);
    const revealed = e.windupUntil || e.hurtUntil || distance(e, state.player) < 54;
    if (concealed && !revealed) ctx.globalAlpha = 0.18;
    drawShadow(x, y + 1, e.radius * (flying ? 1.1 : 1.62), e.radius * (flying ? 0.25 : 0.42));
    ctx.globalAlpha = 1;
    if (e.windupUntil && !BIOME_MONSTER_TERRAIN[e.kind]) {
        drawEnemyTelegraph(e, x, y, now);
    }
    if (BIOME_MONSTER_TERRAIN[e.kind]) {
        drawBiomeEnemyAttackAnimation(e, x, y, now);
    }
    if (e.tongueUntil > now) {
        const alpha = clamp((e.tongueUntil - now) / 260, 0, 1);
        ctx.strokeStyle = `rgba(255, 143, 199, ${0.35 + alpha * 0.5})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + e.attackDir.x * 10, y + e.attackDir.y * 10 - 10);
        ctx.lineTo(worldX(e.tongueTargetX), worldY(e.tongueTargetY) - 8);
        ctx.stroke();
    }
    if (e.vineUntil > now) {
        const alpha = clamp((e.vineUntil - now) / 420, 0, 1);
        ctx.strokeStyle = `rgba(95, 174, 73, ${0.35 + alpha * 0.5})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + e.attackDir.x * 12, y + e.attackDir.y * 12 - 12);
        ctx.quadraticCurveTo(
            (x + worldX(e.vineTargetX)) / 2 - e.attackDir.y * 18,
            (y + worldY(e.vineTargetY)) / 2 + e.attackDir.x * 18 - 12,
            worldX(e.vineTargetX),
            worldY(e.vineTargetY) - 10
        );
        ctx.stroke();
    }
    if (concealed && !revealed) ctx.globalAlpha = 0.16;
    if (e.hurtUntil) {
        ctx.globalAlpha = 0.72;
        drawEnemySprite(e, x + e.attackDir.x * chargeLean, y + bounce, spriteScale, now, '#ffffff');
        ctx.globalAlpha = 1;
    } else {
        drawEnemySprite(e, x + e.attackDir.x * chargeLean, y + bounce, spriteScale, now);
        ctx.globalAlpha = 1;
        if (concealed && !revealed && (e.kind === 'wolf' || e.kind === 'scorpion')) {
            ctx.fillStyle = 'rgba(255, 224, 138, 0.42)';
            ctx.fillRect(x - 5, y - 22, 2, 2);
            ctx.fillRect(x + 4, y - 22, 2, 2);
        }
    }
    if (isJungleCultControlledMonster(e)) drawCultControlledMonsterMarker(e, x, y, now);
    if (!concealed || revealed) drawMiniBar(x, y + e.radius + 10, e.hp / e.maxHp, '#ff6b6b');
    if (e.kind === 'golem' && e.boss) {
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.72)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 24, e.radius + 12 + Math.sin(now / 120) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', x, y - e.radius - 38);
        ctx.textAlign = 'left';
    }
}

function drawCultControlledMonsterMarker(e, x, y, now) {
    const pulse = 0.5 + Math.sin(now / 150 + e.x * 0.02) * 0.5;
    const attacking = cultControlledMonstersShouldAttackPlayer();
    const color = attacking ? '#ffd166' : '#8cff66';
    ctx.save();
    ctx.strokeStyle = attacking ? `rgba(255,209,102,${0.58 + pulse * 0.22})` : `rgba(140,255,102,${0.56 + pulse * 0.24})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, e.radius * 1.35 + pulse * 5, e.radius * 0.58 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(95,174,73,0.78)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const angle = now / 420 + i * Math.PI * 2 / 3;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * e.radius * 0.8, y - e.radius - 11 + Math.sin(angle) * 3, 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(10, 28, 15, 0.82)';
    ctx.fillRect(x - 18, y - e.radius - 42, 36, 16);
    ctx.strokeStyle = color;
    ctx.strokeRect(x - 18, y - e.radius - 42, 36, 16);
    ctx.fillStyle = color;
    ctx.font = 'bold 12px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('受控', x, y - e.radius - 30);
    ctx.textAlign = 'left';
    ctx.restore();
}

function drawEnemyDeathAnimation(e, x, y, now) {
    const progress = clamp((now - (e.deathAt || now)) / 1200, 0, 1);
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    drawShadow(x, y + 1, e.radius * 1.5, 6);
    ctx.translate(x, y + progress * 8);
    ctx.rotate((e.attackDir?.x || 1) >= 0 ? progress * 1.1 : -progress * 1.1);
    drawEnemySprite(e, 0, 0, e.kind === 'scorpion' ? 2.55 : (e.kind === 'golem' && e.boss ? 4.15 : 3.2), now, '#ffffff');
    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawEnemySprite(e, x, y, scale, now, tint = '') {
    if (e.kind === 'bee') {
        drawBeeEnemy(x, y, now, tint);
        return;
    }
    if (e.kind === 'hare') {
        drawHareEnemy(x, y, now, tint, e.facing?.x || 1);
        return;
    }
    if (e.kind === 'deer') {
        drawDeerEnemy(x, y, now, tint, e.facing?.x || 1);
        return;
    }
    if (BIOME_MONSTER_TERRAIN[e.kind]) {
        drawBiomeEnemy(e, x, y, now, tint);
        return;
    }
    if (e.kind === 'jungleSnake') {
        drawJungleSnakeEnemy(x, y, now, tint, e.facing?.x || 1);
        return;
    }
    if (e.kind === 'vineStalker') {
        drawVineStalkerEnemy(x, y, now, tint, !!e.awakened);
        return;
    }
    if (e.kind === 'shade') {
        const night = shadeNightPower();
        drawSpriteGrounded('slime', x, y, scale, { tint: tint || (night > 0.35 ? '#1b1328' : '#2b2a38') });
        if (night > 0.05) {
            ctx.strokeStyle = `rgba(183, 125, 255, ${0.24 + night * 0.34})`;
            ctx.lineWidth = 2 + night * 2;
            ctx.beginPath();
            ctx.arc(x, y - 18, 18 + night * 10 + Math.sin(now / 120) * 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = tint || (night > 0.45 ? '#b77dff' : '#8f6bd8');
        ctx.fillRect(x - 7, y - 28, 4, 4);
        ctx.fillRect(x + 4, y - 28, 4, 4);
        return;
    }
    drawSpriteGrounded(e.kind, x, y, scale, tint ? { tint } : {});
}

function drawBiomeEnemyAttackAnimation(e, x, y, now) {
    const active = e.leapUntil > now || e.swoopUntil > now || e.chargeUntil > now;
    const winding = e.windupUntil > now;
    if (!active && !winding) return;
    const pulse = Math.sin(now / 44) * 3;
    const dir = e.attackDir || { x: 1, y: 0 };
    const angle = Math.atan2(dir.y, dir.x);
    ctx.save();
    if (['grassRunner', 'tallgrassRaptor', 'pineLynx', 'mapleFox', 'birchStag'].includes(e.kind)) {
        ctx.translate(x + dir.x * 34, y + dir.y * 34 - 8);
        ctx.rotate(angle);
        ctx.fillStyle = e.kind === 'mapleFox' ? 'rgba(216, 160, 65, 0.7)' : 'rgba(255, 243, 176, 0.65)';
        for (let i = -1; i <= 1; i++) {
            ctx.fillRect(-8, i * 7, 34 + pulse, 3);
            ctx.fillRect(10, i * 7 - 4, 14 + pulse, 2);
        }
        if (e.kind === 'birchStag') {
            ctx.fillStyle = 'rgba(240,255,210,0.72)';
            ctx.fillRect(12, -16, 30 + pulse, 4);
            ctx.fillRect(12, 12, 30 + pulse, 4);
        }
    } else if (['forestBear', 'bambooPanda', 'ruinsBoneGuard'].includes(e.kind)) {
        ctx.translate(x, y);
        const color = e.kind === 'ruinsBoneGuard' ? 'rgba(216,208,189,0.75)' : 'rgba(185,143,104,0.7)';
        ctx.fillStyle = color;
        const size = winding ? 42 + pulse : 58 + pulse;
        ctx.fillRect(-size / 2, -4, size, 5);
        ctx.fillRect(-size / 3, -14, size * 0.66, 4);
        ctx.fillRect(-size / 3, 7, size * 0.66, 4);
        if (e.kind === 'ruinsBoneGuard') {
            ctx.fillStyle = 'rgba(255,243,208,0.72)';
            ctx.fillRect(-20, -24, 10, 4);
            ctx.fillRect(-2, -29, 13, 4);
            ctx.fillRect(15, -20, 9, 4);
        }
    } else if (['meadowMoth', 'drySandWasp', 'mineCrystalBat'].includes(e.kind)) {
        ctx.translate(x, y - 28);
        const color = e.kind === 'meadowMoth' ? 'rgba(255,209,102,0.75)' : (e.kind === 'drySandWasp' ? 'rgba(140,255,102,0.68)' : 'rgba(125,203,232,0.78)');
        ctx.fillStyle = color;
        for (let i = 0; i < 6; i++) {
            const ox = -24 + i * 9;
            const oy = Math.sin(now / 70 + i) * 7;
            ctx.fillRect(ox, oy, 5, 5);
        }
        if (e.swoopUntil > now) {
            ctx.rotate(angle);
            ctx.fillRect(-8, -2, 48 + pulse, 4);
        }
    } else if (e.kind === 'reedCrab') {
        ctx.translate(x + dir.x * 24, y + dir.y * 24 - 8);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(215,242,138,0.72)';
        ctx.fillRect(4, -18, 24 + pulse, 5);
        ctx.fillRect(4, 13, 24 + pulse, 5);
        ctx.fillRect(22, -13, 6, 26);
    } else if (e.kind === 'swampMireling') {
        ctx.translate(x + dir.x * 28, y + dir.y * 28);
        ctx.fillStyle = 'rgba(109,84,56,0.75)';
        ctx.fillRect(-24, -6, 48 + pulse, 8);
        ctx.fillRect(-14, -15, 28, 7);
        ctx.fillStyle = 'rgba(140,255,102,0.45)';
        ctx.fillRect(-8, -20, 16, 4);
    }
    ctx.restore();
}

function drawBeeEnemy(x, y, now, tint = '') {
    const wing = Math.sin(now / 40) * 3;
    ctx.fillStyle = tint || '#ffd166';
    ctx.fillRect(x - 9, y - 24, 18, 10);
    ctx.fillStyle = '#2b1b12';
    ctx.fillRect(x - 5, y - 24, 3, 10);
    ctx.fillRect(x + 3, y - 24, 3, 10);
    ctx.fillStyle = tint || 'rgba(210, 245, 255, 0.72)';
    ctx.fillRect(x - 13, y - 31 + wing, 9, 6);
    ctx.fillRect(x + 4, y - 31 - wing, 9, 6);
}

function drawBiomeEnemy(e, x, y, now, tint = '') {
    const facing = e.facing?.x || 1;
    const step = Math.sin(now / 140) * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing < 0 ? -1 : 1, 1);
    const color = tint || {
        grassRunner: '#c99a62', tallgrassRaptor: '#7a8f45', meadowMoth: '#f4a6d7',
        forestBear: '#5a341d', bambooPanda: '#ead8bd', birchStag: '#d8c08a',
        pineLynx: '#6f6048', mapleFox: '#c86b3c', reedCrab: '#6f8750',
        swampMireling: '#4b5f34', drySandWasp: '#d99a43', mineCrystalBat: '#9c7dff',
        ruinsBoneGuard: '#d8d0bd',
    }[e.kind] || '#b98f68';
    const dark = tint || {
        meadowMoth: '#9b6bb0', bambooPanda: '#2d2a25', mineCrystalBat: '#512b9a',
        ruinsBoneGuard: '#5a5146', reedCrab: '#2f4b3a', swampMireling: '#263f34',
    }[e.kind] || '#3d2a1d';
    if (e.kind === 'meadowMoth' || e.kind === 'drySandWasp') {
        const wing = Math.sin(now / 45) * 4;
        ctx.fillStyle = color;
        ctx.fillRect(-10, -25, 20, 10);
        ctx.fillStyle = dark;
        ctx.fillRect(7, -27, 8, 6);
        ctx.fillStyle = e.kind === 'meadowMoth' ? '#ffd6ec' : '#fff0a8';
        ctx.fillRect(-23, -35 + wing, 17, 11);
        ctx.fillRect(5, -36 - wing, 18, 12);
        if (e.kind === 'drySandWasp') {
            ctx.fillStyle = '#2d2117';
            ctx.fillRect(-5, -25, 3, 10);
            ctx.fillRect(2, -25, 3, 10);
        }
    } else if (e.kind === 'mineCrystalBat') {
        ctx.fillStyle = dark;
        ctx.fillRect(-11, -25, 22, 12);
        ctx.fillStyle = color;
        ctx.fillRect(-29, -29 + step, 20, 9);
        ctx.fillRect(9, -29 - step, 20, 9);
        ctx.fillStyle = '#d7bcff';
        ctx.fillRect(-3, -31, 6, 6);
        ctx.fillRect(8, -23, 4, 4);
    } else if (e.kind === 'reedCrab') {
        ctx.fillStyle = color;
        ctx.fillRect(-19, -18, 38, 15);
        ctx.fillStyle = dark;
        ctx.fillRect(-25, -15, 10, 8);
        ctx.fillRect(15, -15, 10, 8);
        ctx.fillStyle = '#d7f28a';
        ctx.fillRect(-8, -21, 4, 4);
        ctx.fillRect(5, -21, 4, 4);
    } else if (e.kind === 'swampMireling') {
        ctx.fillStyle = dark;
        ctx.fillRect(-17, -24 + step, 34, 20);
        ctx.fillRect(-12, -34 + step, 24, 13);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(-6, -28 + step, 4, 4);
        ctx.fillRect(4, -28 + step, 4, 4);
    } else if (e.kind === 'forestBear' || e.kind === 'bambooPanda') {
        ctx.fillStyle = color;
        ctx.fillRect(-24, -36 + step, 42, 25);
        ctx.fillRect(7, -49 + step, 18, 17);
        ctx.fillRect(-18, -13, 10, 13);
        ctx.fillRect(9, -13, 10, 13);
        if (e.kind === 'bambooPanda') {
            ctx.fillStyle = '#2d2a25';
            ctx.fillRect(11, -45 + step, 6, 6);
            ctx.fillRect(-15, -33 + step, 12, 13);
        }
    } else if (e.kind === 'birchStag') {
        drawDeerEnemy(0, 0, now, color, 1);
        ctx.strokeStyle = '#f0ffd2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, -48);
        ctx.lineTo(28, -62);
        ctx.moveTo(15, -48);
        ctx.lineTo(4, -62);
        ctx.stroke();
    } else if (e.kind === 'ruinsBoneGuard') {
        ctx.fillStyle = color;
        ctx.fillRect(-18, -39, 36, 35);
        ctx.fillStyle = dark;
        ctx.fillRect(-11, -48, 22, 12);
        ctx.fillStyle = '#2f3945';
        ctx.fillRect(-6, -28, 12, 18);
        ctx.fillStyle = '#b77dff';
        ctx.fillRect(-3, -42, 6, 4);
    } else {
        ctx.fillStyle = color;
        ctx.fillRect(-20, -28 + step, 34, 17);
        ctx.fillRect(9, -39 + step, 13, 13);
        ctx.fillStyle = dark;
        ctx.fillRect(-14, -12, 6, 12);
        ctx.fillRect(8, -12, 7, 12);
        if (e.kind === 'tallgrassRaptor' || e.kind === 'pineLynx' || e.kind === 'mapleFox') {
            ctx.fillStyle = '#fff3d0';
            ctx.fillRect(18, -30 + step, 5, 4);
            ctx.fillRect(13, -9, 5, 3);
        }
    }
    ctx.restore();
}

function drawHareEnemy(x, y, now, tint = '', facingX = 1) {
    const hop = Math.sin(now / 120) * 2;
    const body = tint || '#b98f68';
    const dark = tint || '#6b4a2f';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facingX < 0 ? -1 : 1, 1);
    ctx.fillStyle = body;
    ctx.fillRect(-12, -18 + hop, 20, 10);
    ctx.fillRect(4, -25 + hop, 9, 9);
    ctx.fillRect(-8, -10 + hop, 7, 5);
    ctx.fillRect(4, -10 + hop, 8, 5);
    ctx.fillStyle = dark;
    ctx.fillRect(9, -39 + hop, 3, 15);
    ctx.fillRect(3, -38 + hop, 3, 14);
    ctx.fillRect(10, -22 + hop, 2, 2);
    ctx.fillStyle = '#ead8bd';
    ctx.fillRect(-5, -15 + hop, 8, 4);
    ctx.restore();
}

function drawDeerEnemy(x, y, now, tint = '', facingX = 1) {
    const step = Math.sin(now / 150) * 1.5;
    const body = tint || '#8f6238';
    const dark = tint || '#4f321d';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facingX < 0 ? -1 : 1, 1);
    ctx.fillStyle = body;
    ctx.fillRect(-18, -32 + step, 34, 17);
    ctx.fillRect(8, -45 + step, 13, 15);
    ctx.fillRect(18, -39 + step, 6, 6);
    ctx.fillStyle = '#c99a62';
    ctx.fillRect(-10, -29 + step, 10, 5);
    ctx.fillStyle = dark;
    ctx.fillRect(-13, -16 + step, 4, 17);
    ctx.fillRect(8, -16 - step, 4, 17);
    ctx.fillRect(17, -33 + step, 3, 3);
    ctx.strokeStyle = '#d8c08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, -45 + step);
    ctx.lineTo(23, -55 + step);
    ctx.lineTo(27, -55 + step);
    ctx.moveTo(14, -45 + step);
    ctx.lineTo(7, -55 + step);
    ctx.lineTo(4, -55 + step);
    ctx.stroke();
    ctx.restore();
}

function drawJungleSnakeEnemy(x, y, now, tint = '', facingX = 1) {
    const wave = Math.sin(now / 140) * 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facingX < 0 ? -1 : 1, 1);
    ctx.strokeStyle = tint || '#1f6b3f';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-24, -10);
    ctx.quadraticCurveTo(-13, -22 - wave, 0, -13 + wave);
    ctx.quadraticCurveTo(12, -4 + wave, 25, -17 - wave * 0.4);
    ctx.stroke();
    ctx.strokeStyle = tint || '#8cff66';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-17, -13);
    ctx.quadraticCurveTo(-8, -20 - wave, 2, -13 + wave);
    ctx.quadraticCurveTo(11, -8 + wave, 20, -16 - wave * 0.4);
    ctx.stroke();
    ctx.fillStyle = '#d6ff9c';
    ctx.fillRect(23, -20 - wave * 0.4, 5, 5);
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(25, -21 - wave * 0.4, 2, 2);
    ctx.restore();
}

function drawVineStalkerEnemy(x, y, now, tint = '', awake = false) {
    if (tint) awake = true;
    const pulse = awake ? Math.sin(now / 180) * 2 : 0;
    drawShadow(x, y + 2, 38, 8);
    ctx.fillStyle = tint || '#173b24';
    ctx.fillRect(x - 8, y - 40, 16, 39);
    ctx.fillStyle = tint || '#5fae49';
    ctx.fillRect(x - 24, y - 28, 48, 8);
    ctx.fillRect(x - 20, y - 12, 40, 7);
    ctx.strokeStyle = '#8cff66';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 30);
    ctx.bezierCurveTo(x - 30, y - 46, x - 34, y - 12, x - 20, y);
    ctx.moveTo(x + 10, y - 32);
    ctx.bezierCurveTo(x + 30, y - 44, x + 34, y - 12, x + 20, y);
    ctx.stroke();
    if (awake) {
        ctx.fillStyle = '#d6ff9c';
        ctx.fillRect(x - 6, y - 26 + pulse, 4, 4);
        ctx.fillRect(x + 4, y - 26 + pulse, 4, 4);
    } else {
        ctx.fillStyle = '#2fa35a';
        ctx.fillRect(x - 17, y - 31, 12, 6);
        ctx.fillRect(x + 6, y - 29, 14, 6);
    }
}

function drawEnemyTelegraph(e, x, y, now) {
    const pulse = Math.sin(now / 42) * 3;
    if (e.kind === 'boar') {
        ctx.strokeStyle = 'rgba(255, 92, 92, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + e.attackDir.x * 22, y + e.attackDir.y * 22);
        ctx.lineTo(x + e.attackDir.x * 130, y + e.attackDir.y * 130);
        ctx.stroke();
    } else if (e.kind === 'slime') {
        ctx.strokeStyle = 'rgba(94, 224, 137, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x + e.attackDir.x * 45, y + e.attackDir.y * 45, e.radius + 6 + pulse * 0.4, e.radius * 0.55 + 4, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (e.kind === 'wolf') {
        const angle = Math.atan2(e.attackDir.y, e.attackDir.x);
        ctx.save();
        ctx.translate(x + e.attackDir.x * 42, y + e.attackDir.y * 42);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(255, 214, 112, 0.85)';
        ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(-12, i * 8);
            ctx.lineTo(18 + pulse, i * 5);
            ctx.stroke();
        }
        ctx.restore();
    } else if (e.kind === 'bat') {
        ctx.strokeStyle = 'rgba(143, 184, 255, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + e.attackDir.x * 14, y + e.attackDir.y * 14);
        ctx.quadraticCurveTo(
            x + e.attackDir.x * 48 - e.attackDir.y * 24,
            y + e.attackDir.y * 48 + e.attackDir.x * 24,
            x + e.attackDir.x * 96,
            y + e.attackDir.y * 96
        );
        ctx.stroke();
    } else if (e.kind === 'bee') {
        const angle = Math.atan2(e.attackDir.y, e.attackDir.x);
        ctx.save();
        ctx.translate(x + e.attackDir.x * 34, y + e.attackDir.y * 34);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(54 + pulse, 0);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 209, 102, 0.22)';
        ctx.fillRect(12, -8, 42 + pulse, 16);
        ctx.restore();
    } else if (e.kind === 'shade') {
        const angle = Math.atan2(e.attackDir.y, e.attackDir.x);
        ctx.save();
        ctx.translate(x + e.attackDir.x * 44, y + e.attackDir.y * 44);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(143, 107, 216, 0.9)';
        ctx.lineWidth = 4;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(-16, i * 9);
            ctx.quadraticCurveTo(12 + pulse, i * 12, 38 + pulse, i * 3);
            ctx.stroke();
        }
        ctx.restore();
    } else if (e.kind === 'frog') {
        ctx.strokeStyle = 'rgba(255, 143, 199, 0.86)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + e.attackDir.x * 12, y + e.attackDir.y * 12 - 8);
        ctx.lineTo(x + e.attackDir.x * (126 + pulse), y + e.attackDir.y * (126 + pulse) - 8);
        ctx.stroke();
    } else if (e.kind === 'scorpion') {
        const angle = Math.atan2(e.attackDir.y, e.attackDir.x);
        ctx.save();
        ctx.translate(x + e.attackDir.x * 30, y + e.attackDir.y * 30);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(255, 170, 74, 0.82)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -6);
        ctx.lineTo(20 + pulse, 0);
        ctx.lineTo(-8, 6);
        ctx.stroke();
        ctx.restore();
    } else if (e.kind === 'jungleSnake') {
        const angle = Math.atan2(e.attackDir.y, e.attackDir.x);
        ctx.save();
        ctx.translate(x + e.attackDir.x * 34, y + e.attackDir.y * 34);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(140, 255, 102, 0.86)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(36 + pulse, 0);
        ctx.stroke();
        ctx.restore();
    } else if (e.kind === 'vineStalker') {
        ctx.strokeStyle = 'rgba(95, 174, 73, 0.86)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + e.attackDir.x * 16, y + e.attackDir.y * 16 - 10);
        ctx.quadraticCurveTo(
            x + e.attackDir.x * 82 - e.attackDir.y * 22,
            y + e.attackDir.y * 82 + e.attackDir.x * 22 - 12,
            x + e.attackDir.x * (154 + pulse),
            y + e.attackDir.y * (154 + pulse) - 10
        );
        ctx.stroke();
    } else {
        if (e.boss && e.bossSkill === 'shockwave') {
            const dir = { x: Math.cos(e.bossSkillAngle), y: Math.sin(e.bossSkillAngle) };
            ctx.strokeStyle = 'rgba(255, 209, 102, 0.86)';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(x + dir.x * 30, y + dir.y * 30);
            ctx.lineTo(x + dir.x * 330, y + dir.y * 330);
            ctx.stroke();
            return;
        }
        if (e.boss && e.bossSkill === 'spikes') {
            const target = enemyAttackTarget(e);
            ctx.strokeStyle = 'rgba(183, 125, 255, 0.9)';
            ctx.lineWidth = 4;
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3 + now * 0.001;
                ctx.beginPath();
                ctx.arc(worldX(target.x + Math.cos(angle) * 42), worldY(target.y + Math.sin(angle) * 42), 18 + pulse, 0, Math.PI * 2);
                ctx.stroke();
            }
            return;
        }
        if (e.boss && e.bossSkill === 'summon') {
            ctx.strokeStyle = 'rgba(216, 229, 242, 0.85)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 128 + pulse, 0, Math.PI * 2);
            ctx.stroke();
            return;
        }
        ctx.strokeStyle = e.boss ? 'rgba(183, 125, 255, 0.9)' : 'rgba(183, 125, 255, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, (e.boss ? 112 : 86) + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(183, 125, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(x, y, e.boss ? 112 : 86, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPlayer(now) {
    const p = state.player;
    const x = worldX(p.x);
    const y = worldY(p.y);
    if (state.lose) {
        drawPlayerDeathAnimation(x, y, now, false);
        return;
    }
    const step = Math.sin(now / 90) * (keys.size ? 2 : 0);
    drawShadow(x, y + 1, 34, 8);
    if (p.invincibleUntil > now && Math.floor(now / 80) % 2 === 0) ctx.globalAlpha = 0.55;
    const lean = keys.size ? Math.sin(now / 110) * 2 : 0;
    drawSpriteGrounded('player', x + p.facing.x * Math.abs(lean), y + step, 4);
    ctx.globalAlpha = 1;
    if (p.poisonUntil > now) {
        ctx.globalAlpha = 0.34 + Math.sin(now / 90) * 0.08;
        drawSpriteGrounded('player', x + p.facing.x * Math.abs(lean), y + step, 4, { tint: '#8cff66' });
        ctx.globalAlpha = 1;
    }
    if ((p.slowUntil || 0) > now) {
        ctx.globalAlpha = 0.28 + Math.sin(now / 120) * 0.06;
        drawSpriteGrounded('player', x + p.facing.x * Math.abs(lean), y + step, 4, { tint: '#7dcbe8' });
        ctx.globalAlpha = 1;
    }
    drawArmorOverlay(x + p.facing.x * Math.abs(lean), y + step);
    if (p.attackUntil > now) {
        drawAttackSlash(x, y, p.attackDir || p.facing, now);
    }
    drawPlayerHandsAndWeapon(x, y + step, p, now);
}

function drawArmorOverlay(x, y) {
    if (state.equipment.armor === '无') return;
    const color = state.equipment.armor === '铁甲' ? 'rgba(190, 210, 222, 0.95)' : 'rgba(128, 78, 48, 0.95)';
    const trim = state.equipment.armor === '铁甲' ? '#ffffff' : '#d6a06a';
    ctx.fillStyle = color;
    ctx.fillRect(x - 15, y - 36, 30, 18);
    ctx.fillRect(x - 18, y - 32, 8, 12);
    ctx.fillRect(x + 10, y - 32, 8, 12);
    ctx.fillStyle = trim;
    ctx.fillRect(x - 11, y - 34, 22, 3);
    if (state.equipment.armor === '铁甲') {
        ctx.fillStyle = 'rgba(130, 150, 165, 0.9)';
        ctx.fillRect(x - 2, y - 36, 4, 18);
    }
}

function drawPlayerHandsAndWeapon(x, y, p, now) {
    const dir = p.attackDir || p.facing;
    const attacking = p.attackUntil > now;
    const heldItem = selectedHotbarItem();
    const attackProfile = currentAttackProfile();
    const handX = x + dir.x * (attacking ? 22 : 15);
    const handY = y - 31 + dir.y * 8 + (keys.size ? Math.sin(now / 90) * 1.5 : 0);
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(handX - 4, handY - 4, 8, 8);
    if (p.blocking && state.equipment.shield !== '无') {
        ctx.fillStyle = state.equipment.shield === '铁盾' ? '#c5d6df' : '#8a5a32';
        ctx.strokeStyle = '#101820';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(handX + dir.x * 12, handY + dir.y * 12, 12, 16, Math.atan2(dir.y, dir.x), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        return;
    }
    if (heldItem && !isHandWeaponItem(heldItem)) {
        drawPixelItemIcon(ctx, heldItem, handX + dir.x * 12, handY + dir.y * 12, 18);
        return;
    }
    if (heldItem === 'slingshot') {
        drawSlingshotInHand(handX, handY, dir, directRangedPullAmount('slingshot', attacking));
        return;
    }
    if (heldItem === 'sinewBow') {
        drawBowInHand(handX, handY, dir, directRangedPullAmount('sinewBow', attacking));
        return;
    }
    if (simpleWeaponDef(heldItem)) {
        drawSimpleWeaponInHand(heldItem, handX, handY, dir, attacking);
        return;
    }
    const weaponLength = Math.max(20, attackProfile.range * 0.58);
    ctx.strokeStyle = attackProfile.name === '铁剑' ? '#d8e5f2'
        : (attackProfile.name === '石矛' ? '#a8b3bd'
            : (attackProfile.name === '竹矛' ? '#d7f28a'
                : (attackProfile.name === '石镐' ? '#a8b3bd'
                    : (attackProfile.name === '石斧' ? '#9fb3c8' : COLORS.trunk))));
    ctx.lineWidth = ['石矛', '竹矛', '石镐'].includes(attackProfile.name) ? 3 : 5;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX + dir.x * weaponLength, handY + dir.y * weaponLength);
    ctx.stroke();
    if (attackProfile.name === '铁剑' || attackProfile.name === '魔晶剑') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(handX + dir.x * 8, handY + dir.y * 8);
        ctx.lineTo(handX + dir.x * weaponLength, handY + dir.y * weaponLength);
        ctx.stroke();
    }
}

function isHandWeaponItem(key) {
    return !!simpleWeaponDef(key) || ['stoneAxe', 'stonePickaxe', 'stoneSickle', 'stoneSpear', 'slingshot', 'sinewBow', 'bambooSpear', 'venomDagger', 'ironSword', 'crystalBlade', 'wood', 'bamboo', 'stone'].includes(key) || !key;
}

function directRangedPullAmount(key, attacking) {
    const aim = state.player.rangedAim;
    if (aim?.key === key) return directRangedCharge(aim, performance.now());
    return attacking ? 0.45 : 0;
}

function drawSimpleWeaponInHand(key, handX, handY, dir, attacking) {
    const def = simpleWeaponDef(key);
    if (!def) return;
    const angle = Math.atan2(dir.y, dir.x);
    const attackProgress = attackVisualProgress();
    const heavy = ['vineStoneHammer', 'resinHammer'].includes(key);
    const flexible = ['ropeSickle', 'frogWhip', 'scorpionHook'].includes(key);
    const lunge = attacking ? (heavy ? Math.sin(attackProgress * Math.PI) * 4 : 7) : 0;
    ctx.save();
    ctx.translate(handX + dir.x * (10 + lunge), handY + dir.y * (10 + lunge));
    ctx.rotate(angle + weaponSwingRotation(key, attackProgress, attacking));
    const visualScale = clamp((def.profile.range || 50) / 84, 0.72, 1.35);
    ctx.scale(visualScale, visualScale);
    const chargeGlow = state.player.meleeCharge?.key === key ? meleeChargeAmount(state.player.meleeCharge, performance.now()) : 0;
    const palette = {
        wood: '#6b3b1f',
        lightWood: '#a66a3c',
        stone: '#a8b3bd',
        metal: '#d8e5f2',
        bamboo: '#9bd86a',
        venom: '#8cff66',
        fire: '#ff9f1c',
        shadow: '#b77dff',
        hide: '#d6a06a',
        dark: '#243041',
    };
    const drawShaft = (length, width = 4, color = palette.wood) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
    };
    const drawTip = (x, color = palette.stone, size = 8) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + size, 0);
        ctx.lineTo(x - size * 0.45, -size * 0.6);
        ctx.lineTo(x - size * 0.25, size * 0.6);
        ctx.closePath();
        ctx.fill();
    };
    const drawFork = (length, tineColor, tineCount = 3) => {
        drawShaft(length, 4, key.includes('bamboo') || key === 'bambooPike' ? palette.bamboo : palette.wood);
        ctx.strokeStyle = tineColor;
        ctx.lineWidth = 3;
        for (let i = 0; i < tineCount; i++) {
            const offset = (i - (tineCount - 1) / 2) * 5;
            ctx.beginPath();
            ctx.moveTo(length - 5, offset * 0.35);
            ctx.lineTo(length + 13, offset);
            ctx.stroke();
        }
    };
    switch (key) {
        case 'woodFork':
            drawFork(44, palette.lightWood, 3);
            break;
        case 'stoneBladeSpear':
            drawShaft(50);
            drawTip(50, palette.stone, 10);
            ctx.fillStyle = palette.hide;
            ctx.fillRect(14, -4, 12, 8);
            break;
        case 'bambooPike':
            drawShaft(58, 3, palette.bamboo);
            drawTip(58, palette.stone, 7);
            ctx.fillStyle = '#d7f28a';
            ctx.fillRect(18, -2, 24, 4);
            break;
        case 'boneSpikedClub':
            drawShaft(38, 7, palette.wood);
            ctx.fillStyle = palette.metal;
            for (let px = 18; px <= 38; px += 8) ctx.fillRect(px, -8, 5, 7);
            break;
        case 'vineStoneHammer':
            drawWeightedHammer(36, palette.stone, palette.wood, chargeGlow, attackProgress, '#5f7a46');
            break;
        case 'resinHammer':
            drawWeightedHammer(36, '#d68a43', palette.wood, chargeGlow, attackProgress, '#ffd166');
            break;
        case 'shieldClub':
            drawShaft(34, 6, palette.wood);
            ctx.fillStyle = '#8a5a32';
            ctx.fillRect(6, -12, 15, 24);
            ctx.strokeStyle = palette.metal;
            ctx.strokeRect(7, -11, 13, 22);
            break;
        case 'twinStoneDagger':
            drawDaggerPair(palette.stone, palette.wood);
            break;
        case 'bambooThrowingKnife':
            drawDaggerPair(palette.bamboo, palette.bamboo);
            ctx.fillStyle = '#d7f28a';
            ctx.fillRect(22, -13, 12, 3);
            break;
        case 'torchClub':
            drawShaft(36, 6, palette.wood);
            ctx.fillStyle = palette.fire;
            ctx.fillRect(32, -11, 14, 22);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(36, -15, 7, 30);
            break;
        case 'toxicKnife':
            drawDagger(palette.venom, palette.dark);
            ctx.fillStyle = 'rgba(140,255,102,0.55)';
            ctx.fillRect(30, -8, 12, 16);
            break;
        case 'beeNeedleSpear':
            drawShaft(56, 3, palette.wood);
            drawTip(56, '#ffd166', 7);
            ctx.fillStyle = '#2d2117';
            ctx.fillRect(43, -3, 9, 6);
            break;
        case 'antlerFork':
            drawFork(48, '#f1dfc3', 4);
            break;
        case 'sling':
            drawSlingInHand(attacking ? directRangedPullAmount('sling', true) : directRangedPullAmount('sling', false));
            break;
        case 'bambooCrossbow':
            drawCrossbowInHand(directRangedPullAmount('bambooCrossbow', attacking));
            break;
        case 'ropeSickle':
            drawRopeSickle(palette.stone, palette.hide, attackProgress, attacking);
            break;
        case 'nailClub':
            drawShaft(38, 7, palette.wood);
            ctx.fillStyle = palette.stone;
            ctx.fillRect(20, -9, 5, 5);
            ctx.fillRect(31, 4, 5, 5);
            ctx.fillRect(40, -6, 5, 5);
            break;
        case 'frogWhip':
            drawWhipCurve('#8cff66', '#d94bff', attackProgress, attacking);
            break;
        case 'scorpionHook':
            drawScorpionHook(palette.wood, palette.venom, attackProgress, attacking);
            break;
        case 'shadowWoodBlade':
            drawDagger(palette.shadow, palette.dark, 48);
            ctx.fillStyle = 'rgba(183,125,255,0.35)';
            ctx.fillRect(24, -13, 28, 5);
            break;
        default:
            drawShaft(40);
            drawTip(40);
    }
    ctx.restore();
}

function drawDagger(bladeColor, handleColor, length = 34) {
    ctx.fillStyle = handleColor;
    ctx.fillRect(-7, -4, 14, 8);
    ctx.fillStyle = bladeColor;
    ctx.beginPath();
    ctx.moveTo(length, 0);
    ctx.lineTo(5, -6);
    ctx.lineTo(9, 6);
    ctx.closePath();
    ctx.fill();
}

function attackVisualProgress() {
    const remaining = Math.max(0, state.player.attackUntil - performance.now());
    return state.player.attackUntil > performance.now() ? clamp(1 - remaining / 260, 0, 1) : 0;
}

function weaponSwingRotation(key, progress, attacking) {
    if (!attacking) return 0;
    if (['vineStoneHammer', 'resinHammer'].includes(key)) return -0.55 + Math.sin(progress * Math.PI) * 0.95;
    if (['ropeSickle', 'frogWhip', 'scorpionHook'].includes(key)) return Math.sin(progress * Math.PI * 1.4) * 0.38;
    return Math.sin(progress * Math.PI) * 0.18;
}

function drawWeightedHammer(length, headColor, shaftColor, chargeGlow, progress, wrapColor) {
    const sag = Math.sin(progress * Math.PI) * 6;
    ctx.strokeStyle = shaftColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(length * 0.45, sag * 0.35, length, sag);
    ctx.stroke();
    ctx.save();
    ctx.translate(length + 3, sag);
    ctx.rotate(0.18 + progress * 0.22);
    ctx.fillStyle = headColor;
    ctx.fillRect(-4, -13, 24, 26);
    if (chargeGlow > 0.05) {
        ctx.fillStyle = `rgba(255,255,220,${0.18 + chargeGlow * 0.38})`;
        ctx.fillRect(-9, -17, 34, 34);
    }
    ctx.strokeStyle = wrapColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(20, 8);
    ctx.moveTo(-6, 8);
    ctx.lineTo(20, -8);
    ctx.stroke();
    ctx.restore();
}

function drawDaggerPair(bladeColor, handleColor) {
    ctx.save();
    ctx.rotate(-0.22);
    drawDagger(bladeColor, handleColor, 32);
    ctx.restore();
    ctx.save();
    ctx.rotate(0.28);
    ctx.translate(1, 8);
    drawDagger(bladeColor, handleColor, 28);
    ctx.restore();
}

function drawSlingInHand(pull = 0) {
    ctx.strokeStyle = '#d6a06a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.quadraticCurveTo(16 - pull * 12, 0, -4, 8);
    ctx.stroke();
    ctx.fillStyle = '#8c98a4';
    ctx.fillRect(15 - pull * 12, -4, 8, 8);
}

function drawCrossbowInHand(pull = 0) {
    ctx.strokeStyle = '#9bd86a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(42, 0);
    ctx.moveTo(18, -18);
    ctx.lineTo(18, 18);
    ctx.stroke();
    ctx.strokeStyle = '#f1dfc3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, -18);
    ctx.lineTo(8 - pull * 8, 0);
    ctx.lineTo(18, 18);
    ctx.stroke();
    ctx.fillStyle = '#d8e5f2';
    ctx.fillRect(4 - pull * 8, -2, 44, 4);
}

function drawWhipCurve(lineColor, tipColor, progress = 0, attacking = false) {
    const wave = attacking ? Math.sin(progress * Math.PI) * 18 : 6;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.bezierCurveTo(15, -14 - wave * 0.35, 31, 18 + wave, 58 + wave * 0.45, -6 + wave * 0.2);
    ctx.stroke();
    ctx.fillStyle = tipColor;
    ctx.fillRect(55 + wave * 0.45, -9 + wave * 0.2, 8, 8);
}

function drawRopeSickle(bladeColor, ropeColor, progress = 0, attacking = false) {
    const swing = attacking ? Math.sin(progress * Math.PI) * 24 : Math.sin(performance.now() / 180) * 5;
    const travel = attacking ? progress * 34 : 0;
    const points = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const lag = Math.sin((t * 2.2 - progress * 2.8) * Math.PI) * swing * t;
        points.push({
            x: -5 + t * (50 + travel),
            y: Math.sin(t * Math.PI) * 7 + lag,
        });
    }
    ctx.strokeStyle = ropeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const point = points[i];
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + point.x) / 2, (prev.y + point.y) / 2);
    }
    const end = points[points.length - 1];
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillStyle = ropeColor;
    for (let i = 1; i < points.length; i += 2) {
        ctx.fillRect(points[i].x - 2, points[i].y - 2, 4, 4);
    }
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate((attacking ? 0.9 : 0.25) + swing * 0.025);
    ctx.strokeStyle = bladeColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 11, -1.5, 1.05);
    ctx.stroke();
    ctx.fillStyle = bladeColor;
    ctx.fillRect(6, -3, 9, 6);
    ctx.restore();
}

function drawScorpionHook(shaftColor, hookColor, progress = 0, attacking = false) {
    const snap = attacking ? Math.sin(progress * Math.PI) * 13 : 0;
    ctx.strokeStyle = shaftColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(20, snap * 0.15, 44, 0);
    ctx.stroke();
    ctx.strokeStyle = hookColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(39, 0);
    ctx.quadraticCurveTo(58 + snap, -18 - snap * 0.2, 66 + snap * 0.5, 5);
    ctx.stroke();
}

function drawSlingshotInHand(handX, handY, dir, pull) {
    const angle = Math.atan2(dir.y, dir.x);
    ctx.save();
    ctx.translate(handX + dir.x * 12, handY + dir.y * 12);
    ctx.rotate(angle);
    ctx.strokeStyle = '#6b3b1f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(0, -2);
    ctx.lineTo(-9, -14);
    ctx.moveTo(0, -2);
    ctx.lineTo(9, -14);
    ctx.stroke();
    ctx.strokeStyle = '#d49a5a';
    ctx.lineWidth = 2;
    const pulled = pull > 0.05;
    const pullBack = 3 + pull * 14;
    ctx.beginPath();
    ctx.moveTo(-9, -14);
    ctx.quadraticCurveTo(-5 - pullBack, -5 + pull * 7, 0, pull * 10);
    ctx.quadraticCurveTo(5 + pullBack, -5 + pull * 7, 9, -14);
    ctx.stroke();
    if (pulled) {
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(-3, pull * 10 - 3, 6, 6);
    }
    ctx.restore();
}

function drawBowInHand(handX, handY, dir, pull) {
    const angle = Math.atan2(dir.y, dir.x);
    ctx.save();
    ctx.translate(handX + dir.x * 13, handY + dir.y * 13);
    ctx.rotate(angle);
    ctx.strokeStyle = '#6b3b1f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.quadraticCurveTo(18, 0, 0, 24);
    ctx.stroke();
    ctx.strokeStyle = '#f1dfc3';
    ctx.lineWidth = 2;
    const pullBack = pull * 20;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(-pullBack, 0);
    ctx.lineTo(0, 24);
    ctx.stroke();
    if (pull > 0.05 && directRangedAmmoFor('sinewBow')) {
        ctx.strokeStyle = directRangedAmmoFor('sinewBow') === 'poisonArrow' ? '#8cff66' : '#d8e5f2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-pullBack - 8, 0);
        ctx.lineTo(24, 0);
        ctx.stroke();
    }
    ctx.restore();
}

function drawDecorations() {
    for (const item of visibleDecorations(100)) {
        const x = worldX(item.x);
        const y = worldY(item.y);
        if (x < -80 || y < -80 || x > VIEW.width + 80 || y > VIEW.height + 80) continue;
        if (item.kind === 'reeds') {
            if (terrainInfoAt(item.x, item.y).kind !== 'shore') continue;
            ctx.fillStyle = '#5d7b3a';
            ctx.fillRect(x - 12, y - 18, 4, 22);
            ctx.fillRect(x - 2, y - 24, 4, 28);
            ctx.fillRect(x + 10, y - 16, 4, 20);
            ctx.fillStyle = '#c79649';
            ctx.fillRect(x - 3, y - 27, 6, 7);
        } else if (item.kind === 'flowers') {
            ctx.fillStyle = COLORS.grass2;
            ctx.fillRect(x - 6, y + 3, 12, 8);
            ctx.fillStyle = COLORS.flower1;
            ctx.fillRect(x - 8, y - 4, 5, 5);
            ctx.fillStyle = COLORS.flower2;
            ctx.fillRect(x + 4, y - 6, 5, 5);
            ctx.fillStyle = COLORS.herb;
            ctx.fillRect(x - 1, y - 10, 4, 4);
        } else if (item.kind === 'stump') {
            drawShadow(x, y + 9, 28, 8);
            ctx.fillStyle = COLORS.bark;
            ctx.fillRect(x - 13, y - 4, 26, 16);
            ctx.fillStyle = COLORS.trunk;
            ctx.fillRect(x - 10, y - 9, 20, 8);
            ctx.fillStyle = COLORS.gold;
            ctx.fillRect(x - 4, y - 7, 8, 4);
        } else if (item.kind === 'pebbles') {
            if (terrainInfoAt(item.x, item.y).kind !== 'mine') continue;
            ctx.fillStyle = COLORS.stone2;
            ctx.fillRect(x - 13, y, 10, 7);
            ctx.fillRect(x + 2, y - 5, 13, 9);
            ctx.fillStyle = COLORS.stone1;
            ctx.fillRect(x - 10, y - 2, 5, 2);
            ctx.fillRect(x + 5, y - 7, 6, 2);
        } else if (item.kind === 'crack') {
            if (terrainInfoAt(item.x, item.y).kind !== 'mine' && terrainInfoAt(item.x, item.y).kind !== 'ruins') continue;
            ctx.strokeStyle = 'rgba(20, 24, 29, 0.42)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 18, y - 5);
            ctx.lineTo(x - 4, y + 1);
            ctx.lineTo(x + 8, y - 2);
            ctx.lineTo(x + 18, y + 8);
            ctx.stroke();
        } else {
            ctx.fillStyle = COLORS.grass2;
            ctx.fillRect(x - 8, y - 6, 4, 12);
            ctx.fillRect(x, y - 10, 4, 16);
            ctx.fillRect(x + 8, y - 5, 4, 10);
        }
    }
}

function drawAttackSlash(x, y, dir, now) {
    const progress = 1 - Math.max(0, state.player.attackUntil - now) / 140;
    const angle = Math.atan2(dir.y, dir.x);
    const range = currentAttackProfile().range;
    const style = currentAttackProfile().style;
    const handX = x + dir.x * 22;
    const handY = y - 31 + dir.y * 8;
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(angle);
    if (style === 'thrust' || style === 'stab' || style === 'pick') {
        const length = range * (style === 'stab' ? 0.68 : 0.88);
        ctx.strokeStyle = style === 'pick' ? 'rgba(168, 179, 189, 0.95)' : 'rgba(255, 243, 176, 0.95)';
        ctx.lineWidth = style === 'stab' ? 4 : 5;
        ctx.beginPath();
        ctx.moveTo(8 + progress * 10, 0);
        ctx.lineTo(length + progress * 14, 0);
        ctx.stroke();
        ctx.fillStyle = style === 'pick' ? 'rgba(216, 229, 242, 0.85)' : 'rgba(255, 209, 102, 0.85)';
        ctx.fillRect(length + progress * 14 - 3, -3, 7, 6);
        ctx.restore();
        return;
    }
    if (style === 'chop') {
        ctx.strokeStyle = 'rgba(255, 243, 176, 0.95)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, range * 0.58, -1.05 + progress * 0.55, 0.15 + progress * 0.55);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 159, 28, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, range * 0.42, -0.9 + progress * 0.45, -0.08 + progress * 0.45);
        ctx.stroke();
        ctx.restore();
        return;
    }
    ctx.strokeStyle = 'rgba(255, 243, 176, 0.95)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, range * 0.62, -0.85 + progress * 0.35, 0.55 + progress * 0.35);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 159, 28, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, range * 0.46, -0.65 + progress * 0.25, 0.42 + progress * 0.25);
    ctx.stroke();
    ctx.restore();
}

function drawParticles() {
    for (const p of state.particles) {
        const alpha = clamp(p.life / 0.6, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(worldX(p.x), worldY(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

function drawFloatTexts() {
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Microsoft YaHei"';
    for (const t of state.floatTexts) {
        if (!!t.indoor !== !!state.indoor) continue;
        ctx.globalAlpha = clamp(t.life / 0.85, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(t.text, worldX(t.x) + 1, worldY(t.y) + 1);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, worldX(t.x), worldY(t.y));
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
}

function drawEffects() {
    drawHarvestProgress();
    drawItemUseProgress();
    drawThrowablePreview();
    drawDirectRangedPreview();
    drawPlacementPreview();
}

function drawThrowablePreview() {
    const aim = state.player.throwableAim;
    if (!aim || (state.inventory[aim.key] || 0) <= 0) return;
    const target = throwableTargetForAim(aim, performance.now());
    const start = { x: state.player.x, y: state.player.y - 10 };
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.76)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const arc = Math.sin(t * Math.PI) * 42;
        const x = worldX(lerp(start.x, target.x, t));
        const y = worldY(lerp(start.y, target.y, t) - arc);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const wet = terrainInfoAt(target.x, target.y).kind === 'water';
    ctx.fillStyle = wet ? 'rgba(159, 179, 200, 0.18)' : 'rgba(255, 159, 28, 0.18)';
    ctx.strokeStyle = wet ? 'rgba(216, 229, 242, 0.85)' : 'rgba(255, 209, 102, 0.95)';
    ctx.beginPath();
    ctx.arc(worldX(target.x), worldY(target.y), wet ? 82 : 138, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawDirectRangedPreview() {
    const aim = state.player.rangedAim;
    if (!aim) return;
    const ammo = directRangedAmmoFor(aim.key, aim.ammo);
    if (!ammo) return;
    const charge = directRangedCharge(aim, performance.now());
    const dir = currentAimDir();
    const range = aim.key === 'slingshot' ? (150 + charge * 240) : (230 + charge * 390);
    const start = { x: state.player.x, y: state.player.y - 10 };
    const end = { x: start.x + dir.x * range, y: start.y + dir.y * range };
    ctx.save();
    ctx.strokeStyle = aim.key === 'slingshot' ? 'rgba(216, 229, 242, 0.68)' : 'rgba(255, 209, 102, 0.72)';
    ctx.lineWidth = 2 + charge * 2;
    ctx.setLineDash(aim.key === 'slingshot' ? [5, 8] : [12, 6]);
    ctx.beginPath();
    ctx.moveTo(worldX(start.x), worldY(start.y));
    ctx.lineTo(worldX(end.x), worldY(end.y));
    ctx.stroke();
    ctx.setLineDash([]);
    const barX = worldX(state.player.x) - 28;
    const barY = worldY(state.player.y - state.player.radius - 34);
    ctx.fillStyle = 'rgba(8, 14, 21, 0.78)';
    ctx.fillRect(barX, barY, 56, 7);
    ctx.fillStyle = aim.key === 'slingshot' ? '#d8e5f2' : '#ffd166';
    ctx.fillRect(barX, barY, 56 * charge, 7);
    ctx.strokeStyle = '#101820';
    ctx.strokeRect(barX, barY, 56, 7);
    ctx.restore();
}

function drawItemUseProgress() {
    const use = state.player.usingItem;
    if (!use) return;
    const progress = clamp((performance.now() - use.startedAt) / use.duration, 0, 1);
    const x = state.indoor ? state.player.x : worldX(state.player.x);
    const y = state.indoor ? state.player.y - state.player.radius - 28 : worldY(state.player.y - state.player.radius - 28);
    ctx.fillStyle = 'rgba(8, 14, 21, 0.78)';
    ctx.fillRect(x - 34, y, 68, 8);
    ctx.fillStyle = '#9cffb7';
    ctx.fillRect(x - 34, y, 68 * progress, 8);
    ctx.strokeStyle = '#101820';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 34, y, 68, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(RESOURCE_LABELS[use.key] || use.key, x, y - 4);
    ctx.textAlign = 'left';
}

function drawPlacementPreview() {
    const item = selectedHotbarItem();
    const preview = placementPreviewForItem(item);
    if (!preview || !state.inventory[item]) return;
    const x = worldX(preview.x);
    const y = worldY(preview.y);
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = preview.valid ? 'rgba(94, 224, 137, 0.22)' : 'rgba(255, 107, 107, 0.22)';
    ctx.strokeStyle = preview.valid ? 'rgba(158, 255, 183, 0.9)' : 'rgba(255, 170, 170, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, preview.radius, Math.max(6, preview.radius * 0.42), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (item === 'torch') {
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - 2, y - 22, 4, 24);
        ctx.fillStyle = preview.valid ? '#ffd166' : '#ff6b6b';
        ctx.fillRect(x - 5, y - 30, 10, 8);
    } else if (item === 'bambooFence') {
        ctx.strokeStyle = preview.valid ? '#d7f28a' : '#ffb3b3';
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 16);
        ctx.lineTo(x + 18, y - 20);
        ctx.moveTo(x - 14, y + 2);
        ctx.lineTo(x - 12, y - 26);
        ctx.moveTo(x + 10, y + 2);
        ctx.lineTo(x + 13, y - 28);
        ctx.stroke();
    } else if (item === 'bambooTrap') {
        ctx.strokeStyle = preview.valid ? '#d7f28a' : '#ffb3b3';
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 14 + i * 9, y + 2);
            ctx.lineTo(x - 6 + i * 9, y - 18);
            ctx.lineTo(x + 2 + i * 9, y + 2);
            ctx.stroke();
        }
    } else {
        ctx.fillStyle = preview.valid ? 'rgba(255, 209, 102, 0.38)' : 'rgba(255, 107, 107, 0.35)';
        ctx.fillRect(x - preview.radius, y - preview.radius - 6, preview.radius * 2, preview.radius + 10);
    }
    ctx.restore();
}

function drawTerrainForeground() {
    const foregroundGrass = new Set(getNearbyTallGrass(state.player, 130).filter(grass => isNearView(grass, 80)));
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0 || !isNearView(enemy, 120)) continue;
        getNearbyTallGrass(enemy, enemy.radius + 42).forEach(grass => {
            if (isNearView(grass, 80)) foregroundGrass.add(grass);
        });
    }
    for (const grass of foregroundGrass) {
        drawTallGrassClump(grass, worldX(grass.x), worldY(grass.y), true);
    }
}

function nightAmount() {
    const t = state.timeOfDay;
    if (t > 0.22 && t < 0.72) return 0;
    const midnightDistance = Math.min(Math.abs(t - 0), Math.abs(t - 1));
    if (t >= 0.72) return clamp((t - 0.72) / 0.16, 0, 1);
    return clamp((0.22 - t) / 0.16, 0, 1) * clamp(1 - midnightDistance / 0.22, 0.45, 1);
}

function shadeNightPower() {
    return clamp((nightAmount() - 0.18) / 0.82, 0, 1);
}

function drawNightOverlay() {
    const darkness = nightAmount();
    if (darkness <= 0.01) return;
    lightCtx.clearRect(0, 0, VIEW.width, VIEW.height);
    lightCtx.globalCompositeOperation = 'source-over';
    lightCtx.fillStyle = `rgba(2, 5, 18, ${0.82 * darkness})`;
    lightCtx.fillRect(0, 0, VIEW.width, VIEW.height);
    lightCtx.globalCompositeOperation = 'destination-out';
    const drawLight = (light) => {
        if (!isNearView(light, light.radius + 24)) return;
        const sx = worldX(light.x);
        const sy = worldY(light.y);
        const strength = light.strength || 0.45;
        const gradient = lightCtx.createRadialGradient(sx, sy, 8, sx, sy, light.radius);
        gradient.addColorStop(0, `rgba(255,255,255,${strength * darkness})`);
        gradient.addColorStop(0.42, `rgba(255,255,255,${strength * 0.45 * darkness})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        lightCtx.fillStyle = gradient;
        lightCtx.beginPath();
        lightCtx.arc(sx, sy, light.radius, 0, Math.PI * 2);
        lightCtx.fill();
    };
    drawLight({ x: state.player.x, y: state.player.y, radius: performance.now() < state.player.nightVisionUntil ? 270 : (selectedHotbarItem() === 'torch' || state.equipment.utility === '火把' ? 150 : 62), strength: performance.now() < state.player.nightVisionUntil ? 0.68 : 0.36 });
    drawLight({ x: state.camp.x, y: state.camp.y, radius: state.camp.repaired ? 180 : 85, strength: 0.58 });
    for (const village of allVillages()) {
        for (const building of village.buildings || []) {
            if (village.tier !== 'jungleCult') {
                drawLight({ x: building.x - 24, y: building.doorY + 8, radius: 124, strength: 0.5 });
                drawLight({ x: building.x + 24, y: building.doorY + 8, radius: 124, strength: 0.5 });
            }
        }
        for (const lamp of village.amenities?.lamps || []) {
            drawLight({ x: lamp.x, y: lamp.y - 24, radius: village.tier === 'jungleCult' ? 170 : 150, strength: village.tier === 'jungleCult' ? 0.64 : 0.56 });
        }
        if (village.amenities?.altar) drawLight({ x: village.amenities.altar.x, y: village.amenities.altar.y - 26, radius: 210, strength: 0.5 });
        if (village.amenities?.bell) drawLight({ x: village.amenities.bell.x, y: village.amenities.bell.y - 12, radius: 105, strength: 0.36 });
    }
    for (const lamp of state.roadLamps || []) {
        drawLight({ x: lamp.x, y: lamp.y - 24, radius: 145, strength: 0.54 });
    }
    for (const torch of state.placedTorches) {
        drawLight({ x: torch.x, y: torch.y, radius: torch.kind === 'waxTorch' ? 150 : 125, strength: torch.kind === 'shadowLantern' ? 0.42 : 0.56 });
    }
    for (const fire of state.placedStations) {
        if (fire.kind === 'campfire') drawLight({ x: fire.x, y: fire.y, radius: 150, strength: 0.55 });
    }
    lightCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCanvas, 0, 0);
}

function drawHarvestProgress() {
    const p = state.player;
    const node = p.harvestTarget;
    if (!node || node.hp <= 0 || !keys.has('e')) return;
    const progress = clamp(1 - node.hp / node.maxHp, 0, 1);
    const x = worldX(node.x);
    const y = worldY(node.y - node.radius - 16);
    ctx.fillStyle = 'rgba(8, 14, 21, 0.78)';
    ctx.fillRect(x - 30, y, 60, 8);
    ctx.fillStyle = harvestBlockReason(node) ? '#ff6b6b' : '#ffd166';
    ctx.fillRect(x - 30, y, 60 * progress, 8);
    ctx.strokeStyle = '#101820';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 30, y, 60, 8);
}

function drawUiOverlay() {
    drawTopBar(18, 18, 210, 13, state.player.hp / state.player.maxHp, '#ff6b6b', '生命');
    drawTopBar(18, 40, 210, 10, state.player.stamina / 100, '#5ee089', '体力');
    drawTopBar(18, 56, 210, 10, state.player.hunger / state.player.maxHunger, '#ffd166', '饥饿');
    ctx.fillStyle = 'rgba(8, 14, 21, 0.72)';
    ctx.fillRect(18, 74, 460, 34);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Microsoft YaHei"';
    ctx.fillText(`目标：${questText()}`, 30, 96);
    ctx.fillStyle = 'rgba(255,255,255,0.76)';
    ctx.font = 'bold 13px "Microsoft YaHei"';
    ctx.fillText('按 I 打开背包 / 合成栏', 30, 120);
    const prompt = state.indoor ? indoorPromptText(nearestIndoorObject()) : interactPromptText(nearestInteractable());
    if (prompt) {
        ctx.fillStyle = 'rgba(8, 14, 21, 0.72)';
        ctx.fillRect(18, 128, 460, 24);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.fillText(prompt, 30, 145);
    }
    if (state.player.poisonUntil > performance.now()) {
        ctx.fillStyle = 'rgba(42, 88, 38, 0.82)';
        ctx.fillRect(402, 64, 62, 20);
        ctx.strokeStyle = '#9cff7a';
        ctx.lineWidth = 2;
        ctx.strokeRect(402, 64, 62, 20);
        ctx.fillStyle = '#d9ffd0';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.fillText('中毒', 419, 79);
    }
    if (state.player.dizzyUntil > performance.now()) {
        ctx.fillStyle = 'rgba(120, 85, 28, 0.82)';
        ctx.fillRect(402, 88, 62, 20);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.strokeRect(402, 88, 62, 20);
        ctx.fillStyle = '#fff3b0';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.fillText('眩晕', 419, 103);
    }
    if ((state.player.slowUntil || 0) > performance.now()) {
        ctx.fillStyle = 'rgba(32, 76, 103, 0.82)';
        ctx.fillRect(470, 88, 74, 20);
        ctx.strokeStyle = '#7dcbe8';
        ctx.lineWidth = 2;
        ctx.strokeRect(470, 88, 74, 20);
        ctx.fillStyle = '#d8f6ff';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.fillText('迟缓50%', 480, 103);
    }
    if ((state.player.neuroToxinUntil || 0) > performance.now()) {
        const flicker = Math.sin(performance.now() / 90) > 0 ? 0.32 : 0.08;
        ctx.fillStyle = `rgba(0, 0, 0, ${flicker})`;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        ctx.fillStyle = '#d5ffd8';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.fillText('神经毒', 552, 103);
    }
    if ((state.player.hungerToxinUntil || 0) > performance.now()) {
        ctx.fillStyle = '#cde77b';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.fillText('饥饿毒', 616, 103);
    }
    if ((state.player.weakToxinUntil || 0) > performance.now()) {
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(672, 88, 6, 20);
        ctx.fillRect(666, 94, 18, 6);
        ctx.fillStyle = '#d9ffd6';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.fillText('虚弱毒', 690, 103);
    }
    drawCultToxinVisualEffects(performance.now());
    drawHotbar();

    if (state.win || state.lose) {
        const deathProgress = state.lose ? clamp((performance.now() - (state.deathStartedAt || performance.now())) / 1400, 0, 1) : 1;
        ctx.fillStyle = `rgba(7, 12, 18, ${state.win ? 0.72 : 0.28 + deathProgress * 0.44})`;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        if (state.lose && deathProgress < 0.78) return;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(state.win ? '废墟开启！' : '冒险失败', VIEW.width / 2, VIEW.height / 2 - 16);
        ctx.font = 'bold 20px "Microsoft YaHei"';
        if (state.win) {
            ctx.fillText('你完成了荒野营地 Demo。', VIEW.width / 2, VIEW.height / 2 + 34);
        } else {
            ctx.fillText(state.deathMessage || '你倒下了。', VIEW.width / 2, VIEW.height / 2 + 30);
            ctx.font = 'bold 15px "Microsoft YaHei"';
            ctx.fillStyle = '#ffd166';
            wrapCenterText(state.deathAdvice || '重新开始，先打造装备再深入危险区域。', VIEW.width / 2, VIEW.height / 2 + 64, 620, 22);
        }
        ctx.textAlign = 'left';
    }
}

function wrapCenterText(text, x, y, maxWidth, lineHeight) {
    const chars = String(text || '').split('');
    let line = '';
    let lineY = y;
    for (const char of chars) {
        const test = line + char;
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, lineY);
            line = char;
            lineY += lineHeight;
        } else {
            line = test;
        }
    }
    if (line) ctx.fillText(line, x, lineY);
}

function drawCultToxinVisualEffects(now) {
    const p = state.player;
    const neuro = Math.max(0, (p.neuroToxinUntil || 0) - now);
    const hunger = Math.max(0, (p.hungerToxinUntil || 0) - now);
    const weak = Math.max(0, (p.weakToxinUntil || 0) - now);
    if (!neuro && !hunger && !weak) return;
    ctx.save();
    if (neuro) {
        const pulse = 0.5 + Math.sin(now / 42) * 0.5;
        const blackout = Math.sin(now / 115) > 0.18 ? 0.42 : 0.08;
        ctx.fillStyle = `rgba(0, 0, 0, ${blackout})`;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        ctx.fillStyle = `rgba(213,255,216,${0.12 + pulse * 0.16})`;
        const jitter = Math.round(Math.sin(now / 27) * 10);
        ctx.fillRect(jitter, 0, VIEW.width, VIEW.height);
        ctx.fillStyle = 'rgba(140,255,102,0.22)';
        for (let y = (Math.floor(now / 18) % 12) - 12; y < VIEW.height; y += 18) ctx.fillRect(0, y, VIEW.width, 3);
        ctx.strokeStyle = `rgba(255,255,255,${0.24 + pulse * 0.24})`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            const y = 70 + i * 82 + Math.sin(now / 80 + i) * 26;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(VIEW.width, y + Math.sin(now / 52 + i) * 32);
            ctx.stroke();
        }
    }
    if (hunger) {
        const pulse = 0.45 + Math.sin(now / 120) * 0.25;
        const gradient = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 80, VIEW.width / 2, VIEW.height / 2, VIEW.width * 0.68);
        gradient.addColorStop(0, 'rgba(205,231,123,0)');
        gradient.addColorStop(0.62, `rgba(205,231,123,${0.08 + pulse * 0.08})`);
        gradient.addColorStop(1, `rgba(56,72,18,${0.34 + pulse * 0.12})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        ctx.fillStyle = 'rgba(255,209,102,0.18)';
        for (let i = 0; i < 10; i++) {
            const x = (i * 113 + now * 0.035) % (VIEW.width + 80) - 40;
            const y = 120 + Math.sin(now / 180 + i) * 95 + i * 34;
            ctx.fillRect(x, y, 46, 6);
        }
    }
    if (weak) {
        const pulse = 0.5 + Math.sin(now / 150) * 0.35;
        ctx.strokeStyle = `rgba(140,255,102,${0.18 + pulse * 0.26})`;
        ctx.lineWidth = 5;
        for (let i = 0; i < 7; i++) {
            const x = 80 + i * 122 + Math.sin(now / 210 + i) * 26;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 22, 120);
            ctx.lineTo(x + 18, 240);
            ctx.lineTo(x - 16, VIEW.height);
            ctx.stroke();
        }
        ctx.fillStyle = `rgba(95,174,73,${0.08 + pulse * 0.08})`;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    ctx.restore();
}

function drawHotbar() {
    syncHotbarItems();
    const slot = 48;
    const gap = 6;
    const hotbarItems = state.hotbarItems || HOTBAR_ITEMS;
    const total = hotbarItems.length * slot + (hotbarItems.length - 1) * gap;
    const startX = Math.round((VIEW.width - total) / 2);
    const y = VIEW.height - slot - 18;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 14, 21, 0.82)';
    ctx.fillRect(startX - 10, y - 10, total + 20, slot + 20);
    hotbarItems.forEach((key, index) => {
        const x = startX + index * (slot + gap);
        const selected = index === state.selectedHotbar;
        ctx.fillStyle = selected ? 'rgba(255, 209, 102, 0.28)' : 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(x, y, slot, slot);
        ctx.strokeStyle = selected ? '#ffd166' : 'rgba(255,255,255,0.28)';
        ctx.lineWidth = selected ? 4 : 2;
        ctx.strokeRect(x, y, slot, slot);
        ctx.fillStyle = '#9fb3c8';
        ctx.font = 'bold 10px "Microsoft YaHei"';
        ctx.textAlign = 'left';
        ctx.fillText(String(index + 1), x + 4, y + 12);
        if (state.inventory[key] > 0) {
            drawPixelItemIcon(ctx, key, x + slot / 2, y + 28, 28);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Microsoft YaHei"';
            ctx.textAlign = 'right';
            ctx.fillText(String(state.inventory[key]), x + slot - 5, y + slot - 5);
        }
    });
    const selectedKey = hotbarItems[state.selectedHotbar];
    if (selectedKey && state.inventory[selectedKey] > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(`${RESOURCE_LABELS[selectedKey]}：按 ${state.selectedHotbar + 1} 使用/装备`, VIEW.width / 2, y - 16);
    }
    ctx.restore();
}

function drawTopBar(x, y, width, height, percent, color, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * clamp(percent, 0, 1), height);
    ctx.strokeStyle = '#101820';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Microsoft YaHei"';
    ctx.fillText(label, x + width + 8, y + height);
}

function drawMiniBar(x, y, percent, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 20, y, 40, 5);
    ctx.fillStyle = color;
    ctx.fillRect(x - 20, y, 40 * clamp(percent, 0, 1), 5);
}

function drawShadow(x, y, width, height) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
    ctx.beginPath();
    ctx.ellipse(x, y + height * 0.08, width / 2.8, height / 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawSprite(name, x, y, scale, options = {}) {
    const sprite = SPRITES[name];
    if (!sprite) return;
    const palette = sprite.map;
    for (let row = 0; row < sprite.rows.length; row++) {
        const line = sprite.rows[row];
        for (let col = 0; col < line.length; col++) {
            const key = line[col];
            if (key === '.') continue;
            const colorName = palette[key];
            ctx.fillStyle = options.tint || COLORS[colorName] || colorName || '#ffffff';
            ctx.fillRect(Math.round(x + col * scale), Math.round(y + row * scale), Math.ceil(scale), Math.ceil(scale));
        }
    }
}

function drawSpriteGrounded(name, centerX, groundY, scale, options = {}) {
    const sprite = SPRITES[name];
    if (!sprite) return;
    const bounds = spriteVisibleBounds(sprite);
    const visibleWidth = (bounds.maxCol - bounds.minCol + 1) * scale;
    const offsetX = bounds.minCol * scale;
    const offsetY = bounds.maxRow * scale;
    drawSprite(name, centerX - visibleWidth / 2 - offsetX, groundY - offsetY - scale, scale, options);
}

function spriteVisibleBounds(sprite) {
    if (sprite.bounds) return sprite.bounds;
    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;
    for (let row = 0; row < sprite.rows.length; row++) {
        const line = sprite.rows[row];
        for (let col = 0; col < line.length; col++) {
            if (line[col] === '.') continue;
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
        }
    }
    sprite.bounds = {
        minRow: Number.isFinite(minRow) ? minRow : 0,
        maxRow: Number.isFinite(maxRow) ? maxRow : 0,
        minCol: Number.isFinite(minCol) ? minCol : 0,
        maxCol: Number.isFinite(maxCol) ? maxCol : sprite.w - 1,
    };
    return sprite.bounds;
}

function drawGroundContact(x, y, kind) {
    ctx.fillStyle = kind === 'ore' ? 'rgba(48, 61, 68, 0.65)' : 'rgba(52, 48, 43, 0.55)';
    ctx.fillRect(x - 22, y - 3, 44, 8);
    ctx.fillStyle = kind === 'ore' ? 'rgba(148, 227, 255, 0.28)' : 'rgba(168, 179, 189, 0.26)';
    ctx.fillRect(x - 12, y - 6, 24, 4);
}

function resourceName(kind) {
    if (STUMP_TREE_KIND[kind]) return `${resourceName(STUMP_TREE_KIND[kind])}树桩`;
    return { tree: '树木', grassOakTree: '平原橡树', meadowBlossomTree: '花冠树', forestOakTree: '森林橡树', birchTree: '白桦树', pineTree: '松树', mapleTree: '枫树', deadTree: '枯树', darkTree: '暗绿树', swampCypressTree: '沼泽柏树', reedWillowTree: '湿地柳树', mineIronwoodTree: '矿脉铁木', ruinsElderTree: '遗迹古树', hardwoodTree: '丛林硬木', buttressRoot: '板根树', jungleLeafPlant: '丛林大叶', jungleVine: '藤蔓', jungleFruitBush: '热带果丛', jungleHerb: '丛林草药', jungleOrchid: '树上兰花', poisonBloom: '毒花', stump: '树桩', woodFence: '木栅栏', rock: '岩石', pebble: '小石子', grass: '草丛', tallGrass: '高草丛', reed: '芦苇', berry: '浆果丛', herb: '草药', mushroom: '蘑菇', toxicMushroom: '毒蘑菇', flower: '野花', meadowFlower: '花海花簇', lotus: '莲花', cactus: '仙人掌', ore: '铁矿', bamboo: '竹子', resinPatch: '树脂', sapPatch: '树液', beehive: '蜂巢', mudClump: '泥块' }[kind] || '资源';
}

function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt, now);
}

window.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'e', 'E', 'q', 'Q', 'i', 'I', 'Escape', 'Shift'].includes(key)) event.preventDefault();
    if (key === 'i') {
        toggleInventory();
        return;
    }
    if (key === 'Escape' && state.inventoryOpen) {
        toggleInventory(false);
        return;
    }
    if (state.inventoryOpen) return;
    if (/^[1-9]$/.test(key)) {
        const index = Number(key) - 1;
        selectHotbarSlot(index);
        return;
    }
    if (key === ' ' && isThrowableItem(selectedHotbarItem())) {
        keys.add(key);
        startThrowableAim();
        return;
    }
    if (key === ' ' && isDirectRangedItem(selectedHotbarItem())) {
        keys.add(key);
        startDirectRangedAim();
        return;
    }
    if (key === ' ' && isChargeMeleeItem(selectedHotbarItem())) {
        keys.add(key);
        startMeleeCharge();
        return;
    }
    if (key === 'q') {
        useSelectedHotbarItem();
        return;
    }
    if (key === 'e') {
        keys.add(key);
        if (!event.repeat) {
            interact();
        }
    }
    else if (key === ' ') {
        keys.add(key);
        attack();
    }
    else if (key === 'r') {
        state.player.x = state.camp.x + 80;
        state.player.y = state.camp.y + 40;
        showToast('已回到营地附近。');
    } else {
        keys.add(key);
    }
});

window.addEventListener('keyup', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === ' ' && state.player.throwableAim) releaseThrowable();
    if (key === ' ' && state.player.rangedAim) releaseDirectRanged();
    if (key === ' ' && state.player.meleeCharge) releaseMeleeCharge();
    keys.delete(key);
    if (key === 'e') resetHarvestHold();
});

function setMouseToFacing(distanceAhead = 150) {
    const p = state.player;
    mouse.x = worldX(p.x + p.facing.x * distanceAhead);
    mouse.y = worldY(p.y + p.facing.y * distanceAhead);
}

function triggerMobileInteractStart() {
    touchInput.interact = true;
    keys.add('e');
    interact();
}

function triggerMobileInteractEnd() {
    touchInput.interact = false;
    keys.delete('e');
    resetHarvestHold();
}

function setupMobileControls() {
    const controls = document.getElementById('mobile-controls');
    const joystick = document.getElementById('mobile-joystick');
    const thumb = document.getElementById('mobile-joystick-thumb');
    if (!controls || !joystick || !thumb) return;

    document.body.classList.add('mobile-control-active');
    updateMobileInventoryScale();
    window.addEventListener('resize', updateMobileInventoryScale);
    window.addEventListener('orientationchange', updateMobileInventoryScale);
    document.addEventListener('touchmove', event => {
        if (!document.body.classList.contains('mobile-control-active')) return;
        if (state.inventoryOpen) return;
        event.preventDefault();
    }, { passive: false });
    const resetStick = () => {
        touchInput.moveX = 0;
        touchInput.moveY = 0;
        touchInput.joystickPointerId = null;
        thumb.style.transform = 'translate(-50%, -50%)';
    };
    const updateStick = event => {
        const rect = joystick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const max = rect.width * 0.34;
        const rawX = event.clientX - cx;
        const rawY = event.clientY - cy;
        const length = Math.hypot(rawX, rawY);
        const scale = length > max ? max / length : 1;
        const x = rawX * scale;
        const y = rawY * scale;
        touchInput.moveX = Math.abs(x) < 4 ? 0 : x / max;
        touchInput.moveY = Math.abs(y) < 4 ? 0 : y / max;
        thumb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    };
    joystick.addEventListener('pointerdown', event => {
        event.preventDefault();
        touchInput.joystickPointerId = event.pointerId;
        joystick.setPointerCapture(event.pointerId);
        updateStick(event);
    });
    joystick.addEventListener('pointermove', event => {
        if (touchInput.joystickPointerId !== event.pointerId) return;
        event.preventDefault();
        updateStick(event);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
        joystick.addEventListener(type, resetStick);
    });

    document.querySelectorAll('[data-mobile-action]').forEach(button => {
        const action = button.dataset.mobileAction;
        button.addEventListener('pointerdown', event => {
            event.preventDefault();
            if (action === 'attack') {
                setMouseToFacing();
                if (isThrowableItem(selectedHotbarItem())) startThrowableAim();
                else if (isDirectRangedItem(selectedHotbarItem())) startDirectRangedAim();
                else if (isChargeMeleeItem(selectedHotbarItem())) startMeleeCharge();
                else {
                    mouse.down = true;
                    attack();
                }
            } else if (action === 'interact') {
                triggerMobileInteractStart();
            } else if (action === 'block') {
                mouse.blocking = true;
            }
        });
        button.addEventListener('pointerup', event => {
            event.preventDefault();
            if (action === 'attack') {
                if (state.player.throwableAim) releaseThrowable();
                if (state.player.rangedAim) releaseDirectRanged();
                mouse.down = false;
            } else if (action === 'interact') {
                triggerMobileInteractEnd();
            } else if (action === 'block') {
                mouse.blocking = false;
            }
        });
        button.addEventListener('pointercancel', () => {
            if (action === 'attack') {
                if (state.player.throwableAim) releaseThrowable();
                if (state.player.rangedAim) releaseDirectRanged();
                mouse.down = false;
            }
            if (action === 'interact') triggerMobileInteractEnd();
            if (action === 'block') mouse.blocking = false;
        });
        button.addEventListener('click', event => {
            event.preventDefault();
            if (action === 'use') useSelectedHotbarItem();
            if (action === 'inventory') toggleInventory();
        });
    });
}

canvas.addEventListener('mousemove', event => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener('contextmenu', event => {
    event.preventDefault();
});

canvas.addEventListener('mousedown', event => {
    if (state.inventoryOpen) return;
    if (event.button === 2) {
        mouse.blocking = true;
        return;
    }
    if (isThrowableItem(selectedHotbarItem())) {
        startThrowableAim();
        return;
    }
    if (isDirectRangedItem(selectedHotbarItem())) {
        startDirectRangedAim();
        return;
    }
    if (isChargeMeleeItem(selectedHotbarItem())) {
        startMeleeCharge();
        return;
    }
    mouse.down = true;
    attack();
});

canvas.addEventListener('mouseup', event => {
    if (event.button === 2) {
        mouse.blocking = false;
        return;
    }
    if (state.player.throwableAim) {
        releaseThrowable();
        return;
    }
    if (state.player.rangedAim) {
        releaseDirectRanged();
        return;
    }
    if (state.player.meleeCharge) {
        releaseMeleeCharge();
        return;
    }
    mouse.down = false;
});

canvas.addEventListener('mouseleave', () => {
    if (state.player.throwableAim) releaseThrowable();
    if (state.player.rangedAim) releaseDirectRanged();
    if (state.player.meleeCharge) releaseMeleeCharge();
    mouse.down = false;
    mouse.blocking = false;
});

function resetWorldCaches() {
    CAMP_POSITION = createCampPosition();
    terrainChunkCache.clear();
    vegetationSpriteCache.tallGrass.clear();
    vegetationSpriteCache.bamboo.clear();
    worldRegionsCacheSeed = null;
    worldRegionsCache = null;
    villagePathCacheSeed = null;
    villagePathCache = null;
    activeJungleCultVillage = null;
    activeAdvancedVillage = null;
}

function regenerateWilderness(message = '新的随机地图开始了。先收集木头和石头修复营地。') {
    document.getElementById('loading-screen')?.classList.remove('hidden');
    worldSeed = createWorldSeed();
    resetWorldCaches();
    state = createState();
    showToast(message);
    renderHud();
    requestAnimationFrame(() => document.getElementById('loading-screen')?.classList.add('hidden'));
}

function readWildernessSettingsFromUi() {
    wildernessSettings.seedText = document.getElementById('setting-seed')?.value || '';
    wildernessSettings.monsterDensity = Number(document.getElementById('setting-monster-density')?.value || 1);
    wildernessSettings.dayLength = Number(document.getElementById('setting-day-length')?.value || 230);
    wildernessSettings.jungleScale = Number(document.getElementById('setting-jungle-scale')?.value || 1);
    wildernessSettings.forestScale = Number(document.getElementById('setting-forest-scale')?.value || 1);
    wildernessSettings.villageScale = Number(document.getElementById('setting-village-scale')?.value || 1);
    wildernessSettings.villageDistance = Number(document.getElementById('setting-village-distance')?.value || 1);
    wildernessSettings.cultSpacing = Number(document.getElementById('setting-cult-spacing')?.value || 150);
    wildernessSettings.fortressEnabled = !!document.getElementById('setting-fortress-enabled')?.checked;
}

function updateWildernessSettingLabels() {
    const monster = document.getElementById('setting-monster-density');
    const day = document.getElementById('setting-day-length');
    const jungle = document.getElementById('setting-jungle-scale');
    const forest = document.getElementById('setting-forest-scale');
    const villageScale = document.getElementById('setting-village-scale');
    const villageDistance = document.getElementById('setting-village-distance');
    const cultSpacing = document.getElementById('setting-cult-spacing');
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    if (monster) setText('setting-monster-density-label', `${Number(monster.value).toFixed(1)}x`);
    if (day) setText('setting-day-length-label', `${day.value}秒`);
    if (jungle) setText('setting-jungle-scale-label', `${Number(jungle.value).toFixed(1)}x`);
    if (forest) setText('setting-forest-scale-label', `${Number(forest.value).toFixed(1)}x`);
    if (villageScale) setText('setting-village-scale-label', `${Number(villageScale.value).toFixed(1)}x`);
    if (villageDistance) setText('setting-village-distance-label', `${Number(villageDistance.value).toFixed(1)}x`);
    if (cultSpacing) setText('setting-cult-spacing-label', `${cultSpacing.value}`);
}

function setupWildernessSettingsUi() {
    ['setting-monster-density', 'setting-day-length', 'setting-jungle-scale', 'setting-forest-scale', 'setting-village-scale', 'setting-village-distance', 'setting-cult-spacing'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateWildernessSettingLabels);
    });
    document.getElementById('apply-wilderness-settings-btn')?.addEventListener('click', () => {
        readWildernessSettingsFromUi();
        regenerateWilderness('已按荒野设置重新生成世界。');
    });
    updateWildernessSettingLabels();
}

document.getElementById('restart-btn').addEventListener('click', () => {
    wildernessSettings.seedText = '';
    const seedInput = document.getElementById('setting-seed');
    if (seedInput) seedInput.value = '';
    regenerateWilderness();
});

document.getElementById('inventory-close-btn').addEventListener('click', () => toggleInventory(false));
document.getElementById('villager-trade-btn')?.addEventListener('click', () => {
    if (state.pendingTrader) openVillagerTrade(state.pendingTrader);
});

document.getElementById('inventory-overlay').addEventListener('click', event => {
    if (event.target.id === 'inventory-overlay') toggleInventory(false);
});

setupWildernessSettingsUi();
setupMobileControls();
renderHud();
showToast('自由移动探索。靠近资源按 E 采集，空格或鼠标攻击。');
requestAnimationFrame(() => document.getElementById('loading-screen')?.classList.add('hidden'));
requestAnimationFrame(loop);
