const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const lightCanvas = document.createElement('canvas');
lightCanvas.width = canvas.width;
lightCanvas.height = canvas.height;
const lightCtx = lightCanvas.getContext('2d');

const WORLD = { width: 6400, height: 4400 };
const VIEW = { width: canvas.width, height: canvas.height };
const CAMP_POSITION = { x: WORLD.width / 2, y: WORLD.height / 2 };
const TERRAIN_CHUNK_SIZE = 256;
const MAX_PARTICLES = 220;
const COVER_GRID_SIZE = 160;
const MAX_ENEMIES = 80;
const MAX_NEARBY_ENEMIES = 14;
const DYNAMIC_SPAWN_MIN_DISTANCE = 560;
const DYNAMIC_SPAWN_MAX_DISTANCE = 940;
const keys = new Set();
const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, blocking: false };
const camera = { x: 0, y: 0 };
const terrainChunkCache = new Map();
const vegetationSpriteCache = {
    tallGrass: new Map(),
    bamboo: new Map(),
};
let toastTimer = null;
let lastTime = performance.now();
let worldSeed = createWorldSeed();
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
    stoneSpear: '石矛',
    bambooSpear: '竹矛',
    ironSword: '铁剑',
    crystalBlade: '魔晶剑',
    venomDagger: '毒牙匕首',
    leatherArmor: '皮甲',
    ironArmor: '铁甲',
    crystalArmor: '魔晶甲',
    woodShield: '木盾',
    ironShield: '铁盾',
    coalBomb: '煤火弹',
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
    stoneSpear: '🔱',
    bambooSpear: '🎋',
    ironSword: '⚔',
    crystalBlade: '🗡',
    venomDagger: '🔪',
    leatherArmor: '🥋',
    ironArmor: '🛡',
    crystalArmor: '💠',
    woodShield: '◧',
    ironShield: '◨',
    coalBomb: '💣',
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
    roastMeat: '🍖',
    key: '🗝',
};

const HOTBAR_ITEMS = ['stoneAxe', 'stonePickaxe', 'stoneSpear', 'ironSword', 'crystalBlade', 'torch', 'potion', 'speedPotion', 'bedroll'];
const POOR_SWIMMERS = new Set(['boar', 'wolf', 'scorpion', 'golem']);
const ITEM_ICON_TYPES = {
    wood: 'wood', bamboo: 'bamboo', stone: 'stone', pebble: 'stone', ore: 'ore', coal: 'coal', crystal: 'crystal', mud: 'mud',
    fiber: 'grass', herb: 'herb', flower: 'flower', berry: 'berry', mushroom: 'mushroom', lotus: 'lotus', cactusFruit: 'cactus',
    hide: 'hide', meat: 'meat', slimeGel: 'gel', fang: 'fang', venom: 'venom',
    stoneAxe: 'axe', stonePickaxe: 'pickaxe', stoneSpear: 'spear', bambooSpear: 'spear', ironSword: 'sword', crystalBlade: 'blade', venomDagger: 'dagger',
    leatherArmor: 'armor', ironArmor: 'armor', crystalArmor: 'armor', woodShield: 'shield', ironShield: 'shield',
    coalBomb: 'bomb', torch: 'torch', bedroll: 'bedroll', campCharm: 'charm', snare: 'trap', bambooFence: 'fence', bambooTrap: 'trap',
    potionTable: 'stationPotion', workbench: 'stationWorkbench', forge: 'stationForge', campFlag: 'flag',
    potion: 'potion', stew: 'stew', salve: 'salve', antidote: 'antidote', speedPotion: 'speed', regenPotion: 'potion', ironSkinPotion: 'armorPotion', roastMeat: 'meat', key: 'key',
};
const PIXEL_ICON_PALETTES = {
    wood: ['#5a341d', '#9a6436', '#d49a5a'], bamboo: ['#1f5f34', '#70bf55', '#d7f28a'], stone: ['#48515a', '#8c98a4', '#d8e5f2'],
    ore: ['#48515a', '#7dcbe8', '#e8fbff'], coal: ['#121820', '#303946', '#7b8794'], crystal: ['#512b9a', '#b77dff', '#f2ddff'],
    mud: ['#3b2a1b', '#6d5438', '#a38350'], grass: ['#1f5f34', '#5fbf55', '#cde77b'], herb: ['#17613a', '#69e08e', '#d5ffd8'],
    flower: ['#2e7d43', '#ffd166', '#ff6b9a'], berry: ['#245d34', '#d93f68', '#ff9ab0'], mushroom: ['#efe3c0', '#d94b5f', '#ffffff'],
    lotus: ['#1f6b52', '#f4a6d7', '#ffd166'], cactus: ['#1d6b47', '#58c47a', '#ff6b9a'], hide: ['#4b2d1d', '#9a5f3f', '#d6a06a'],
    meat: ['#7f2630', '#d94b5f', '#ffd0b8'], gel: ['#125f4c', '#5ee089', '#c8ffd8'], fang: ['#5d4934', '#f8fbff', '#c9d6dd'],
    venom: ['#213c1e', '#8cff66', '#d6ff9c'], axe: ['#5a341d', '#a8b3bd', '#f8fbff'], pickaxe: ['#5a341d', '#66737f', '#d8e5f2'],
    spear: ['#5a341d', '#d8e5f2', '#d7f28a'], sword: ['#38414d', '#c5d6df', '#ffffff'], blade: ['#512b9a', '#b77dff', '#ffffff'],
    dagger: ['#203020', '#8cff66', '#f8fbff'], armor: ['#4a3a2a', '#9fb3c8', '#ffffff'], shield: ['#5a341d', '#c5d6df', '#ffd166'],
    bomb: ['#161b22', '#ff9f1c', '#ffd166'], torch: ['#5a341d', '#ff9f1c', '#ffd166'], bedroll: ['#27364a', '#8fb8ff', '#f8fbff'],
    charm: ['#5d2ea6', '#ffd166', '#ffffff'], trap: ['#5a341d', '#d8e5f2', '#ffd166'], fence: ['#1f5f34', '#d7f28a', '#9bd86a'],
    flag: ['#5a341d', '#ff6b6b', '#ffffff'], potion: ['#2d4b6b', '#7dcbe8', '#ffffff'], stew: ['#5a341d', '#d68a43', '#ffd166'],
    salve: ['#125f4c', '#5ee089', '#ffffff'], antidote: ['#213c1e', '#8cff66', '#ffffff'], speed: ['#27364a', '#ffd166', '#ffffff'],
    stationPotion: ['#3a2454', '#7dcbe8', '#ffd166'], stationWorkbench: ['#4a2b17', '#9a6436', '#d49a5a'], stationForge: ['#2f3945', '#ff9f1c', '#d8e5f2'],
    armorPotion: ['#26384d', '#c5d6df', '#ffffff'], key: ['#5a3c13', '#ffd166', '#fff3b0'], default: ['#26384d', '#9fb3c8', '#ffffff'],
};

const RECIPES = [
    recipe('axe', '石斧', '砍树更快', { wood: 4, stone: 3 }, game => {
        game.inventory.stoneAxe += 1;
    }, game => game.inventory.stoneAxe > 0 || game.equipment.tool === '石斧'),
    recipe('pickaxe', '石镐', '挖石和采矿', { wood: 3, stone: 5, fiber: 2 }, game => {
        game.inventory.stonePickaxe += 1;
    }, game => game.inventory.stonePickaxe > 0 || game.equipment.tool === '石镐'),
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
    recipe('bambooSpear', '竹矛', '攻击距离很长，适合隔开野兽', { bamboo: 4, fiber: 2, stone: 1 }, game => {
        game.inventory.bambooSpear += 1;
    }, game => game.inventory.bambooSpear > 0 || game.equipment.weapon === '竹矛'),
    recipe('sword', '铁剑', '可以挑战守门石像', { wood: 2, ore: 6, hide: 2 }, game => {
        game.inventory.ironSword += 1;
    }, game => game.inventory.ironSword > 0 || game.equipment.weapon === '铁剑'),
    recipe('armor', '皮甲', '受到伤害 -1', { hide: 4, fiber: 4 }, game => {
        game.inventory.leatherArmor += 1;
    }, game => game.inventory.leatherArmor > 0 || game.equipment.armor === '皮甲'),
    recipe('potion', '治疗药水', '恢复 35 生命', { herb: 2, berry: 2 }, game => {
        game.inventory.potion += 1;
    }, () => false),
    recipe('stew', '蘑菇汤', '恢复 25 生命', { mushroom: 3, berry: 1 }, game => {
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
    recipe('ironArmor', '铁甲', '防御大幅提升', { ore: 8, coal: 2, hide: 2 }, game => {
        game.inventory.ironArmor += 1;
    }, game => game.inventory.ironArmor > 0 || game.equipment.armor === '铁甲'),
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
    recipe('coalBomb', '煤火弹', '范围伤害道具', { coal: 3, slimeGel: 1, fiber: 1 }, game => {
        game.inventory.coalBomb += 1;
    }, () => false),
    recipe('roastMeat', '烤肉', '恢复 40 生命', { meat: 1, coal: 1 }, game => {
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
    return {
        player: {
            x: CAMP_POSITION.x + 80,
            y: CAMP_POSITION.y + 40,
            radius: 17,
            speed: 190,
            hp: 100,
            maxHp: 100,
            stamina: 100,
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
        },
        inventory: { wood: 0, bamboo: 0, stone: 0, fiber: 0, pebble: 0, berry: 0, herb: 0, mushroom: 0, flower: 0, lotus: 0, cactusFruit: 0, mud: 0, ore: 0, coal: 0, hide: 0, meat: 0, slimeGel: 0, fang: 0, venom: 0, crystal: 0, stoneAxe: 0, stonePickaxe: 0, stoneSpear: 0, bambooSpear: 0, ironSword: 0, crystalBlade: 0, venomDagger: 0, leatherArmor: 0, ironArmor: 0, crystalArmor: 0, woodShield: 0, ironShield: 0, coalBomb: 0, torch: 0, bedroll: 0, campCharm: 0, snare: 0, bambooFence: 0, bambooTrap: 0, potionTable: 0, workbench: 0, forge: 0, campFlag: 0, potion: 0, stew: 0, salve: 0, antidote: 0, speedPotion: 0, regenPotion: 0, ironSkinPotion: 0, roastMeat: 0, key: 0 },
        equipment: {
            tool: '徒手',
            weapon: '木棍',
            armor: '布衣',
            shield: '无',
            attack: 1,
            range: 42,
            defense: 0,
            woodPower: 1,
            stonePower: 1,
            orePower: 1,
            utility: '无',
        },
        resources,
        tallGrassGrid: buildTallGrassGrid(resources),
        spawnDens,
        enemies: createEnemies(spawnDens),
        camp: { x: CAMP_POSITION.x, y: CAMP_POSITION.y, radius: 70, repaired: false },
        ruins: { x: 2110, y: 330, radius: 58, opened: false },
        decorations: createDecorations(),
        particles: [],
        floatTexts: [],
        placedTorches: [],
        placedFences: [],
        placedStations: [],
        bambooTraps: [],
        hotbarItems: Array(9).fill(null),
        draggedInventoryItem: null,
        nextDynamicSpawnAt: 0,
        spawnCooldowns: new Map(),
        cameraShake: 0,
        selectedHotbar: 0,
        inventoryOpen: false,
        wolfPacks: createWolfPackStates(),
        timeOfDay: 0.28,
        dayLength: 180,
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

function createResources() {
    const resources = [];
    const campPoint = CAMP_POSITION;
    const ruinsPoint = { x: 2110, y: 330 };
    const add = (kind, x, y, gives, hp, radius) => {
        const point = { x, y };
        const terrain = terrainInfoAt(x, y);
        if (terrain.kind === 'water' || terrain.kind === 'ruins') return;
        if (distance(point, campPoint) < 95 && kind !== 'grass' && kind !== 'tallGrass') return;
        if (distance(point, ruinsPoint) < 230) return;
        const spacing = kind === 'tallGrass' ? -42 : (kind === 'grass' ? 8 : 24);
        if (resources.some(item => distance(item, point) < item.radius + radius + spacing)) return;
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

    [
        [430, 250, 'tree'], [520, 360, 'tree'], [760, 220, 'tree'],
        [1420, 880, 'rock'], [1780, 1080, 'ore'], [1980, 920, 'ore'],
        [690, 780, 'reed'], [875, 940, 'reed'], [500, 690, 'stump'],
        [520, 1750, 'tree'], [650, 1880, 'tree'], [830, 1710, 'stump'],
        [2620, 1550, 'ore'], [2840, 1760, 'rock'],
        [4860, 1120, 'rock'], [5040, 1240, 'ore'], [5220, 1360, 'ore'],
        [4050, 720, 'tree'], [4320, 900, 'tree'], [4680, 1120, 'stump'],
        [5200, 3140, 'ore'], [5700, 3600, 'rock'], [6100, 3920, 'ore'],
        [6000, 2320, 'rock'], [6200, 2500, 'ore'], [5840, 2620, 'ore'],
        [3880, 2860, 'reed'], [4300, 3080, 'reed'],
        [CAMP_POSITION.x + 180, CAMP_POSITION.y + 90, 'tree'], [CAMP_POSITION.x - 160, CAMP_POSITION.y + 130, 'stump'], [CAMP_POSITION.x + 220, CAMP_POSITION.y - 160, 'rock'],
    ].forEach(([x, y, kind]) => {
        const config = {
            tree: ['wood', 6, 34],
            rock: ['stone', 7, 28],
            ore: ['ore', 8, 28],
            reed: ['fiber', 2, 16],
            stump: ['wood', 3, 20],
        }[kind];
        add(kind, x, y, ...config);
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
        knockX: 0,
        knockY: 0,
    };
}

function makeEnemy(kind, x, y, boss = false) {
    const configs = {
        slime: ['史莱姆', 18, 16, 2, 92, 42, { slimeGel: 2, fiber: 1 }, 1],
        frog: ['沼泽蛙', 16, 18, 1, 130, 58, { slimeGel: 1, lotus: 1 }, 1],
        scorpion: ['沙蝎', 15, 20, 2, 120, 54, { venom: 1, fang: 1 }, 1],
        boar: ['野猪', 22, 28, 5, 135, 68, { hide: 2, meat: 1, fang: 1 }, 1],
        wolf: ['荒狼', 18, 22, 4, 148, 64, { fang: 1, hide: 1, meat: 1 }, 1],
        bat: ['夜蝠', 12, 12, 2, 210, 96, { fang: 1, slimeGel: 1 }, 1],
        golem: [boss ? '守门石像' : '石像守卫', boss ? 28 : 26, boss ? 55 : 42, boss ? 9 : 7, boss ? 78 : 70, boss ? 92 : 78, boss ? { crystal: 3, stone: 4, coal: 2 } : { crystal: 1, stone: 2, coal: 1 }, 1],
    };
    const config = configs[kind];
    if (!config) return null;
    return enemy(kind, config[0], x, y, config[1], config[2], config[3], config[4], config[5], config[6], config[7], boss);
}

function createEnemies(spawnDens = []) {
    const enemies = [];
    const campPoint = CAMP_POSITION;
    const ruinsPoint = { x: 2110, y: 330 };
    const add = item => {
        if (!item || !canSpawnEnemyAt(item.kind, item.x, item.y, enemies)) return;
        if (enemies.length >= 58 && item.kind !== 'wolf' && !item.boss) return;
        if (distance(item, campPoint) < 260) return;
        if (item.kind !== 'golem' && distance(item, ruinsPoint) < 180) return;
        if (enemies.some(enemyItem => distance(enemyItem, item) < enemyItem.radius + item.radius + 110)) return;
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
    add(makeEnemy('golem', 1980, 520, true));
    if (!enemies.some(item => item.kind === 'boar' && item.x < 800 && item.y > 1050)) {
        add(makeEnemy('boar', 560, 1260));
    }
    createWolfPacks().forEach(add);
    return enemies;
}

function chooseInitialSpawnKind(terrainKind, x, y, n) {
    const danger = dangerLevelAt(x, y);
    if (danger < 0.08) return '';
    if ((terrainKind === 'grass' || terrainKind === 'shore') && n > 0.82) return danger > 0.34 && n > 0.91 ? 'bat' : 'slime';
    if ((terrainKind === 'swamp' || terrainKind === 'mud' || terrainKind === 'shore') && n > 0.62) return 'frog';
    if (terrainKind === 'dry' && n > 0.62) return 'scorpion';
    if ((terrainKind === 'forest' || terrainKind === 'bamboo') && n > 0.7) return danger > 0.45 && n > 0.88 ? 'wolf' : 'boar';
    if (terrainKind === 'tallgrass' && n > 0.68) return 'wolf';
    if ((terrainKind === 'mine' || terrainKind === 'ruins') && n > 0.8) return n > 0.9 ? 'golem' : 'bat';
    return '';
}

function dangerLevelAt(x, y) {
    return clamp((distance({ x, y }, CAMP_POSITION) - 420) / 2200, 0, 1);
}

function canSpawnEnemyAt(kind, x, y, existing = state?.enemies || []) {
    const terrain = terrainInfoAt(x, y);
    if (terrain.kind === 'water' && kind !== 'bat') return false;
    if (distance({ x, y }, CAMP_POSITION) < 360 && kind !== 'slime') return false;
    if (distance({ x, y }, CAMP_POSITION) < 260) return false;
    if (isPoorSwimmer(kind) && isNearWater(x, y, 72)) return false;
    if (kind === 'scorpion' && (terrain.kind !== 'dry' || isNearWater(x, y, 180))) return false;
    if (kind === 'frog' && !['swamp', 'mud', 'shore'].includes(terrain.kind)) return false;
    if (kind === 'boar' && !['forest', 'bamboo', 'grass', 'shore'].includes(terrain.kind)) return false;
    if (kind === 'wolf' && !['tallgrass', 'forest', 'bamboo', 'grass'].includes(terrain.kind)) return false;
    if (kind === 'bat' && !['mine', 'ruins', 'forest', 'shore', 'grass'].includes(terrain.kind)) return false;
    const localSame = existing.filter(enemyItem => enemyItem.hp > 0 && enemyItem.kind === kind && distance(enemyItem, { x, y }) < 520).length;
    const speciesCap = kind === 'wolf' ? 4 : (kind === 'scorpion' ? 5 : 6);
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

function createSpawnDens() {
    const dens = [];
    const caps = { frog: 8, scorpion: 8, bat: 7, wolf: 5, slime: 6 };
    const counts = { frog: 0, scorpion: 0, bat: 0, wolf: 0, slime: 0 };
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
            else if ((terrain === 'mine' || terrain === 'ruins') && n > 0.58) add('bat', px, py);
            else if ((terrain === 'tallgrass' || terrain === 'forest') && n > 0.72) add('wolf', px, py);
            else if ((terrain === 'grass' || terrain === 'shore') && n > 0.78) add('slime', px, py);
        }
    }
    return dens;
}

function canDenExistAt(kind, x, y) {
    if (distance({ x, y }, CAMP_POSITION) < 520) return false;
    const terrain = terrainInfoAt(x, y).kind;
    if (terrain === 'water') return false;
    if (kind === 'frog') return ['swamp', 'mud', 'shore'].includes(terrain);
    if (kind === 'scorpion') return terrain === 'dry' && !isNearWater(x, y, 180);
    if (kind === 'bat') return terrain === 'mine' || terrain === 'ruins';
    if (kind === 'wolf') return terrain === 'tallgrass' || terrain === 'forest';
    if (kind === 'slime') return terrain === 'grass' || terrain === 'shore';
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
        updatePlayer(dt, now);
        updateHarvestHold(dt);
        updateBambooTraps(now);
        updateEnemies(dt, now);
        updateDynamicSpawns(now);
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
    updatePoison(dt, now);
    updatePotionEffects(now);
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

    if (dx || dy) {
        const dir = normalize(dx, dy);
        const sprinting = keys.has('Shift') && p.stamina > 0;
        const terrain = terrainInfoAt(p.x, p.y);
        const inWater = terrain.kind === 'water';
        const inMud = terrain.kind === 'mud';
        const inBamboo = terrain.kind === 'bamboo';
        const boost = performance.now() < p.speedBoostUntil ? 1.32 : 1;
        p.blocking = isBlocking();
        const blockSlow = p.blocking ? 0.62 : 1;
        const armorMudSlow = inMud && (state.equipment.armor === '铁甲' || state.equipment.armor === '魔晶甲') ? 0.76 : 1;
        const speed = p.speed * boost * blockSlow * (sprinting ? 1.55 : 1) * (inWater ? 0.58 : 1) * (inMud ? 0.58 : 1) * (inBamboo ? 0.9 : 1) * armorMudSlow;
        p.facing = dir;
        moveCircle(p, dir.x * speed * dt, dir.y * speed * dt);
        if (inWater) {
            const current = waterCurrentAt(p.x, p.y);
            moveCircle(p, current.x * dt, current.y * dt);
            spawnWaterRipple(p.x, p.y + 12);
        }
        const sprintCost = inMud ? -56 : -38;
        p.stamina = clamp(p.stamina + (sprinting ? sprintCost : 24) * dt, 0, 100);
    } else {
        p.blocking = isBlocking();
        if (terrainInfoAt(p.x, p.y).kind === 'water') {
            const current = waterCurrentAt(p.x, p.y);
            moveCircle(p, current.x * 0.55 * dt, current.y * 0.55 * dt);
            spawnWaterRipple(p.x, p.y + 12);
        }
        p.stamina = clamp(p.stamina + 30 * dt, 0, 100);
    }

    p.attackDir = currentAimDir();
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
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

function collides(entity) {
    for (const r of state.resources) {
        if (!isSolidResource(r)) continue;
        if (r.hp > 0 && distance(entity, r) < entity.radius + r.radius * (r.kind === 'tree' ? 0.42 : (r.kind === 'bamboo' ? 0.34 : 0.72))) return true;
    }
    for (const fence of state.placedFences) {
        if (distance(entity, fence) < entity.radius + fence.radius) return true;
    }
    for (const station of state.placedStations) {
        if (distance(entity, station) < entity.radius + station.radius * 0.75) return true;
    }
    if (distance(entity, state.ruins) < entity.radius + state.ruins.radius && !state.ruins.opened) return true;
    return false;
}

function isSolidResource(item) {
    return item.kind === 'tree' || item.kind === 'rock' || item.kind === 'ore' || item.kind === 'bamboo';
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
            if (distance(e, { x: e.spawnX, y: e.spawnY }) > 20) {
                const home = normalize(e.spawnX - e.x, e.spawnY - e.y);
                moveEnemy(e, home.x * e.speed * 0.55 * dt, home.y * e.speed * 0.55 * dt);
            }
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
        if (dist < e.radius + p.radius + 4 && e.contactCooldown <= 0) {
            applyEnemyDamage(e, Math.max(1, e.attack - 1), '碰撞');
            e.contactCooldown = e.kind === 'boar' ? 0.7 : 0.9;
        }
        if (e.strikeAt && now >= e.strikeAt) {
            resolveEnemyAttack(e, now);
        }

        const aggroRange = 330 + nightAmount() * (e.kind === 'bat' ? 190 : 90) + (ambushing ? 120 : 0) + (frogInMud ? 70 : 0);
        const nightSpeed = 1 + nightAmount() * (e.kind === 'bat' ? 0.35 : 0.16);
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

function updateDynamicSpawns(now) {
    if (state.win || state.lose || now < state.nextDynamicSpawnAt) return;
    state.nextDynamicSpawnAt = now + (nightAmount() > 0.2 ? 1800 : 2800);
    const alive = state.enemies.filter(enemyItem => enemyItem.hp > 0);
    if (alive.length >= MAX_ENEMIES) return;
    const nearby = alive.filter(enemyItem => distance(enemyItem, state.player) < 850);
    if (nearby.length >= MAX_NEARBY_ENEMIES) return;

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
        den.nextSpawnAt = now + (nightAmount() > 0.2 ? 14000 : 24000);
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
    for (let i = 0; i < 10; i++) {
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
    if (terrain === 'mud' || terrain === 'swamp' || terrain === 'shore') return n > 0.35 ? 'frog' : 'slime';
    if (terrain === 'dry') return night > 0.15 || n > 0.45 ? 'scorpion' : '';
    if (terrain === 'mine' || terrain === 'ruins') return night > 0.08 || n > 0.52 ? 'bat' : (danger > 0.55 && n > 0.78 ? 'golem' : '');
    if (terrain === 'tallgrass') return night > 0.12 || n > 0.4 ? 'wolf' : 'slime';
    if (terrain === 'forest' || terrain === 'bamboo') return night > 0.2 && n > 0.35 ? 'wolf' : (n > 0.55 ? 'boar' : '');
    if (terrain === 'grass') return night > 0.25 && n > 0.68 ? 'bat' : (n > 0.45 ? 'slime' : '');
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
    } else {
        e.windupUntil = now + (e.boss ? 760 : 620);
        e.strikeAt = now + (e.boss ? 560 : 450);
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
    } else {
        const slamRadius = e.boss ? 112 : 86;
        state.cameraShake = Math.max(state.cameraShake, e.boss ? 16 : 10);
        spawnBurst(e.x, e.y, '#b77dff', e.boss ? 28 : 18, 180, slamRadius * 0.42);
        if (distance(e, p) < slamRadius) applyEnemyDamage(e, e.attack, '震地');
        e.attackCooldown = e.boss ? 1.5 : 1.8;
    }
    e.strikeAt = 0;
    e.windupUntil = 0;
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
        : (state.equipment.armor === '铁甲' ? 0.32
            : (state.equipment.armor === '皮甲' ? 0.18 : 0));
    return Math.min(0.62, base + boost);
}

function passiveShieldReduction() {
    if (state.equipment.shield === '铁盾') return 0.12;
    if (state.equipment.shield === '木盾') return 0.08;
    return 0;
}

function poisonPlayer(now, duration) {
    const p = state.player;
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
    const terrain = terrainInfoAt(e.x, e.y);
    if (e.kind !== 'bat' && terrain.kind === 'water') {
        const current = waterCurrentAt(e.x, e.y);
        dx = dx * 0.45 + (current.x / 60) * 1.6;
        dy = dy * 0.45 + (current.y / 60) * 1.6;
        if (Math.random() < 0.25) spawnWaterRipple(e.x, e.y + e.radius * 0.5);
    } else if (terrain.kind === 'mud' && e.kind !== 'frog' && e.kind !== 'bat') {
        dx *= 0.62;
        dy *= 0.62;
    } else if (terrain.kind === 'bamboo' && e.kind !== 'bat') {
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
    e.x = clamp(e.x + dx, e.radius, WORLD.width - e.radius);
    e.y = clamp(e.y + dy, e.radius, WORLD.height - e.radius);
}

function updateCamera() {
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
    const target = nearestInteractable();
    if (!target) {
        showToast('靠近树、石头、草丛、矿石、营地或废墟门后再按 E。');
        return;
    }

    if (target.type === 'resource') beginHarvest(target.item);
    if (target.type === 'camp') useCamp();
    if (target.type === 'ruins') openRuins();
}

function nearestInteractable() {
    const p = state.player;
    const resources = state.resources
        .filter(item => item.hp > 0 && distance(p, item) <= p.radius + item.radius + 24)
        .map(item => ({ type: 'resource', item, d: distance(p, item) }));
    const specials = [];
    if (distance(p, state.camp) <= state.camp.radius + 28) specials.push({ type: 'camp', item: state.camp, d: distance(p, state.camp) });
    if (distance(p, state.ruins) <= state.ruins.radius + 34) specials.push({ type: 'ruins', item: state.ruins, d: distance(p, state.ruins) });
    return [...resources, ...specials].sort((a, b) => a.d - b.d)[0] || null;
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
    if (!keys.has('e')) {
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
        state.inventory[node.gives] += amount;
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
    return ({ wood: 4, bamboo: 4, stone: 4, fiber: 3, berry: 3, herb: 2, mushroom: 2, flower: 2, lotus: 2, cactusFruit: 2, mud: 3, ore: 4, coal: 3 }[node.gives] || 1);
}

function harvestBlockReason(node) {
    if (node.gives === 'ore' && state.equipment.tool !== '石镐') return '铁矿太硬，需要先合成石镐。';
    if (node.kind === 'tree' && state.equipment.tool === '徒手') return '徒手砍不动整棵树，先收集木头和石头合成石斧。';
    return '';
}

function harvestPower(node) {
    if (node.kind === 'grass' || node.kind === 'tallGrass' || node.kind === 'reed' || node.kind === 'berry' || node.kind === 'herb' || node.kind === 'mushroom' || node.kind === 'flower' || node.kind === 'mudClump') return 2.2;
    if (node.kind === 'bamboo') return 1.35 + state.equipment.woodPower * 0.55;
    if (node.kind === 'stump') return 0.9 + state.equipment.woodPower * 0.45;
    if (node.gives === 'wood') return state.equipment.woodPower * 0.95;
    if (node.gives === 'stone') return state.equipment.stonePower * 0.9;
    if (node.gives === 'ore') return state.equipment.orePower * 0.8;
    return 1;
}

function harvestParticleColor(node) {
    if (node.gives === 'wood' || node.gives === 'bamboo' || node.gives === 'fiber') return '#8bd76e';
    if (node.gives === 'ore') return '#94e3ff';
    if (node.gives === 'mud') return '#6d5438';
    return '#d7d7d7';
}

function useCamp() {
    if (!state.camp.repaired) {
        if (state.inventory.wood >= 8 && state.inventory.stone >= 4) {
            state.inventory.wood -= 8;
            state.inventory.stone -= 4;
            state.camp.repaired = true;
            state.quest = 'craft-tools';
            showToast('篝火修好了！现在合成石镐和武器，去矿区找铁矿。');
        } else {
            showToast('修复篝火需要 木头 8 + 石头 4。');
        }
    } else {
        state.player.hp = state.player.maxHp;
        showToast('在篝火旁休息，生命已恢复。');
    }
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
    p.attackCooldown = weaponCooldown();
    p.attackUntil = now + 160;
    const attackDir = currentAimDir();
    p.attackDir = attackDir;
    p.facing = attackDir;
    const strike = { x: p.x + attackDir.x * p.radius, y: p.y + attackDir.y * p.radius };
    const hits = [];
    for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        const toEnemy = normalize(e.x - p.x, e.y - p.y);
        const facingDot = toEnemy.x * attackDir.x + toEnemy.y * attackDir.y;
        const dist = distance(strike, e);
        if (dist <= state.equipment.range + e.radius && facingDot > weaponArcDot()) {
            hits.push({ enemy: e, dist });
        }
    }
    spawnArcParticles(p.x, p.y, attackDir);
    if (!hits.length) {
        addFloatText('挥空', p.x + attackDir.x * 50, p.y + attackDir.y * 50, '#d8e5f2');
        renderHud();
        return;
    }

    hits.sort((a, b) => a.dist - b.dist);
    const maxHits = state.equipment.weapon === '铁剑' ? 2 : 1;
    for (const { enemy: hit } of hits.slice(0, maxHits)) {
        damageEnemy(hit, now);
    }
    renderHud();
}

function damageEnemy(hit, now) {
    hit.hp -= state.equipment.attack;
    hit.hurtUntil = now + 160;
    hit.attackCooldown = Math.max(hit.attackCooldown, 0.24);
    hit.windupUntil = 0;
    hit.strikeAt = 0;
    const dir = state.player.attackDir || state.player.facing;
    hit.knockX += dir.x * (hit.boss ? 130 : 240);
    hit.knockY += dir.y * (hit.boss ? 130 : 240);
    state.cameraShake = Math.max(state.cameraShake, hit.boss ? 12 : 7);
    spawnBurst(hit.x, hit.y, hit.boss ? '#b77dff' : '#ffd166', 14, 220, hit.radius * 0.75);
    addFloatText(`-${state.equipment.attack}`, hit.x, hit.y - 36, '#fff3b0');
    if (state.equipment.weapon === '毒牙匕首' && hit.kind !== 'golem') {
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
        showToast(`${hit.name} 受伤，剩余 ${Math.ceil(Math.max(0, hit.hp))}/${hit.maxHp}`);
    }
}

function grantEnemyDrops(hit) {
    const entries = typeof hit.drop === 'string' ? [[hit.drop, hit.dropAmount]] : Object.entries(hit.drop);
    const received = [];
    for (const [key, amount] of entries) {
        const bonus = hit.boss ? 0 : (Math.random() < 0.28 ? 1 : 0);
        const finalAmount = amount + bonus;
        state.inventory[key] = (state.inventory[key] || 0) + finalAmount;
        received.push(`${RESOURCE_LABELS[key]} x${finalAmount}`);
    }
    return {
        floatText: `+${received[0]}${received.length > 1 ? '…' : ''}`,
        toastText: received.join('、'),
    };
}

function weaponCooldown() {
    if (state.equipment.weapon === '铁剑') return 0.42;
    if (state.equipment.weapon === '竹矛') return 0.54;
    if (state.equipment.weapon === '石矛') return 0.48;
    return 0.34;
}

function weaponStaminaCost() {
    if (state.equipment.weapon === '铁剑') return 18;
    if (state.equipment.weapon === '竹矛') return 13;
    if (state.equipment.weapon === '石矛') return 14;
    return 10;
}

function weaponArcDot() {
    if (state.equipment.weapon === '铁剑') return 0.08;
    if (state.equipment.weapon === '竹矛') return 0.34;
    if (state.equipment.weapon === '石矛') return 0.28;
    return 0.18;
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

function addFloatText(text, x, y, color) {
    state.floatTexts.push({ text, x, y, color, life: 0.85 });
}

function addParticle(particle) {
    state.particles.push(particle);
    if (state.particles.length > MAX_PARTICLES) {
        state.particles.splice(0, state.particles.length - MAX_PARTICLES);
    }
}

function canCraft(item) {
    if (item.owned(state)) return false;
    if (requiresCamp(item) && !isNearCamp()) return false;
    if (!hasRequiredStation(item)) return false;
    return Object.entries(item.cost).every(([key, amount]) => state.inventory[key] >= amount);
}

function requiresCamp(item) {
    return ['ironArmor', 'crystalBlade', 'key', 'coalBomb', 'campCharm', 'snare', 'ironShield'].includes(item.id);
}

function stationRequirement(item) {
    if (['potion', 'salve', 'antidote', 'speedPotion', 'regenPotion', 'ironSkinPotion'].includes(item.id)) return 'potionTable';
    if (['potionTable', 'forge', 'bedroll', 'snare', 'bambooFence', 'bambooTrap', 'coalBomb', 'campFlag'].includes(item.id)) return 'workbench';
    if (['sword', 'ironArmor', 'ironShield', 'crystalBlade', 'crystalArmor', 'venomDagger', 'key'].includes(item.id)) return 'forge';
    return '';
}

function hasRequiredStation(item) {
    const station = stationRequirement(item);
    return !station || isNearStation(station);
}

function isNearStation(kind) {
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
            state.equipment.woodPower = 2;
            showToast('已装备石斧。');
            break;
        case 'stonePickaxe':
            state.equipment.tool = '石镐';
            state.equipment.stonePower = 2;
            state.equipment.orePower = 2;
            showToast('已装备石镐。');
            break;
        case 'stoneSpear':
            equipWeapon('石矛', 4, 88, '已装备石矛。');
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
        case 'leatherArmor':
            equipArmor('皮甲', 1, '已装备皮甲。');
            break;
        case 'ironArmor':
            equipArmor('铁甲', 2, '已装备铁甲。');
            break;
        case 'crystalArmor':
            equipArmor('魔晶甲', 3, '已装备魔晶甲。');
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
        case 'torch':
            if (state.equipment.utility !== '火把') {
                state.equipment.utility = '火把';
                showToast('已手持火把，夜晚视野扩大。再次使用可放置。');
            } else {
                state.placedTorches.push({ x: p.x + p.facing.x * 34, y: p.y + p.facing.y * 34 });
                state.inventory.torch -= 1;
                if (state.inventory.torch <= 0) state.equipment.utility = '无';
                showToast('已放置火把。');
            }
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
            placeStation(key);
            break;
        case 'campFlag':
            state.player.x = state.camp.x + 85;
            state.player.y = state.camp.y + 42;
            showToast('营地旗帜指引你回到营地。');
            break;
        case 'potion':
            p.hp = Math.min(p.maxHp, p.hp + 35);
            state.inventory.potion -= 1;
            showToast('使用治疗药水，恢复 35 生命。');
            break;
        case 'stew':
            p.hp = Math.min(p.maxHp, p.hp + 25);
            state.inventory.stew -= 1;
            showToast('喝下蘑菇汤，恢复 25 生命。');
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
            p.hp = Math.min(p.maxHp, p.hp + 40);
            state.inventory.roastMeat -= 1;
            showToast('吃下烤肉，恢复 40 生命。');
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
    showToast(message);
}

function equipArmor(name, defense, message) {
    state.equipment.armor = name;
    state.equipment.defense = defense + shieldDefense();
    showToast(message);
}

function equipShield(name, defense, message) {
    state.equipment.shield = name;
    state.equipment.defense = armorDefense() + defense;
    showToast(message);
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
    const p = state.player;
    state.inventory.coalBomb -= 1;
    let hitCount = 0;
    for (const enemy of state.enemies) {
        if (enemy.hp <= 0 || distance(enemy, p) > 150) continue;
        enemy.hp -= 8;
        enemy.hurtUntil = performance.now() + 220;
        enemy.knockX += normalize(enemy.x - p.x, enemy.y - p.y).x * 260;
        enemy.knockY += normalize(enemy.x - p.x, enemy.y - p.y).y * 260;
        hitCount++;
    }
    state.cameraShake = Math.max(state.cameraShake, 16);
    spawnBurst(p.x, p.y, '#ff9f1c', 48, 300, 120);
    showToast(hitCount ? `煤火弹击中了 ${hitCount} 个敌人。` : '煤火弹爆炸，但没有击中敌人。');
    renderHud();
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

function placeBambooFence() {
    const p = state.player;
    const pos = placementPosition(38);
    const fence = { x: pos.x, y: pos.y, radius: 18 };
    if (terrainInfoAt(pos.x, pos.y).kind === 'water' || collides(fence)) {
        showToast('这里不能放置竹栅栏。');
        return;
    }
    state.inventory.bambooFence -= 1;
    state.placedFences.push(fence);
    spawnBurst(pos.x, pos.y, '#d7f28a', 10, 80, 14);
    showToast('已放置竹栅栏，可阻挡小怪。');
    renderHud();
}

function placeBambooTrap() {
    const pos = placementPosition(42);
    if (terrainInfoAt(pos.x, pos.y).kind === 'water') {
        showToast('竹刺陷阱不能放在深水里。');
        return;
    }
    state.inventory.bambooTrap -= 1;
    state.bambooTraps.push({ x: pos.x, y: pos.y, radius: 24, used: false });
    spawnBurst(pos.x, pos.y, '#d7f28a', 10, 90, 16);
    showToast('已布置竹刺陷阱，怪物踩中会受伤并被定住。');
    renderHud();
}

function placeStation(kind) {
    const pos = stationPlacementPosition(kind);
    if (!pos) {
        showToast('附近没有足够空间放置工作设施。');
        return;
    }
    const station = { kind, x: pos.x, y: pos.y, radius: kind === 'forge' ? 28 : 24 };
    state.inventory[kind] -= 1;
    state.placedStations.push(station);
    spawnBurst(pos.x, pos.y, kind === 'forge' ? '#ff9f1c' : '#ffd166', 14, 90, 18);
    showToast(`已放置${RESOURCE_LABELS[kind]}。靠近它可解锁相关合成。`);
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

function placementPosition(distanceAhead) {
    const p = state.player;
    return {
        x: clamp(p.x + p.facing.x * distanceAhead, 24, WORLD.width - 24),
        y: clamp(p.y + p.facing.y * distanceAhead, 24, WORLD.height - 24),
    };
}

function updateQuest() {
    if (state.win || state.lose) return;
    if (state.quest === 'collect-basic' && state.inventory.wood >= 8 && state.inventory.stone >= 4) state.quest = 'repair-camp';
    if (state.quest === 'craft-tools' && state.equipment.tool === '石镐') state.quest = 'mine-ore';
    if (state.quest === 'mine-ore' && state.inventory.ore >= 6) state.quest = 'craft-weapon';
    if (state.quest === 'craft-weapon' && state.equipment.weapon === '铁剑') state.quest = 'defeat-golem';
    if (state.quest === 'defeat-golem' && state.inventory.crystal >= 3) state.quest = 'craft-key';
}

function questText() {
    return {
        'collect-basic': '采集木头和石头，准备修复营地篝火。',
        'repair-camp': '回到营地，按 E 修复篝火。',
        'craft-tools': '合成石斧/石镐，向矿区推进。',
        'mine-ore': '去右下矿区采铁矿。',
        'craft-weapon': '合成铁剑，准备挑战守门石像。',
        'defeat-golem': '击败废墟附近的守门石像，获得魔晶。',
        'craft-key': '合成废墟钥匙。',
        'open-ruins': '前往右上角废墟门，按 E 开门。',
    }[state.quest] || '探索荒野。';
}

function renderHud() {
    document.getElementById('hp-label').textContent = `${Math.ceil(state.player.hp)}/${state.player.maxHp}`;
    document.getElementById('hp-bar').style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
    document.getElementById('attack-label').textContent = state.equipment.attack;
    document.getElementById('tool-label').textContent = state.equipment.tool;
    document.getElementById('armor-label').textContent = state.equipment.shield === '无' ? state.equipment.armor : `${state.equipment.armor}+${state.equipment.shield}`;
    document.getElementById('time-label').textContent = nightAmount() > 0.2 ? '黑夜' : '白天';

    const inventory = document.getElementById('inventory');
    inventory.innerHTML = '';
    Object.entries(RESOURCE_LABELS).forEach(([key, label]) => {
        if (!state.inventory[key]) return;
        const row = document.createElement(canUseInventoryItem(key) ? 'button' : 'div');
        row.className = 'inventory-row';
        if (row.tagName === 'BUTTON') row.type = 'button';
        row.classList.toggle('usable', canUseInventoryItem(key));
        row.classList.add('draggable');
        row.dataset.itemKey = key;
        row.appendChild(createPixelIconElement(key, 'inventory-icon'));
        const name = document.createElement('span');
        name.className = 'inventory-name';
        name.textContent = label;
        row.appendChild(name);
        const count = document.createElement('strong');
        count.textContent = state.inventory[key] || 0;
        row.appendChild(count);
        row.draggable = true;
        row.addEventListener('dragstart', event => {
            state.draggedInventoryItem = key;
            event.dataTransfer.setData('text/plain', key);
            event.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
            state.draggedInventoryItem = null;
        });
        if (canUseInventoryItem(key)) row.addEventListener('click', () => useInventoryItem(key));
        inventory.appendChild(row);
    });
    if (!inventory.children.length) {
        const empty = document.createElement('div');
        empty.className = 'inventory-empty';
        empty.textContent = '暂未获得物品';
        inventory.appendChild(empty);
    }

    renderHotbarDropZone();

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

function recipeStatusText(item, disabled) {
    if (item.owned(state)) return '已拥有';
    if (requiresCamp(item) && !isNearCamp()) return '需在营地';
    const stationText = stationRequirementText(item);
    if (stationText) return stationText;
    return disabled ? '材料不足' : '可合成';
}

function recipeStationVisible(item) {
    return !stationRequirement(item) || hasRequiredStation(item);
}

function renderHotbarDropZone() {
    let zone = document.getElementById('hotbar-drop-zone');
    if (!zone) return;
    zone.innerHTML = '';
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
        const number = document.createElement('small');
        number.textContent = String(index + 1);
        slot.appendChild(number);
        if (key) {
            slot.appendChild(createPixelIconElement(key, 'hotbar-drop-icon'));
            const label = document.createElement('span');
            label.textContent = RESOURCE_LABELS[key] || key;
            slot.appendChild(label);
        }
        zone.appendChild(slot);
    });
}

function assignHotbarItem(index, itemKey) {
    if (!itemKey || (state.inventory[itemKey] || 0) <= 0) {
        showToast('只能把背包里已有的物品放到快捷栏。');
        return;
    }
    state.hotbarItems = state.hotbarItems.map((key, slotIndex) => key === itemKey && slotIndex !== index ? null : key);
    state.hotbarItems[index] = itemKey;
    state.selectedHotbar = index;
    state.draggedInventoryItem = null;
    showToast(`${RESOURCE_LABELS[itemKey]} 已放到快捷栏 ${index + 1}。`);
    renderHud();
}

function createPixelIconElement(key, className = 'pixel-icon') {
    const icon = document.createElement('span');
    icon.className = `pixel-icon ${className}`;
    icon.setAttribute('aria-hidden', 'true');
    const colors = itemIconColors(key);
    pixelIconRects(key).forEach(rect => {
        const cell = document.createElement('span');
        cell.style.left = `${rect[0] * 25}%`;
        cell.style.top = `${rect[1] * 25}%`;
        cell.style.width = `${rect[2] * 25}%`;
        cell.style.height = `${rect[3] * 25}%`;
        cell.style.background = colors[rect[4] || 0];
        icon.appendChild(cell);
    });
    return icon;
}

function pixelIconHtml(key) {
    const colors = itemIconColors(key);
    const pixels = pixelIconRects(key)
        .map(rect => `<i style="left:${rect[0] * 25}%;top:${rect[1] * 25}%;width:${rect[2] * 25}%;height:${rect[3] * 25}%;background:${colors[rect[4] || 0]}"></i>`)
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
        resetHarvestHold();
    }
    renderHud();
}

function canUseInventoryItem(key) {
    return ['stoneAxe', 'stonePickaxe', 'stoneSpear', 'bambooSpear', 'ironSword', 'crystalBlade', 'venomDagger', 'leatherArmor', 'ironArmor', 'crystalArmor', 'woodShield', 'ironShield', 'coalBomb', 'torch', 'bedroll', 'campCharm', 'snare', 'bambooFence', 'bambooTrap', 'potionTable', 'workbench', 'forge', 'campFlag', 'potion', 'stew', 'salve', 'antidote', 'speedPotion', 'regenPotion', 'ironSkinPotion', 'roastMeat'].includes(key) && (state.inventory[key] || 0) > 0;
}

function recipeHasKnownMaterial(recipe) {
    return Object.keys(recipe.cost).some(key => (state.inventory[key] || 0) > 0);
}

function itemIconColors(key) {
    return PIXEL_ICON_PALETTES[ITEM_ICON_TYPES[key] || key] || PIXEL_ICON_PALETTES.default;
}

function pixelIconRects(key) {
    const type = ITEM_ICON_TYPES[key] || key;
    if (['sword', 'blade', 'dagger'].includes(type)) return [[1, 0, 1, 1, 2], [2, 0, 1, 1, 1], [1, 1, 1, 1, 1], [1, 2, 1, 1, 1], [0, 3, 2, 1, 0]];
    if (['spear'].includes(type)) return [[2, 0, 1, 1, 2], [2, 1, 1, 1, 1], [1, 2, 1, 1, 0], [1, 3, 1, 1, 0]];
    if (['axe', 'pickaxe'].includes(type)) return [[1, 0, 1, 4, 0], [2, 0, 2, 1, 1], [2, 1, 1, 1, 2], [0, 3, 1, 1, 0]];
    if (['armor', 'shield'].includes(type)) return [[1, 0, 2, 1, 1], [0, 1, 4, 2, 0], [1, 3, 2, 1, 2]];
    if (['potion', 'salve', 'antidote', 'speed'].includes(type)) return [[1, 0, 2, 1, 2], [1, 1, 2, 1, 0], [0, 2, 4, 2, 1]];
    if (['torch'].includes(type)) return [[1, 0, 2, 1, 2], [1, 1, 2, 1, 1], [2, 2, 1, 2, 0]];
    if (['bomb'].includes(type)) return [[1, 0, 2, 1, 2], [0, 1, 4, 3, 0], [2, 1, 1, 1, 1]];
    if (['key'].includes(type)) return [[0, 1, 2, 2, 1], [2, 2, 2, 1, 1], [3, 3, 1, 1, 2]];
    if (['meat', 'hide', 'bedroll'].includes(type)) return [[0, 1, 3, 2, 0], [1, 0, 2, 1, 1], [2, 2, 2, 1, 2]];
    if (['fang'].includes(type)) return [[1, 0, 2, 1, 2], [1, 1, 2, 1, 1], [2, 2, 1, 2, 1]];
    if (['fence', 'trap'].includes(type)) return [[0, 1, 4, 1, 1], [0, 3, 4, 1, 1], [1, 0, 1, 4, 0], [3, 0, 1, 4, 0]];
    if (['flag'].includes(type)) return [[1, 0, 1, 4, 0], [2, 0, 2, 2, 1], [2, 2, 1, 1, 2]];
    if (['wood', 'bamboo', 'stone', 'ore', 'coal', 'crystal', 'mud'].includes(type)) return [[0, 1, 4, 2, 0], [1, 0, 2, 1, 1], [2, 2, 2, 1, 2]];
    return [[1, 0, 2, 1, 2], [0, 1, 4, 2, 1], [1, 3, 2, 1, 0]];
}

function drawPixelItemIcon(target, key, x, y, size = 28) {
    const colors = itemIconColors(key);
    const unit = size / 4;
    target.save();
    target.imageSmoothingEnabled = false;
    target.fillStyle = 'rgba(0, 0, 0, 0.32)';
    target.fillRect(x - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4);
    for (const rect of pixelIconRects(key)) {
        target.fillStyle = colors[rect[4] || 0];
        target.fillRect(x - size / 2 + rect[0] * unit, y - size / 2 + rect[1] * unit, rect[2] * unit, rect[3] * unit);
    }
    target.restore();
}

function render(now) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
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
    const camp = naturalRegionWeight(x, y, CAMP_POSITION.x, CAMP_POSITION.y, 520, 15.5);
    if (camp > 0.46) {
        const campNoise = valueNoise(x * 0.006, y * 0.006);
        return { kind: 'camp', color: mixMany([['#6f5532', camp], ['#3e7f47', Math.max(0, 1 - camp)]], campNoise) };
    }

    const river = riverDistance(x, y);
    const lake = lakeDistance(x, y);
    const water = Math.min(river - 68, lake);
    if (water < 0) return { kind: 'water', color: blendColor('#1f5f92', '#2f8fc7', clamp((-water) / 84, 0, 1)) };
    if (water < 54) return { kind: 'shore', color: blendColor('#6f8750', '#3d8146', water / 54) };

    const climate = climateAt(x, y);
    const mine = Math.max(
        climate.rock * 0.56 + climate.height * 0.24,
        naturalRegionWeight(x, y, 5200, 3420, 1060, 2.0),
        naturalRegionWeight(x, y, 5100, 1120, 980, 2.9),
        naturalRegionWeight(x, y, 2600, 1700, 820, 1.1)
    );
    const ruins = Math.max(naturalRegionWeight(x, y, 2060, 360, 620, 4.3), naturalRegionWeight(x, y, 5600, 780, 620, 5.1));
    const swamp = Math.max(
        climate.moisture * 0.55 + (1 - climate.height) * 0.32 + naturalRegionWeight(x, y, 1180, 3580, 1120, 7.0) * 0.55,
        naturalRegionWeight(x, y, 3420, 2880, 1020, 6.2)
    );
    const dry = Math.max(
        (1 - climate.moisture) * 0.64 + climate.temperature * 0.28 + naturalRegionWeight(x, y, 5850, 3300, 1100, 9.3) * 0.42,
        naturalRegionWeight(x, y, 5680, 1360, 980, 8.4)
    );
    const forest = Math.max(
        climate.moisture * 0.48 + (1 - Math.abs(climate.temperature - 0.48)) * 0.24 + naturalRegionWeight(x, y, 820, 1120, 1260, 10.2) * 0.5,
        naturalRegionWeight(x, y, 4300, 980, 1040, 13.3),
        naturalRegionWeight(x, y, 4100, 3150, 900, 14.6)
    );
    const waterEdge = clamp(1 - water / 230, 0, 1);
    const noise = valueNoise(x * 0.006, y * 0.006);

    if (ruins + shapeNoise * 0.04 > 0.54) return { kind: 'ruins', color: mixMany([['#38414d', ruins], ['#4f5964', 0.32], ['#2f6b3d', Math.max(0, 1 - ruins)]], noise) };
    if (mine + shapeNoise * 0.05 > 0.58) return { kind: 'mine', color: mixMany([['#58636e', mine], ['#6a604f', 0.2], ['#376d3f', Math.max(0, 1 - mine)]], noise) };
    if (swamp + waterEdge * 0.24 + shapeNoise * 0.06 > 0.68) {
        if (waterEdge > 0.42 && climate.moisture > 0.54) return { kind: 'mud', color: mixMany([['#263f34', swamp], ['#4b3b28', 0.38], ['#2f6d57', 0.24]], noise) };
        return { kind: 'swamp', color: mixMany([['#214b3d', swamp], ['#2f6d57', 0.25], ['#2f6b3d', Math.max(0, 1 - swamp)]], noise) };
    }
    if (dry + shapeNoise * 0.05 > 0.62) return { kind: 'dry', color: mixMany([['#a47a3c', dry], ['#735536', 0.24], ['#3f8f4f', Math.max(0, 1 - dry)]], noise) };
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

function riverCenterY(x) {
    return 735 + Math.sin(x * 0.0045) * 90 + Math.sin(x * 0.0018 + 1.7) * 68;
}

function riverDistance(x, y) {
    const mainRiver = Math.abs(y - riverCenterY(x)) * 0.82;
    const easternBranch = Math.abs(y - (1120 + Math.sin(x * 0.003 + 2.1) * 78 + Math.sin(x * 0.008) * 28))
        + rangePenalty(x, 2200, 5200) * 1.8;
    const northCreek = Math.abs(y - (430 + Math.sin(x * 0.005 + 0.8) * 52))
        + rangePenalty(x, 2800, 6200) * 2.2;
    const southRiver = Math.abs(y - (3160 + Math.sin(x * 0.0028 + 1.4) * 105))
        + rangePenalty(x, 3600, WORLD.width) * 1.5;
    const verticalStream = Math.abs(x - (3840 + Math.sin(y * 0.004) * 95))
        + rangePenalty(y, 980, 3520) * 1.6;
    const deltaBranch = Math.abs(y - (2580 + Math.sin(x * 0.0026 + 3.2) * 120))
        + rangePenalty(x, 700, 3950) * 1.15;
    return Math.min(mainRiver, easternBranch, northCreek, southRiver, verticalStream, deltaBranch);
}

function lakeDistance(x, y) {
    return Math.min(
        lakeEdgeDistance(x, y, 1120, 3500, 520, 340, 1.6),
        lakeEdgeDistance(x, y, 1060, 1120, 360, 250, 2.4),
        lakeEdgeDistance(x, y, 3560, 2820, 440, 300, 3.1),
        lakeEdgeDistance(x, y, 4530, 820, 300, 210, 4.7)
    );
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
        ...(isNearView(state.ruins, 220) ? [{ y: state.ruins.y, draw: () => drawRuins() }] : []),
        ...state.spawnDens.filter(den => isNearView(den, 140)).map(den => ({ y: den.y - 4, draw: () => drawSpawnDen(den) })),
        ...state.bambooTraps.filter(t => isNearView(t, 90)).map(t => ({ y: t.y - 2, draw: () => drawBambooTrap(t) })),
        ...state.placedFences.filter(t => isNearView(t, 120)).map(t => ({ y: t.y + 8, draw: () => drawBambooFence(t) })),
        ...state.placedStations.filter(t => isNearView(t, 140)).map(t => ({ y: t.y + 10, draw: () => drawStation(t) })),
        ...state.placedTorches.filter(t => isNearView(t, 120)).map(t => ({ y: t.y, draw: () => drawPlacedTorch(t) })),
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
    const flyLift = e.kind === 'bat' ? 16 + Math.sin(now / 90) * 6 + Math.sin(swoopProgress * Math.PI) * 18 : 0;
    const chargeLean = e.chargeUntil > now ? 8 : 0;
    const bounce = Math.sin(now / 140) * (e.kind === 'slime' ? 3 : 1.2) - leapLift - flyLift;
    const concealed = e.kind !== 'bat' && tallGrassCoverAt(e);
    const revealed = e.windupUntil || e.hurtUntil || distance(e, state.player) < 54;
    if (concealed && !revealed) ctx.globalAlpha = 0.18;
    drawShadow(x, y + 1, e.radius * (e.kind === 'bat' ? 1.1 : 1.62), e.radius * (e.kind === 'bat' ? 0.25 : 0.42));
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
        drawSpriteGrounded(e.kind, x + e.attackDir.x * chargeLean, y + bounce, 3.2, { tint: '#ffffff' });
        ctx.globalAlpha = 1;
    } else {
        drawSpriteGrounded(e.kind, x + e.attackDir.x * chargeLean, y + bounce, 3.2);
        ctx.globalAlpha = 1;
        if (concealed && !revealed && (e.kind === 'wolf' || e.kind === 'scorpion')) {
            ctx.fillStyle = 'rgba(255, 224, 138, 0.42)';
            ctx.fillRect(x - 5, y - 22, 2, 2);
            ctx.fillRect(x + 4, y - 22, 2, 2);
        }
    }
    if (!concealed || revealed) drawMiniBar(x, y + e.radius + 10, e.hp / e.maxHp, '#ff6b6b');
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
    drawPlayerHandsAndWeapon(x, y + step, p, now);
    if (p.attackUntil > now) {
        drawAttackSlash(x, y, p.attackDir || p.facing, now);
    }
}

function drawArmorOverlay(x, y) {
    if (state.equipment.armor === '布衣') return;
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
    const weaponLength = Math.max(20, state.equipment.range * 0.58);
    ctx.strokeStyle = state.equipment.weapon === '铁剑' ? '#d8e5f2' : (state.equipment.weapon === '石矛' ? '#a8b3bd' : (state.equipment.weapon === '竹矛' ? '#d7f28a' : COLORS.trunk));
    ctx.lineWidth = state.equipment.weapon === '石矛' || state.equipment.weapon === '竹矛' ? 3 : 5;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX + dir.x * weaponLength, handY + dir.y * weaponLength);
    ctx.stroke();
    if (state.equipment.weapon === '铁剑') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(handX + dir.x * 8, handY + dir.y * 8);
        ctx.lineTo(handX + dir.x * weaponLength, handY + dir.y * weaponLength);
        ctx.stroke();
    }
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
    ctx.save();
    ctx.translate(x + dir.x * 34, y + dir.y * 34);
    ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(255, 243, 176, 0.95)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, state.equipment.range * 0.62, -0.85 + progress * 0.35, 0.55 + progress * 0.35);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 159, 28, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, state.equipment.range * 0.46, -0.65 + progress * 0.25, 0.42 + progress * 0.25);
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

function drawNightOverlay() {
    const darkness = nightAmount();
    if (darkness <= 0.01) return;
    lightCtx.clearRect(0, 0, VIEW.width, VIEW.height);
    lightCtx.globalCompositeOperation = 'source-over';
    lightCtx.fillStyle = `rgba(4, 10, 26, ${0.58 * darkness})`;
    lightCtx.fillRect(0, 0, VIEW.width, VIEW.height);
    const lights = [
        { x: state.player.x, y: state.player.y, radius: state.equipment.utility === '火把' ? 210 : 110 },
        { x: state.camp.x, y: state.camp.y, radius: state.camp.repaired ? 230 : 120 },
    ];
    lightCtx.globalCompositeOperation = 'destination-out';
    for (const light of lights) {
        const gradient = lightCtx.createRadialGradient(worldX(light.x), worldY(light.y), 18, worldX(light.x), worldY(light.y), light.radius);
        gradient.addColorStop(0, `rgba(255,255,255,${0.9 * darkness})`);
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
    ctx.fillStyle = 'rgba(8, 14, 21, 0.72)';
    ctx.fillRect(18, 58, 460, 34);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Microsoft YaHei"';
    ctx.fillText(`目标：${questText()}`, 30, 80);
    ctx.fillStyle = 'rgba(255,255,255,0.76)';
    ctx.font = 'bold 13px "Microsoft YaHei"';
    ctx.fillText('按 I 打开背包 / 合成栏', 30, 104);
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
    return { tree: '树木', stump: '树桩', rock: '岩石', pebble: '小石子', grass: '草丛', tallGrass: '高草丛', reed: '芦苇', berry: '浆果丛', herb: '草药', mushroom: '蘑菇', flower: '野花', lotus: '莲花', cactus: '仙人掌', ore: '铁矿', bamboo: '竹子', mudClump: '泥块' }[kind] || '资源';
}

function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt, now);
}

window.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'e', 'E', 'i', 'I', 'Escape', 'Shift'].includes(key)) event.preventDefault();
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
        state.selectedHotbar = index;
        const item = (state.hotbarItems || HOTBAR_ITEMS)[index];
        if (item && canUseInventoryItem(item)) useInventoryItem(item);
        else if (item && (state.inventory[item] || 0) > 0) showToast(`${RESOURCE_LABELS[item]} 不能直接使用，只能查看数量。`);
        return;
    }
    if (key === 'e') {
        keys.add(key);
        if (!event.repeat) {
            const target = nearestInteractable();
            if (target?.type === 'camp') useCamp();
            else if (target?.type === 'ruins') openRuins();
            else if (!target) showToast('靠近资源后长按 E 采集。');
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
    keys.delete(key);
    if (key === 'e') resetHarvestHold();
});

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
    mouse.down = true;
    attack();
});

canvas.addEventListener('mouseup', event => {
    if (event.button === 2) {
        mouse.blocking = false;
        return;
    }
    mouse.down = false;
});

canvas.addEventListener('mouseleave', () => {
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

renderHud();
showToast('自由移动探索。靠近资源按 E 采集，空格或鼠标攻击。');
requestAnimationFrame(loop);
