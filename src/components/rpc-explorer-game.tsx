"use client";

import { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type GameStation = {
  id: string;
  name: string;
  x: number;
  height: number;
  recipeId: string;
  method: string;
  color: string;
  reward: number;
  description: string;
  mockResult: string;
};

type GameItem = {
  id: number;
  type: "pokt" | "potion" | "key" | "map" | "node";
  x: number;
  y: number;
  collected: boolean;
  xp: number;
};

type Platform = { x: number; y: number; w: number };

type StationDialog = {
  station: GameStation;
  loading: boolean;
  result: string | null;
  xpAwarded: boolean;
  alreadyCompleted: boolean;
};

type FloatingText = {
  text: string;
  timer: number;
  color: string;
  x: number;
  y: number;
};

type GameState = {
  playerX: number;
  playerY: number;
  playerVelY: number;
  facing: "left" | "right";
  animFrame: number;
  animTimer: number;
  animState: "idle" | "walk" | "run" | "interact";
  isGrounded: boolean;
  cameraX: number;
  items: GameItem[];
  collectedCount: number;
  nearStation: string | null;
  activeDialog: StationDialog | null;
  keys: Set<string>;
  interactPressed: boolean;
  switchToPlayground: boolean;
  floatingTexts: FloatingText[];
  welcomeTimer: number;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CW = 800;
const CH = 450;
const WORLD_W = 3400;
const GROUND_Y = 370;
const PW = 36;
const PH = 60;
const PLAYER_SPEED = 2.8;
const RUN_SPEED = 4.5;
const JUMP_FORCE = -8.5;
const GRAVITY = 0.45;
const FRAME_DURATION = 140;

// ═══════════════════════════════════════════════════════════════════════════════
//  WORLD DATA
// ═══════════════════════════════════════════════════════════════════════════════

const STATIONS: GameStation[] = [
  {
    id: "genesis", name: "Genesis Tower", x: 500, height: 110,
    recipeId: "latest-block", method: "eth_blockNumber",
    color: "#4a90d9", reward: 50,
    description: "Read the newest block height from the network.",
    mockResult: "Block #21,342,567 (0x145B9F7)",
  },
  {
    id: "chaingate", name: "Chain Gate", x: 1100, height: 90,
    recipeId: "chain-id", method: "eth_chainId",
    color: "#34d399", reward: 50,
    description: "Identify a chain's unique network identifier.",
    mockResult: "Chain ID: 1 — Ethereum Mainnet",
  },
  {
    id: "gasoracle", name: "Gas Oracle", x: 1700, height: 100,
    recipeId: "gas-price", method: "eth_gasPrice",
    color: "#f59e0b", reward: 75,
    description: "Get the current gas price on the network.",
    mockResult: "Gas: 23.4 Gwei (0x5745D0B00)",
  },
  {
    id: "vault", name: "Wallet Vault", x: 2300, height: 95,
    recipeId: "wallet-balance", method: "eth_getBalance",
    color: "#8b5cf6", reward: 75,
    description: "Check any wallet's native token balance.",
    mockResult: "Balance: 1.337 ETH",
  },
  {
    id: "archives", name: "TX Archives", x: 2900, height: 105,
    recipeId: "transaction", method: "eth_getTransactionByHash",
    color: "#ef4444", reward: 100,
    description: "Look up transaction details by hash.",
    mockResult: "TX found — Status: Success ✓",
  },
];

const PLATFORMS: Platform[] = [
  { x: 320, y: GROUND_Y - 80, w: 80 },
  { x: 850, y: GROUND_Y - 100, w: 64 },
  { x: 1400, y: GROUND_Y - 85, w: 72 },
  { x: 2000, y: GROUND_Y - 90, w: 68 },
  { x: 2600, y: GROUND_Y - 80, w: 76 },
  { x: 3150, y: GROUND_Y - 95, w: 64 },
];

const TREE_XS = [150, 380, 680, 950, 1250, 1550, 1850, 2050, 2450, 2750, 3050, 3250];

function createItems(): GameItem[] {
  const ground: GameItem[] = [
    { id: 1, type: "pokt", x: 220, y: GROUND_Y - 50, collected: false, xp: 25 },
    { id: 2, type: "potion", x: 430, y: GROUND_Y - 40, collected: false, xp: 10 },
    { id: 3, type: "key", x: 700, y: GROUND_Y - 48, collected: false, xp: 15 },
    { id: 4, type: "pokt", x: 980, y: GROUND_Y - 52, collected: false, xp: 25 },
    { id: 5, type: "map", x: 1280, y: GROUND_Y - 44, collected: false, xp: 15 },
    { id: 6, type: "node", x: 1550, y: GROUND_Y - 56, collected: false, xp: 20 },
    { id: 7, type: "pokt", x: 1850, y: GROUND_Y - 48, collected: false, xp: 25 },
    { id: 8, type: "potion", x: 2080, y: GROUND_Y - 40, collected: false, xp: 10 },
    { id: 9, type: "key", x: 2450, y: GROUND_Y - 52, collected: false, xp: 15 },
    { id: 10, type: "pokt", x: 2700, y: GROUND_Y - 50, collected: false, xp: 25 },
    { id: 11, type: "map", x: 3050, y: GROUND_Y - 44, collected: false, xp: 15 },
    { id: 12, type: "pokt", x: 3250, y: GROUND_Y - 48, collected: false, xp: 25 },
  ];
  const onPlat: GameItem[] = PLATFORMS.map((p, i) => ({
    id: 100 + i,
    type: (["pokt", "node", "pokt", "node", "pokt", "node"] as const)[i],
    x: p.x + p.w / 2 - 8,
    y: p.y - 50,
    collected: false,
    xp: 40,
  }));
  return [...ground, ...onPlat];
}

const ITEM_LABELS: Record<string, string> = {
  pokt: "POKT Token", potion: "Data Potion", key: "Chain Key",
  map: "Network Map", node: "Node Shard",
};

const STAR_SEEDS: [number, number][] = [];
for (let i = 0; i < 50; i++) {
  STAR_SEEDS.push([((i * 173 + 37) % 800), ((i * 97 + 13) % 120)]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawSky(ctx: CanvasRenderingContext2D, cameraX: number, time: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, "#080818");
  grad.addColorStop(0.35, "#10102a");
  grad.addColorStop(0.7, "#181840");
  grad.addColorStop(1, "#202055");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, GROUND_Y);

  for (const [sx, sy] of STAR_SEEDS) {
    const px = ((sx - cameraX * 0.015) % CW + CW) % CW;
    const tw = Math.sin(time / 1200 + sx * 0.07) * 0.35 + 0.65;
    ctx.globalAlpha = tw;
    ctx.fillStyle = "#fff";
    ctx.fillRect(Math.round(px), sy, sy % 3 === 0 ? 2 : 1, sy % 3 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;

  ctx.font = "7px monospace";
  const hexes = ["0xBEEF", "0xDEAD", "0xCAFE", "0x1337", "0xFF00", "0x4269"];
  for (let i = 0; i < hexes.length; i++) {
    const hx = ((i * 250 + 60 - cameraX * 0.04) % (CW + 160) + CW + 160) % (CW + 160) - 80;
    const hy = 130 + Math.sin(time / 2200 + i * 1.3) * 18;
    ctx.fillStyle = "rgba(100,130,255,0.12)";
    ctx.fillText(hexes[i], hx, hy);
  }

  ctx.fillStyle = "#0e0e28";
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= CW; x += 3) {
    const wx = x + cameraX * 0.06;
    ctx.lineTo(x, GROUND_Y - (Math.sin(wx * 0.008) * 55 + Math.sin(wx * 0.019) * 35 + 70));
  }
  ctx.lineTo(CW, GROUND_Y);
  ctx.fill();

  ctx.fillStyle = "#141435";
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= CW; x += 3) {
    const wx = x + cameraX * 0.14;
    ctx.lineTo(x, GROUND_Y - (Math.sin(wx * 0.012) * 38 + Math.sin(wx * 0.028) * 25 + 42));
  }
  ctx.lineTo(CW, GROUND_Y);
  ctx.fill();
}

function drawGround(ctx: CanvasRenderingContext2D, cameraX: number) {
  const bs = 32;
  const startB = Math.floor(cameraX / bs);
  const endB = startB + Math.ceil(CW / bs) + 1;
  for (let i = startB; i <= endB; i++) {
    const bx = i * bs - cameraX;
    ctx.fillStyle = i % 2 === 0 ? "#252840" : "#222538";
    ctx.fillRect(bx, GROUND_Y, bs, CH - GROUND_Y);
    ctx.fillStyle = "#353860";
    ctx.fillRect(bx, GROUND_Y, bs, 3);
    ctx.strokeStyle = "#1a1d30";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx + 0.5, GROUND_Y + 0.5, bs - 1, bs - 1);
    if (i % 4 === 0) {
      ctx.fillStyle = "#2a2d50";
      ctx.font = "5px monospace";
      ctx.fillText(`#${((i * 137) % 9999).toString().padStart(4, "0")}`, bx + 3, GROUND_Y + 20);
    }
  }
  ctx.strokeStyle = "rgba(100,180,255,0.06)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.moveTo(Math.max(0, STATIONS[0].x + 50 - cameraX), GROUND_Y + 14);
  for (const s of STATIONS) {
    const sx = s.x + 50 - cameraX;
    if (sx > -100 && sx < CW + 100) ctx.lineTo(sx, GROUND_Y + 14);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlatforms(ctx: CanvasRenderingContext2D, cameraX: number) {
  for (const p of PLATFORMS) {
    const px = p.x - cameraX;
    if (px < -p.w - 10 || px > CW + 10) continue;
    ctx.fillStyle = "#2e3150";
    ctx.fillRect(px, p.y, p.w, 14);
    ctx.fillStyle = "#424670";
    ctx.fillRect(px, p.y, p.w, 4);
    ctx.strokeStyle = "#1a1d30";
    ctx.lineWidth = 0.5;
    for (let bx = 0; bx < p.w; bx += 16) {
      ctx.strokeRect(px + bx + 0.5, p.y + 0.5, Math.min(16, p.w - bx), 13);
    }
  }
}

function drawTrees(ctx: CanvasRenderingContext2D, cameraX: number) {
  for (const tx of TREE_XS) {
    const x = tx - cameraX;
    if (x < -30 || x > CW + 30) continue;
    const y = GROUND_Y - 46;
    ctx.fillStyle = "#3E2723";
    ctx.fillRect(x + 8, y + 30, 6, 16);
    ctx.fillStyle = "#1B5E20";
    ctx.fillRect(x + 1, y + 18, 20, 14);
    ctx.fillStyle = "#2E7D32";
    ctx.fillRect(x + 3, y + 8, 16, 12);
    ctx.fillStyle = "#388E3C";
    ctx.fillRect(x + 5, y, 12, 10);
  }
}

function drawPax(ctx: CanvasRenderingContext2D, gs: GameState) {
  const screenX = Math.round(gs.playerX - gs.cameraX);
  const screenY = Math.round(gs.playerY);
  const f = gs.animFrame;
  const walking = gs.animState === "walk" || gs.animState === "run";
  const interacting = gs.animState === "interact";

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (gs.facing === "left") {
    ctx.translate(screenX + PW, screenY);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(screenX, screenY);
  }

  const s = 2;
  const by = walking ? [0, -1, 0, -1][f % 4] * s : 0;
  const lp = walking ? f % 4 : 0;
  const armSwing = walking ? [-2, 0, 2, 0][f % 4] * s : 0;

  const fill = (px: number, py: number, w: number, h: number) =>
    ctx.fillRect(px * s, py * s + by, w * s, h * s);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(2, PH - 4 - by, PW - 4, 6);

  // Boots
  ctx.fillStyle = "#4E342E";
  if (lp === 1) { fill(3, 27, 4, 4); fill(11, 25, 4, 4); }
  else if (lp === 3) { fill(3, 25, 4, 4); fill(11, 27, 4, 4); }
  else { fill(3, 26, 5, 4); fill(10, 26, 5, 4); }

  // Pants
  ctx.fillStyle = "#37474F";
  fill(4, 20, 10, 7);

  // Belt
  ctx.fillStyle = "#6D4C41";
  fill(3, 19, 12, 2);
  ctx.fillStyle = "#FFD700";
  fill(8, 19, 2, 2);

  // Torso
  ctx.fillStyle = "#2E7D32";
  fill(3, 10, 12, 10);
  ctx.fillStyle = "#43A047";
  fill(5, 11, 2, 7);
  fill(11, 11, 2, 7);

  // Arms
  ctx.fillStyle = "#2E7D32";
  const a1 = 12 * s + armSwing + by;
  const a2 = 12 * s - armSwing + by;
  ctx.fillRect(1 * s, a1, 3 * s, 7 * s);
  ctx.fillRect(14 * s, a2, 3 * s, 7 * s);
  ctx.fillStyle = "#DEBB9B";
  ctx.fillRect(1 * s, a1 + 7 * s, 3 * s, 2 * s);
  ctx.fillRect(14 * s, a2 + 7 * s, 3 * s, 2 * s);

  // Head
  ctx.fillStyle = "#DEBB9B";
  fill(4, 3, 10, 8);

  // Hair
  ctx.fillStyle = "#7B4B2A";
  fill(3, 0, 12, 4);
  fill(3, 2, 3, 3);
  fill(12, 2, 3, 3);

  // Goggles band
  ctx.fillStyle = "#00897B";
  fill(3, 4, 12, 3);
  ctx.fillStyle = "#B2EBF2";
  fill(4, 5, 3, 2);
  fill(10, 5, 3, 2);
  ctx.fillStyle = "#00695C";
  fill(3, 4, 12, 1);

  // Eyes
  ctx.fillStyle = "#1a1a2e";
  fill(5, 8, 2, 1);
  fill(11, 8, 2, 1);

  // Mouth
  ctx.fillStyle = "#C9956B";
  fill(7, 10, 3, 1);

  // Interaction glow
  if (interacting) {
    ctx.fillStyle = "#00E5FF";
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3;
    ctx.fillRect(15 * s, 13 * s + by, 5 * s, 5 * s);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawStation(
  ctx: CanvasRenderingContext2D, station: GameStation,
  cameraX: number, isNear: boolean, isCompleted: boolean, time: number,
) {
  const sx = station.x - cameraX;
  if (sx < -140 || sx > CW + 40) return;
  const bw = 100;
  const bh = station.height;
  const x = sx;
  const y = GROUND_Y - bh;
  const c = station.color;

  if (isNear) {
    const grad = ctx.createRadialGradient(x + bw / 2, GROUND_Y, 4, x + bw / 2, GROUND_Y, 80);
    grad.addColorStop(0, c + "30");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(x - 30, GROUND_Y - 20, bw + 60, 40);
  }

  ctx.fillStyle = c + "18";
  ctx.fillRect(x, y, bw, bh);
  ctx.strokeStyle = c + "60";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, bw, bh);

  ctx.fillStyle = c + "90";
  ctx.fillRect(x - 6, y - 8, bw + 12, 10);
  ctx.fillStyle = c;
  ctx.fillRect(x - 6, y - 8, bw + 12, 3);

  ctx.fillStyle = c + "30";
  ctx.fillRect(x + 12, y + 22, 16, 12);
  ctx.fillRect(x + bw - 28, y + 22, 16, 12);
  ctx.fillStyle = c + "50";
  ctx.fillRect(x + 14, y + 24, 12, 8);
  ctx.fillRect(x + bw - 26, y + 24, 12, 8);

  ctx.fillStyle = c + "25";
  ctx.fillRect(x + bw / 2 - 10, GROUND_Y - 28, 20, 28);
  ctx.strokeStyle = c + "70";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + bw / 2 - 10, GROUND_Y - 28, 20, 28);

  const pulse = Math.sin(time / 400) * 0.3 + 0.7;
  ctx.fillStyle = c;
  ctx.globalAlpha = isNear ? pulse : 0.5;
  ctx.beginPath();
  ctx.arc(x + bw / 2, y - 16, isNear ? 7 : 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 8px monospace";
  ctx.fillText(station.name.toUpperCase(), x + bw / 2, y - 28);
  ctx.fillStyle = c;
  ctx.font = "7px monospace";
  ctx.fillText(station.method, x + bw / 2, y - 19);
  ctx.textAlign = "left";

  if (isCompleted) {
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.arc(x + bw - 8, y + 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u2713", x + bw - 8, y + 14);
    ctx.textAlign = "left";
  }

  if (isNear) {
    const bob = Math.sin(time / 350) * 3;
    ctx.textAlign = "center";
    roundRect(ctx, x + bw / 2 - 32, y - 50 + bob, 64, 18, 4);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("\u25BC Press E", x + bw / 2, y - 37 + bob);
    ctx.textAlign = "left";
  }
}

function drawItem(
  ctx: CanvasRenderingContext2D, item: GameItem,
  cameraX: number, time: number,
) {
  const ix = item.x - cameraX;
  if (ix < -20 || ix > CW + 20) return;
  const float = Math.sin(time / 550 + item.id * 1.7) * 5;
  const iy = item.y + float;

  ctx.globalAlpha = 0.15 + Math.sin(time / 400 + item.id) * 0.08;
  ctx.fillStyle = item.type === "pokt" ? "#FFD700" : item.type === "node" ? "#00BCD4" : "#fff";
  ctx.beginPath();
  ctx.arc(ix + 8, iy + 8, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  switch (item.type) {
    case "pokt":
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(ix + 8, iy + 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#B8860B";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("P", ix + 8, iy + 11);
      ctx.textAlign = "left";
      break;
    case "potion":
      ctx.fillStyle = "#C62828";
      ctx.fillRect(ix + 4, iy + 6, 8, 10);
      ctx.fillStyle = "#795548";
      ctx.fillRect(ix + 5, iy + 2, 6, 5);
      ctx.fillStyle = "#EF5350";
      ctx.fillRect(ix + 5, iy + 7, 6, 4);
      break;
    case "key":
      ctx.fillStyle = "#FFC107";
      ctx.beginPath();
      ctx.arc(ix + 5, iy + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(ix + 8, iy + 7, 7, 2);
      ctx.fillRect(ix + 13, iy + 5, 2, 6);
      break;
    case "map":
      ctx.fillStyle = "#D7CCC8";
      ctx.fillRect(ix + 3, iy + 4, 10, 12);
      ctx.fillStyle = "#8D6E63";
      ctx.fillRect(ix + 2, iy + 3, 12, 3);
      ctx.fillRect(ix + 2, iy + 14, 12, 3);
      ctx.fillStyle = "#A1887F";
      ctx.fillRect(ix + 5, iy + 7, 6, 1);
      ctx.fillRect(ix + 5, iy + 10, 4, 1);
      break;
    case "node":
      ctx.strokeStyle = "#00838F";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ix + 8, iy + 8, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#00BCD4";
      ctx.beginPath();
      ctx.arc(ix + 8, iy + 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#B2EBF2";
      ctx.beginPath();
      ctx.arc(ix + 8, iy + 8, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  xp: number, completedCount: number, collectedItems: number,
  stationProgress: boolean[],
) {
  ctx.fillStyle = "rgba(8,8,24,0.88)";
  ctx.fillRect(0, 0, CW, 34);
  ctx.fillStyle = "#1a1d3a";
  ctx.fillRect(0, 34, CW, 1);

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`\u26A1 ${xp.toLocaleString()} XP`, 14, 22);

  ctx.fillStyle = "#9e9eb8";
  ctx.font = "10px monospace";
  ctx.fillText(`Stations: ${completedCount}/${STATIONS.length}`, 150, 22);

  ctx.fillStyle = "#4CAF50";
  ctx.fillText(`Items: ${collectedItems}`, 310, 22);

  const indStart = CW - 190;
  for (let i = 0; i < STATIONS.length; i++) {
    const ix = indStart + i * 34;
    const done = stationProgress[i];
    ctx.fillStyle = STATIONS[i].color + (done ? "ff" : "30");
    roundRect(ctx, ix, 10, 26, 14, 3);
    ctx.fill();
    if (done) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u2713", ix + 13, 21);
      ctx.textAlign = "left";
    }
  }

  ctx.fillStyle = "rgba(8,8,24,0.55)";
  ctx.fillRect(0, CH - 22, CW, 22);
  ctx.fillStyle = "#555578";
  ctx.font = "8px monospace";
  ctx.fillText("\u2190 \u2192 Walk   SHIFT Run   SPACE Jump   E Interact   T Playground", 14, CH - 7);
}

function drawDialog(ctx: CanvasRenderingContext2D, dialog: StationDialog, time: number) {
  const dw = 380;
  const dh = 220;
  const dx = (CW - dw) / 2;
  const dy = (CH - dh) / 2 - 10;
  const c = dialog.station.color;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, CW, CH);

  roundRect(ctx, dx, dy, dw, dh, 8);
  ctx.fillStyle = "#12142a";
  ctx.fill();
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = c + "20";
  ctx.fillRect(dx + 2, dy + 2, dw - 4, 30);
  ctx.fillStyle = c;
  ctx.fillRect(dx + 2, dy + 30, dw - 4, 2);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px monospace";
  ctx.fillText(`\u2605 ${dialog.station.name.toUpperCase()}`, dx + 16, dy + 22);

  ctx.fillStyle = c;
  ctx.font = "bold 10px monospace";
  ctx.fillText(dialog.station.method, dx + 16, dy + 52);

  ctx.fillStyle = "#8888aa";
  ctx.font = "10px sans-serif";
  ctx.fillText(dialog.station.description, dx + 16, dy + 70);

  if (dialog.loading) {
    ctx.fillStyle = "#1a1d3a";
    ctx.fillRect(dx + 16, dy + 90, dw - 32, 10);
    const loadW = ((time / 8) % (dw - 32));
    ctx.fillStyle = c;
    ctx.fillRect(dx + 16, dy + 90, loadW, 10);
    ctx.fillStyle = "#aaa";
    ctx.font = "10px monospace";
    ctx.fillText("Querying blockchain via POKT relay...", dx + 16, dy + 120);
  } else if (dialog.result) {
    roundRect(ctx, dx + 16, dy + 88, dw - 32, 36, 4);
    ctx.fillStyle = "#0a0c1a";
    ctx.fill();
    ctx.strokeStyle = c + "40";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#4CAF50";
    ctx.font = "bold 11px monospace";
    ctx.fillText(dialog.result, dx + 26, dy + 111);

    if (dialog.xpAwarded) {
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`+${dialog.station.reward} XP \u26A1`, dx + 16, dy + 148);
    }
    if (dialog.alreadyCompleted && !dialog.xpAwarded) {
      ctx.fillStyle = "#666";
      ctx.font = "9px monospace";
      ctx.fillText("(Previously completed)", dx + 16, dy + 148);
    }

    ctx.fillStyle = "#555578";
    ctx.font = "bold 9px monospace";
    ctx.fillText("[E] Close", dx + 16, dy + dh - 16);
    ctx.fillStyle = c;
    ctx.fillText("[T] Open in Playground \u2192", dx + dw - 180, dy + dh - 16);
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[], cameraX: number) {
  for (const ft of texts) {
    ctx.globalAlpha = Math.min(1, ft.timer / 20);
    ctx.fillStyle = ft.color;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x - cameraX, ft.y - (55 - ft.timer));
    ctx.textAlign = "left";
  }
  ctx.globalAlpha = 1;
}

function drawWelcome(ctx: CanvasRenderingContext2D, timer: number) {
  if (timer <= 0) return;
  ctx.globalAlpha = Math.min(1, timer / 40);
  const bw = 420;
  const bh = 60;
  const bx = (CW - bw) / 2;
  const by = 55;
  roundRect(ctx, bx, by, bw, bh, 8);
  ctx.fillStyle = "rgba(10,12,30,0.92)";
  ctx.fill();
  ctx.strokeStyle = "#4a90d9";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText("POKT JOURNEY \u2014 RPC Explorer", CW / 2, by + 24);
  ctx.fillStyle = "#9e9eb8";
  ctx.font = "10px monospace";
  ctx.fillText("Use \u2190 \u2192 to walk  \u00B7  SPACE jump  \u00B7  E interact with stations", CW / 2, by + 44);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export type RpcExplorerGameProps = {
  xp: number;
  progress: string[];
  onStationComplete: (recipeId: string, xpAmount: number, label: string) => void;
  onItemCollect: (xpAmount: number, label: string) => void;
  onSwitchToPlayground: (recipeId: string) => void;
};

function createInitialState(): GameState {
  return {
    playerX: 60, playerY: GROUND_Y - PH, playerVelY: 0,
    facing: "right", animFrame: 0, animTimer: 0, animState: "idle",
    isGrounded: true, cameraX: 0,
    items: createItems(), collectedCount: 0,
    nearStation: null, activeDialog: null,
    keys: new Set(), interactPressed: false, switchToPlayground: false,
    floatingTexts: [], welcomeTimer: 200,
  };
}

export function RpcExplorerGame({
  xp, progress, onStationComplete, onItemCollect, onSwitchToPlayground,
}: RpcExplorerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>(createInitialState());
  const rafRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  const progressRef = useRef(progress);
  const xpRef = useRef(xp);
  const onStationRef = useRef(onStationComplete);
  const onItemRef = useRef(onItemCollect);
  const onSwitchRef = useRef(onSwitchToPlayground);

  useEffect(() => {
    progressRef.current = progress;
    xpRef.current = xp;
    onStationRef.current = onStationComplete;
    onItemRef.current = onItemCollect;
    onSwitchRef.current = onSwitchToPlayground;
  }, [progress, xp, onStationComplete, onItemCollect, onSwitchToPlayground]);

  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isTouch !== isMobile) setIsMobile(isTouch);
  }, [isMobile]);

  // Keyboard
  useEffect(() => {
    const gs = gsRef.current;
    function onKD(e: KeyboardEvent) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      gs.keys.add(e.key);
      if (e.key.toLowerCase() === "e") gs.interactPressed = true;
      if (e.key.toLowerCase() === "t") gs.switchToPlayground = true;
    }
    function onKU(e: KeyboardEvent) { gs.keys.delete(e.key); }
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);
    return () => { window.removeEventListener("keydown", onKD); window.removeEventListener("keyup", onKU); };
  }, []);

  // Game Loop
  useEffect(() => {
    let lastTime = performance.now();

    function loop(now: number) {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      const gs = gsRef.current;

      // ── UPDATE ──
      if (gs.welcomeTimer > 0) gs.welcomeTimer -= 1;

      const keys = gs.keys;
      const left = keys.has("ArrowLeft") || keys.has("a");
      const right = keys.has("ArrowRight") || keys.has("d");
      const jump = keys.has(" ") || keys.has("ArrowUp") || keys.has("w");
      const run = keys.has("Shift");

      if (!gs.activeDialog) {
        const speed = run ? RUN_SPEED : PLAYER_SPEED;
        if (left) { gs.playerX -= speed; gs.facing = "left"; gs.animState = run ? "run" : "walk"; }
        else if (right) { gs.playerX += speed; gs.facing = "right"; gs.animState = run ? "run" : "walk"; }
        else { gs.animState = "idle"; }
        gs.playerX = Math.max(0, Math.min(WORLD_W - PW, gs.playerX));

        gs.playerVelY += GRAVITY;
        gs.playerY += gs.playerVelY;
        gs.isGrounded = false;

        if (gs.playerY + PH >= GROUND_Y) {
          gs.playerY = GROUND_Y - PH;
          gs.playerVelY = 0;
          gs.isGrounded = true;
        }

        if (gs.playerVelY > 0) {
          for (const p of PLATFORMS) {
            if (gs.playerX + PW > p.x && gs.playerX < p.x + p.w &&
                gs.playerY + PH >= p.y && gs.playerY + PH <= p.y + 14) {
              gs.playerY = p.y - PH;
              gs.playerVelY = 0;
              gs.isGrounded = true;
              break;
            }
          }
        }

        if (jump && gs.isGrounded) { gs.playerVelY = JUMP_FORCE; gs.isGrounded = false; }

        // Items
        for (const item of gs.items) {
          if (item.collected) continue;
          if (Math.abs(gs.playerX + PW / 2 - item.x - 8) < 22 &&
              Math.abs(gs.playerY + PH / 2 - item.y - 8) < 22) {
            item.collected = true;
            gs.collectedCount++;
            gs.floatingTexts.push({ text: `+${item.xp} XP`, timer: 55, color: "#FFD700", x: item.x + 8, y: item.y });
            onItemRef.current(item.xp, ITEM_LABELS[item.type] ?? "Item");
          }
        }

        // Station proximity
        gs.nearStation = null;
        for (const station of STATIONS) {
          if (Math.abs(gs.playerX + PW / 2 - station.x - 50) < 55 && gs.playerY + PH >= GROUND_Y - 5) {
            gs.nearStation = station.id;
            break;
          }
        }

        // Open dialog
        if (gs.interactPressed && gs.nearStation) {
          const station = STATIONS.find((s) => s.id === gs.nearStation)!;
          const done = progressRef.current.includes(station.recipeId);
          gs.activeDialog = { station, loading: true, result: null, xpAwarded: false, alreadyCompleted: done };
          gs.animState = "interact";
          setTimeout(() => {
            if (gs.activeDialog?.station.id === station.id) {
              gs.activeDialog.loading = false;
              gs.activeDialog.result = station.mockResult;
              if (!done) { gs.activeDialog.xpAwarded = true; onStationRef.current(station.recipeId, station.reward, station.name); }
            }
          }, 1400);
        }
      } else {
        if (gs.interactPressed && !gs.activeDialog.loading) { gs.activeDialog = null; gs.animState = "idle"; }
        if (gs.switchToPlayground && gs.activeDialog && !gs.activeDialog.loading) {
          onSwitchRef.current(gs.activeDialog.station.recipeId);
          gs.activeDialog = null;
          gs.animState = "idle";
        }
      }

      gs.interactPressed = false;
      gs.switchToPlayground = false;

      gs.animTimer += dt;
      if (gs.animTimer >= FRAME_DURATION) { gs.animTimer -= FRAME_DURATION; gs.animFrame = (gs.animFrame + 1) % 4; }

      const targetCam = gs.playerX - CW / 2 + PW / 2;
      gs.cameraX += (targetCam - gs.cameraX) * 0.08;
      gs.cameraX = Math.max(0, Math.min(WORLD_W - CW, gs.cameraX));

      gs.floatingTexts = gs.floatingTexts.filter((ft) => { ft.timer -= 1; return ft.timer > 0; });

      // ── RENDER ──
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }
      ctx.imageSmoothingEnabled = false;

      const prog = progressRef.current;
      const stationProg = STATIONS.map((s) => prog.includes(s.recipeId));
      const completedCount = stationProg.filter(Boolean).length;

      drawSky(ctx, gs.cameraX, now);
      drawGround(ctx, gs.cameraX);
      drawPlatforms(ctx, gs.cameraX);
      drawTrees(ctx, gs.cameraX);
      for (const s of STATIONS) drawStation(ctx, s, gs.cameraX, gs.nearStation === s.id, prog.includes(s.recipeId), now);
      for (const item of gs.items) if (!item.collected) drawItem(ctx, item, gs.cameraX, now);
      drawPax(ctx, gs);
      drawFloatingTexts(ctx, gs.floatingTexts, gs.cameraX);
      drawHud(ctx, xpRef.current, completedCount, gs.collectedCount, stationProg);
      if (gs.activeDialog) drawDialog(ctx, gs.activeDialog, now);
      drawWelcome(ctx, gs.welcomeTimer);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleTouch = (key: string, pressed: boolean) => {
    const gs = gsRef.current;
    if (pressed) { gs.keys.add(key); if (key === "e") gs.interactPressed = true; if (key === "t") gs.switchToPlayground = true; }
    else { gs.keys.delete(key); }
  };

  return (
    <div className="game-container">
      <canvas ref={canvasRef} width={CW} height={CH} className="game-canvas" tabIndex={0} />
      {isMobile && (
        <div className="game-dpad">
          <button className="dpad-btn dpad-left"
            onTouchStart={(e) => { e.preventDefault(); handleTouch("ArrowLeft", true); }}
            onTouchEnd={() => handleTouch("ArrowLeft", false)}
            onTouchCancel={() => handleTouch("ArrowLeft", false)}
            aria-label="Move left">◀</button>
          <button className="dpad-btn dpad-right"
            onTouchStart={(e) => { e.preventDefault(); handleTouch("ArrowRight", true); }}
            onTouchEnd={() => handleTouch("ArrowRight", false)}
            onTouchCancel={() => handleTouch("ArrowRight", false)}
            aria-label="Move right">▶</button>
          <button className="dpad-btn dpad-jump"
            onTouchStart={(e) => { e.preventDefault(); handleTouch(" ", true); }}
            onTouchEnd={() => handleTouch(" ", false)}
            onTouchCancel={() => handleTouch(" ", false)}
            aria-label="Jump">▲</button>
          <button className="dpad-btn dpad-interact"
            onTouchStart={(e) => { e.preventDefault(); handleTouch("e", true); }}
            onTouchEnd={() => handleTouch("e", false)}
            onTouchCancel={() => handleTouch("e", false)}
            aria-label="Interact">E</button>
        </div>
      )}
    </div>
  );
}
