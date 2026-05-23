const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const WORLD = { width: 2400, height: 1600 };
const VIEW = { width: canvas.width, height: canvas.height };
const keys = new Set();
const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false };
const camera = { x: 0, y: 0 };
let toastTimer = null;
let lastTime = performance.now();
let state = createState();

const RESOURCE_LABELS = {
    wood: '木头',
    stone: '石头',
    fiber: '纤维',
    berry: '浆果',
    herb: '草药',
    mushroom: '蘑菇',
    flower: '野花',
    ore: '铁矿',
    coal: '煤块',
    hide: '兽皮',
    meat: '生肉',
    slimeGel: '黏液',
    fang: '兽牙',
    crystal: '魔晶',
    stoneAxe: '石斧',
    stonePickaxe: '石镐',
    stoneSpear: '石矛',
    ironSword: '铁剑',
    crystalBlade: '魔晶剑',
    leatherArmor: '皮甲',
    ironArmor: '铁甲',
    potion: '治疗药水',
    stew: '蘑菇汤',
    salve: '黏液药膏',
    key: '废墟钥匙',
};

const RESOURCE_ICONS = {
    wood: '🪵',
    stone: '🪨',
    fiber: '🌾',
    berry: '🍓',
    herb: '🌿',
    mushroom: '🍄',
    flower: '🌼',
    ore: '⛏',
    coal: '◼',
    hide: '🟫',
    meat: '🥩',
    slimeGel: '🟢',
    fang: '🦷',
    crystal: '💎',
    stoneAxe: '🪓',
    stonePickaxe: '⛏',
    stoneSpear: '🔱',
    ironSword: '⚔',
    crystalBlade: '🗡',
    leatherArmor: '🥋',
    ironArmor: '🛡',
    potion: '🧪',
    stew: '🍲',
    salve: '💚',
    key: '🗝',
};

const HOTBAR_ITEMS = ['stoneAxe', 'stonePickaxe', 'stoneSpear', 'ironSword', 'crystalBlade', 'potion', 'stew', 'salve', 'key'];

const RECIPES = [
    recipe('axe', '石斧', '砍树更快', { wood: 4, stone: 3 }, game => {
        game.inventory.stoneAxe += 1;
    }, game => game.inventory.stoneAxe > 0 || game.equipment.tool === '石斧'),
    recipe('pickaxe', '石镐', '挖石和采矿', { wood: 3, stone: 5, fiber: 2 }, game => {
        game.inventory.stonePickaxe += 1;
    }, game => game.inventory.stonePickaxe > 0 || game.equipment.tool === '石镐'),
    recipe('spear', '石矛', '近战伤害 +2', { wood: 3, stone: 3, fiber: 2 }, game => {
        game.inventory.stoneSpear += 1;
    }, game => game.inventory.stoneSpear > 0 || game.equipment.weapon === '石矛'),
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
    recipe('ironArmor', '铁甲', '防御大幅提升', { ore: 8, coal: 2, hide: 2 }, game => {
        game.inventory.ironArmor += 1;
    }, game => game.inventory.ironArmor > 0 || game.equipment.armor === '铁甲'),
    recipe('crystalBlade', '魔晶剑', '高伤害长剑', { ironSword: 1, crystal: 4, fang: 2 }, game => {
        game.inventory.crystalBlade += 1;
    }, game => game.inventory.crystalBlade > 0 || game.equipment.weapon === '魔晶剑'),
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
    return {
        player: {
            x: 280,
            y: 260,
            radius: 17,
            speed: 190,
            hp: 100,
            maxHp: 100,
            stamina: 100,
            knockX: 0,
            knockY: 0,
            facing: { x: 1, y: 0 },
            attackUntil: 0,
            attackDir: { x: 1, y: 0 },
            attackCooldown: 0,
            attackQueuedUntil: 0,
            invincibleUntil: 0,
            harvestTarget: null,
            harvestBlockedAt: 0,
        },
        inventory: { wood: 0, stone: 0, fiber: 0, berry: 0, herb: 0, mushroom: 0, flower: 0, ore: 0, coal: 0, hide: 0, meat: 0, slimeGel: 0, fang: 0, crystal: 0, stoneAxe: 0, stonePickaxe: 0, stoneSpear: 0, ironSword: 0, crystalBlade: 0, leatherArmor: 0, ironArmor: 0, potion: 0, stew: 0, salve: 0, key: 0 },
        equipment: {
            tool: '徒手',
            weapon: '木棍',
            armor: '布衣',
            attack: 1,
            range: 42,
            defense: 0,
            woodPower: 1,
            stonePower: 1,
            orePower: 1,
        },
        resources: createResources(),
        enemies: createEnemies(),
        camp: { x: 260, y: 230, radius: 70, repaired: false },
        ruins: { x: 2110, y: 330, radius: 58, opened: false },
        decorations: createDecorations(),
        particles: [],
        floatTexts: [],
        cameraShake: 0,
        selectedHotbar: 0,
        quest: 'collect-basic',
        win: false,
        lose: false,
    };
}

function resource(kind, x, y, gives, hp, radius) {
    return { kind, x, y, gives, hp, maxHp: hp, radius };
}

function createResources() {
    const resources = [];
    const campPoint = { x: 260, y: 230 };
    const ruinsPoint = { x: 2110, y: 330 };
    const add = (kind, x, y, gives, hp, radius) => {
        const point = { x, y };
        const terrain = terrainInfoAt(x, y);
        if (terrain.kind === 'water' || terrain.kind === 'ruins') return;
        if (distance(point, campPoint) < 95 && kind !== 'grass') return;
        if (distance(point, ruinsPoint) < 230) return;
        if (resources.some(item => distance(item, point) < item.radius + radius + (kind === 'grass' ? 8 : 24))) return;
        resources.push(resource(kind, x, y, gives, hp, radius));
    };

    for (let y = 180; y <= 1500; y += 72) {
        for (let x = 250; x <= 2180; x += 76) {
            const jitterX = (hash2(x * 0.07, y * 0.07) - 0.5) * 46;
            const jitterY = (hash2(x * 0.05 + 8, y * 0.05 - 2) - 0.5) * 44;
            const px = x + jitterX;
            const py = y + jitterY;
            const info = terrainInfoAt(px, py);
            const n = valueNoise(px * 0.014, py * 0.014);
            if (info.kind === 'forest') {
                if (n > 0.38) add('tree', px, py, 'wood', 6, 34);
                else if (n > 0.22) add('stump', px, py, 'wood', 3, 20);
                else add(n > 0.1 ? 'mushroom' : 'berry', px, py, n > 0.1 ? 'mushroom' : 'berry', 3, 20);
            } else if (info.kind === 'grass' || info.kind === 'camp') {
                if (n > 0.72) add('berry', px, py, 'berry', 3, 22);
                else if (n > 0.42) add('grass', px, py, 'fiber', 3, 18);
                else if (n > 0.32) add(n > 0.37 ? 'herb' : 'flower', px, py, n > 0.37 ? 'herb' : 'flower', 3, 18);
            } else if (info.kind === 'shore') {
                if (n > 0.32) add('reed', px, py, 'fiber', 2, 16);
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

function enemy(kind, name, x, y, radius, hp, attack, speed, range, drop, dropAmount, boss = false) {
    return {
        kind, name, x, y, spawnX: x, spawnY: y, radius, hp, maxHp: hp, attack, speed, range, drop, dropAmount, boss,
        hurtUntil: 0,
        attackCooldown: 0,
        contactCooldown: 0,
        windupUntil: 0,
        strikeAt: 0,
        attackDir: { x: 0, y: 1 },
        chargeUntil: 0,
        chargeHit: false,
        leapStartAt: 0,
        leapUntil: 0,
        leapStartX: x,
        leapStartY: y,
        leapTargetX: x,
        leapTargetY: y,
        leapHit: false,
        knockX: 0,
        knockY: 0,
    };
}

function createEnemies() {
    const enemies = [];
    const campPoint = { x: 260, y: 230 };
    const ruinsPoint = { x: 2110, y: 330 };
    const add = item => {
        if (terrainInfoAt(item.x, item.y).kind === 'water') return;
        if (distance(item, campPoint) < 260) return;
        if (item.kind !== 'golem' && distance(item, ruinsPoint) < 180) return;
        if (enemies.some(enemyItem => distance(enemyItem, item) < enemyItem.radius + item.radius + 110)) return;
        enemies.push(item);
    };
    for (let y = 260; y <= 1480; y += 170) {
        for (let x = 300; x <= 2200; x += 190) {
            const px = x + (hash2(x * 0.03, y * 0.03) - 0.5) * 95;
            const py = y + (hash2(x * 0.04 + 6, y * 0.04 - 4) - 0.5) * 95;
            const info = terrainInfoAt(px, py);
            const n = valueNoise(px * 0.01 + 4, py * 0.01 - 3);
            if ((info.kind === 'grass' || info.kind === 'shore' || info.kind === 'camp') && n > 0.76) {
                add(enemy('slime', '史莱姆', px, py, 18, 16, 1, 92, 42, { slimeGel: 2, fiber: 1 }, 1));
            } else if (info.kind === 'forest' && n > 0.64) {
                add(enemy('boar', '野猪', px, py, 22, 28, 3, 135, 68, { hide: 2, meat: 1, fang: 1 }, 1));
            } else if ((info.kind === 'mine' || info.kind === 'ruins') && n > 0.72) {
                add(enemy('golem', '石像守卫', px, py, 26, 42, 4, 70, 78, { crystal: 1, stone: 2, coal: 1 }, 1));
            }
        }
    }
    add(enemy('golem', '守门石像', 1980, 520, 28, 55, 5, 78, 92, { crystal: 3, stone: 4, coal: 2 }, 1, true));
    if (!enemies.some(item => item.kind === 'boar' && item.x < 800 && item.y > 1050)) {
        add(enemy('boar', '野猪', 560, 1260, 22, 28, 3, 135, 68, { hide: 2, meat: 1, fang: 1 }, 1));
    }
    return enemies;
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
    if (!state.win && !state.lose) {
        updatePlayer(dt, now);
        updateHarvestHold(dt);
        updateEnemies(dt, now);
        updateQuest();
    }
    updateParticles(dt);
    updateFloatTexts(dt);
    state.cameraShake = Math.max(0, state.cameraShake - dt * 36);
    updateCamera();
    render(now);
    requestAnimationFrame(loop);
}

function updatePlayer(dt, now) {
    const p = state.player;
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
        const speed = p.speed * (sprinting ? 1.55 : 1) * (inWater ? 0.58 : 1);
        p.facing = dir;
        moveCircle(p, dir.x * speed * dt, dir.y * speed * dt);
        if (inWater) {
            const current = waterCurrentAt(p.x, p.y);
            moveCircle(p, current.x * dt, current.y * dt);
            spawnWaterRipple(p.x, p.y + 12);
        }
        p.stamina = clamp(p.stamina + (sprinting ? -38 : 24) * dt, 0, 100);
    } else {
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

function moveCircle(entity, dx, dy) {
    entity.x = clamp(entity.x + dx, entity.radius, WORLD.width - entity.radius);
    if (collides(entity)) entity.x = clamp(entity.x - dx, entity.radius, WORLD.width - entity.radius);
    entity.y = clamp(entity.y + dy, entity.radius, WORLD.height - entity.radius);
    if (collides(entity)) entity.y = clamp(entity.y - dy, entity.radius, WORLD.height - entity.radius);
}

function collides(entity) {
    for (const r of state.resources) {
        if (!isSolidResource(r)) continue;
        if (r.hp > 0 && distance(entity, r) < entity.radius + r.radius * (r.kind === 'tree' ? 0.42 : 0.72)) return true;
    }
    if (distance(entity, state.ruins) < entity.radius + state.ruins.radius && !state.ruins.opened) return true;
    return false;
}

function isSolidResource(item) {
    return item.kind === 'tree' || item.kind === 'rock' || item.kind === 'ore';
}

function updateEnemies(dt, now) {
    for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        if (e.attackCooldown > 0) e.attackCooldown -= dt;
        if (e.contactCooldown > 0) e.contactCooldown -= dt;
        if (e.leapUntil > now) {
            const progress = clamp((now - e.leapStartAt) / Math.max(1, e.leapUntil - e.leapStartAt), 0, 1);
            const arc = Math.sin(progress * Math.PI);
            e.x = lerp(e.leapStartX, e.leapTargetX, progress);
            e.y = lerp(e.leapStartY, e.leapTargetY, progress) - arc * 10;
            if (!e.leapHit && progress > 0.55 && distance(e, state.player) < e.radius + state.player.radius + 18) {
                applyEnemyDamage(e, e.attack, '跳扑');
                e.leapHit = true;
            }
            if (Math.random() < 0.45) spawnBurst(e.x, e.y + e.radius, '#5ee089', 1, 42, e.radius * 0.3);
            continue;
        } else if (e.leapUntil) {
            e.x = e.leapTargetX;
            e.y = e.leapTargetY;
            e.leapUntil = 0;
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
        if (Math.abs(e.knockX) > 1 || Math.abs(e.knockY) > 1) {
            moveEnemy(e, e.knockX * dt, e.knockY * dt);
            e.knockX *= Math.pow(0.035, dt);
            e.knockY *= Math.pow(0.035, dt);
        }
        const p = state.player;
        const dist = distance(e, p);
        if (dist < e.radius + p.radius + 4 && e.contactCooldown <= 0) {
            applyEnemyDamage(e, Math.max(1, e.attack - 1), '碰撞');
            e.contactCooldown = e.kind === 'boar' ? 0.7 : 0.9;
        }
        if (e.strikeAt && now >= e.strikeAt) {
            resolveEnemyAttack(e, now);
        }

        if (!e.windupUntil && dist < 330) {
            const dir = normalize(p.x - e.x, p.y - e.y);
            moveEnemy(e, dir.x * e.speed * dt, dir.y * e.speed * dt);
        } else if (!e.windupUntil && distance(e, { x: e.spawnX, y: e.spawnY }) > 18) {
            const dir = normalize(e.spawnX - e.x, e.spawnY - e.y);
            moveEnemy(e, dir.x * e.speed * 0.42 * dt, dir.y * e.speed * 0.42 * dt);
        }

        if (!e.windupUntil && dist < e.radius + p.radius + e.range && e.attackCooldown <= 0) {
            startEnemyAttack(e, now);
        }

        if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
    }
    separateEnemies();
}

function startEnemyAttack(e, now) {
    e.attackDir = normalize(state.player.x - e.x, state.player.y - e.y);
    e.chargeHit = false;
    if (e.kind === 'slime') {
        e.windupUntil = now + 460;
        e.strikeAt = now + 360;
    } else if (e.kind === 'boar') {
        e.windupUntil = now + 560;
        e.strikeAt = now + 420;
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
        e.attackCooldown = 2.8;
    } else if (e.kind === 'boar') {
        e.chargeUntil = now + 430;
        e.chargeHit = false;
        e.attackCooldown = 1.4;
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
    if (performance.now() <= p.invincibleUntil) return;
    const damage = Math.max(1, rawDamage - state.equipment.defense);
    p.hp = Math.max(0, p.hp - damage);
    p.invincibleUntil = performance.now() + 620;
    const dir = normalize(p.x - e.x, p.y - e.y);
    const force = e.kind === 'boar' ? 430 : (e.kind === 'golem' ? 330 : 260);
    p.knockX += dir.x * force;
    p.knockY += dir.y * force;
    p.stamina = Math.max(0, p.stamina - (e.kind === 'boar' ? 18 : 10));
    state.cameraShake = Math.max(state.cameraShake, e.boss ? 14 : 8);
    spawnBurst(p.x, p.y, '#ff6b6b', 10, 170, p.radius * 0.55);
    addFloatText(`-${damage}`, p.x, p.y - 36, '#ffb3b3');
    showToast(`${e.name}${verb ? ` ${verb}` : ''}命中你，生命 -${damage}`);
    if (p.hp <= 0) {
        state.lose = true;
        showToast('你倒下了。回到营地重新准备吧。');
    }
    renderHud();
}

function moveEnemy(e, dx, dy) {
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
        spawnBurst(node.x, node.y, node.gives === 'wood' ? '#8bd76e' : (node.gives === 'ore' ? '#94e3ff' : '#d7d7d7'), 2, 55, node.radius * 0.55);
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
    spawnBurst(node.x, node.y, node.gives === 'wood' ? '#8bd76e' : (node.gives === 'ore' ? '#94e3ff' : '#d7d7d7'), 8, 110, node.radius * 0.65);
    if (node.hp <= 0) {
        const amount = ({ wood: 4, stone: 4, fiber: 3, berry: 3, herb: 2, mushroom: 2, ore: 4 }[node.gives] || 1);
        state.inventory[node.gives] += amount;
        addFloatText(`+${amount} ${RESOURCE_LABELS[node.gives]}`, node.x, node.y - 30, '#fff3b0');
        showToast(`采集成功：${RESOURCE_LABELS[node.gives]} x${amount}`);
    } else {
        showToast(`${resourceName(node.kind)} 剩余 ${Math.ceil(Math.max(0, node.hp))}/${node.maxHp}`);
    }
    renderHud();
}

function harvestBlockReason(node) {
    if (node.gives === 'ore' && state.equipment.tool !== '石镐') return '铁矿太硬，需要先合成石镐。';
    if (node.kind === 'tree' && state.equipment.tool === '徒手') return '徒手砍不动整棵树，先收集木头和石头合成石斧。';
    return '';
}

function harvestPower(node) {
    if (node.kind === 'grass' || node.kind === 'reed' || node.kind === 'berry' || node.kind === 'herb' || node.kind === 'mushroom') return 1.05;
    if (node.kind === 'stump') return 0.9 + state.equipment.woodPower * 0.45;
    if (node.gives === 'wood') return state.equipment.woodPower * 0.95;
    if (node.gives === 'stone') return state.equipment.stonePower * 0.9;
    if (node.gives === 'ore') return state.equipment.orePower * 0.8;
    return 1;
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
    if (hit.hp <= 0) {
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
    if (state.equipment.weapon === '石矛') return 0.48;
    return 0.34;
}

function weaponStaminaCost() {
    if (state.equipment.weapon === '铁剑') return 18;
    if (state.equipment.weapon === '石矛') return 14;
    return 10;
}

function weaponArcDot() {
    if (state.equipment.weapon === '铁剑') return 0.08;
    if (state.equipment.weapon === '石矛') return 0.28;
    return 0.18;
}

function spawnBurst(x, y, color, count = 8, speed = 120, spread = 0) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = Math.random() * spread;
        const velocity = speed * (0.35 + Math.random() * 0.65);
        state.particles.push({
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
        state.particles.push({
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

function canCraft(item) {
    if (item.owned(state)) return false;
    return Object.entries(item.cost).every(([key, amount]) => state.inventory[key] >= amount);
}

function craft(id) {
    const item = RECIPES.find(recipe => recipe.id === id);
    if (!item || !canCraft(item)) return;
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
            equipWeapon('石矛', 3, 86, '已装备石矛。');
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
            state.inventory.salve -= 1;
            showToast('使用黏液药膏，恢复 45 生命。');
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
    state.equipment.defense = defense;
    showToast(message);
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
    document.getElementById('armor-label').textContent = state.equipment.armor;

    const inventory = document.getElementById('inventory');
    inventory.innerHTML = '';
    Object.entries(RESOURCE_LABELS).forEach(([key, label]) => {
        const row = document.createElement(canUseInventoryItem(key) ? 'button' : 'div');
        row.className = 'inventory-row';
        if (row.tagName === 'BUTTON') row.type = 'button';
        row.classList.toggle('empty', !state.inventory[key]);
        row.classList.toggle('usable', canUseInventoryItem(key));
        row.innerHTML = `<span class="inventory-icon">${RESOURCE_ICONS[key] || '•'}</span><span class="inventory-name">${label}</span><strong>${state.inventory[key] || 0}</strong>`;
        if (canUseInventoryItem(key)) row.addEventListener('click', () => useInventoryItem(key));
        inventory.appendChild(row);
    });

    const recipes = document.getElementById('recipes');
    recipes.innerHTML = '';
    RECIPES.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'recipe-btn';
        button.disabled = !canCraft(item);
        const cost = Object.entries(item.cost)
            .map(([key, amount]) => `<span class="cost-chip ${state.inventory[key] >= amount ? 'met' : ''}"><span>${RESOURCE_ICONS[key] || '•'}</span><b>${amount}</b></span>`)
            .join('');
        button.innerHTML = `
            <div class="recipe-title"><span>${item.name}</span><small>${item.desc}</small></div>
            <div class="recipe-cost"><span class="recipe-cost-list">${cost}</span><span>${item.owned(state) ? '已拥有' : (button.disabled ? '材料不足' : '可合成')}</span></div>
        `;
        button.addEventListener('click', () => craft(item.id));
        recipes.appendChild(button);
    });

    const objective = document.getElementById('objective-text');
    if (objective) objective.textContent = questText();
}

function canUseInventoryItem(key) {
    return ['stoneAxe', 'stonePickaxe', 'stoneSpear', 'ironSword', 'crystalBlade', 'leatherArmor', 'ironArmor', 'potion', 'stew', 'salve'].includes(key) && (state.inventory[key] || 0) > 0;
}

function render(now) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    drawTerrain();
    drawWorldObjects(now);
    drawParticles();
    drawFloatTexts();
    drawEffects(now);
    drawUiOverlay();
}

function worldX(x) { return Math.round(x - camera.x); }
function worldY(y) { return Math.round(y - camera.y); }

function drawTerrain() {
    ctx.fillStyle = '#2d7141';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const grid = 32;
    const startX = Math.floor(camera.x / grid) * grid;
    const startY = Math.floor(camera.y / grid) * grid;
    for (let y = startY; y < camera.y + VIEW.height + grid; y += grid) {
        for (let x = startX; x < camera.x + VIEW.width + grid; x += grid) {
            const info = terrainInfoAt(x + grid / 2, y + grid / 2);
            ctx.fillStyle = info.color;
            ctx.fillRect(worldX(x), worldY(y), grid, grid);
            drawTerrainDetail(x, y, grid, info);
        }
    }
    drawWaterHighlights(performance.now());
}

function terrainInfoAt(x, y) {
    const river = riverDistance(x, y);
    if (river < 46) return { kind: 'water', color: blendColor('#1f5f92', '#2f8fc7', clamp((46 - river) / 46, 0, 1)) };
    if (river < 82) return { kind: 'shore', color: blendColor('#6f8750', '#3d8146', (river - 46) / 36) };

    const mine = regionWeight(x, y, 1760, 1010, 620);
    const ruins = regionWeight(x, y, 2060, 360, 560);
    const forest = Math.max(regionWeight(x, y, 780, 340, 620), regionWeight(x, y, 520, 1290, 540));
    const camp = regionWeight(x, y, 250, 230, 360);
    const noise = valueNoise(x * 0.006, y * 0.006);

    if (ruins > 0.54) return { kind: 'ruins', color: mixMany([['#38414d', ruins], ['#4f5964', 0.32], ['#2f6b3d', Math.max(0, 1 - ruins)]], noise) };
    if (mine > 0.52) return { kind: 'mine', color: mixMany([['#58636e', mine], ['#6a604f', 0.2], ['#376d3f', Math.max(0, 1 - mine)]], noise) };
    if (forest > 0.46) return { kind: 'forest', color: mixMany([['#1f5a35', forest], ['#2f7041', 0.3], ['#3f8f4f', Math.max(0, 1 - forest)]], noise) };
    if (camp > 0.44) return { kind: 'camp', color: mixMany([['#6f5532', camp], ['#3e7f47', Math.max(0, 1 - camp)]], noise) };
    return { kind: 'grass', color: blendColor('#347d47', '#428c4e', noise * 0.32) };
}

function riverCenterY(x) {
    return 735 + Math.sin(x * 0.0045) * 90 + Math.sin(x * 0.0018 + 1.7) * 68;
}

function riverDistance(x, y) {
    return Math.abs(y - riverCenterY(x));
}

function waterCurrentAt(x, y) {
    return {
        x: 42 + Math.sin(y * 0.012) * 18,
        y: Math.cos(x * 0.006) * 16,
    };
}

function regionWeight(x, y, cx, cy, radius) {
    const d = Math.hypot(x - cx, y - cy);
    return clamp(1 - d / radius, 0, 1);
}

function hash2(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
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
    if (info.kind === 'water') return;
    if (info.kind === 'shore') {
        ctx.fillStyle = h > 0.5 ? 'rgba(230, 206, 145, 0.22)' : 'rgba(70, 105, 65, 0.2)';
        ctx.fillRect(sx + 6 + (h * 9) % 16, sy + 12, 20, 4);
        return;
    }
    if (info.kind === 'mine') {
        ctx.fillStyle = 'rgba(20, 24, 29, 0.22)';
        ctx.fillRect(sx + 6, sy + 8 + h * 12, 12 + h * 14, 4);
        if (h > 0.58) ctx.fillRect(sx + 22, sy + 24, 7, 6);
        return;
    }
    if (info.kind === 'ruins') {
        ctx.strokeStyle = 'rgba(18, 24, 34, 0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 2, sy + 2, grid - 4, grid - 4);
        if (h > 0.7) {
            ctx.fillStyle = 'rgba(183, 125, 255, 0.12)';
            ctx.fillRect(sx + 12, sy + 8, 8, 8);
        }
        return;
    }
    if (info.kind === 'forest') {
        ctx.fillStyle = h > 0.5 ? 'rgba(32, 22, 12, 0.18)' : 'rgba(132, 87, 43, 0.16)';
        ctx.fillRect(sx + 7, sy + 18, 14, 5);
        return;
    }
    ctx.fillStyle = h > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)';
    ctx.fillRect(sx + 8, sy + 10 + h * 12, 14, 4);
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
    state.particles.push({
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
        { y: state.camp.y, draw: () => drawCamp() },
        { y: state.ruins.y, draw: () => drawRuins() },
        ...state.resources.filter(r => r.hp > 0).map(r => ({ y: r.y, draw: () => drawResource(r) })),
        ...state.enemies.filter(e => e.hp > 0).map(e => ({ y: e.y, draw: () => drawEnemy(e, now) })),
        { y: state.player.y, draw: () => drawPlayer(now) },
    ];
    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach(item => item.draw());
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
    ctx.fillStyle = r.kind === 'berry' ? COLORS.grass2 : COLORS.grass1;
    ctx.fillRect(x - 14, y - 17, 5, 18);
    ctx.fillRect(x - 4, y - 24, 5, 25);
    ctx.fillRect(x + 8, y - 16, 5, 17);
    ctx.fillStyle = r.kind === 'berry' ? COLORS.berry : (r.kind === 'herb' ? COLORS.herb : COLORS.grass2);
    ctx.fillRect(x - 9, y - 24, 6, 6);
    ctx.fillRect(x + 4, y - 28, 6, 6);
}

function drawEnemy(e, now) {
    const x = worldX(e.x);
    const y = worldY(e.y);
    const leapProgress = e.leapUntil > now ? clamp((now - e.leapStartAt) / Math.max(1, e.leapUntil - e.leapStartAt), 0, 1) : 0;
    const leapLift = e.leapUntil > now ? Math.sin(leapProgress * Math.PI) * 18 : 0;
    const chargeLean = e.chargeUntil > now ? 8 : 0;
    const bounce = Math.sin(now / 140) * (e.kind === 'slime' ? 3 : 1.2) - leapLift;
    drawShadow(x, y + 1, e.radius * 1.62, e.radius * 0.42);
    if (e.windupUntil) {
        drawEnemyTelegraph(e, x, y, now);
    }
    if (e.hurtUntil) {
        ctx.globalAlpha = 0.72;
        drawSpriteGrounded(e.kind, x + e.attackDir.x * chargeLean, y + bounce, 3.2, { tint: '#ffffff' });
        ctx.globalAlpha = 1;
    } else {
        drawSpriteGrounded(e.kind, x + e.attackDir.x * chargeLean, y + bounce, 3.2);
    }
    drawMiniBar(x, y + e.radius + 10, e.hp / e.maxHp, '#ff6b6b');
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
    drawPlayerHandsAndWeapon(x, y + step, p, now);
    if (p.attackUntil > now) {
        drawAttackSlash(x, y, p.attackDir || p.facing, now);
    }
}

function drawPlayerHandsAndWeapon(x, y, p, now) {
    const dir = p.attackDir || p.facing;
    const attacking = p.attackUntil > now;
    const handX = x + dir.x * (attacking ? 22 : 15);
    const handY = y - 31 + dir.y * 8 + (keys.size ? Math.sin(now / 90) * 1.5 : 0);
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(handX - 4, handY - 4, 8, 8);
    const weaponLength = Math.max(20, state.equipment.range * 0.58);
    ctx.strokeStyle = state.equipment.weapon === '铁剑' ? '#d8e5f2' : (state.equipment.weapon === '石矛' ? '#a8b3bd' : COLORS.trunk);
    ctx.lineWidth = state.equipment.weapon === '石矛' ? 3 : 5;
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
    const total = HOTBAR_ITEMS.length * slot + (HOTBAR_ITEMS.length - 1) * gap;
    const startX = Math.round((VIEW.width - total) / 2);
    const y = VIEW.height - slot - 18;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 14, 21, 0.82)';
    ctx.fillRect(startX - 10, y - 10, total + 20, slot + 20);
    HOTBAR_ITEMS.forEach((key, index) => {
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
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(RESOURCE_ICONS[key] || '•', x + slot / 2, y + 31);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Microsoft YaHei"';
            ctx.textAlign = 'right';
            ctx.fillText(String(state.inventory[key]), x + slot - 5, y + slot - 5);
        }
    });
    const selectedKey = HOTBAR_ITEMS[state.selectedHotbar];
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
    return { tree: '树木', stump: '树桩', rock: '岩石', grass: '草丛', reed: '芦苇', berry: '浆果丛', herb: '草药', ore: '铁矿' }[kind] || '资源';
}

function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt, now);
}

window.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'e', 'E', 'Shift'].includes(key)) event.preventDefault();
    if (/^[1-9]$/.test(key)) {
        const index = Number(key) - 1;
        state.selectedHotbar = index;
        const item = HOTBAR_ITEMS[index];
        if (item && canUseInventoryItem(item)) useInventoryItem(item);
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

canvas.addEventListener('mousedown', () => {
    mouse.down = true;
    attack();
});

canvas.addEventListener('mouseup', () => {
    mouse.down = false;
});

document.getElementById('restart-btn').addEventListener('click', () => {
    state = createState();
    showToast('新的冒险开始了。先收集木头和石头修复营地。');
    renderHud();
});

renderHud();
showToast('自由移动探索。靠近资源按 E 采集，空格或鼠标攻击。');
requestAnimationFrame(loop);
