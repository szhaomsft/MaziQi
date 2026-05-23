const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const TILE = 40;
const COLS = 24;
const ROWS = 16;
const RESOURCE_LABELS = {
    wood: '木头',
    stone: '石头',
    herb: '草药',
    ore: '矿石',
    fang: '兽牙',
    badge: '徽章',
};

const RECIPES = [
    {
        id: 'axe',
        name: '石斧',
        desc: '砍树效率 +1',
        cost: { wood: 3, stone: 2 },
        apply: state => {
            state.equipment.tool = '石斧';
            state.equipment.woodPower = 2;
        },
        owned: state => state.equipment.tool === '石斧' || state.equipment.tool === '铁镐',
    },
    {
        id: 'pickaxe',
        name: '铁镐',
        desc: '采石和挖矿效率 +1',
        cost: { wood: 2, stone: 3, ore: 2 },
        apply: state => {
            state.equipment.tool = '铁镐';
            state.equipment.stonePower = 2;
            state.equipment.orePower = 2;
        },
        owned: state => state.equipment.tool === '铁镐',
    },
    {
        id: 'sword',
        name: '铁剑',
        desc: '攻击力提升',
        cost: { wood: 2, stone: 1, ore: 3 },
        apply: state => {
            state.equipment.weapon = '铁剑';
            state.equipment.attack = 4;
        },
        owned: state => state.equipment.weapon === '铁剑',
    },
    {
        id: 'armor',
        name: '草药护符',
        desc: '最大生命 +30',
        cost: { herb: 5, ore: 1 },
        apply: state => {
            state.equipment.armor = '草药护符';
            state.player.maxHp = 130;
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 30);
        },
        owned: state => state.equipment.armor === '草药护符',
    },
    {
        id: 'potion',
        name: '治疗药水',
        desc: '恢复 35 生命',
        cost: { herb: 3 },
        apply: state => {
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 35);
        },
        owned: () => false,
    },
    {
        id: 'badge',
        name: '冒险者徽章',
        desc: '完成 Demo 的关键道具',
        cost: { wood: 4, stone: 4, ore: 4, fang: 1 },
        apply: state => {
            state.inventory.badge += 1;
            state.win = true;
            showToast('你合成了冒险者徽章，完成试炼！');
        },
        owned: state => state.inventory.badge > 0,
    },
];

const keys = new Set();
let toastTimer = null;
let state = createInitialState();

function createInitialState() {
    return {
        player: {
            x: 2,
            y: 2,
            hp: 100,
            maxHp: 100,
            facing: { x: 1, y: 0 },
        },
        inventory: { wood: 0, stone: 0, herb: 0, ore: 0, fang: 0, badge: 0 },
        equipment: {
            tool: '徒手',
            weapon: '木棍',
            armor: '布衣',
            attack: 1,
            woodPower: 1,
            stonePower: 1,
            orePower: 1,
        },
        resources: [
            resource('tree', 5, 3, 'wood', 5),
            resource('tree', 8, 2, 'wood', 5),
            resource('tree', 18, 4, 'wood', 5),
            resource('rock', 4, 10, 'stone', 5),
            resource('rock', 12, 12, 'stone', 5),
            resource('rock', 19, 11, 'stone', 5),
            resource('herb', 7, 8, 'herb', 4),
            resource('herb', 16, 7, 'herb', 4),
            resource('herb', 21, 13, 'herb', 4),
            resource('ore', 14, 4, 'ore', 6),
            resource('ore', 20, 8, 'ore', 6),
        ],
        monsters: [
            monster(11, 6, '史莱姆', 8, 1, 'fang'),
            monster(17, 10, '野狼', 14, 2, 'fang'),
            monster(21, 4, '守门兽', 24, 4, 'fang', true),
        ],
        walls: new Set([
            '10,2', '10,3', '10,4', '10,5',
            '3,7', '4,7', '5,7',
            '13,9', '14,9', '15,9',
            '6,13', '7,13', '8,13', '9,13',
        ]),
        win: false,
        lose: false,
        lastActionAt: 0,
    };
}

function resource(kind, x, y, gives, hp) {
    return { kind, x, y, gives, hp, maxHp: hp };
}

function monster(x, y, name, hp, attack, drop, boss = false) {
    return { x, y, name, hp, maxHp: hp, attack, drop, boss, cooldown: 0 };
}

function tileKey(x, y) {
    return `${x},${y}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
}

function canEnter(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    if (state.walls.has(tileKey(x, y))) return false;
    if (state.resources.some(item => item.hp > 0 && item.x === x && item.y === y)) return false;
    if (state.monsters.some(item => item.hp > 0 && item.x === x && item.y === y)) return false;
    return true;
}

function movePlayer(dx, dy) {
    if (state.win || state.lose) return;
    state.player.facing = { x: dx, y: dy };
    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    if (canEnter(nx, ny)) {
        state.player.x = nx;
        state.player.y = ny;
    }
}

function targetTile() {
    return {
        x: state.player.x + state.player.facing.x,
        y: state.player.y + state.player.facing.y,
    };
}

function action() {
    if (state.win || state.lose) return;
    const now = performance.now();
    if (now - state.lastActionAt < 160) return;
    state.lastActionAt = now;

    const target = targetTile();
    const resourceNode = state.resources.find(item => item.hp > 0 && item.x === target.x && item.y === target.y);
    if (resourceNode) {
        harvest(resourceNode);
        return;
    }

    const enemy = state.monsters.find(item => item.hp > 0 && item.x === target.x && item.y === target.y);
    if (enemy) {
        attack(enemy);
        return;
    }

    showToast('面前没有可采集或攻击的目标。');
}

function harvest(node) {
    const power = node.gives === 'wood'
        ? state.equipment.woodPower
        : (node.gives === 'stone' ? state.equipment.stonePower : (node.gives === 'ore' ? state.equipment.orePower : 1));
    node.hp -= power;
    if (node.hp <= 0) {
        const amountByResource = { wood: 4, stone: 4, herb: 2, ore: 5 };
        const amount = amountByResource[node.gives] || 1;
        state.inventory[node.gives] += amount;
        showToast(`获得 ${RESOURCE_LABELS[node.gives]} x${amount}`);
    } else {
        showToast(`${nameForResource(node.kind)} 剩余耐久 ${Math.max(0, node.hp)}/${node.maxHp}`);
    }
    renderHud();
}

function attack(enemy) {
    enemy.hp -= state.equipment.attack;
    if (enemy.hp <= 0) {
        state.inventory[enemy.drop] += enemy.boss ? 2 : 1;
        showToast(`击败 ${enemy.name}，获得 ${RESOURCE_LABELS[enemy.drop]}！`);
    } else {
        state.player.hp -= Math.max(1, enemy.attack - (state.equipment.armor === '草药护符' ? 1 : 0));
        showToast(`${enemy.name} 还剩 ${enemy.hp}/${enemy.maxHp} 生命。`);
        if (state.player.hp <= 0) {
            state.player.hp = 0;
            state.lose = true;
            showToast('你倒下了，点击重新开始再试一次。');
        }
    }
    renderHud();
}

function nameForResource(kind) {
    return {
        tree: '树木',
        rock: '岩石',
        herb: '草药',
        ore: '矿脉',
    }[kind] || '资源';
}

function canCraft(recipe) {
    if (recipe.owned(state)) return false;
    return Object.entries(recipe.cost).every(([key, amount]) => state.inventory[key] >= amount);
}

function craft(recipeId) {
    const recipe = RECIPES.find(item => item.id === recipeId);
    if (!recipe || !canCraft(recipe)) return;
    Object.entries(recipe.cost).forEach(([key, amount]) => {
        state.inventory[key] -= amount;
    });
    recipe.apply(state);
    if (!state.win) showToast(`合成成功：${recipe.name}`);
    renderHud();
}

function renderHud() {
    document.getElementById('hp-label').textContent = `${state.player.hp}/${state.player.maxHp}`;
    document.getElementById('hp-bar').style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
    document.getElementById('attack-label').textContent = state.equipment.attack;
    document.getElementById('tool-label').textContent = state.equipment.tool;
    document.getElementById('armor-label').textContent = state.equipment.armor;

    const inventory = document.getElementById('inventory');
    inventory.innerHTML = '';
    Object.entries(RESOURCE_LABELS).forEach(([key, label]) => {
        const row = document.createElement('div');
        row.className = 'inventory-row';
        row.innerHTML = `<span>${label}</span><strong>${state.inventory[key]}</strong>`;
        inventory.appendChild(row);
    });

    const recipes = document.getElementById('recipes');
    recipes.innerHTML = '';
    RECIPES.forEach(recipe => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'recipe-btn';
        button.disabled = !canCraft(recipe);
        const cost = Object.entries(recipe.cost)
            .map(([key, amount]) => `${RESOURCE_LABELS[key]} ${amount}`)
            .join(' · ');
        button.innerHTML = `
            <div class="recipe-title"><span>${recipe.name}</span><small>${recipe.desc}</small></div>
            <div class="recipe-cost"><span>${cost}</span><span>${recipe.owned(state) ? '已拥有' : (button.disabled ? '材料不足' : '可合成')}</span></div>
        `;
        button.addEventListener('click', () => craft(recipe.id));
        recipes.appendChild(button);
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGround();
    drawWalls();
    drawResources();
    drawMonsters();
    drawPlayer();
    drawOverlay();
    requestAnimationFrame(draw);
}

function drawGround() {
    ctx.fillStyle = '#24402e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#2f5138' : '#2a4933';
            ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
    }
}

function drawWalls() {
    for (const key of state.walls) {
        const [x, y] = key.split(',').map(Number);
        drawTile(x, y, '#51616c', '#2f3a42', '墙');
    }
}

function drawResources() {
    for (const node of state.resources) {
        if (node.hp <= 0) continue;
        const color = {
            tree: '#2fd36b',
            rock: '#9ba8b3',
            herb: '#79f2a6',
            ore: '#76d7ff',
        }[node.kind];
        const label = {
            tree: '树',
            rock: '石',
            herb: '草',
            ore: '矿',
        }[node.kind];
        drawTile(node.x, node.y, color, 'rgba(0,0,0,0.22)', label);
        drawMiniBar(node.x, node.y, node.hp / node.maxHp, '#ffd166');
    }
}

function drawMonsters() {
    for (const enemy of state.monsters) {
        if (enemy.hp <= 0) continue;
        drawTile(enemy.x, enemy.y, enemy.boss ? '#c22635' : '#d96b4b', '#4a1f21', enemy.boss ? '兽' : '怪');
        drawMiniBar(enemy.x, enemy.y, enemy.hp / enemy.maxHp, '#ff6b6b');
    }
}

function drawPlayer() {
    const px = state.player.x * TILE + TILE / 2;
    const py = state.player.y * TILE + TILE / 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(px, py, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a3710';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#1c2431';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('你', px, py + 1);

    const target = targetTile();
    if (target.x >= 0 && target.x < COLS && target.y >= 0 && target.y < ROWS) {
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.85)';
        ctx.lineWidth = 3;
        ctx.strokeRect(target.x * TILE + 4, target.y * TILE + 4, TILE - 8, TILE - 8);
    }
}

function drawTile(x, y, fill, shadow, label) {
    const left = x * TILE;
    const top = y * TILE;
    ctx.fillStyle = shadow;
    ctx.fillRect(left + 4, top + 6, TILE - 8, TILE - 8);
    ctx.fillStyle = fill;
    ctx.fillRect(left + 5, top + 4, TILE - 10, TILE - 10);
    ctx.fillStyle = '#102033';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, left + TILE / 2, top + TILE / 2 + 1);
}

function drawMiniBar(x, y, percent, color) {
    const left = x * TILE + 7;
    const top = y * TILE + TILE - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(left, top, TILE - 14, 4);
    ctx.fillStyle = color;
    ctx.fillRect(left, top, (TILE - 14) * Math.max(0, Math.min(1, percent)), 4);
}

function drawOverlay() {
    if (!state.win && !state.lose) return;
    ctx.fillStyle = 'rgba(7, 12, 18, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.win ? '试炼完成！' : '冒险失败', canvas.width / 2, canvas.height / 2 - 18);
    ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
    ctx.fillText(state.win ? '你打造了冒险者徽章。' : '重新开始，先合成装备再挑战怪物。', canvas.width / 2, canvas.height / 2 + 28);
}

function tick() {
    let dx = 0;
    let dy = 0;
    if (keys.has('ArrowUp') || keys.has('w')) dy = -1;
    else if (keys.has('ArrowDown') || keys.has('s')) dy = 1;
    else if (keys.has('ArrowLeft') || keys.has('a')) dx = -1;
    else if (keys.has('ArrowRight') || keys.has('d')) dx = 1;
    if (dx || dy) movePlayer(dx, dy);
}

window.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(key)) {
        event.preventDefault();
    }
    if (key === ' ') action();
    else keys.add(key);
});

window.addEventListener('keyup', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
});

document.getElementById('restart-btn').addEventListener('click', () => {
    state = createInitialState();
    showToast('新的冒险开始了。先采集树木和岩石。');
    renderHud();
});

renderHud();
showToast('靠近资源后按空格采集。');
setInterval(tick, 120);
requestAnimationFrame(draw);
