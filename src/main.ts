import * as THREE from 'three';
import { RECIPES } from './game/recipes';
import { canMoveTo, craftItem, createInitialState, harvestTile, type GameState } from './game/state';
import type { Direction } from './game/types';
import { getItemIcon, getPlayerTexture, getTileTexture } from './game/textures';
import './index.css';

const MOVE_SPEED = 4;
const TARGET_VISIBLE_TILES_AT_MIN_DIMENSION = 24;
const CAMERA_LERP = 0.1;
const TILE_Z = 0;
const PLAYER_Z = 0.1;

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element');
}

const app = document.createElement('div');
app.className = 'game-app';
root.appendChild(app);

const titleScreen = document.createElement('div');
titleScreen.className = 'title-screen';
app.appendChild(titleScreen);

const title = document.createElement('h1');
title.textContent = 'MINICRAFT';
titleScreen.appendChild(title);

const subtitle = document.createElement('p');
subtitle.className = 'subtitle';
subtitle.textContent = 'Prototipo Web - Explore, colete e crie!';
titleScreen.appendChild(subtitle);

const playButton = document.createElement('button');
playButton.id = 'play-button';
playButton.type = 'button';
playButton.textContent = 'PLAY';
titleScreen.appendChild(playButton);

const controls = document.createElement('div');
controls.className = 'controls';
controls.innerHTML = `
  <p>WASD / Setas - Mover</p>
  <p>ESPACO - Coletar recurso</p>
  <p>C - Crafting</p>
`;
titleScreen.appendChild(controls);

const viewport = document.createElement('div');
viewport.className = 'viewport is-hidden';
app.appendChild(viewport);

const hud = document.createElement('div');
hud.className = 'hud';
viewport.appendChild(hud);

const craftingOverlay = document.createElement('div');
craftingOverlay.className = 'crafting-overlay is-hidden';
viewport.appendChild(craftingOverlay);

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'WASD: mover | ESPACO: coletar | C: crafting';
viewport.appendChild(hint);

let started = false;
let state = createInitialState();
state.gameStarted = true;

const pressedKeys = new Set<string>();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;

let tileGeometry: THREE.PlaneGeometry | null = null;
let playerGeometry: THREE.PlaneGeometry | null = null;
const tileMaterials = new Map<string, THREE.MeshBasicMaterial>();
const tileMeshes: THREE.Mesh[][] = [];

let playerMaterial: THREE.MeshBasicMaterial | null = null;
let playerMesh: THREE.Mesh | null = null;

let directionFrame = 0;
let frameTimer = 0;
let lastDirection: Direction = state.player.direction;
let lastFrame = 0;
let lastTimestamp = performance.now();

function getTileMaterial(tileType: number, harvested: boolean): THREE.MeshBasicMaterial {
  const key = `${tileType}-${harvested}`;
  const cached = tileMaterials.get(key);
  if (cached) {
    return cached;
  }

  const material = new THREE.MeshBasicMaterial({ map: getTileTexture(tileType, harvested) });
  tileMaterials.set(key, material);
  return material;
}

function updateProjection(): void {
  if (!renderer || !camera) {
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const minDimension = Math.min(width, height);
  const adaptiveZoom = Math.max(8, Math.floor(minDimension / TARGET_VISIBLE_TILES_AT_MIN_DIMENSION));

  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.zoom = adaptiveZoom;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function inventoryAmount(itemId: string): number {
  return state.inventory.find((item) => item.id === itemId)?.quantity ?? 0;
}

function canCraft(recipeId: string): boolean {
  const recipe = RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) {
    return false;
  }

  return recipe.ingredients.every((ingredient) => inventoryAmount(ingredient.itemId) >= ingredient.quantity);
}

function renderHud(): void {
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;

  const inventoryHtml =
    state.inventory.length === 0
      ? ''
      : `
      <div class="inventory-panel">
        <div class="inventory-title">INVENTARIO</div>
        ${state.inventory
          .map(
            (item) => `
            <div class="inventory-row">
              <span class="inventory-icon">${getItemIcon(item.id)}</span>
              <span>${item.name}</span>
              <span class="inventory-qty">x${item.quantity}</span>
            </div>
          `,
          )
          .join('')}
      </div>
    `;

  hud.innerHTML = `
    <div class="health-row">
      <span class="heart">❤</span>
      <div class="health-track">
        <div class="health-fill" style="width: ${healthPercent}%"></div>
      </div>
      <span class="health-text">${state.player.health}/${state.player.maxHealth}</span>
    </div>
    ${inventoryHtml}
  `;
}

function renderCraftingMenu(): void {
  craftingOverlay.classList.toggle('is-hidden', !state.craftingOpen);
  if (!state.craftingOpen) {
    craftingOverlay.innerHTML = '';
    return;
  }

  craftingOverlay.innerHTML = `
    <div class="crafting-panel">
      <div class="crafting-header">
        <h2>CRAFTING</h2>
        <button type="button" data-close-crafting="true">ESC</button>
      </div>
      ${RECIPES.map((recipe) => {
        const available = canCraft(recipe.id);
        const ingredients = recipe.ingredients
          .map((ingredient) => {
            const amount = inventoryAmount(ingredient.itemId);
            const metClass = amount >= ingredient.quantity ? 'ok' : 'missing';
            return `<span class="ingredient ${metClass}">${getItemIcon(ingredient.itemId)} ${ingredient.itemId} ${amount}/${ingredient.quantity}</span>`;
          })
          .join('');

        return `
          <button type="button" class="recipe ${available ? 'available' : ''}" data-recipe-id="${recipe.id}" ${
            available ? '' : 'disabled'
          }>
            <div class="recipe-name">${getItemIcon(recipe.result.itemId)} ${recipe.name}</div>
            <div class="recipe-ingredients">${ingredients}</div>
          </button>
        `;
      }).join('')}
      <p class="crafting-footnote">Clique para craftar | C ou ESC para fechar</p>
    </div>
  `;
}

function refreshHarvestedTiles(previous: GameState, next: GameState): void {
  if (previous.map === next.map || tileMeshes.length === 0) {
    return;
  }

  for (let y = 0; y < next.map.length; y += 1) {
    for (let x = 0; x < next.map[y].length; x += 1) {
      const before = previous.map[y][x];
      const after = next.map[y][x];
      if (before.harvested !== after.harvested || before.type !== after.type) {
        tileMeshes[y][x].material = getTileMaterial(after.type, after.harvested);
      }
    }
  }
}

function applyState(nextState: GameState): void {
  const previous = state;
  state = nextState;
  refreshHarvestedTiles(previous, nextState);
  renderHud();
  renderCraftingMenu();
}

function toggleCrafting(open: boolean): void {
  applyState({ ...state, craftingOpen: open });
}

function onKeyDown(event: KeyboardEvent): void {
  if (!started) {
    return;
  }

  const key = event.key.toLowerCase();
  pressedKeys.add(key);

  if (key === ' ' || key === 'e') {
    event.preventDefault();
    applyState(harvestTile(state));
    return;
  }

  if (key === 'c') {
    event.preventDefault();
    toggleCrafting(!state.craftingOpen);
    return;
  }

  if (key === 'escape') {
    event.preventDefault();
    toggleCrafting(false);
  }
}

function onKeyUp(event: KeyboardEvent): void {
  if (!started) {
    return;
  }

  pressedKeys.delete(event.key.toLowerCase());
}

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('resize', updateProjection);

craftingOverlay.addEventListener('click', (event) => {
  if (!started) {
    return;
  }

  const target = event.target as HTMLElement;

  if (target.closest('[data-close-crafting="true"]')) {
    toggleCrafting(false);
    return;
  }

  const recipeButton = target.closest<HTMLButtonElement>('[data-recipe-id]');
  if (!recipeButton?.dataset.recipeId) {
    return;
  }

  applyState(craftItem(state, recipeButton.dataset.recipeId));
});

function updateMovement(delta: number): void {
  if (state.craftingOpen) {
    state.player.moving = false;
    return;
  }

  let dx = 0;
  let dy = 0;
  let direction: Direction | null = null;

  if (pressedKeys.has('w') || pressedKeys.has('arrowup')) {
    dy = -1;
    direction = 'up';
  }
  if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) {
    dy = 1;
    direction = 'down';
  }
  if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) {
    dx = -1;
    direction = 'left';
  }
  if (pressedKeys.has('d') || pressedKeys.has('arrowright')) {
    dx = 1;
    direction = 'right';
  }

  const moving = dx !== 0 || dy !== 0;

  if (!moving) {
    state.player.moving = false;
    return;
  }

  const length = Math.sqrt(dx * dx + dy * dy);
  const normalizedDx = dx / length;
  const normalizedDy = dy / length;

  const nextX = state.player.position.x + normalizedDx * MOVE_SPEED * delta;
  const nextY = state.player.position.y + normalizedDy * MOVE_SPEED * delta;

  state.player.position.x = canMoveTo(state.map, nextX, state.player.position.y) ? nextX : state.player.position.x;
  state.player.position.y = canMoveTo(state.map, state.player.position.x, nextY) ? nextY : state.player.position.y;
  state.player.direction = direction ?? state.player.direction;
  state.player.moving = true;
}

function updatePlayerSprite(delta: number): void {
  if (!playerMaterial) {
    return;
  }

  if (state.player.moving) {
    frameTimer += delta;
    if (frameTimer > 0.15) {
      directionFrame = (directionFrame + 1) % 4;
      frameTimer = 0;
    }
  } else {
    directionFrame = 0;
    frameTimer = 0;
  }

  const directionChanged = state.player.direction !== lastDirection;
  const frameChanged = directionFrame !== lastFrame;
  if (directionChanged || frameChanged) {
    playerMaterial.map = getPlayerTexture(state.player.direction, directionFrame);
    playerMaterial.needsUpdate = true;
    lastDirection = state.player.direction;
    lastFrame = directionFrame;
  }
}

function renderFrame(delta: number): void {
  if (!renderer || !scene || !camera || !playerMesh) {
    return;
  }

  updateMovement(delta);
  updatePlayerSprite(delta);

  playerMesh.position.set(state.player.position.x, -state.player.position.y, PLAYER_Z);

  const targetX = state.player.position.x;
  const targetY = -state.player.position.y;
  camera.position.x += (targetX - camera.position.x) * CAMERA_LERP;
  camera.position.y += (targetY - camera.position.y) * CAMERA_LERP;
  camera.lookAt(camera.position.x, camera.position.y, 0);

  renderer.render(scene, camera);
}

function loop(now: number): void {
  if (!started) {
    return;
  }

  const delta = Math.min((now - lastTimestamp) / 1000, 0.05);
  lastTimestamp = now;
  renderFrame(delta);
  requestAnimationFrame(loop);
}

function initThree(): void {
  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = 'game-canvas';
  viewport.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(state.player.position.x, -state.player.position.y, 10);
  scene.add(camera);

  tileGeometry = new THREE.PlaneGeometry(1, 1);
  playerGeometry = new THREE.PlaneGeometry(1, 1);

  for (let y = 0; y < state.map.length; y += 1) {
    const row: THREE.Mesh[] = [];
    for (let x = 0; x < state.map[y].length; x += 1) {
      const tile = state.map[y][x];
      const mesh = new THREE.Mesh(tileGeometry, getTileMaterial(tile.type, tile.harvested));
      mesh.position.set(x, -y, TILE_Z);
      scene.add(mesh);
      row.push(mesh);
    }
    tileMeshes.push(row);
  }

  playerMaterial = new THREE.MeshBasicMaterial({
    map: getPlayerTexture(state.player.direction, 0),
    transparent: true,
  });

  playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
  playerMesh.position.set(state.player.position.x, -state.player.position.y, PLAYER_Z);
  scene.add(playerMesh);

  updateProjection();
}

function startGame(): void {
  if (started) {
    return;
  }

  try {
    initThree();
  } catch (error) {
    titleScreen.innerHTML = '<p>Nao foi possivel iniciar o jogo neste navegador.</p>';
    console.error(error);
    return;
  }

  started = true;
  titleScreen.classList.add('is-hidden');
  viewport.classList.remove('is-hidden');

  renderHud();
  renderCraftingMenu();

  lastTimestamp = performance.now();
  requestAnimationFrame(loop);
}

playButton.addEventListener('click', startGame);
