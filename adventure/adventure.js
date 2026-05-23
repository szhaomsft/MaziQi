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
    ore: '铁矿',
    hide: '兽皮',
    crystal: '魔晶',
    key: '废墟钥匙',
};

const RECIPES = [
    recipe('axe', '石斧', '砍树更快', { wood: 4, stone: 3 }, game => {
        game.equipment.tool = '石斧';
        game.equipment.woodPower = 2;
    }, game => game.equipment.tool === '石斧' || game.equipment.tool === '石镐'),
    recipe('pickaxe', '石镐', '挖石和采矿', { wood: 3, stone: 5, fiber: 2 }, game => {
        game.equipment.tool = '石镐';
        game.equipment.stonePower = 2;
        game.equipment.orePower = 2;
    }, game => game.equipment.tool === '石镐'),
    recipe('spear', '石矛', '近战伤害 +2', { wood: 3, stone: 3, fiber: 2 }, game => {
        game.equipment.weapon = '石矛';
        game.equipment.attack = 3;
        game.equipment.range = 58;
    }, game => game.equipment.weapon === '石矛' || game.equipment.weapon === '铁剑'),
    recipe('sword', '铁剑', '可以挑战守门石像', { wood: 2, ore: 6, hide: 2 }, game => {
        game.equipment.weapon = '铁剑';
        game.equipment.attack = 6;
        game.equipment.range = 66;
    }, game => game.equipment.weapon === '铁剑'),
    recipe('armor', '皮甲', '受到伤害 -1', { hide: 4, fiber: 4 }, game => {
        game.equipment.armor = '皮甲';
        game.equipment.defense = 1;
    }, game => game.equipment.armor === '皮甲'),
    recipe('potion', '治疗药水', '恢复 35 生命', { herb: 2, berry: 2 }, game => {
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 35);
    }, () => false),
    recipe('key', '废墟钥匙', '打开古代废墟', { ore: 8, crystal: 3 }, game => {
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
            facing: { x: 1, y: 0 },
            attackUntil: 0,
            attackCooldown: 0,
            invincibleUntil: 0,
        },
        inventory: { wood: 0, stone: 0, fiber: 0, berry: 0, herb: 0, ore: 0, hide: 0, crystal: 0, key: 0 },
        equipment: {
            tool: '徒手',
            weapon: '木棍',
            armor: '布衣',
            attack: 1,
            range: 46,
            defense: 0,
            woodPower: 1,
            stonePower: 1,
            orePower: 1,
        },
        resources: createResources(),
        enemies: [
            enemy('slime', '史莱姆', 900, 760, 18, 16, 1, 92, 26, 'fiber', 1),
            enemy('boar', '野猪', 1260, 710, 22, 28, 3, 135, 34, 'hide', 2),
            enemy('boar', '野猪', 1550, 560, 22, 28, 3, 135, 34, 'hide', 2),
            enemy('golem', '守门石像', 1980, 520, 28, 55, 5, 78, 42, 'crystal', 3, true),
        ],
        camp: { x: 260, y: 230, radius: 70, repaired: false },
        ruins: { x: 2110, y: 330, radius: 58, opened: false },
        decorations: createDecorations(),
        particles: [],
        floatTexts: [],
        cameraShake: 0,
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
    const add = (kind, x, y, gives, hp, radius) => resources.push(resource(kind, x, y, gives, hp, radius));
    const candidates = [
        [360, 230], [430, 290], [520, 230], [610, 330], [700, 250], [790, 345], [880, 270], [960, 390], [1080, 440],
        [320, 480], [470, 520], [650, 560], [820, 575], [1010, 610], [1160, 585], [1280, 520],
    ];
    for (const [x, y] of candidates) {
        const info = terrainInfoAt(x, y);
        if (info.kind === 'forest') add('tree', x, y, 'wood', 6, 34);
        else if (info.kind === 'grass' || info.kind === 'camp') add('grass', x, y, 'fiber', 3, 18);
    }

    [
        [410, 410], [560, 470], [740, 510], [970, 565], [1120, 665], [1340, 635],
    ].forEach(([x, y], index) => add(index % 2 ? 'berry' : 'grass', x, y, index % 2 ? 'berry' : 'fiber', 3, index % 2 ? 22 : 18));

    [
        [500, 690], [1160, 430], [1730, 1330], [870, 430], [1030, 720],
    ].forEach(([x, y]) => add('stump', x, y, 'wood', 3, 20));

    [
        [690, 780], [770, 860], [875, 940], [990, 1025], [1085, 1110],
    ].forEach(([x, y]) => add('reed', x, y, 'fiber', 2, 16));

    [
        [1180, 310], [1320, 560], [1450, 660],
    ].forEach(([x, y]) => add('herb', x, y, 'herb', 3, 18));

    [
        [1420, 880], [1580, 980], [1760, 800], [1870, 1210], [2110, 1320],
    ].forEach(([x, y], index) => add(index < 3 ? 'rock' : 'ore', x, y, index < 3 ? 'stone' : 'ore', index < 3 ? 7 : 8, 28));
    [
        [1780, 1080], [1980, 920], [2110, 1120],
    ].forEach(([x, y]) => add('ore', x, y, 'ore', 8, 28));

    return resources.filter(item => terrainInfoAt(item.x, item.y).kind !== 'water');
}

function enemy(kind, name, x, y, radius, hp, attack, speed, range, drop, dropAmount, boss = false) {
    return { kind, name, x, y, spawnX: x, spawnY: y, radius, hp, maxHp: hp, attack, speed, range, drop, dropAmount, boss, hurtUntil: 0, attackCooldown: 0, windupUntil: 0, strikeAt: 0, knockX: 0, knockY: 0 };
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

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
}

function update(dt, now) {
    if (!state.win && !state.lose) {
        updatePlayer(dt);
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

function updatePlayer(dt) {
    const p = state.player;
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

    if (p.attackCooldown > 0) p.attackCooldown -= dt;
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
        if (Math.abs(e.knockX) > 1 || Math.abs(e.knockY) > 1) {
            moveEnemy(e, e.knockX * dt, e.knockY * dt);
            e.knockX *= Math.pow(0.035, dt);
            e.knockY *= Math.pow(0.035, dt);
        }
        const p = state.player;
        const dist = distance(e, p);
        if (e.strikeAt && now >= e.strikeAt) {
            if (dist < e.radius + p.radius + e.range * 0.46 && now > p.invincibleUntil) {
                const damage = Math.max(1, e.attack - state.equipment.defense);
                p.hp = Math.max(0, p.hp - damage);
                p.invincibleUntil = now + 620;
                state.cameraShake = Math.max(state.cameraShake, e.boss ? 14 : 8);
                spawnBurst(p.x, p.y, '#ff6b6b', 10, 170);
                addFloatText(`-${damage}`, p.x, p.y - 36, '#ffb3b3');
                showToast(`${e.name} 命中你，生命 -${damage}`);
                if (p.hp <= 0) {
                    state.lose = true;
                    showToast('你倒下了。回到营地重新准备吧。');
                }
                renderHud();
            }
            e.strikeAt = 0;
            e.windupUntil = 0;
            e.attackCooldown = e.boss ? 1.0 : 1.35;
        }

        if (!e.windupUntil && dist < 330) {
            const dir = normalize(p.x - e.x, p.y - e.y);
            moveEnemy(e, dir.x * e.speed * dt, dir.y * e.speed * dt);
        } else if (!e.windupUntil && distance(e, { x: e.spawnX, y: e.spawnY }) > 18) {
            const dir = normalize(e.spawnX - e.x, e.spawnY - e.y);
            moveEnemy(e, dir.x * e.speed * 0.42 * dt, dir.y * e.speed * 0.42 * dt);
        }

        if (!e.windupUntil && dist < e.radius + p.radius + e.range * 0.42 && e.attackCooldown <= 0) {
            e.windupUntil = now + (e.boss ? 480 : 360);
            e.strikeAt = now + (e.boss ? 360 : 250);
            spawnBurst(e.x, e.y - 12, '#ffd166', 5, 80);
        }

        if (e.hurtUntil && now > e.hurtUntil) e.hurtUntil = 0;
    }
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

    if (target.type === 'resource') harvest(target.item);
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

function harvest(node) {
    const power = node.gives === 'wood'
        ? state.equipment.woodPower
        : (node.gives === 'stone' ? state.equipment.stonePower : (node.gives === 'ore' ? state.equipment.orePower : 1));
    node.hp -= power;
    node.shakeUntil = performance.now() + 140;
    spawnBurst(node.x, node.y, node.gives === 'wood' ? '#8bd76e' : (node.gives === 'ore' ? '#94e3ff' : '#d7d7d7'), 6, 110);
    if (node.hp <= 0) {
        const amount = ({ wood: 4, stone: 4, fiber: 3, berry: 3, herb: 2, ore: 4 }[node.gives] || 1);
        state.inventory[node.gives] += amount;
        addFloatText(`+${amount} ${RESOURCE_LABELS[node.gives]}`, node.x, node.y - 30, '#fff3b0');
        showToast(`采集成功：${RESOURCE_LABELS[node.gives]} x${amount}`);
    } else {
        showToast(`${resourceName(node.kind)} 剩余 ${Math.max(0, node.hp)}/${node.maxHp}`);
    }
    renderHud();
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
    if (state.win || state.lose || p.attackCooldown > 0) return;
    p.attackCooldown = 0.34;
    p.attackUntil = now + 140;
    const aim = normalize(mouse.x - VIEW.width / 2, mouse.y - VIEW.height / 2);
    if (Math.hypot(mouse.x - VIEW.width / 2, mouse.y - VIEW.height / 2) > 18) p.facing = aim;
    const strike = { x: p.x + p.facing.x * p.radius, y: p.y + p.facing.y * p.radius };
    let hit = null;
    for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        const toEnemy = normalize(e.x - p.x, e.y - p.y);
        const facingDot = toEnemy.x * p.facing.x + toEnemy.y * p.facing.y;
        if (distance(strike, e) <= state.equipment.range + e.radius && facingDot > 0.18) {
            hit = e;
            break;
        }
    }
    spawnArcParticles(p.x, p.y, p.facing);
    if (!hit) {
        addFloatText('挥空', p.x + p.facing.x * 50, p.y + p.facing.y * 50, '#d8e5f2');
        return;
    }

    hit.hp -= state.equipment.attack;
    hit.hurtUntil = now + 160;
    hit.knockX += p.facing.x * (hit.boss ? 130 : 240);
    hit.knockY += p.facing.y * (hit.boss ? 130 : 240);
    state.cameraShake = Math.max(state.cameraShake, hit.boss ? 12 : 7);
    spawnBurst(hit.x, hit.y, hit.boss ? '#b77dff' : '#ffd166', 14, 220);
    addFloatText(`-${state.equipment.attack}`, hit.x, hit.y - 36, '#fff3b0');
    if (hit.hp <= 0) {
        state.inventory[hit.drop] += hit.dropAmount;
        spawnBurst(hit.x, hit.y, '#ffffff', 24, 260);
        addFloatText(`+${hit.dropAmount} ${RESOURCE_LABELS[hit.drop]}`, hit.x, hit.y - 52, '#9cffb7');
        showToast(`击败 ${hit.name}，获得 ${RESOURCE_LABELS[hit.drop]} x${hit.dropAmount}`);
    } else {
        showToast(`${hit.name} 受伤，剩余 ${hit.hp}/${hit.maxHp}`);
    }
    renderHud();
}

function spawnBurst(x, y, color, count = 8, speed = 120) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.35 + Math.random() * 0.65);
        state.particles.push({
            x,
            y,
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
        const row = document.createElement('div');
        row.className = 'inventory-row';
        row.innerHTML = `<span>${label}</span><strong>${state.inventory[key] || 0}</strong>`;
        inventory.appendChild(row);
    });

    const recipes = document.getElementById('recipes');
    recipes.innerHTML = '';
    RECIPES.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'recipe-btn';
        button.disabled = !canCraft(item);
        const cost = Object.entries(item.cost).map(([key, amount]) => `${RESOURCE_LABELS[key]} ${amount}`).join(' · ');
        button.innerHTML = `
            <div class="recipe-title"><span>${item.name}</span><small>${item.desc}</small></div>
            <div class="recipe-cost"><span>${cost}</span><span>${item.owned(state) ? '已拥有' : (button.disabled ? '材料不足' : '可合成')}</span></div>
        `;
        button.addEventListener('click', () => craft(item.id));
        recipes.appendChild(button);
    });

    const objective = document.getElementById('objective-text');
    if (objective) objective.textContent = questText();
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
    const forest = regionWeight(x, y, 780, 340, 620);
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
    state.particles.push({
        x,
        y,
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
    drawShadow(x, y, 74, 20);
    drawSpriteGrounded('campfire', x, y + 8, 5);
    ctx.fillStyle = state.camp.repaired ? '#ffd166' : '#9fb3c8';
    ctx.font = 'bold 14px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(state.camp.repaired ? '营地篝火' : '破损篝火', x, y + 54);
}

function drawRuins() {
    const x = worldX(state.ruins.x);
    const y = worldY(state.ruins.y);
    drawShadow(x, y + 16, 142, 28);
    drawSpriteGrounded('ruins', x, y + 24, 6);
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
    if (sprite) {
        const scale = r.kind === 'tree' ? 5.8 : (r.kind === 'ore' ? 3.5 : 3.2);
        drawShadow(x, y + 2, r.radius * (r.kind === 'tree' ? 1.35 : 1.85), r.radius * 0.46);
        if (r.kind === 'ore' || r.kind === 'rock') drawGroundContact(x, y, r.kind);
        drawSpriteGrounded(sprite, x + shake, y + (r.kind === 'tree' ? 6 : 0), scale);
    } else {
        drawGatherablePatch(r, x + shake, y);
    }
    if (r.hp < r.maxHp || isSolidResource(r)) drawMiniBar(x, y + 16, r.hp / r.maxHp, '#ffd166');
}

function drawGatherablePatch(r, x, y) {
    if (r.kind === 'stump') {
        drawShadow(x, y + 3, 32, 10);
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
        drawShadow(x, y + 3, 26, 7);
        ctx.fillStyle = '#5d7b3a';
        ctx.fillRect(x - 12, y - 27, 4, 28);
        ctx.fillRect(x - 1, y - 34, 4, 35);
        ctx.fillRect(x + 10, y - 24, 4, 25);
        ctx.fillStyle = '#c79649';
        ctx.fillRect(x - 2, y - 38, 6, 8);
        return;
    }
    drawShadow(x, y + 2, 30, 8);
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
    drawShadow(x, y + 6, e.radius * 1.75, e.radius * 0.52);
    const bounce = Math.sin(now / 140) * (e.kind === 'slime' ? 3 : 1.2);
    if (e.windupUntil) {
        ctx.strokeStyle = e.boss ? 'rgba(183, 125, 255, 0.85)' : 'rgba(255, 209, 102, 0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, e.radius + 16 + Math.sin(now / 42) * 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (e.hurtUntil) {
        ctx.globalAlpha = 0.72;
        drawSpriteGrounded(e.kind, x, y + bounce, 3.2, { tint: '#ffffff' });
        ctx.globalAlpha = 1;
    } else {
        drawSpriteGrounded(e.kind, x, y + bounce, 3.2);
    }
    drawMiniBar(x, y + e.radius + 10, e.hp / e.maxHp, '#ff6b6b');
}

function drawPlayer(now) {
    const p = state.player;
    const x = worldX(p.x);
    const y = worldY(p.y);
    drawShadow(x, y + 5, 35, 10);
    const step = Math.sin(now / 90) * (keys.size ? 2 : 0);
    if (p.invincibleUntil > now && Math.floor(now / 80) % 2 === 0) ctx.globalAlpha = 0.55;
    drawSpriteGrounded('player', x, y + step, 4);
    ctx.globalAlpha = 1;
    if (p.attackUntil > now) {
        drawAttackSlash(x, y, p.facing, now);
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
    const target = nearestInteractable();
    if (target) {
        const item = target.item;
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(worldX(item.x), worldY(item.y), (item.radius || 42) + 12, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawUiOverlay() {
    drawTopBar(18, 18, 210, 13, state.player.hp / state.player.maxHp, '#ff6b6b', '生命');
    drawTopBar(18, 40, 210, 10, state.player.stamina / 100, '#5ee089', '体力');
    ctx.fillStyle = 'rgba(8, 14, 21, 0.72)';
    ctx.fillRect(18, 58, 460, 34);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Microsoft YaHei"';
    ctx.fillText(`目标：${questText()}`, 30, 80);

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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
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
    const width = sprite.w * scale;
    const height = sprite.rows.length * scale;
    drawSprite(name, centerX - width / 2, groundY - height, scale, options);
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
    if (key === 'e') interact();
    else if (key === ' ') attack();
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
