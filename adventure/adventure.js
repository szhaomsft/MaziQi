const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const lightCanvas = document.createElement('canvas');
lightCanvas.width = canvas.width;
lightCanvas.height = canvas.height;
const lightCtx = lightCanvas.getContext('2d');

const WORLD = { width: 10000, height: 5600 };
const VIEW = { width: canvas.width, height: canvas.height };
const CAMP_POSITION = { x: WORLD.width / 2, y: WORLD.height / 2 };
const TERRAIN_CHUNK_SIZE = 256;
const MAX_PARTICLES = 220;
const COVER_GRID_SIZE = 160;
const ITEM_ICON_GRID = 8;
const MAX_ENEMIES = 80;
const MAX_NEARBY_ENEMIES = 14;
const DYNAMIC_SPAWN_MIN_DISTANCE = 560;
const DYNAMIC_SPAWN_MAX_DISTANCE = 940;
const keys = new Set();
const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, blocking: false };
const touchInput = { moveX: 0, moveY: 0, interact: false, joystickPointerId: null };
const camera = { x: 0, y: 0 };
const terrainChunkCache = new Map();
const vegetationSpriteCache = {
    tallGrass: new Map(),
    bamboo: new Map(),
};
let toastTimer = null;
let lastTime = performance.now();
let worldSeed = createWorldSeed();
let worldRegionsCacheSeed = null;
let worldRegionsCache = null;
let state = createState();

const RESOURCE_LABELS = {
    wood: '木头',
    bamboo: '竹材',
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
};

const RESOURCE_ICONS = {
    wood: '🪵',
    bamboo: '🎋',
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
    reedMat: '▤',
    chest: '▣',
    resinGlue: '▣',
    mapleSnack: '▪',
    honeyRoastMeat: '▰',
    roastMeat: '🍖',
    key: '🗝',
};

const HOTBAR_ITEMS = ['stoneAxe', 'stonePickaxe', 'stoneSpear', 'ironSword', 'crystalBlade', 'torch', 'potion', 'speedPotion', 'bedroll'];
const POOR_SWIMMERS = new Set(['boar', 'wolf', 'scorpion', 'golem']);
const BACKPACK_COLUMNS = 9;
const BACKPACK_ROWS = 4;
const BACKPACK_SLOT_LIMIT = BACKPACK_COLUMNS * BACKPACK_ROWS;
const CHEST_SLOT_LIMIT = 27;
const ITEM_ICON_TYPES = {
    wood: 'wood', bamboo: 'bamboo', stone: 'stone', pebble: 'stone', ore: 'ore', coal: 'coal', crystal: 'crystal', mud: 'mud',
    resin: 'resin', sap: 'sap', honey: 'honey', beeStinger: 'fang', beeswax: 'honey', rabbitFur: 'hide', rabbitFoot: 'meat', antler: 'fang', sinew: 'fiber',
    frogLeg: 'meat', frogTongue: 'venom', scorpionShell: 'armor', batWing: 'wing', stoneCore: 'stoneCore', shadowShard: 'shadow', shadowEssence: 'shadow', toxicMushroom: 'toxicMushroom',
    fiber: 'grass', herb: 'herb', flower: 'flower', berry: 'berry', mushroom: 'mushroom', lotus: 'lotus', cactusFruit: 'cactus',
    hide: 'hide', meat: 'meat', slimeGel: 'gel', fang: 'fang', venom: 'venom',
    stoneAxe: 'axe', stonePickaxe: 'pickaxe', stoneSickle: 'sickle', stoneSpear: 'spear', slingshot: 'bow', bambooSpear: 'spear', ironSword: 'sword', crystalBlade: 'blade', venomDagger: 'dagger',
    leatherArmor: 'armor', clothArmor: 'cloak', ironArmor: 'armor', crystalArmor: 'armor', woodShield: 'shield', ironShield: 'shield',
    coalBomb: 'bomb', poisonVial: 'toxicMushroom', campfire: 'torch', torch: 'torch', bedroll: 'bedroll', campCharm: 'charm', snare: 'trap', bambooFence: 'fence', bambooTrap: 'trap',
    potionTable: 'stationPotion', workbench: 'stationWorkbench', forge: 'stationForge', campFlag: 'flag',
    potion: 'potion', stew: 'stew', salve: 'salve', antidote: 'antidote', speedPotion: 'speed', regenPotion: 'potion', ironSkinPotion: 'armorPotion',
    honeySalve: 'salve', nightVisionPotion: 'potion', jumpPotion: 'speed', poisonResistPotion: 'antidote', shadowPotion: 'shadow', bandage: 'bandage', strongBandage: 'bandage',
    sinewBow: 'bow', simpleArrow: 'arrow', poisonArrow: 'arrow', beeDart: 'dart', antlerSpear: 'spear', stoneCoreHammer: 'hammer', rabbitCloak: 'cloak', scorpionArmor: 'armor',
    antlerCharm: 'charm', waxTorch: 'torch', beehiveBox: 'honey', antlerHorn: 'horn', shadowLantern: 'shadow', stoneCoreTotem: 'stoneCore', reedMat: 'grass', chest: 'stationWorkbench', resinGlue: 'resin',
    mapleSnack: 'sap', honeyRoastMeat: 'meat', roastMeat: 'meat', key: 'key',
};
const PIXEL_ICON_PALETTES = {
    wood: ['#5a341d', '#9a6436', '#d49a5a'], bamboo: ['#1f5f34', '#70bf55', '#d7f28a'], stone: ['#48515a', '#8c98a4', '#d8e5f2'],
    ore: ['#48515a', '#7dcbe8', '#e8fbff'], coal: ['#121820', '#303946', '#7b8794'], crystal: ['#512b9a', '#b77dff', '#f2ddff'],
    mud: ['#3b2a1b', '#6d5438', '#a38350'], grass: ['#1f5f34', '#5fbf55', '#cde77b'], herb: ['#17613a', '#69e08e', '#d5ffd8'],
    resin: ['#5a341d', '#ffb84d', '#fff0a8'], sap: ['#5a2f1c', '#d68a43', '#ffd166'], honey: ['#8a5a12', '#ffd166', '#fff3b0'],
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
    recipe('workbench', '工作台', '放置后制作复杂物品', { wood: 8, stone: 2 }, game => {
        game.inventory.workbench += 1;
    }, () => false),
    recipe('potionTable', '药水台', '放置后制作高级药水', { wood: 3, stone: 4, lotus: 1 }, game => {
        game.inventory.potionTable += 1;
    }, () => false),
    recipe('forge', '锻造台', '放置后锻造高级装备', { stone: 8, mud: 4, coal: 3, ore: 2 }, game => {
        game.inventory.forge += 1;
    }, () => false),
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
    recipe('salve', '黏液药膏', '恢复 45 生命', { slimeGel: 2, herb: 2, flower: 1 }, game => {
        game.inventory.salve += 1;
    }, () => false),
    recipe('antidote', '解毒药', '解除中毒并恢复 15 生命', { herb: 1, lotus: 1, mushroom: 1 }, game => {
        game.inventory.antidote += 1;
    }, () => false),
    recipe('speedPotion', '迅捷药水', '短时间加速', { cactusFruit: 2, slimeGel: 1, lotus: 1 }, game => {
        game.inventory.speedPotion += 1;
    }, () => false),
    recipe('regenPotion', '再生药水', '持续恢复生命', { herb: 2, lotus: 2, slimeGel: 1 }, game => {
        game.inventory.regenPotion += 1;
    }, () => false),
    recipe('ironSkinPotion', '硬皮药水', '短时间降低受到的伤害', { cactusFruit: 1, mud: 2, coal: 1 }, game => {
        game.inventory.ironSkinPotion += 1;
    }, () => false),
    recipe('honeySalve', '蜂蜜药膏', '外用恢复 30 生命', { honey: 1, herb: 1, fiber: 1 }, game => { game.inventory.honeySalve += 1; }, () => false),
    recipe('nightVisionPotion', '夜视药水', '夜晚视野扩大', { batWing: 1, crystal: 1, lotus: 1 }, game => { game.inventory.nightVisionPotion += 1; }, () => false),
    recipe('jumpPotion', '跳跃药水', '短时间越过湿地阻力', { frogLeg: 1, lotus: 1, slimeGel: 1 }, game => { game.inventory.jumpPotion += 1; }, () => false),
    recipe('poisonResistPotion', '毒抗药水', '短时间免疫中毒', { scorpionShell: 1, antidote: 1, honey: 1 }, game => { game.inventory.poisonResistPotion += 1; }, () => false),
    recipe('shadowPotion', '暗影药水', '降低怪物感知', { shadowShard: 2, toxicMushroom: 1, crystal: 1 }, game => { game.inventory.shadowPotion += 1; }, () => false),
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
    const resources = createResources();
    const spawnDens = createSpawnDens();
    const village = createVillage();
    return {
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
            poisonUntil: 0,
            poisonTickAt: 0,
            regenUntil: 0,
            regenTickAt: 0,
            ironSkinUntil: 0,
            nightVisionUntil: 0,
            poisonResistUntil: 0,
            shadowUntil: 0,
            throwableAim: null,
            rangedAim: null,
        },
        inventory: { wood: 0, bamboo: 0, stone: 0, fiber: 0, pebble: 0, berry: 0, herb: 0, mushroom: 0, flower: 0, lotus: 0, cactusFruit: 0, resin: 0, sap: 0, honey: 0, beeStinger: 0, beeswax: 0, rabbitFur: 0, rabbitFoot: 0, antler: 0, sinew: 0, frogLeg: 0, frogTongue: 0, scorpionShell: 0, batWing: 0, stoneCore: 0, shadowShard: 0, shadowEssence: 0, toxicMushroom: 0, mud: 0, ore: 0, coal: 0, hide: 0, meat: 0, slimeGel: 0, fang: 0, venom: 0, crystal: 0, stoneAxe: 0, stonePickaxe: 0, stoneSickle: 0, stoneSpear: 0, slingshot: 0, bambooSpear: 0, ironSword: 0, crystalBlade: 0, venomDagger: 0, sinewBow: 0, antlerSpear: 0, stoneCoreHammer: 0, leatherArmor: 0, clothArmor: 0, ironArmor: 0, crystalArmor: 0, rabbitCloak: 0, scorpionArmor: 0, woodShield: 0, ironShield: 0, coalBomb: 0, poisonVial: 0, campfire: 0, torch: 0, waxTorch: 0, shadowLantern: 0, bedroll: 0, campCharm: 0, antlerCharm: 0, snare: 0, bambooFence: 0, bambooTrap: 0, beehiveBox: 0, stoneCoreTotem: 0, reedMat: 0, chest: 0, potionTable: 0, workbench: 0, forge: 0, campFlag: 0, potion: 0, honeySalve: 0, nightVisionPotion: 0, jumpPotion: 0, poisonResistPotion: 0, shadowPotion: 0, stew: 0, salve: 0, antidote: 0, speedPotion: 0, regenPotion: 0, ironSkinPotion: 0, bandage: 0, strongBandage: 0, roastMeat: 0, honeyRoastMeat: 0, mapleSnack: 0, resinGlue: 0, simpleArrow: 0, poisonArrow: 0, beeDart: 0, antlerHorn: 0, key: 0 },
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
        spawnDens,
        village,
        enemies: createEnemies(spawnDens),
        camp: { x: CAMP_POSITION.x, y: CAMP_POSITION.y, radius: 70, repaired: true },
        ruins: { x: worldRegionSet().ruins[0].x, y: worldRegionSet().ruins[0].y, radius: 58, opened: false },
        decorations: createDecorations(),
        particles: [],
        floatTexts: [],
        projectiles: [],
        placedTorches: [],
        placedFences: [],
        placedStations: [],
        bambooTraps: [],
        hotbarItems: Array(9).fill(null),
        draggedInventoryItem: null,
        draggedHotbarSlot: null,
        nextDynamicSpawnAt: 0,
        spawnCooldowns: new Map(),
        cameraShake: 0,
        selectedHotbar: 0,
        inventoryOpen: false,
        openChest: null,
        indoor: null,
        villageReputation: 0,
        villageTasks: createVillageTasks(),
        wolfPacks: createWolfPackStates(),
        timeOfDay: 0.28,
        dayLength: 230,
        quest: 'collect-basic',
        win: false,
        lose: false,
    };
}

function createWorldSeed() {
    return Math.random() * 10000;
}

function resource(kind, x, y, gives, hp, radius) {
    return { kind, x, y, gives, hp, maxHp: hp, radius };
}

function createVillage() {
    const region = worldRegionSet().village;
    const roadSeed = region.seed;
    const buildingDefs = [
        { kind: 'blacksmith', label: '铁匠屋', angle: -2.35, distance: 210, w: 132, h: 112 },
        { kind: 'apothecary', label: '药师屋', angle: -0.78, distance: 198, w: 132, h: 112 },
        { kind: 'kitchen', label: '厨房', angle: 2.35, distance: 220, w: 132, h: 112 },
        { kind: 'elder', label: '村长屋', angle: 0.82, distance: 238, w: 132, h: 112 },
    ];
    const buildings = buildingDefs.map((building, index) => {
        const angle = building.angle + (seededUnit(141, index) - 0.5) * 0.45;
        const dist = building.distance + (seededUnit(142, index) - 0.5) * 44;
        const x = snapToGroundGrid(region.x + Math.cos(angle) * dist);
        const y = snapToGroundGrid(region.y + Math.sin(angle) * dist * 0.72);
        return {
            ...building,
            x,
            y,
            doorX: x,
            doorY: y + building.h * 0.32,
            roofTone: seededUnit(143, index),
        };
    });
    const garden = villageGardenForRegion(region);
    return {
        x: region.x,
        y: region.y,
        radius: region.radius,
        seed: roadSeed,
        buildings,
        well: { x: snapToGroundGrid(region.x + 8 + (seededUnit(144, 1) - 0.5) * 36), y: snapToGroundGrid(region.y + 4 + (seededUnit(144, 2) - 0.5) * 28), radius: 22 },
        garden,
        spawn: { x: snapToGroundGrid(region.x - 120), y: snapToGroundGrid(region.y + 96) },
    };
}

function villageGardenForRegion(region) {
    return {
        x: snapToGroundGrid(region.x + region.radius * 0.94 + (seededUnit(145, 1) - 0.5) * 56),
        y: snapToGroundGrid(region.y + (seededUnit(145, 2) - 0.5) * 42),
        w: 220,
        h: 150,
    };
}

function snapToGroundGrid(value) {
    return Math.round(value / 32) * 32;
}

function createResources() {
    const resources = [];
    const campPoint = CAMP_POSITION;
    const ruinsPoint = worldRegionSet().ruins[0];
    const add = (kind, x, y, gives, hp, radius) => {
        const point = { x, y };
        const terrain = terrainInfoAt(x, y);
        if (terrain.kind === 'water' || terrain.kind === 'ruins') return;
        if (villageRegionWeight(x, y) > 0.16) return;
        if (distance(point, campPoint) < 95 && kind !== 'grass' && kind !== 'tallGrass') return;
        if (distance(point, ruinsPoint) < 230) return;
        const spacing = kind === 'tallGrass' ? -42 : (kind === 'grass' ? 8 : 24);
        if (resources.some(item => distance(item, point) < item.radius + radius + spacing)) return;
        resources.push(resource(kind, x, y, gives, hp, radius));
    };
    const addForced = (kind, x, y, gives, hp, radius) => {
        if (terrainInfoAt(x, y).kind === 'water') return;
        resources.push(resource(kind, x, y, gives, hp, radius));
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
                else add('grass', px, py, 'fiber', 3, 18);
            } else if (info.kind === 'birch') {
                if (n > 0.34) add('birchTree', px, py, 'wood', 5, 26);
                else if (n > 0.18) add(n > 0.26 ? 'flower' : 'berry', px, py, n > 0.26 ? 'flower' : 'berry', 3, 18);
            } else if (info.kind === 'pine') {
                if (n > 0.36) add('pineTree', px, py, 'wood', 6, 28);
                else if (n > 0.22) add('resinPatch', px, py, 'resin', 3, 14);
                else add('mushroom', px, py, 'mushroom', 3, 18);
            } else if (info.kind === 'maple') {
                if (n > 0.34) add('mapleTree', px, py, 'wood', 6, 30);
                else if (n > 0.2) add('sapPatch', px, py, 'sap', 3, 14);
                else add('berry', px, py, 'berry', 3, 20);
            } else if (info.kind === 'meadow') {
                if (n > 0.76) add('beehive', px, py, 'honey', 5, 18);
                else if (n > 0.22) add('meadowFlower', px, py, 'flower', 3, 20);
                else if (n > 0.12) add('herb', px, py, 'herb', 3, 18);
            } else if (info.kind === 'darkForest') {
                if (n > 0.54) add('darkTree', px, py, 'wood', 6, 30);
                else if (n > 0.36) add('deadTree', px, py, 'wood', 5, 26);
                else if (n > 0.18) add('toxicMushroom', px, py, 'toxicMushroom', 3, 18);
                else if (n > 0.1) add('mushroom', px, py, 'mushroom', 3, 20);
                else add('stump', px, py, 'wood', 3, 18);
            } else if (info.kind === 'reedWetland') {
                if (n > 0.25) add('reed', px, py, 'fiber', 2, 16);
                if (n > 0.68) add('lotus', px + 16, py - 12, 'lotus', 3, 18);
            } else if (info.kind === 'forest') {
                if (n > 0.38) add('tree', px, py, 'wood', 6, 34);
                else if (n > 0.22) add('stump', px, py, 'wood', 3, 20);
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
                else if (n < 0.18) add('flower', px - 22, py + 16, 'flower', 3, 18);
            } else if (info.kind === 'grass' || info.kind === 'camp') {
                if (n > 0.72) add('berry', px, py, 'berry', 3, 22);
                else if (n > 0.42) add('grass', px, py, 'fiber', 3, 18);
                else if (n > 0.32) add(n > 0.37 ? 'herb' : 'flower', px, py, n > 0.37 ? 'herb' : 'flower', 3, 18);
                else if (n > 0.18) add('pebble', px, py, 'stone', 2, 10);
            } else if (info.kind === 'shore') {
                if (n > 0.32) add('reed', px, py, 'fiber', 2, 16);
            } else if (info.kind === 'mud') {
                if (n > 0.66) add('lotus', px, py, 'lotus', 3, 18);
                else if (n > 0.36) add('reed', px, py, 'fiber', 2, 16);
                else add('mudClump', px, py, 'mud', 3, 14);
            } else if (info.kind === 'swamp') {
                if (n > 0.62) add('lotus', px, py, 'lotus', 3, 18);
                else if (n > 0.28) add('reed', px, py, 'fiber', 2, 16);
                else add('mushroom', px, py, 'mushroom', 3, 20);
            } else if (info.kind === 'dry') {
                if (n > 0.52) add('cactus', px, py, 'cactusFruit', 4, 22);
                else if (n > 0.32) add('rock', px, py, 'stone', 6, 24);
            } else if (info.kind === 'mine') {
                if (n > 0.62) add('ore', px, py, 'ore', 8, 28);
                else if (n > 0.42) add('rock', px, py, 'stone', 7, 28);
                else if (n > 0.28) add('rock', px, py, 'coal', 6, 26);
            }
        }
    }

    const regions = worldRegionSet();
    const village = createVillage();
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
        gardenFence.push([x, village.garden.y - village.garden.h / 2, 'woodFence']);
        gardenFence.push([x, village.garden.y + village.garden.h / 2, 'woodFence']);
    }
    for (let y = village.garden.y - village.garden.h / 2 + 28; y < village.garden.y + village.garden.h / 2; y += 28) {
        gardenFence.push([village.garden.x - village.garden.w / 2, y, 'woodFence']);
        gardenFence.push([village.garden.x + village.garden.w / 2, y, 'woodFence']);
    }
    [
        [CAMP_POSITION.x + 180, CAMP_POSITION.y + 90, 'tree'], [CAMP_POSITION.x - 160, CAMP_POSITION.y + 130, 'stump'], [CAMP_POSITION.x + 220, CAMP_POSITION.y - 160, 'rock'],
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
            [region.x + 120, region.y + 80, 'stump'],
        ]),
        ...gardenPlants,
        ...gardenFence,
    ].forEach(([x, y, kind]) => {
        const config = {
            tree: ['wood', 6, 34],
            rock: ['stone', 7, 28],
            ore: ['ore', 8, 28],
            reed: ['fiber', 2, 16],
            stump: ['wood', 3, 20],
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
    const campPoint = CAMP_POSITION;
    const ruinsPoint = worldRegionSet().ruins[0];
    const add = (item, force = false) => {
        if (!item || !canSpawnEnemyAt(item.kind, item.x, item.y, enemies)) return;
        if (!force && enemies.length >= 58 && item.kind !== 'wolf' && !item.boss) return;
        if (distance(item, campPoint) < 260) return;
        if (item.kind !== 'golem' && distance(item, ruinsPoint) < 180) return;
        if (!force && enemies.some(enemyItem => distance(enemyItem, item) < enemyItem.radius + item.radius + 110)) return;
        enemies.push(item);
    };
    for (let y = 260; y <= WORLD.height - 220; y += 170) {
        for (let x = 300; x <= WORLD.width - 260; x += 190) {
            const px = x + (hash2(x * 0.03, y * 0.03) - 0.5) * 95;
            const py = y + (hash2(x * 0.04 + 6, y * 0.04 - 4) - 0.5) * 95;
            const info = terrainInfoAt(px, py);
            const n = valueNoise(px * 0.01 + 4, py * 0.01 - 3);
            const kind = chooseInitialSpawnKind(info.kind, px, py, n);
            if (kind) add(makeEnemy(kind, px, py));
        }
    }
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
        ['bee', 'meadow', 2],
        ['hare', 'meadow', 2],
        ['deer', 'birch', 2],
        ['deer', 'maple', 2],
        ['deer', 'pine', 2],
        ['shade', 'darkForest', 3],
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
    const danger = dangerLevelAt(x, y);
    if (danger < 0.08) return '';
    if (terrainKind === 'meadow' && n > 0.56) return n > 0.76 ? 'bee' : 'hare';
    if (terrainKind === 'darkForest' && n > 0.52) return 'shade';
    if ((terrainKind === 'birch' || terrainKind === 'maple') && n > 0.46) return n > 0.66 ? 'deer' : 'hare';
    if (terrainKind === 'pine' && n > 0.56) return n > 0.86 ? 'wolf' : 'deer';
    if ((terrainKind === 'grass' || terrainKind === 'shore') && n > 0.9) return danger > 0.34 && n > 0.95 ? 'bat' : 'slime';
    if ((terrainKind === 'swamp' || terrainKind === 'mud' || terrainKind === 'shore') && n > 0.62) return 'frog';
    if (terrainKind === 'dry' && n > 0.62) return 'scorpion';
    if ((terrainKind === 'forest' || terrainKind === 'bamboo' || terrainKind === 'pine' || terrainKind === 'maple' || terrainKind === 'birch') && n > 0.72) return danger > 0.45 && n > 0.88 ? 'wolf' : 'boar';
    if (terrainKind === 'tallgrass' && n > 0.68) return 'wolf';
    if ((terrainKind === 'mine' || terrainKind === 'ruins') && n > 0.8) return n > 0.9 ? 'golem' : 'bat';
    return '';
}

function dangerLevelAt(x, y) {
    return clamp((distance({ x, y }, CAMP_POSITION) - 420) / 2200, 0, 1);
}

function canSpawnEnemyAt(kind, x, y, existing = []) {
    const terrain = terrainInfoAt(x, y);
    if (terrain.kind === 'water' && kind !== 'bat') return false;
    if (distance({ x, y }, CAMP_POSITION) < 360 && kind !== 'slime') return false;
    if (distance({ x, y }, CAMP_POSITION) < 260) return false;
    if (terrain.kind === 'village') return false;
    if (villageRegionWeight(x, y) > 0.18) return false;
    if (kind === 'golem' && !['mine', 'ruins'].includes(terrain.kind)) return false;
    if (isPoorSwimmer(kind) && kind !== 'golem' && isNearWater(x, y, 72)) return false;
    if (kind === 'scorpion' && (terrain.kind !== 'dry' || isNearWater(x, y, 180))) return false;
    if (kind === 'frog' && !['swamp', 'mud', 'shore'].includes(terrain.kind)) return false;
    if (kind === 'boar' && !['forest', 'bamboo', 'grass', 'shore'].includes(terrain.kind)) return false;
    if (kind === 'wolf' && !['tallgrass', 'forest', 'bamboo', 'grass'].includes(terrain.kind)) return false;
    if (kind === 'bat' && !['mine', 'ruins', 'forest', 'shore', 'grass'].includes(terrain.kind)) return false;
    if (kind === 'bee' && terrain.kind !== 'meadow') return false;
    if (kind === 'hare' && !['meadow', 'birch', 'maple', 'grass'].includes(terrain.kind)) return false;
    if (kind === 'deer' && !['birch', 'maple', 'pine', 'forest'].includes(terrain.kind)) return false;
    if (kind === 'shade' && terrain.kind !== 'darkForest') return false;
    const localSame = existing.filter(enemyItem => enemyItem.hp > 0 && enemyItem.kind === kind && distance(enemyItem, { x, y }) < 520).length;
    const speciesCap = kind === 'wolf' ? 4 : (kind === 'scorpion' ? 5 : (kind === 'bat' ? 10 : 6));
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
        blacksmith: { status: 'new', need: { ore: 3, coal: 1 }, reward: { simpleArrow: 10 }, reputation: 1 },
        apothecary: { status: 'new', need: { herb: 5 }, reward: { potion: 1, antidote: 1 }, reputation: 1 },
        kitchen: { status: 'new', need: { meat: 2, coal: 1 }, reward: { roastMeat: 2 }, reputation: 1 },
        elder: { status: 'new', need: { flower: 3, crystal: 1 }, reward: { antlerHorn: 1 }, reputation: 2 },
    };
}


function createSpawnDens() {
    const dens = [];
    const caps = { frog: 8, scorpion: 8, bat: 12, wolf: 5, slime: 6, bee: 6, shade: 5 };
    const counts = { frog: 0, scorpion: 0, bat: 0, wolf: 0, slime: 0, bee: 0, shade: 0 };
    const add = (kind, x, y) => {
        if (counts[kind] >= caps[kind]) return;
        if (!canDenExistAt(kind, x, y)) return;
        if (dens.some(den => distance(den, { x, y }) < 620)) return;
        dens.push({ kind, x, y, radius: 34, nextSpawnAt: 0 });
        counts[kind]++;
    };
    for (let y = 260; y < WORLD.height - 220; y += 240) {
        for (let x = 260; x < WORLD.width - 220; x += 260) {
            const px = x + (hash2(x * 0.019, y * 0.019) - 0.5) * 140;
            const py = y + (hash2(x * 0.017 + 5, y * 0.017 - 7) - 0.5) * 140;
            const terrain = terrainInfoAt(px, py).kind;
            const n = valueNoise(px * 0.006 + 21, py * 0.006 - 12);
            if ((terrain === 'swamp' || terrain === 'mud' || terrain === 'shore') && n > 0.62) add('frog', px, py);
            else if (terrain === 'dry' && n > 0.62) add('scorpion', px, py);
            else if ((terrain === 'mine' || terrain === 'ruins') && n > 0.46) add('bat', px, py);
            else if ((terrain === 'tallgrass' || terrain === 'forest') && n > 0.72) add('wolf', px, py);
            else if ((terrain === 'grass' || terrain === 'shore') && n > 0.78) add('slime', px, py);
            else if (terrain === 'meadow' && n > 0.42) add('bee', px, py);
            else if (terrain === 'darkForest' && n > 0.42) add('shade', px, py);
        }
    }
    return dens;
}

function canDenExistAt(kind, x, y) {
    if (distance({ x, y }, CAMP_POSITION) < 520) return false;
    if (villageRegionWeight(x, y) > 0.12) return false;
    const terrain = terrainInfoAt(x, y).kind;
    if (terrain === 'water') return false;
    if (kind === 'frog') return ['swamp', 'mud', 'shore'].includes(terrain);
    if (kind === 'scorpion') return terrain === 'dry' && !isNearWater(x, y, 180);
    if (kind === 'bat') return terrain === 'mine' || terrain === 'ruins';
    if (kind === 'wolf') return terrain === 'tallgrass' || terrain === 'forest';
    if (kind === 'slime') return terrain === 'grass' || terrain === 'shore';
    if (kind === 'bee') return terrain === 'meadow';
    if (kind === 'shade') return terrain === 'darkForest';
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

function update(dt, now) {
    if (!state.inventoryOpen && !state.win && !state.lose) {
        updateItemUse(now);
        updatePlayer(dt, now);
        if (!state.indoor) {
            updateHarvestHold(dt);
            updateBambooTraps(now);
            updateProjectiles(dt, now);
            updateEnemies(dt, now);
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
    updatePotionEffects(now);
    if (!state.indoor) updateCampHealing(dt, now);
    if (Math.abs(p.knockX) > 1 || Math.abs(p.knockY) > 1) {
        moveCircle(p, p.knockX * dt, p.knockY * dt);
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
        const boost = performance.now() < p.speedBoostUntil ? 1.32 : 1;
        p.blocking = isBlocking();
        const blockSlow = p.blocking ? 0.62 : 1;
        const armorMudSlow = inMud && (state.equipment.armor === '铁甲' || state.equipment.armor === '魔晶甲') ? 0.76 : 1;
        const aimSlow = isAimingDirectRanged() ? 0.48 : 1;
        const speed = p.speed * boost * blockSlow * hungerFactor * aimSlow * (sprinting ? 1.55 : 1) * (inWater ? 0.58 : 1) * (inMud ? 0.58 : 1) * (inBamboo ? 0.9 : 1) * armorMudSlow;
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
        state.lose = true;
        showToast('饥饿耗尽，你倒下了。');
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
        state.lose = true;
        showToast('毒素耗尽了你的生命。');
    }
    renderHud();
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
    player.x = player.x + dx;
    player.y = player.y + dy;
    if (indoorCollides(player)) {
        player.x = oldX;
        player.y = oldY;
    }
}

function indoorCollides(entity) {
    if (!state.indoor) return false;
    if (indoorWallCollides(entity)) return true;
    return state.indoor.objects.some(object => object.solid && object.action !== 'leave' && rectCircleOverlap(object, entity));
}

function indoorWallCollides(entity) {
    const left = 196 + 28;
    const right = VIEW.width - 224;
    const top = 132 + 28;
    const bottom = VIEW.height - 138;
    const doorLeft = VIEW.width / 2 - 48;
    const doorRight = VIEW.width / 2 + 48;
    if (entity.x - entity.radius < left || entity.x + entity.radius > right || entity.y - entity.radius < top) return true;
    if (entity.y + entity.radius > bottom && (entity.x < doorLeft || entity.x > doorRight)) return true;
    if (entity.y > VIEW.height - 42) return true;
    return false;
}

function rectCircleOverlap(rect, circle) {
    const closestX = clamp(circle.x, rect.x - rect.w / 2, rect.x + rect.w / 2);
    const closestY = clamp(circle.y, rect.y - rect.h / 2, rect.y + rect.h / 2);
    return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
}

function collides(entity) {
    for (const r of state.resources) {
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
    if (state.village) {
        for (const building of state.village.buildings) {
            const halfW = building.w * 0.38;
            const frontY = building.y + building.h * 0.28;
            const halfH = building.h * 0.2;
            if (Math.abs(entity.x - building.x) < entity.radius + halfW && Math.abs(entity.y - frontY) < entity.radius + halfH) return true;
        }
        if (distance(entity, state.village.well) < entity.radius + state.village.well.radius) return true;
    }
    return false;
}

function isSolidResource(item) {
    return ['tree', 'birchTree', 'pineTree', 'mapleTree', 'deadTree', 'darkTree', 'rock', 'ore', 'bamboo', 'woodFence'].includes(item.kind);
}

function isEnemyEntity(entity) {
    return entity && Number.isFinite(entity.spawnX) && Number.isFinite(entity.spawnY) && 'attackCooldown' in entity;
}

function resourceCollisionScale(item, entity) {
    const treeLike = ['tree', 'birchTree', 'pineTree', 'mapleTree', 'deadTree', 'darkTree'].includes(item.kind);
    const enemy = isEnemyEntity(entity);
    if (treeLike) return enemy ? 0.26 : 0.42;
    if (item.kind === 'bamboo') return enemy ? 0.24 : 0.34;
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
    for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        updateEnemyPoison(e, dt, now);
        if (e.hp <= 0) continue;
        if (e.attackCooldown > 0) e.attackCooldown -= dt;
        if (e.contactCooldown > 0) e.contactCooldown -= dt;
        const p = state.player;
        const dist = distance(e, p);
        const enemyTerrain = terrainInfoAt(e.x, e.y);
        const playerTerrain = terrainInfoAt(p.x, p.y);
        const ambushing = tallGrassCoverAt(e) && (e.kind === 'wolf' || e.kind === 'scorpion');
        const frogInMud = e.kind === 'frog' && enemyTerrain.kind === 'mud';
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
            const progress = clamp((now - e.leapStartAt) / Math.max(1, e.leapUntil - e.leapStartAt), 0, 1);
            const arc = Math.sin(progress * Math.PI);
            e.x = lerp(e.leapStartX, e.leapTargetX, progress);
            e.y = lerp(e.leapStartY, e.leapTargetY, progress) - arc * 10;
            if (e.leapDamage !== false && !e.leapHit && progress > 0.55 && distance(e, state.player) < e.radius + state.player.radius + 18) {
                applyEnemyDamage(e, e.attack, '跳扑');
                e.leapHit = true;
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
            moveEnemy(e, e.attackDir.x * e.speed * 3.2 * dt, e.attackDir.y * e.speed * 3.2 * dt);
            if (Math.random() < 0.7) spawnBurst(e.x - e.attackDir.x * 18, e.y - e.attackDir.y * 18, '#c89a6a', 1, 70, e.radius * 0.35);
            if (!e.chargeHit && distance(e, state.player) < e.radius + state.player.radius + 10) {
                applyEnemyDamage(e, e.attack + 1, '冲撞');
                e.chargeHit = true;
            }
            continue;
        } else if (e.chargeUntil) {
            e.chargeUntil = 0;
            e.attackCooldown = 1.25;
        }
        if (e.swoopUntil > now) {
            const progress = clamp((now - e.swoopStartAt) / Math.max(1, e.swoopUntil - e.swoopStartAt), 0, 1);
            e.x = lerp(e.swoopStartX, e.swoopTargetX, progress);
            e.y = lerp(e.swoopStartY, e.swoopTargetY, progress) - Math.sin(progress * Math.PI) * 24;
            if (!e.swoopHit && progress > 0.42 && distance(e, state.player) < e.radius + state.player.radius + 24) {
                applyEnemyDamage(e, e.attack, '掠袭');
                state.player.stamina = Math.max(0, state.player.stamina - 10);
                e.swoopHit = true;
            }
            if (Math.random() < 0.35) spawnBurst(e.x, e.y, '#8fb8ff', 1, 70, e.radius);
            continue;
        } else if (e.swoopUntil) {
            e.x = e.swoopTargetX;
            e.y = e.swoopTargetY;
            e.swoopUntil = 0;
            e.attackCooldown = 1.8;
        }
        if (Math.abs(e.knockX) > 1 || Math.abs(e.knockY) > 1) {
            moveEnemy(e, e.knockX * dt, e.knockY * dt);
            e.knockX *= Math.pow(0.035, dt);
            e.knockY *= Math.pow(0.035, dt);
        }
        if (!isPassiveCreature(e.kind) && dist < e.radius + p.radius + 4 && e.contactCooldown <= 0) {
            applyEnemyDamage(e, Math.max(1, e.attack - 1), '碰撞');
            e.contactCooldown = e.kind === 'boar' ? 0.7 : 0.9;
        }
        if (e.strikeAt && now >= e.strikeAt) {
            resolveEnemyAttack(e, now);
        }

        let aggroRange = 330 + nightAmount() * (e.kind === 'bat' ? 190 : (e.kind === 'shade' ? 190 : 90)) + (ambushing ? 120 : 0) + (frogInMud ? 70 : 0);
        if (e.kind === 'shade') aggroRange += shadeNightPower() * 120;
        if (performance.now() < p.shadowUntil) aggroRange *= 0.55;
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
    state.nextDynamicSpawnAt = now + (night > 0.2 ? Math.max(900, 1800 - night * 650) : 2800);
    const alive = state.enemies.filter(enemyItem => enemyItem.hp > 0);
    if (alive.length >= MAX_ENEMIES) return;
    const nearby = alive.filter(enemyItem => distance(enemyItem, state.player) < 850);
    if (nearby.length >= MAX_NEARBY_ENEMIES + (night > 0.45 ? 3 : 0)) return;

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
        den.nextSpawnAt = now + (kind === 'bat' && nightAmount() > 0.35 ? 7500 : (nightAmount() > 0.2 ? 14000 : 24000));
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
    for (let i = 0; i < (night > 0.35 ? 14 : 10); i++) {
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
    const danger = dangerLevelAt(x, y);
    const n = valueNoise(x * 0.012 + night * 9, y * 0.012 - 3);
    if (danger < 0.08) return '';
    if (night > 0.45 && n > 0.78 && ['grass', 'shore', 'forest', 'mine', 'ruins'].includes(terrain)) return 'bat';
    if (night > 0.72 && n > 0.68 && ['grass', 'shore', 'forest'].includes(terrain)) return 'bat';
    if (terrain === 'mud' || terrain === 'swamp' || terrain === 'shore') return n > 0.35 ? 'frog' : 'slime';
    if (terrain === 'dry') return night > 0.15 || n > 0.45 ? 'scorpion' : '';
    if (terrain === 'mine' || terrain === 'ruins') return night > 0.08 || n > 0.52 ? 'bat' : (danger > 0.55 && n > 0.78 ? 'golem' : '');
    if (terrain === 'meadow') return n > 0.36 ? 'bee' : (n > 0.12 ? 'hare' : '');
    if (terrain === 'birch' || terrain === 'maple') return n > 0.42 ? 'deer' : (n > 0.18 ? 'hare' : '');
    if (terrain === 'pine') return n > 0.42 ? 'deer' : '';
    if (terrain === 'darkForest') return night > 0.12 || n > 0.48 ? 'shade' : '';
    if (terrain === 'tallgrass') return night > 0.12 || n > 0.4 ? 'wolf' : 'slime';
    if (terrain === 'forest' || terrain === 'bamboo' || terrain === 'pine' || terrain === 'maple' || terrain === 'birch') return night > 0.2 && n > 0.35 ? 'wolf' : (n > 0.58 ? 'boar' : '');
    if (terrain === 'grass') return night > 0.25 && n > 0.64 ? 'bat' : (n > 0.62 ? 'slime' : '');
    return '';
}

function canDynamicSpawn(kind, x, y, alive) {
    if (!canSpawnEnemyAt(kind, x, y, alive)) return false;
    if (distance({ x, y }, state.player) < DYNAMIC_SPAWN_MIN_DISTANCE || distance({ x, y }, state.player) > DYNAMIC_SPAWN_MAX_DISTANCE + 360) return false;
    const localAll = alive.filter(enemyItem => distance(enemyItem, { x, y }) < 420).length;
    return localAll < 5;
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
        markSpawnAreaCleared(e.x, e.y, now);
        const drops = grantEnemyDrops(e);
        addFloatText(drops.floatText, e.x, e.y - 56, '#9cffb7');
        showToast(`毒素击败 ${e.name}，获得 ${drops.toastText}`);
        renderHud();
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

function startEnemyAttack(e, now) {
    e.attackDir = normalize(state.player.x - e.x, state.player.y - e.y);
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
    const p = state.player;
    if (e.kind === 'slime') {
        e.leapStartAt = now;
        e.leapUntil = now + 420;
        e.leapStartX = e.x;
        e.leapStartY = e.y;
        e.leapTargetX = clamp(e.x + e.attackDir.x * 125, e.radius, WORLD.width - e.radius);
        e.leapTargetY = clamp(e.y + e.attackDir.y * 125, e.radius, WORLD.height - e.radius);
        e.leapHit = false;
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
            const hit = applyEnemyDamage(e, e.attack, '舌头卷住');
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
        e.leapDamage = false;
        e.attackCooldown = terrainInfoAt(e.x, e.y).kind === 'mud' ? 1.45 : 2.25;
        spawnBurst(e.x, e.y - 6, '#ff8fc7', 7, 130, e.radius * 0.55);
    } else if (e.kind === 'scorpion') {
        moveEnemy(e, e.attackDir.x * 48, e.attackDir.y * 48);
        if (distance(e, p) < e.radius + p.radius + 18) {
            const hit = applyEnemyDamage(e, e.attack, '毒刺');
            if (hit) {
                poisonPlayer(now, 5200);
                p.stamina = Math.max(0, p.stamina - 16);
            }
        }
        e.attackCooldown = 1.25;
        e.retreatUntil = now + 360;
        spawnBurst(e.x, e.y, '#8cff66', 10, 135, e.radius * 0.6);
    } else if (e.kind === 'boar') {
        e.chargeUntil = now + 430;
        e.chargeHit = false;
        e.attackCooldown = 1.4;
    } else if (e.kind === 'wolf') {
        moveEnemy(e, e.attackDir.x * 96, e.attackDir.y * 96);
        if (distance(e, p) < e.radius + p.radius + 20) applyEnemyDamage(e, e.attack, '撕咬');
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
        e.attackCooldown = 2.1;
        spawnBurst(e.x, e.y, '#8fb8ff', 6, 100, e.radius * 0.6);
    } else if (e.kind === 'bee') {
        moveEnemy(e, e.attackDir.x * 82, e.attackDir.y * 82);
        if (distance(e, p) < e.radius + p.radius + 14) {
            applyEnemyDamage(e, e.attack, '蜂针');
            p.stamina = Math.max(0, p.stamina - 8);
        }
        e.retreatUntil = now + 320;
        e.attackCooldown = 1.45;
        spawnBurst(e.x, e.y, '#ffd166', 8, 110, e.radius * 0.6);
    } else if (e.kind === 'shade') {
        const night = shadeNightPower();
        const reach = 96 + night * 42;
        const forward = (p.x - e.x) * e.attackDir.x + (p.y - e.y) * e.attackDir.y;
        const side = Math.abs((p.x - e.x) * -e.attackDir.y + (p.y - e.y) * e.attackDir.x);
        spawnBurst(e.x + e.attackDir.x * 52, e.y + e.attackDir.y * 52, night > 0.35 ? '#b77dff' : '#8f6bd8', 16 + Math.floor(night * 10), 130 + night * 80, 32 + night * 20);
        if (forward > 0 && forward < reach && side < p.radius + 22 + night * 10) {
            applyEnemyDamage(e, e.attack + 1 + Math.floor(night * 2), night > 0.55 ? '夜影爪' : '暗影爪');
            p.stamina = Math.max(0, p.stamina - (14 + night * 10));
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
        if (distance(e, p) < slamRadius) applyEnemyDamage(e, e.attack, e.boss ? '王者震地' : '震地');
        if (e.boss && distance(e, p) < slamRadius * 0.72) {
            p.knockX += e.attackDir.x * 260;
            p.knockY += e.attackDir.y * 260;
        }
        e.attackCooldown = e.boss ? 1.25 : 1.8;
    }
    e.strikeAt = 0;
    e.windupUntil = 0;
}

function resolveBossGolemSkill(e, now) {
    const p = state.player;
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
                applyEnemyDamage(e, e.attack + 2, '冲击波');
                p.knockX += dir.x * 360;
                p.knockY += dir.y * 360;
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
        if (distance(e, p) < 260) applyEnemyDamage(e, e.attack + 1, '岩刺');
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
    p.invincibleUntil = performance.now() + 620;
    const dir = normalize(p.x - e.x, p.y - e.y);
    const force = e.kind === 'boar' ? 430 : (e.kind === 'golem' ? 330 : 260);
    p.knockX += dir.x * force;
    p.knockY += dir.y * force;
    p.stamina = Math.max(0, p.stamina - (e.kind === 'boar' ? 18 : 10) - block.staminaCost);
    state.cameraShake = Math.max(state.cameraShake, e.boss ? 14 : 8);
    spawnBurst(p.x, p.y, '#ff6b6b', 10, 170, p.radius * 0.55);
    addFloatText(`-${damage}`, p.x, p.y - 36, '#ffb3b3');
    showToast(`${e.name}${verb ? ` ${verb}` : ''}命中你，生命 -${damage}`);
    if (p.hp <= 0) {
        state.lose = true;
        showToast('你倒下了。回到营地重新准备吧。');
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
    const boost = performance.now() < state.player.ironSkinUntil ? 0.18 : 0;
    const base = state.equipment.armor === '魔晶甲' ? 0.45
        : (state.equipment.armor === '蝎壳甲' ? 0.34
            : (state.equipment.armor === '铁甲' ? 0.32
                : (state.equipment.armor === '皮甲' ? 0.18
                    : (state.equipment.armor === '兔毛披肩' ? 0.08 : 0))));
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
    if (!state.player.blocking || state.equipment.shield === '无') return { damage: rawDamage, blocked: false, staminaCost: 0 };
    if (verb === '震地' && state.equipment.shield !== '铁盾') return { damage: rawDamage, blocked: false, staminaCost: 0 };
    const toEnemy = normalize(e.x - state.player.x, e.y - state.player.y);
    const dot = toEnemy.x * state.player.attackDir.x + toEnemy.y * state.player.attackDir.y;
    if (dot < 0.25) return { damage: rawDamage, blocked: false, staminaCost: 0 };
    const reduction = state.equipment.shield === '铁盾' ? 0.7 : 0.5;
    const staminaCost = state.equipment.shield === '铁盾' ? 10 : 12;
    if (state.player.stamina < staminaCost) return { damage: rawDamage, blocked: false, staminaCost: 0 };
    return { damage: rawDamage * (1 - reduction), blocked: true, staminaCost };
}

function moveEnemy(e, dx, dy) {
    const startX = e.x;
    const startY = e.y;
    const terrain = terrainInfoAt(e.x, e.y);
    const flying = e.kind === 'bat' || e.kind === 'bee';
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
    for (const r of state.resources) {
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
        showToast('靠近树、石头、草丛、矿石、营地或废墟门后再按 E。');
        return;
    }

    if (target.type === 'resource') beginHarvest(target.item);
    if (target.type === 'camp') useCamp();
    if (target.type === 'ruins') openRuins();
    if (target.type === 'chest') openChest(target.item);
    if (target.type === 'villageHouse') enterVillageHouse(target.item);
}

function nearestInteractable() {
    const p = state.player;
    const resources = state.resources
        .filter(item => item.hp > 0 && distance(p, item) <= p.radius + item.radius + 24)
        .map(item => ({ type: 'resource', item, d: distance(p, item) }));
    const specials = [];
    if (distance(p, state.camp) <= state.camp.radius + 28) specials.push({ type: 'camp', item: state.camp, d: distance(p, state.camp) });
    if (distance(p, state.ruins) <= state.ruins.radius + 34) specials.push({ type: 'ruins', item: state.ruins, d: distance(p, state.ruins) });
    if (state.village) {
        state.village.buildings
            .filter(building => distance(p, { x: building.doorX, y: building.doorY }) <= 74)
            .forEach(building => specials.push({ type: 'villageHouse', item: building, d: distance(p, { x: building.doorX, y: building.doorY }) }));
    }
    state.placedStations
        .filter(station => station.kind === 'chest' && distance(p, station) <= station.radius + 46)
        .forEach(station => specials.push({ type: 'chest', item: station, d: distance(p, station) }));
    return [...resources, ...specials].sort((a, b) => a.d - b.d)[0] || null;
}

function enterVillageHouse(building) {
    state.indoor = {
        building,
        outsideX: state.player.x,
        outsideY: state.player.y + 28,
        objects: createIndoorObjects(building.kind),
    };
    state.player.x = VIEW.width / 2;
    state.player.y = VIEW.height - 92;
    camera.x = 0;
    camera.y = 0;
    showToast(`进入${building.label}。靠近门按 E 离开。`);
}

function leaveVillageHouse() {
    const indoor = state.indoor;
    if (!indoor) return;
    state.player.x = indoor.outsideX;
    state.player.y = indoor.outsideY;
    state.indoor = null;
    showToast('离开房屋。');
}

function openChest(chest) {
    state.openChest = chest;
    toggleInventory(true);
    showToast('打开木箱。');
}

function createIndoorObjects(kind) {
    const topY = 178;
    const bottomY = 350;
    const common = [
        { kind: 'door', label: '门', x: VIEW.width / 2, y: VIEW.height - 58, w: 72, h: 28, solid: true, action: 'leave' },
        { kind: 'table', label: '木桌', x: 480, y: 300, w: 118, h: 52, solid: true, action: 'workTable' },
        { kind: 'bed', label: '床', x: 720, y: 402, w: 48, h: 88, solid: true, action: 'sleep' },
        { kind: 'chest', label: '村民箱子', x: 620, y: topY, w: 58, h: 40, solid: true, action: 'steal', loot: { berry: 3, herb: 2, fiber: 2 }, stolen: false },
        { kind: 'chest', label: '小木箱', x: 684, y: topY, w: 58, h: 40, solid: true, action: 'steal', loot: { fiber: 5, mushroom: 1 }, stolen: false },
    ];
    const byKind = {
        blacksmith: [
            { kind: 'forge', label: '熔炉', x: 260, y: topY, w: 76, h: 58, solid: true, action: 'forge' },
            { kind: 'rack', label: '武器架', x: 450, y: topY, w: 144, h: 48, solid: true, action: 'weaponRack' },
            { kind: 'npc', role: 'blacksmith', label: '铁匠', x: 330, y: 276, w: 34, h: 46, solid: true, action: 'npc' },
            { kind: 'coalPile', label: '煤堆', x: 270, y: bottomY, w: 56, h: 34, solid: true, action: 'takeCoal', taken: false },
            { kind: 'crate', label: '矿石箱', x: 720, y: 324, w: 58, h: 42, solid: true, action: 'steal', loot: { coal: 3, ore: 2, stone: 4 }, stolen: false },
        ],
        apothecary: [
            { kind: 'potionTable', label: '药水台', x: 260, y: topY, w: 86, h: 52, solid: true, action: 'potionTable' },
            { kind: 'herbRack', label: '晾草架', x: 450, y: topY, w: 144, h: 48, solid: true, action: 'takeHerb', taken: false },
            { kind: 'npc', role: 'apothecary', label: '药师', x: 330, y: 276, w: 34, h: 46, solid: true, action: 'npc' },
            { kind: 'basket', label: '草药篮', x: 270, y: bottomY, w: 48, h: 34, solid: true, action: 'takeHerb', taken: false },
            { kind: 'chest', label: '药材箱', x: 720, y: 324, w: 62, h: 44, solid: true, action: 'steal', loot: { herb: 4, antidote: 1, lotus: 1 }, stolen: false, mark: 'herb' },
        ],
        kitchen: [
            { kind: 'hearth', label: '火塘', x: 260, y: topY, w: 88, h: 60, solid: true, action: 'campfire' },
            { kind: 'meatRack', label: '食材架', x: 450, y: topY, w: 144, h: 48, solid: true, action: 'takeFood', taken: false },
            { kind: 'npc', role: 'kitchen', label: '厨师', x: 330, y: 276, w: 34, h: 46, solid: true, action: 'npc' },
            { kind: 'cookPot', label: '锅', x: 270, y: bottomY, w: 50, h: 42, solid: true, action: 'campfire' },
            { kind: 'foodCrate', label: '食材箱', x: 720, y: 324, w: 64, h: 46, solid: true, action: 'steal', loot: { roastMeat: 2, berry: 3, honey: 1 }, stolen: false },
        ],
        elder: [
            { kind: 'map', label: '地图台', x: 320, y: topY, w: 104, h: 34, solid: true, action: 'map' },
            { kind: 'noticeBoard', label: '公告栏', x: 450, y: topY, w: 120, h: 48, solid: true, action: 'elder' },
            { kind: 'npc', role: 'elder', label: '村长', x: 330, y: 276, w: 34, h: 46, solid: true, action: 'npc' },
            { kind: 'flag', label: '村旗', x: 270, y: bottomY, w: 44, h: 92, solid: true, action: 'elder' },
            { kind: 'chest', label: '村长箱子', x: 720, y: 324, w: 62, h: 44, solid: true, action: 'steal', loot: { crystal: 1, flower: 3, antlerCharm: 1 }, stolen: false, mark: 'elder' },
        ],
    };
    return [...common, ...(byKind[kind] || [])];
}

function nearestIndoorObject() {
    if (!state.indoor) return null;
    return state.indoor.objects
        .map(object => ({ object, d: distanceToRect(state.player, object) }))
        .filter(item => item.d < 46)
        .sort((a, b) => a.d - b.d)[0]?.object || null;
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
        case 'sleep':
            state.timeOfDay = 0.25;
            state.player.hp = state.player.maxHp;
            showToast('你在床上休息到清晨，生命已恢复。');
            renderHud();
            break;
        case 'steal':
            stealFromIndoorContainer(object);
            break;
        case 'takeCoal':
            takeIndoorResource(object, 'coal', 2, '拿走了煤。');
            break;
        case 'takeHerb':
            takeIndoorResource(object, 'herb', 2, '取下了一些草药。');
            break;
        case 'takeFood':
            takeIndoorResource(object, 'meat', 1, '从食材架上取下一块生肉。');
            break;
        case 'map':
            showToast('地图标记着矿区、黑森林和废墟的大致方向。');
            break;
        case 'weaponRack':
            showToast('武器架上挂着村民保养的旧矛和短弓，暂时不能拿。');
            break;
        case 'workTable':
            showToast('木桌可以整理物品和查看笔记，后续会接任务/交易。');
            break;
        case 'npc':
            interactVillageNpc(object.role);
            break;
        case 'elder':
            showToast(`村庄声誉：${state.villageReputation}。以后这里会接任务。`);
            break;
        default:
            showToast(`${object.label} 可以交互，功能后续扩展。`);
    }
}

function stealFromIndoorContainer(object) {
    if (object.stolen) {
        showToast('箱子已经空了。');
        return;
    }
    if (!object.opened) {
        object.opened = true;
        showToast(`${object.label}：${lootText(object.loot)}。再按 E 拿走会降低声誉。`);
        return;
    }
    let got = 0;
    for (const [key, amount] of Object.entries(object.loot || {})) {
        if (addInventoryItem(key, amount)) got++;
    }
    object.stolen = true;
    state.villageReputation -= 2;
    showToast(got ? `偷走了村民箱子里的东西。声誉 -2（当前 ${state.villageReputation}）` : '背包已满，没拿到东西。');
    renderHud();
}

function lootText(loot = {}) {
    const entries = Object.entries(loot).map(([key, amount]) => `${RESOURCE_LABELS[key] || key} x${amount}`);
    return entries.length ? entries.join('、') : '空的';
}

function takeIndoorResource(object, key, amount, message) {
    if (object.taken) {
        showToast(`${object.label} 已经空了。`);
        return;
    }
    if (!addInventoryItem(key, amount)) {
        showToast('背包已满。');
        return;
    }
    object.taken = true;
    showToast(message);
    renderHud();
}

function interactVillageNpc(role) {
    const task = state.villageTasks[role];
    if (!task) return;
    const name = npcName(role);
    if (task.status === 'done') {
        showToast(`${name}：谢谢你，村里会记得你的帮助。声誉 ${state.villageReputation}`);
        return;
    }
    if (task.status === 'new') {
        task.status = 'accepted';
        showToast(`${name}：请带来 ${itemListText(task.need)}。奖励：${itemListText(task.reward)}。`);
        renderHud();
        return;
    }
    if (!hasItems(task.need)) {
        showToast(`${name}：还需要 ${missingItemsText(task.need)}。`);
        return;
    }
    consumeItems(task.need);
    if (!grantItems(task.reward)) {
        showToast('背包已满，先清理空间再领奖。');
        return;
    }
    task.status = 'done';
    state.villageReputation += task.reputation;
    showToast(`${name}：任务完成！获得 ${itemListText(task.reward)}，声誉 +${task.reputation}。`);
    renderHud();
}

function npcName(role) {
    return { blacksmith: '铁匠', apothecary: '药师', kitchen: '厨师', elder: '村长' }[role] || '村民';
}

function hasItems(cost) {
    return Object.entries(cost).every(([key, amount]) => (state.inventory[key] || 0) >= amount);
}

function consumeItems(cost) {
    Object.entries(cost).forEach(([key, amount]) => {
        state.inventory[key] = Math.max(0, (state.inventory[key] || 0) - amount);
    });
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

function missingItemsText(items) {
    return Object.entries(items)
        .filter(([key, amount]) => (state.inventory[key] || 0) < amount)
        .map(([key, amount]) => `${RESOURCE_LABELS[key] || key} ${state.inventory[key] || 0}/${amount}`)
        .join('、');
}

function beginHarvest(node) {
    const p = state.player;
    if (p.harvestTarget !== node) {
        p.harvestTarget = node;
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
        addFloatText(`+${amount} ${RESOURCE_LABELS[node.gives]}`, node.x, node.y - 30, '#fff3b0');
        showToast(`采集成功：${RESOURCE_LABELS[node.gives]} x${amount}`);
    } else {
        showToast(`${resourceName(node.kind)} 剩余 ${Math.ceil(Math.max(0, node.hp))}/${node.maxHp}`);
    }
    renderHud();
}

function harvestAmount(node) {
    if (node.kind === 'pebble') return hash2(node.x * 0.13, node.y * 0.13) > 0.5 ? 3 : 2;
    return ({ wood: 4, bamboo: 4, stone: 4, fiber: 3, berry: 3, herb: 2, mushroom: 2, toxicMushroom: 2, flower: 2, lotus: 2, cactusFruit: 2, resin: 2, sap: 2, honey: 2, mud: 3, ore: 4, coal: 3 }[node.gives] || 1);
}

function harvestBlockReason(node) {
    if (node.gives === 'ore' && selectedHotbarItem() !== 'stonePickaxe') return '铁矿太硬，需要手持石镐。';
    if (['tree', 'birchTree', 'pineTree', 'mapleTree', 'deadTree', 'darkTree'].includes(node.kind) && selectedHotbarItem() !== 'stoneAxe') return '整棵树需要手持石斧砍伐。';
    return '';
}

function harvestPower(node) {
    const held = selectedHotbarItem();
    const woodPower = held === 'stoneAxe' ? 2 : 1;
    const stonePower = held === 'stonePickaxe' ? 2 : 1;
    const fiberPower = held === 'stoneSickle' ? 3.2 : 1;
    if (['grass', 'tallGrass', 'reed', 'meadowFlower', 'flower'].includes(node.kind)) return 2.2 * fiberPower;
    if (['herb', 'berry', 'mushroom', 'toxicMushroom', 'lotus'].includes(node.kind)) return held === 'stoneSickle' ? 3.4 : 2.2;
    if (node.kind === 'mudClump') return 2.2;
    if (node.kind === 'bamboo') return 1.35 + woodPower * 0.55;
    if (node.kind === 'stump') return 0.9 + woodPower * 0.45;
    if (node.gives === 'wood') return woodPower * 0.95;
    if (node.gives === 'stone') return stonePower * 0.9;
    if (node.gives === 'ore') return stonePower * 0.8;
    return 1;
}

function harvestParticleColor(node) {
    if (node.gives === 'wood' || node.gives === 'bamboo' || node.gives === 'fiber') return '#8bd76e';
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
    const attackProfile = currentAttackProfile();
    if (p.attackCooldown > 0) {
        p.attackQueuedUntil = now + 220;
        return;
    }
    const staminaCost = weaponStaminaCost();
    if (p.stamina < staminaCost) {
        showToast('体力不足，稍等恢复后再攻击。');
        return;
    }
    p.stamina = Math.max(0, p.stamina - staminaCost);
    consumeHungerForAction(staminaCost * 0.015);
    p.attackCooldown = weaponCooldown();
    p.attackUntil = now + 160;
    const attackDir = currentAimDir();
    p.attackDir = attackDir;
    p.facing = attackDir;
    const strike = { x: p.x + attackDir.x * p.radius, y: p.y + attackDir.y * p.radius };
    const hits = [];
    for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        const hit = enemyHitByAttack(e, p, attackDir, attackProfile, strike);
        if (hit.hit) {
            hits.push({ enemy: e, dist: hit.dist });
        }
    }
    spawnAttackParticles(p.x, p.y, attackDir, attackProfile);
    if (!hits.length) {
        addFloatText('挥空', p.x + attackDir.x * 50, p.y + attackDir.y * 50, '#d8e5f2');
        renderHud();
        return;
    }

    hits.sort((a, b) => a.dist - b.dist);
    const maxHits = attackProfile.cleave ? 2 : 1;
    for (const { enemy: hit } of hits.slice(0, maxHits)) {
        damageEnemy(hit, now, attackProfile);
    }
    renderHud();
}

function isThrowableItem(key) {
    return key === 'coalBomb' || key === 'poisonVial';
}

function isDirectRangedItem(key) {
    return key === 'slingshot' || key === 'sinewBow';
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
        showToast(key === 'slingshot' ? '弹弓需要小石子作为子弹。' : '鹿筋弓需要箭矢。');
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
        showToast(aim.key === 'slingshot' ? '没有小石子。' : '没有箭矢。');
        return true;
    }
    const held = directRangedCharge(aim, now);
    const p = state.player;
    const cost = aim.key === 'slingshot' ? 10 : 16;
    if (p.stamina < cost) {
        showToast('体力不足，无法稳定发射。');
        return true;
    }
    const dir = currentAimDirWithSpread(aim, held);
    p.stamina = Math.max(0, p.stamina - cost);
    consumeHungerForAction(cost * 0.018);
    p.attackCooldown = aim.key === 'slingshot' ? 0.95 : 0.82;
    p.attackUntil = now + 180 + held * 120;
    p.attackDir = dir;
    p.facing = dir;
    state.inventory[ammo] -= 1;
    const range = aim.key === 'slingshot' ? (150 + held * 240) : (230 + held * 390);
    state.projectiles.push({
        kind: aim.key === 'slingshot' ? 'slingshotPebble' : ammo,
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
        exploded: false,
    });
    spawnBurst(p.x + dir.x * 14, p.y - 8 + dir.y * 14, aim.key === 'slingshot' ? '#d8e5f2' : '#d6a06a', 5, 70, 8);
    syncHotbarItems();
    renderHud();
    return true;
}

function directRangedCharge(aim, now = performance.now()) {
    const fullTime = aim.key === 'slingshot' ? 850 : 1050;
    return clamp((now - aim.startedAt) / fullTime, 0.18, 1);
}

function directRangedAmmoFor(key, preferred = '') {
    if (preferred && (state.inventory[preferred] || 0) > 0) return preferred;
    if (key === 'slingshot') return (state.inventory.pebble || 0) > 0 ? 'pebble' : '';
    if (key === 'sinewBow') {
        if ((state.inventory.poisonArrow || 0) > 0) return 'poisonArrow';
        if ((state.inventory.simpleArrow || 0) > 0) return 'simpleArrow';
    }
    return '';
}

function currentAimDirWithSpread(aim, charge) {
    const dir = currentAimDir();
    const maxSpread = aim.key === 'slingshot' ? 0.22 : 0.13;
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
        const progress = clamp((now - projectile.startedAt) / projectile.duration, 0, 1);
        const arc = isDirectProjectile(projectile.kind) ? 0 : Math.sin(progress * Math.PI) * 42;
        projectile.x = lerp(projectile.startX, projectile.targetX, progress);
        projectile.y = lerp(projectile.startY, projectile.targetY, progress) - arc;
        if (isDirectProjectile(projectile.kind)) {
            const hit = state.enemies.find(enemy => enemy.hp > 0 && distance(enemy, projectile) <= enemy.radius + 8);
            if (hit) {
                projectile.exploded = true;
                hitDirectProjectileTarget(projectile);
                continue;
            }
        }
        if (Math.random() < 0.65) {
            const trailColor = projectile.kind === 'poisonVial'
                ? (Math.random() < 0.5 ? '#8cff66' : '#d94bff')
                : (isDirectProjectile(projectile.kind) ? '#d8e5f2' : (Math.random() < 0.5 ? '#ff9f1c' : '#ffd166'));
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

function resolveProjectileImpact(projectile) {
    if (projectile.kind === 'coalBomb') {
        explodeCoalBombAt(projectile.targetX, projectile.targetY);
    } else if (projectile.kind === 'poisonVial') {
        explodePoisonVialAt(projectile.targetX, projectile.targetY);
    } else if (isDirectProjectile(projectile.kind)) {
        hitDirectProjectileTarget(projectile);
    }
}

function isDirectProjectile(kind) {
    return kind === 'slingshotPebble' || kind === 'simpleArrow' || kind === 'poisonArrow';
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
    hit.knockX += dir.x * (hit.boss ? 130 : 240);
    hit.knockY += dir.y * (hit.boss ? 130 : 240);
    state.cameraShake = Math.max(state.cameraShake, hit.boss ? 12 : 7);
    spawnBurst(hit.x, hit.y, hit.boss ? '#b77dff' : '#ffd166', 14, 220, hit.radius * 0.75);
    addFloatText(`-${attackProfile.damage}`, hit.x, hit.y - 36, '#fff3b0');
    if (attackProfile.poison && hit.kind !== 'golem') {
        hit.poisonUntil = Math.max(hit.poisonUntil || 0, now + 4200);
        hit.poisonTickAt = Math.min(hit.poisonTickAt || now + 900, now + 900);
        spawnBurst(hit.x, hit.y - 8, '#8cff66', 6, 90, hit.radius * 0.45);
    }
    if (hit.hp <= 0) {
        markSpawnAreaCleared(hit.x, hit.y, now);
        const drops = grantEnemyDrops(hit);
        spawnBurst(hit.x, hit.y, '#ffffff', 24, 260, hit.radius);
        addFloatText(drops.floatText, hit.x, hit.y - 52, '#9cffb7');
        showToast(`击败 ${hit.name}，获得 ${drops.toastText}`);
    } else {
        showToast(`${hit.name} 被${attackProfile.name}击中，剩余 ${Math.ceil(Math.max(0, hit.hp))}/${hit.maxHp}`);
    }
}

function currentAttackProfile() {
    const item = selectedHotbarItem();
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
    return profiles[item] || { name: '拳头', damage: 1, range: 32, stamina: 10, cooldown: 0.34, arc: 0.14, style: 'punch' };
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
    return true;
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
    showToast(`取出：${RESOURCE_LABELS[key] || key} x${moved}`);
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
    state.floatTexts.push({ text, x, y, color, life: 0.85 });
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
        salve: 1500,
        antidote: 1200,
        speedPotion: 1300,
        regenPotion: 1500,
        ironSkinPotion: 1500,
        stew: 1700,
        roastMeat: 1600,
        honeySalve: 1200,
        nightVisionPotion: 1300,
        jumpPotion: 1200,
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
            p.regenUntil = performance.now() + 5000;
            p.regenTickAt = performance.now() + 800;
            state.inventory.honeySalve -= 1;
            showToast('使用蜂蜜药膏，恢复生命并短暂再生。');
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
            showToast('使用黏液药膏，恢复 45 生命并清除中毒。');
            break;
        case 'antidote':
            p.poisonUntil = 0;
            p.poisonTickAt = 0;
            p.hp = Math.min(p.maxHp, p.hp + 15);
            state.inventory.antidote -= 1;
            showToast('服下解毒药，中毒已解除。');
            break;
        case 'speedPotion':
            p.speedBoostUntil = performance.now() + 12000;
            state.inventory.speedPotion -= 1;
            showToast('饮下迅捷药水，移动速度暂时提高。');
            break;
        case 'nightVisionPotion':
            p.nightVisionUntil = performance.now() + 18000;
            state.inventory.nightVisionPotion -= 1;
            showToast('饮下夜视药水，夜晚视野扩大。');
            break;
        case 'jumpPotion':
            p.speedBoostUntil = Math.max(p.speedBoostUntil, performance.now() + 9000);
            state.inventory.jumpPotion -= 1;
            showToast('饮下跳跃药水，短时间行动更轻快。');
            break;
        case 'poisonResistPotion':
            p.poisonResistUntil = performance.now() + 20000;
            p.poisonUntil = 0;
            state.inventory.poisonResistPotion -= 1;
            showToast('饮下毒抗药水，短时间免疫中毒。');
            break;
        case 'shadowPotion':
            p.shadowUntil = performance.now() + 14000;
            state.inventory.shadowPotion -= 1;
            showToast('饮下暗影药水，怪物更难发现你。');
            break;
        case 'regenPotion':
            p.regenUntil = performance.now() + 12000;
            p.regenTickAt = performance.now() + 400;
            state.inventory.regenPotion -= 1;
            showToast('饮下再生药水，生命会持续恢复。');
            break;
        case 'ironSkinPotion':
            p.ironSkinUntil = performance.now() + 14000;
            state.inventory.ironSkinPotion -= 1;
            showToast('饮下硬皮药水，短时间减少受到的伤害。');
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
    if (requiresCamp(item) && !isNearCamp()) return false;
    if (!hasRequiredStation(item)) return false;
    if (!canReceiveRecipeOutput(item)) return false;
    return Object.entries(item.cost).every(([key, amount]) => state.inventory[key] >= amount);
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
    return Object.entries(item.cost).some(([key, amount]) => key !== output && (state.inventory[key] || 0) <= amount && !isHotbarItem(key));
}

function requiresCamp(item) {
    return ['ironArmor', 'crystalBlade', 'key', 'coalBomb', 'campCharm', 'snare', 'ironShield'].includes(item.id);
}

function stationRequirement(item) {
    if (['stew', 'roastMeat', 'honeyRoastMeat'].includes(item.id)) return 'campfire';
    if (['potion', 'salve', 'antidote', 'speedPotion', 'regenPotion', 'ironSkinPotion'].includes(item.id)) return 'potionTable';
    if (['honeySalve', 'nightVisionPotion', 'jumpPotion', 'poisonResistPotion', 'shadowPotion'].includes(item.id)) return 'potionTable';
    if (['potionTable', 'forge', 'bedroll', 'snare', 'bambooFence', 'bambooTrap', 'coalBomb', 'slingshot', 'campFlag', 'simpleArrow', 'poisonArrow', 'beeDart', 'beehiveBox', 'antlerHorn', 'shadowLantern', 'stoneCoreTotem', 'reedMat', 'resinGlue', 'mapleSnack', 'honeyRoastMeat'].includes(item.id)) return 'workbench';
    if (['sword', 'ironArmor', 'ironShield', 'crystalBlade', 'crystalArmor', 'venomDagger', 'key', 'sinewBow', 'antlerSpear', 'stoneCoreHammer', 'rabbitCloak', 'scorpionArmor', 'waxTorch'].includes(item.id)) return 'forge';
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
    Object.entries(item.cost).forEach(([key, amount]) => {
        state.inventory[key] -= amount;
    });
    item.apply(state);
    showToast(`合成成功：${item.name}`);
    renderHud();
}

function useInventoryItem(key) {
    if ((state.inventory[key] || 0) <= 0) return;
    const p = state.player;
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
    return { 布衣: 'clothArmor', 皮甲: 'leatherArmor', 铁甲: 'ironArmor', 魔晶甲: 'crystalArmor', 兔毛披肩: 'rabbitCloak', 蝎壳甲: 'scorpionArmor' }[name] || '';
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
    const playerDist = distance(state.player, { x, y });
    if (playerDist < radius * 0.62) {
        const damage = wet ? 1 : 3;
        state.player.hp = Math.max(0, state.player.hp - damage);
        const knock = normalize(state.player.x - x, state.player.y - y);
        state.player.knockX += knock.x * 220;
        state.player.knockY += knock.y * 220;
        addFloatText(`-${damage}`, state.player.x, state.player.y - 44, '#ffb3b3');
        if (state.player.hp <= 0) {
            state.lose = true;
            showToast('你被爆炸击倒了。');
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
    spawnBurst(x, y, '#8cff66', 34, 220, radius * 0.5);
    showToast(hitCount ? `毒药让 ${hitCount} 个敌人中毒。` : '毒药碎裂，毒雾没有命中敌人。');
    renderHud();
}

function hitDirectProjectileTarget(projectile) {
    const hit = state.enemies
        .filter(enemy => enemy.hp > 0)
        .map(enemy => ({ enemy, d: distance(enemy, { x: projectile.x, y: projectile.y }) }))
        .filter(item => item.d <= item.enemy.radius + 18)
        .sort((a, b) => a.d - b.d)[0]?.enemy;
    if (!hit) {
        spawnBurst(projectile.x, projectile.y, '#d8e5f2', 8, 70, 10);
        return;
    }
    const now = performance.now();
    const damage = directProjectileDamage(projectile);
    hit.hp -= damage;
    hit.hurtUntil = now + 160;
    hit.attackCooldown = Math.max(hit.attackCooldown, 0.22);
    if (projectile.kind !== 'slingshotPebble') {
        const knock = projectile.dir || normalize(hit.x - state.player.x, hit.y - state.player.y);
        hit.knockX += knock.x * (projectile.kind === 'poisonArrow' ? 80 : 120);
        hit.knockY += knock.y * (projectile.kind === 'poisonArrow' ? 80 : 120);
    }
    if (projectile.kind === 'poisonArrow' && hit.kind !== 'golem') {
        hit.poisonUntil = Math.max(hit.poisonUntil || 0, now + 5200);
        hit.poisonTickAt = Math.min(hit.poisonTickAt || now + 800, now + 800);
        addFloatText('中毒', hit.x, hit.y - 48, '#9cff7a');
    }
    spawnBurst(hit.x, hit.y, projectile.kind === 'poisonArrow' ? '#8cff66' : '#d8e5f2', projectile.kind === 'slingshotPebble' ? 6 : 12, 70, hit.radius * 0.45);
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

function directProjectileDamage(projectile) {
    if (projectile.kind === 'slingshotPebble') return 1;
    if (projectile.kind === 'poisonArrow') return Math.max(2, Math.round(2 + (projectile.charge || 0.5) * 2));
    return Math.max(3, Math.round(2 + (projectile.charge || 0.5) * 4));
}

function directProjectileName(projectile) {
    if (projectile.kind === 'slingshotPebble') return '弹弓石子';
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
        row.classList.add('draggable');
        row.dataset.itemKey = key;
        row.title = `${label} x${state.inventory[key] || 0}`;
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
        if (chest) {
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
        if (canUseInventoryItem(key)) row.addEventListener('click', () => useInventoryItem(key));
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
            .map(([key, amount]) => `<span class="cost-chip ${state.inventory[key] >= amount ? 'met' : ''}">${pixelIconHtml(key)}<b>${amount}</b></span>`)
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
    title.textContent = `木箱 ${keys.length}/${CHEST_SLOT_LIMIT} 格`;
    panel.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'chest-grid';
    keys.forEach(key => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'inventory-row chest-row';
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

function equippedItemKey(type) {
    if (type === 'offhand') return { 木盾: 'woodShield', 铁盾: 'ironShield' }[state.equipment.shield] || '';
    return { 布衣: 'clothArmor', 皮甲: 'leatherArmor', 铁甲: 'ironArmor', 魔晶甲: 'crystalArmor', 兔毛披肩: 'rabbitCloak', 蝎壳甲: 'scorpionArmor' }[state.equipment.armor] || '';
}

function equipmentSummaryText() {
    const armor = state.equipment.armor === '无' ? '' : state.equipment.armor;
    const shield = state.equipment.shield === '无' ? '' : state.equipment.shield;
    if (armor && shield) return `${armor}+${shield}`;
    return armor || shield || '无';
}

function isArmorKey(key) {
    return ['clothArmor', 'leatherArmor', 'ironArmor', 'crystalArmor', 'rabbitCloak', 'scorpionArmor'].includes(key);
}

function isShieldKey(key) {
    return ['woodShield', 'ironShield'].includes(key);
}

function recipeStatusText(item, disabled) {
    if (item.owned(state)) return '已拥有';
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
    showToast(`${RESOURCE_LABELS[itemKey]} 已放到快捷栏 ${index + 1}。`);
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
}

function isHotbarItem(key) {
    return (state.hotbarItems || []).includes(key);
}

function syncHotbarItems() {
    state.hotbarItems = (state.hotbarItems || Array(9).fill(null)).map(key => key && (state.inventory[key] || 0) > 0 ? key : null);
    while (state.hotbarItems.length < 9) state.hotbarItems.push(null);
    if (state.hotbarItems.length > 9) state.hotbarItems.length = 9;
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
    return ['stoneAxe', 'stonePickaxe', 'stoneSickle', 'stoneSpear', 'slingshot', 'bambooSpear', 'venomDagger', 'ironSword', 'crystalBlade', 'sinewBow', 'antlerSpear', 'stoneCoreHammer', 'leatherArmor', 'clothArmor', 'ironArmor', 'crystalArmor', 'rabbitCloak', 'scorpionArmor', 'woodShield', 'ironShield'].includes(key);
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
}

function toggleInventory(force = null) {
    state.inventoryOpen = force === null ? !state.inventoryOpen : !!force;
    if (state.inventoryOpen) {
        mouse.down = false;
        state.player.rangedAim = null;
        state.player.throwableAim = null;
        resetHarvestHold();
    }
    renderHud();
}

function canUseInventoryItem(key) {
    return ['stoneAxe', 'stonePickaxe', 'stoneSickle', 'stoneSpear', 'slingshot', 'bambooSpear', 'ironSword', 'crystalBlade', 'venomDagger', 'sinewBow', 'antlerSpear', 'stoneCoreHammer', 'leatherArmor', 'clothArmor', 'ironArmor', 'crystalArmor', 'rabbitCloak', 'scorpionArmor', 'woodShield', 'ironShield', 'coalBomb', 'poisonVial', 'campfire', 'torch', 'waxTorch', 'shadowLantern', 'bedroll', 'campCharm', 'antlerCharm', 'snare', 'bambooFence', 'bambooTrap', 'potionTable', 'workbench', 'forge', 'beehiveBox', 'stoneCoreTotem', 'reedMat', 'chest', 'antlerHorn', 'campFlag', 'berry', 'mushroom', 'lotus', 'cactusFruit', 'honey', 'sap', 'meat', 'frogLeg', 'rabbitFoot', 'potion', 'honeySalve', 'nightVisionPotion', 'jumpPotion', 'poisonResistPotion', 'shadowPotion', 'bandage', 'strongBandage', 'stew', 'salve', 'antidote', 'speedPotion', 'regenPotion', 'ironSkinPotion', 'mapleSnack', 'honeyRoastMeat', 'roastMeat'].includes(key) && (state.inventory[key] || 0) > 0;
}

function recipeHasKnownMaterial(recipe) {
    return Object.keys(recipe.cost).some(key => (state.inventory[key] || 0) > 0);
}

function itemIconColors(key) {
    return PIXEL_ICON_PALETTES[ITEM_ICON_TYPES[key] || key] || PIXEL_ICON_PALETTES.default;
}

function pixelIconRects(key) {
    const type = ITEM_ICON_TYPES[key] || key;
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
    ctx.fillStyle = '#18110c';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#5a3a1f';
    ctx.fillRect(196, 132, VIEW.width - 392, VIEW.height - 270);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(214, 150, VIEW.width - 428, VIEW.height - 306);
    ctx.fillStyle = 'rgba(214, 160, 106, 0.08)';
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
    state.indoor.objects
        .slice()
        .sort((a, b) => a.y - b.y)
        .forEach(drawIndoorObject);
    drawIndoorObjectLabels();
    drawIndoorPlayer(now);
    const target = nearestIndoorObject();
    if (target) {
        ctx.fillStyle = 'rgba(8, 14, 21, 0.78)';
        ctx.fillRect(VIEW.width / 2 - 190, VIEW.height - 40, 380, 28);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        const suffix = target.action === 'steal' && target.opened && !target.stolen ? ` / 内容：${lootText(target.loot)} / 再按 E 拿走` : '';
        ctx.fillText(`按 E 互动：${target.label}${suffix}`, VIEW.width / 2, VIEW.height - 21);
        ctx.textAlign = 'left';
    }
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

function drawIndoorPlayer(now) {
    drawShadow(state.player.x, state.player.y + 1, 34, 8);
    drawSpriteGrounded('player', state.player.x, state.player.y, 4);
}

function drawIndoorNpc(object) {
    const x = object.x;
    const y = object.y;
    drawShadow(x, y + 1, 30, 7);
    const colors = {
        blacksmith: ['#5a341d', '#66737f'],
        apothecary: ['#355d3f', '#69e08e'],
        kitchen: ['#7a3f2a', '#ffd166'],
        elder: ['#3f2a1c', '#b77dff'],
    }[object.role] || ['#5a341d', '#d49a5a'];
    ctx.fillStyle = '#d6a06a';
    ctx.fillRect(x - 8, y - 42, 16, 16);
    ctx.fillStyle = colors[0];
    ctx.fillRect(x - 11, y - 27, 22, 26);
    ctx.fillStyle = colors[1];
    ctx.fillRect(x - 8, y - 24, 16, 6);
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(x - 5, y - 38, 3, 3);
    ctx.fillRect(x + 3, y - 38, 3, 3);
    if (object.role === 'blacksmith') {
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - 13, y - 31, 26, 5);
    } else if (object.role === 'elder') {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 9, y - 48, 18, 4);
    }
}

function drawIndoorObject(object) {
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
        ctx.fillRect(x - object.w / 2, y, object.w, 18);
        ctx.fillStyle = '#9a6436';
        ctx.fillRect(x - object.w / 2 + 6, y - 5, object.w - 12, 7);
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
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - 22, y - 10, 44, 26);
        ctx.fillStyle = '#66737f';
        ctx.fillRect(x - 26, y - 16, 52, 9);
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(x - 12, y + 18, 24, 7);
        ctx.fillStyle = '#d8e5f2';
        ctx.fillRect(x - 8, y - 20, 16, 4);
    } else if (object.kind === 'chest' || object.kind === 'foodCrate' || object.kind === 'crate') {
        const base = object.kind === 'crate' ? '#48515a' : (object.kind === 'foodCrate' ? '#6b4a2f' : (object.mark === 'elder' ? '#5d4934' : (object.mark === 'herb' ? '#355d3f' : '#8a5a32')));
        ctx.fillStyle = object.stolen ? '#3b2a1b' : base;
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        ctx.fillStyle = object.kind === 'crate' ? '#303946' : '#5a341d';
        ctx.fillRect(x - object.w / 2 + 5, y - object.h / 2 + 6, object.w - 10, 5);
        ctx.fillRect(x - object.w / 2 + 5, y + object.h / 2 - 10, object.w - 10, 5);
        ctx.fillStyle = object.kind === 'crate' ? '#c5d6df' : (object.kind === 'foodCrate' ? '#d94b5f' : (object.mark === 'elder' ? '#b77dff' : (object.mark === 'herb' ? '#69e08e' : '#d49a5a')));
        if (object.kind === 'crate') {
            ctx.fillRect(x - 18, y - 12, 10, 8);
            ctx.fillRect(x + 6, y + 5, 12, 7);
        } else if (object.kind === 'foodCrate') {
            ctx.fillRect(x - 18, y - 10, 8, 8);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(x + 8, y - 8, 9, 7);
        } else if (object.mark === 'elder') {
            ctx.fillRect(x - 16, y - 12, 32, 5);
            ctx.fillRect(x - 4, y - 16, 8, 13);
        } else if (object.mark === 'herb') {
            ctx.fillRect(x - 15, y - 13, 8, 14);
            ctx.fillRect(x + 6, y - 12, 8, 13);
        }
        if (object.opened && !object.stolen) {
            ctx.fillStyle = '#d49a5a';
            ctx.fillRect(x - object.w / 2 + 4, y - object.h / 2 - 7, object.w - 8, 8);
        }
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - 5, y - 4, 10, 8);
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
        ctx.fillStyle = object.taken ? '#3b3b32' : '#121820';
        ctx.fillRect(x - 25, y - 10, 50, 22);
        ctx.fillStyle = '#303946';
        ctx.fillRect(x - 12, y - 16, 20, 8);
        ctx.fillRect(x + 10, y - 6, 18, 7);
    } else if (object.kind === 'herbRack' || object.kind === 'rack' || object.kind === 'meatRack') {
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, 6);
        ctx.fillRect(x - object.w / 2, y + object.h / 2 - 7, object.w, 6);
        ctx.fillStyle = '#5a341d';
        for (let i = 0; i < 5; i++) ctx.fillRect(x - object.w / 2 + 12 + i * 36, y - object.h / 2 + 2, 4, object.h - 4);
        if (object.kind === 'rack') {
            for (let i = 0; i < 4; i++) {
                const px = x - 54 + i * 34;
                ctx.strokeStyle = i % 2 ? '#d8e5f2' : '#a8b3bd';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(px, y + 14);
                ctx.lineTo(px + 18, y - 16);
                ctx.stroke();
                ctx.fillStyle = '#5a341d';
                ctx.fillRect(px - 3, y + 10, 8, 8);
            }
        } else {
            const colors = object.kind === 'herbRack' ? ['#69e08e', '#9cffb7', '#2f7f45'] : ['#d94b5f', '#ffd0b8', '#7f2630'];
            for (let i = 0; i < 6; i++) {
                const px = x - 72 + i * 28;
                ctx.fillStyle = colors[i % colors.length];
                ctx.fillRect(px, y - 14 + (i % 2) * 3, 8, 20);
                ctx.fillStyle = 'rgba(0,0,0,0.22)';
                ctx.fillRect(px + 2, y + 3, 4, 7);
            }
        }
    } else if (object.kind === 'basket') {
        ctx.fillStyle = '#8a5a32';
        ctx.fillRect(x - object.w / 2, y - object.h / 2 + 8, object.w, object.h - 8);
        ctx.strokeStyle = '#d49a5a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 2, 17, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#69e08e';
        ctx.fillRect(x - 12, y - 12, 8, 12);
        ctx.fillRect(x + 4, y - 14, 8, 14);
    } else if (object.kind === 'table') {
        ctx.fillStyle = object.action === 'elder' ? '#3f2a1c' : '#5a341d';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        ctx.fillStyle = object.action === 'elder' ? '#d49a5a' : '#d49a5a';
        ctx.fillRect(x - object.w / 2 + 8, y - object.h / 2 + 8, object.w - 16, 8);
        if (object.action === 'elder') {
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(x - 22, y - 8, 44, 6);
            ctx.fillStyle = '#b77dff';
            ctx.fillRect(x - 6, y - 18, 12, 12);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x - object.w / 2 + 12, y + object.h / 2 - 10, 12, 12);
        ctx.fillRect(x + object.w / 2 - 24, y + object.h / 2 - 10, 12, 12);
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
        ctx.fillStyle = '#8fb8ff';
        ctx.fillRect(x - 22, y - 32, 8, 24);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 4, y - 30, 8, 22);
        ctx.fillStyle = '#d94b5f';
        ctx.fillRect(x + 18, y - 28, 8, 20);
        ctx.fillStyle = '#69e08e';
        ctx.fillRect(x - 8, y + 6, 8, 24);
    } else if (object.kind === 'jarShelf') {
        ctx.fillStyle = '#4a2b17';
        ctx.fillRect(x - object.w / 2, y - object.h / 2, object.w, object.h);
        ctx.fillStyle = '#7dcbe8';
        ctx.fillRect(x - 22, y - 18, 10, 16);
        ctx.fillStyle = '#8cff66';
        ctx.fillRect(x - 3, y - 20, 10, 18);
        ctx.fillStyle = '#d94bff';
        ctx.fillRect(x + 16, y - 15, 9, 14);
        ctx.fillStyle = '#d49a5a';
        ctx.fillRect(x - object.w / 2 + 5, y + 6, object.w - 10, 5);
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
    if (terrainChunkCache.has(key)) return terrainChunkCache.get(key);
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
    const darkForest = weightedRegions(x, y, regions.darkForest);
    const reedWetland = weightedRegions(x, y, regions.reedWetland);
    const waterEdge = clamp(1 - water / 230, 0, 1);
    const noise = valueNoise(x * 0.006, y * 0.006);

    if (ruins + shapeNoise * 0.04 > 0.54) return { kind: 'ruins', color: mixMany([['#38414d', ruins], ['#4f5964', 0.32], ['#2f6b3d', Math.max(0, 1 - ruins)]], noise) };
    if (mine + shapeNoise * 0.05 > 0.58) return { kind: 'mine', color: mixMany([['#58636e', mine], ['#6a604f', 0.2], ['#376d3f', Math.max(0, 1 - mine)]], noise) };
    if (swamp + waterEdge * 0.24 + shapeNoise * 0.06 > 0.68) {
        if (waterEdge > 0.42 && climate.moisture > 0.54) return { kind: 'mud', color: mixMany([['#263f34', swamp], ['#4b3b28', 0.38], ['#2f6d57', 0.24]], noise) };
        return { kind: 'swamp', color: mixMany([['#214b3d', swamp], ['#2f6d57', 0.25], ['#2f6b3d', Math.max(0, 1 - swamp)]], noise) };
    }
    if (dry + shapeNoise * 0.05 > 0.62) return { kind: 'dry', color: mixMany([['#a47a3c', dry], ['#735536', 0.24], ['#3f8f4f', Math.max(0, 1 - dry)]], noise) };
    if (reedWetland + waterEdge * 0.18 + shapeNoise * 0.05 > 0.68) return { kind: 'reedWetland', color: mixMany([['#426d3d', reedWetland], ['#6f8750', 0.32], ['#2f6d57', waterEdge * 0.3]], noise) };
    if (darkForest + shapeNoise * 0.06 > 0.58) return { kind: 'darkForest', color: mixMany([['#1f3328', darkForest], ['#38284b', 0.34], ['#2b4a31', 0.22], ['#17251f', 0.12]], noise) };
    if (pine + shapeNoise * 0.06 > 0.6) return { kind: 'pine', color: mixMany([['#173c2b', pine], ['#24502e', 0.28], ['#30452a', 0.18]], noise) };
    if (maple + shapeNoise * 0.06 > 0.58) return { kind: 'maple', color: mixMany([['#4f7f45', maple], ['#5f8f50', 0.26], ['#6f8a3d', 0.14]], noise) };
    if (birch + shapeNoise * 0.06 > 0.58) return { kind: 'birch', color: mixMany([['#5f9b55', birch], ['#83b86a', 0.26], ['#3f8f4f', 0.22]], noise) };
    if (meadow + shapeNoise * 0.05 > 0.56) return { kind: 'meadow', color: mixMany([['#6fbf55', meadow], ['#9ecf63', 0.28], ['#3f8f4f', 0.25]], noise) };
    if (forest + shapeNoise * 0.07 > 0.58) {
        if (climate.moisture > 0.66 && climate.temperature > 0.42 && valueNoise(x * 0.004 + 18, y * 0.004 - 12) > 0.54) {
            return { kind: 'bamboo', color: mixMany([['#1f6b3f', forest], ['#3b8d49', 0.36], ['#24502e', 0.22]], noise) };
        }
        return { kind: 'forest', color: mixMany([['#1f5a35', forest], ['#2f7041', 0.3], ['#3f8f4f', Math.max(0, 1 - forest)]], noise) };
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
        mine: makeRegions(5, 10, 820, 1180, 520, 850),
        ruins: makeRegions(2, 20, 560, 720, 540, 1250),
        swamp: makeRegions(2, 30, 900, 1180, 420, 720),
        dry: makeRegions(2, 40, 900, 1200, 420, 760),
        forest: makeRegions(4, 50, 880, 1320, 360, 520),
        birch: makeRegions(1, 60, 880, 1080, 420, 700),
        pine: makeRegions(2, 70, 900, 1220, 420, 760),
        maple: makeRegions(1, 80, 900, 1120, 420, 760),
        meadow: makeRegions(2, 90, 720, 940, 360, 580),
        darkForest: makeRegions(1, 100, 920, 1180, 520, 1100),
        reedWetland: makeRegions(2, 110, 680, 860, 360, 620),
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
    const village = worldRegionSet().village;
    return naturalRegionWeight(x, y, village.x, village.y, village.radius * 0.88, village.seed);
}

function villageRoadWeight(x, y) {
    const village = worldRegionSet().village;
    const garden = villageGardenForRegion(village);
    const centerFade = clamp(1 - distance({ x, y }, village) / (village.radius * 0.94), 0, 1);
    const windingY = village.y + Math.sin((x - village.x) * 0.012 + village.seed) * 20;
    const windingX = village.x + Math.sin((y - village.y) * 0.011 - village.seed) * 18;
    const centerRoad = Math.max(1 - Math.abs(y - windingY) / 34, 1 - Math.abs(x - windingX) / 32) * centerFade;
    const gardenPath = clamp(1 - distanceToSegment({ x, y }, village, garden) / 34, 0, 1);
    return Math.max(centerRoad, gardenPath);
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
        ...(state.village && isNearView(state.village, state.village.radius + 180) ? villageDrawables(state.village) : []),
        ...(isNearView(state.ruins, 220) ? [{ y: state.ruins.y, draw: () => drawRuins() }] : []),
        ...state.bambooTraps.filter(t => isNearView(t, 90)).map(t => ({ y: t.y - 2, draw: () => drawBambooTrap(t) })),
        ...state.placedFences.filter(t => isNearView(t, 120)).map(t => ({ y: t.y + 8, draw: () => drawBambooFence(t) })),
        ...state.placedStations.filter(t => isNearView(t, 140)).map(t => ({ y: t.y + 10, draw: () => drawStation(t) })),
        ...state.placedTorches.filter(t => isNearView(t, 120)).map(t => ({ y: t.y, draw: () => drawPlacedTorch(t) })),
        ...state.projectiles.filter(p => isNearView(p, 120)).map(p => ({ y: p.y, draw: () => drawProjectile(p) })),
        ...state.resources.filter(shouldDrawResource).map(r => ({ y: r.y, draw: () => drawResource(r) })),
        ...state.enemies.filter(e => e.hp > 0 && isNearView(e, 220)).map(e => ({ y: e.y, draw: () => drawEnemy(e, now) })),
        { y: state.player.y, draw: () => drawPlayer(now) },
    ];
    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach(item => item.draw());
}

function shouldDrawResource(r) {
    if (r.hp <= 0 || !isNearView(r, 180)) return false;
    return true;
}

function villageDrawables(village) {
    const items = [];
    items.push({ y: village.y + 8, draw: () => drawVillageWell(village.well) });
    village.buildings.forEach(building => items.push({ y: building.y + building.h * 0.5, draw: () => drawVillageHouse(building) }));
    return items;
}

function drawVillageHouse(building) {
    const x = worldX(building.x);
    const y = worldY(building.y);
    const left = Math.round(x - building.w / 2);
    const top = Math.round(y - building.h / 2);
    drawShadow(x, y + building.h * 0.38, building.w * 0.82, 14);
    ctx.fillStyle = '#4b3b28';
    ctx.fillRect(left + 8, top + 82, building.w - 16, 10);
    ctx.fillStyle = '#2d2117';
    ctx.fillRect(left + 12, top + 44, building.w - 24, building.h - 42);
    ctx.fillStyle = '#7a6040';
    ctx.fillRect(left + 18, top + 50, building.w - 36, building.h - 54);
    for (let yy = top + 54; yy < top + building.h - 10; yy += 14) {
        ctx.fillStyle = yy % 28 ? 'rgba(90, 52, 29, 0.45)' : 'rgba(40, 30, 20, 0.35)';
        ctx.fillRect(left + 18, yy, building.w - 36, 4);
    }
    const roof = building.kind === 'blacksmith' ? '#5d4934' : (building.roofTone > 0.5 ? '#5a4632' : '#4b3b28');
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
    ctx.fillStyle = '#5a341d';
    ctx.fillRect(left + 14, y + building.h * 0.46, building.w - 28, 7);
    if (building.kind === 'blacksmith') {
        ctx.fillStyle = '#20262d';
        ctx.fillRect(left + building.w - 14, top + 8, 12, 34);
        ctx.fillStyle = 'rgba(80, 80, 80, 0.35)';
        ctx.fillRect(left + building.w - 12, top - 4, 8, 10);
    }
}

function drawVillageWell(well) {
    const x = worldX(well.x);
    const y = worldY(well.y);
    drawShadow(x, y + 7, 54, 13);
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

function drawGatherablePatch(r, x, y) {
    if (['birchTree', 'pineTree', 'mapleTree', 'deadTree', 'darkTree'].includes(r.kind)) {
        drawVariantTree(r, x, y);
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
    ctx.fillStyle = r.kind === 'berry' ? COLORS.grass2 : COLORS.grass1;
    ctx.fillRect(x - 14, y - 17, 5, 18);
    ctx.fillRect(x - 4, y - 24, 5, 25);
    ctx.fillRect(x + 8, y - 16, 5, 17);
    ctx.fillStyle = r.kind === 'berry' ? COLORS.berry : (r.kind === 'herb' ? COLORS.herb : COLORS.grass2);
    ctx.fillRect(x - 9, y - 24, 6, 6);
    ctx.fillRect(x + 4, y - 28, 6, 6);
}

function drawVariantTree(r, x, y) {
    const configs = {
        birchTree: { trunk: '#f1ead3', bark: '#2d2a25', leaf: '#9ddc76', leaf2: '#d6f5a7', w: 34, h: 66 },
        pineTree: { trunk: '#5a341d', bark: '#3b2417', leaf: '#1f5a35', leaf2: '#3f8f4f', w: 30, h: 82 },
        mapleTree: { trunk: '#6b3b1f', bark: '#3d2417', leaf: '#4f8f45', leaf2: '#8fbf68', w: 48, h: 72 },
        deadTree: { trunk: '#5a4632', bark: '#2d2117', leaf: '#3b2d22', leaf2: '#7a6040', w: 34, h: 68 },
        darkTree: { trunk: '#342819', bark: '#151f16', leaf: '#102f22', leaf2: '#1f5a35', w: 46, h: 78 },
    }[r.kind];
    drawShadow(x, y + 2, r.radius * 1.35, 10);
    if (r.kind === 'mapleTree') {
        drawMapleTree(x, y, configs);
        return;
    }
    if (r.kind === 'deadTree') {
        drawDeadTree(x, y, configs);
        return;
    }
    if (r.kind === 'darkTree') {
        drawDarkTree(x, y, configs);
        return;
    }
    ctx.fillStyle = configs.trunk;
    ctx.fillRect(x - 5, y - configs.h + 28, 10, configs.h - 28);
    ctx.fillStyle = configs.bark;
    if (r.kind === 'birchTree') {
        for (let yy = y - configs.h + 34; yy < y - 8; yy += 13) ctx.fillRect(x - 5, yy, 10, 3);
    } else {
        ctx.fillRect(x - 2, y - configs.h + 32, 4, configs.h - 36);
    }
    if (r.kind === 'pineTree') {
        ctx.fillStyle = configs.leaf;
        ctx.fillRect(x - 12, y - 78, 24, 18);
        ctx.fillRect(x - 18, y - 62, 36, 18);
        ctx.fillRect(x - 23, y - 46, 46, 18);
        ctx.fillStyle = configs.leaf2;
        ctx.fillRect(x - 8, y - 74, 16, 4);
        return;
    }
    ctx.fillStyle = configs.leaf;
    ctx.fillRect(x - configs.w / 2, y - configs.h, configs.w, 24);
    ctx.fillRect(x - configs.w / 2 + 5, y - configs.h - 14, configs.w - 10, 22);
    ctx.fillStyle = configs.leaf2;
    ctx.fillRect(x - configs.w / 2 + 8, y - configs.h + 5, configs.w - 16, 8);
}

function drawMapleTree(x, y, config) {
    ctx.strokeStyle = config.trunk;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 60);
    ctx.stroke();
    ctx.strokeStyle = config.bark;
    ctx.lineWidth = 5;
    const branches = [
        [x, y - 38, x - 22, y - 66],
        [x + 1, y - 40, x + 23, y - 68],
        [x, y - 52, x - 8, y - 82],
        [x + 1, y - 55, x + 8, y - 82],
    ];
    branches.forEach(branch => {
        ctx.beginPath();
        ctx.moveTo(branch[0], branch[1]);
        ctx.lineTo(branch[2], branch[3]);
        ctx.stroke();
    });
    ctx.fillStyle = '#3f7f3f';
    ctx.fillRect(x - 36, y - 84, 72, 26);
    ctx.fillRect(x - 30, y - 100, 60, 25);
    ctx.fillRect(x - 20, y - 114, 40, 20);
    ctx.fillRect(x - 25, y - 74, 50, 20);
    ctx.fillStyle = config.leaf2;
    ctx.fillRect(x - 28, y - 90, 20, 8);
    ctx.fillRect(x + 8, y - 94, 20, 8);
    ctx.fillRect(x - 8, y - 106, 18, 7);
    ctx.fillRect(x - 16, y - 73, 30, 6);
    ctx.fillStyle = 'rgba(100, 130, 55, 0.85)';
    ctx.fillRect(x - 33, y - 62, 66, 10);
}

function drawDeadTree(x, y, config) {
    ctx.strokeStyle = config.trunk;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 3, y - 20, x + 4, y - 42, x - 2, y - 64);
    ctx.stroke();
    ctx.strokeStyle = config.bark;
    ctx.lineWidth = 4;
    [
        [x - 2, y - 42, x - 24, y - 58],
        [x, y - 52, x + 24, y - 68],
        [x - 2, y - 30, x - 18, y - 38],
        [x + 1, y - 35, x + 18, y - 42],
        [x - 3, y - 61, x - 12, y - 78],
    ].forEach(branch => {
        ctx.beginPath();
        ctx.moveTo(branch[0], branch[1]);
        ctx.lineTo(branch[2], branch[3]);
        ctx.stroke();
    });
    ctx.fillStyle = 'rgba(40, 28, 20, 0.6)';
    ctx.fillRect(x - 5, y - 22, 6, 12);
    ctx.fillStyle = config.leaf2;
    ctx.fillRect(x - 22, y - 43, 8, 4);
    ctx.fillRect(x + 14, y - 50, 7, 4);
}

function drawDarkTree(x, y, config) {
    ctx.strokeStyle = config.trunk;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 4, y - 18, x + 5, y - 46, x, y - 70);
    ctx.stroke();
    ctx.strokeStyle = config.bark;
    ctx.lineWidth = 5;
    [
        [x - 1, y - 42, x - 24, y - 68],
        [x + 1, y - 48, x + 25, y - 72],
        [x, y - 58, x - 8, y - 86],
    ].forEach(branch => {
        ctx.beginPath();
        ctx.moveTo(branch[0], branch[1]);
        ctx.lineTo(branch[2], branch[3]);
        ctx.stroke();
    });
    ctx.fillStyle = config.leaf;
    ctx.fillRect(x - 32, y - 82, 64, 22);
    ctx.fillRect(x - 26, y - 100, 52, 24);
    ctx.fillRect(x - 18, y - 114, 36, 18);
    ctx.fillStyle = config.leaf2;
    ctx.fillRect(x - 24, y - 91, 16, 6);
    ctx.fillRect(x + 8, y - 96, 16, 6);
    ctx.fillStyle = 'rgba(86, 61, 122, 0.28)';
    ctx.fillRect(x - 29, y - 74, 58, 8);
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
    const leapProgress = e.leapUntil > now ? clamp((now - e.leapStartAt) / Math.max(1, e.leapUntil - e.leapStartAt), 0, 1) : 0;
    const leapLift = e.leapUntil > now ? Math.sin(leapProgress * Math.PI) * 18 : 0;
    const swoopProgress = e.swoopUntil > now ? clamp((now - e.swoopStartAt) / Math.max(1, e.swoopUntil - e.swoopStartAt), 0, 1) : 0;
    const flying = e.kind === 'bat' || e.kind === 'bee';
    const flyLift = flying ? 16 + Math.sin(now / 90) * 6 + Math.sin(swoopProgress * Math.PI) * 18 : 0;
    const chargeLean = e.chargeUntil > now ? 8 : 0;
    const spriteScale = e.kind === 'scorpion' ? 2.55 : (e.kind === 'golem' && e.boss ? 4.15 : 3.2);
    const bounce = Math.sin(now / 140) * (e.kind === 'slime' ? 3 : 1.2) - leapLift - flyLift;
    const concealed = e.kind !== 'bat' && e.kind !== 'bee' && tallGrassCoverAt(e);
    const revealed = e.windupUntil || e.hurtUntil || distance(e, state.player) < 54;
    if (concealed && !revealed) ctx.globalAlpha = 0.18;
    drawShadow(x, y + 1, e.radius * (flying ? 1.1 : 1.62), e.radius * (flying ? 0.25 : 0.42));
    ctx.globalAlpha = 1;
    if (e.windupUntil) {
        drawEnemyTelegraph(e, x, y, now);
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
            ctx.strokeStyle = 'rgba(183, 125, 255, 0.9)';
            ctx.lineWidth = 4;
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3 + now * 0.001;
                ctx.beginPath();
                ctx.arc(worldX(state.player.x + Math.cos(angle) * 42), worldY(state.player.y + Math.sin(angle) * 42), 18 + pulse, 0, Math.PI * 2);
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
    return ['stoneAxe', 'stonePickaxe', 'stoneSickle', 'stoneSpear', 'slingshot', 'sinewBow', 'bambooSpear', 'venomDagger', 'ironSword', 'crystalBlade', 'wood', 'bamboo', 'stone'].includes(key) || !key;
}

function directRangedPullAmount(key, attacking) {
    const aim = state.player.rangedAim;
    if (aim?.key === key) return directRangedCharge(aim, performance.now());
    return attacking ? 0.45 : 0;
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
    for (const item of state.decorations) {
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
    const x = worldX(state.player.x);
    const y = worldY(state.player.y - state.player.radius - 28);
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
    const lights = [
        { x: state.player.x, y: state.player.y, radius: performance.now() < state.player.nightVisionUntil ? 190 : (selectedHotbarItem() === 'torch' || state.equipment.utility === '火把' ? 150 : 62), strength: performance.now() < state.player.nightVisionUntil ? 0.48 : 0.36 },
        { x: state.camp.x, y: state.camp.y, radius: state.camp.repaired ? 180 : 85, strength: 0.58 },
        ...state.placedTorches.map(torch => ({ x: torch.x, y: torch.y, radius: torch.kind === 'waxTorch' ? 150 : 125, strength: torch.kind === 'shadowLantern' ? 0.42 : 0.56 })),
        ...state.placedStations.filter(station => station.kind === 'campfire').map(fire => ({ x: fire.x, y: fire.y, radius: 150, strength: 0.55 })),
    ];
    lightCtx.globalCompositeOperation = 'destination-out';
    for (const light of lights) {
        const gradient = lightCtx.createRadialGradient(worldX(light.x), worldY(light.y), 8, worldX(light.x), worldY(light.y), light.radius);
        gradient.addColorStop(0, `rgba(255,255,255,${(light.strength || 0.45) * darkness})`);
        gradient.addColorStop(0.42, `rgba(255,255,255,${(light.strength || 0.45) * 0.45 * darkness})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        lightCtx.fillStyle = gradient;
        lightCtx.beginPath();
        lightCtx.arc(worldX(light.x), worldY(light.y), light.radius, 0, Math.PI * 2);
        lightCtx.fill();
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
    drawHotbar();

    if (state.win || state.lose) {
        ctx.fillStyle = 'rgba(7, 12, 18, 0.72)';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(state.win ? '废墟开启！' : '冒险失败', VIEW.width / 2, VIEW.height / 2 - 16);
        ctx.font = 'bold 20px "Microsoft YaHei"';
        ctx.fillText(state.win ? '你完成了荒野营地 Demo。' : '重新开始，先打造装备再深入危险区域。', VIEW.width / 2, VIEW.height / 2 + 34);
        ctx.textAlign = 'left';
    }
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
    return { tree: '树木', birchTree: '白桦树', pineTree: '松树', mapleTree: '枫树', deadTree: '枯树', darkTree: '暗绿树', stump: '树桩', woodFence: '木栅栏', rock: '岩石', pebble: '小石子', grass: '草丛', tallGrass: '高草丛', reed: '芦苇', berry: '浆果丛', herb: '草药', mushroom: '蘑菇', toxicMushroom: '毒蘑菇', flower: '野花', meadowFlower: '花海花簇', lotus: '莲花', cactus: '仙人掌', ore: '铁矿', bamboo: '竹子', resinPatch: '树脂', sapPatch: '树液', beehive: '蜂巢', mudClump: '泥块' }[kind] || '资源';
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
    mouse.down = false;
});

canvas.addEventListener('mouseleave', () => {
    if (state.player.throwableAim) releaseThrowable();
    if (state.player.rangedAim) releaseDirectRanged();
    mouse.down = false;
    mouse.blocking = false;
});

document.getElementById('restart-btn').addEventListener('click', () => {
    worldSeed = createWorldSeed();
    terrainChunkCache.clear();
    state = createState();
    showToast('新的随机地图开始了。先收集木头和石头修复营地。');
    renderHud();
});

document.getElementById('inventory-close-btn').addEventListener('click', () => toggleInventory(false));

document.getElementById('inventory-overlay').addEventListener('click', event => {
    if (event.target.id === 'inventory-overlay') toggleInventory(false);
});

setupMobileControls();
renderHud();
showToast('自由移动探索。靠近资源按 E 采集，空格或鼠标攻击。');
requestAnimationFrame(loop);
