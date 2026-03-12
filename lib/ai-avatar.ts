function hashString(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function normaliseDescription(description: string) {
  return description.trim().replace(/\s+/g, " ");
}

function hsl(hue: number, saturation: number, lightness: number) {
  return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
}

function getAvatarMotif(description: string) {
  const lowered = description.toLowerCase();

  if (/(science|space|planet|star|astronaut|rocket)/.test(lowered)) return "star";
  if (/(book|read|library|story|literacy|english|author)/.test(lowered)) return "book";
  if (/(music|sing|piano|guitar|choir|song)/.test(lowered)) return "music";
  if (/(sport|football|dance|run|gym|pe|tennis)/.test(lowered)) return "bolt";
  if (/(art|paint|draw|creative|colour|design)/.test(lowered)) return "spark";
  if (/(nature|forest|leaf|garden|outdoor|eco)/.test(lowered)) return "leaf";
  return "orbit";
}

function drawMotif(ctx: CanvasRenderingContext2D, motif: string, accent: string, x: number, y: number, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (motif) {
    case "star":
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(5, -5);
      ctx.lineTo(17, -4);
      ctx.lineTo(8, 4);
      ctx.lineTo(11, 16);
      ctx.lineTo(0, 9);
      ctx.lineTo(-11, 16);
      ctx.lineTo(-8, 4);
      ctx.lineTo(-17, -4);
      ctx.lineTo(-5, -5);
      ctx.closePath();
      ctx.fill();
      break;
    case "book":
      ctx.strokeRect(-15, -13, 12, 26);
      ctx.strokeRect(3, -13, 12, 26);
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, 14);
      ctx.stroke();
      break;
    case "music":
      ctx.beginPath();
      ctx.moveTo(-5, -14);
      ctx.lineTo(-5, 7);
      ctx.lineTo(11, 3);
      ctx.lineTo(11, -16);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-8, 10, 5, 0, Math.PI * 2);
      ctx.arc(8, 6, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bolt":
      ctx.beginPath();
      ctx.moveTo(-4, -17);
      ctx.lineTo(7, -17);
      ctx.lineTo(-1, -2);
      ctx.lineTo(10, -2);
      ctx.lineTo(-8, 17);
      ctx.lineTo(-1, 3);
      ctx.lineTo(-12, 3);
      ctx.closePath();
      ctx.fill();
      break;
    case "leaf":
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 20, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, 10);
      ctx.lineTo(8, -10);
      ctx.stroke();
      break;
    case "spark":
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(4, -4);
      ctx.lineTo(18, 0);
      ctx.lineTo(4, 4);
      ctx.lineTo(0, 18);
      ctx.lineTo(-4, 4);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 24, Math.PI * 0.15, Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(18, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, hash: number, hue1: number, hue2: number) {
  const grad = ctx.createLinearGradient(0, 0, 320, 320);
  grad.addColorStop(0, hsl(hue1, 72, 58));
  grad.addColorStop(1, hsl(hue2, 68, 40));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 320, 320);

  const radial = ctx.createRadialGradient(70, 60, 10, 90, 70, 170);
  radial.addColorStop(0, "rgba(255,255,255,0.42)");
  radial.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 320, 320);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 7; i += 1) {
    const size = 18 + ((hash >> (i * 2)) % 28);
    const x = 20 + ((hash >> (i * 3)) % 260);
    const y = 18 + ((hash >> (i * 4)) % 120);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(160, 180);
  ctx.rotate(((hash % 22) - 11) * (Math.PI / 180));
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = -260; i <= 260; i += 28) {
    ctx.fillRect(i, -220, 10, 420);
  }
  ctx.restore();
}

function drawShoulders(ctx: CanvasRenderingContext2D, clothing: string) {
  ctx.save();
  ctx.fillStyle = clothing;
  ctx.beginPath();
  ctx.moveTo(48, 320);
  ctx.quadraticCurveTo(86, 218, 160, 218);
  ctx.quadraticCurveTo(234, 218, 272, 320);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(102, 232);
  ctx.quadraticCurveTo(160, 256, 218, 232);
  ctx.lineTo(236, 320);
  ctx.lineTo(84, 320);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPortrait(
  ctx: CanvasRenderingContext2D,
  hash: number,
  motif: string,
  palette: { skin: string; hair: string; clothing: string; accent: string },
) {
  const faceShift = (hash % 14) - 7;

  drawShoulders(ctx, palette.clothing);

  ctx.save();
  ctx.translate(160 + faceShift, 162);

  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.ellipse(0, 4, 56, 66, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.skin;
  ctx.fillRect(-14, 60, 28, 34);

  ctx.fillStyle = palette.hair;
  ctx.beginPath();
  ctx.moveTo(-58, 14);
  ctx.quadraticCurveTo(-56, -62, 0, -70);
  ctx.quadraticCurveTo(56, -62, 60, 18);
  ctx.quadraticCurveTo(46, -4, 22, -8);
  ctx.quadraticCurveTo(8, 6, -16, 8);
  ctx.quadraticCurveTo(-40, 8, -58, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.20)";
  ctx.beginPath();
  ctx.ellipse(-18, -34, 18, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(44,35,30,0.72)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-26, -2);
  ctx.quadraticCurveTo(-16, -9, -6, -2);
  ctx.moveTo(6, -2);
  ctx.quadraticCurveTo(16, -9, 26, -2);
  ctx.stroke();

  ctx.fillStyle = "#2c231e";
  ctx.beginPath();
  ctx.arc(-16, 10, 4.5, 0, Math.PI * 2);
  ctx.arc(16, 10, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(120,80,70,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(-4, 30, 0, 34);
  ctx.stroke();

  ctx.strokeStyle = "rgba(128,61,64,0.70)";
  ctx.beginPath();
  ctx.moveTo(-15, 45);
  ctx.quadraticCurveTo(0, 53, 15, 45);
  ctx.stroke();

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 4, 72, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();

  drawMotif(ctx, motif, palette.accent, 0, -68, 0.8);
  ctx.restore();
}

function getPalette(hash: number, hue1: number, motif: string) {
  const skinTones = [
    "#f6d2b8",
    "#edc19d",
    "#d9a77d",
    "#b97c57",
    "#8c593b",
    "#6f432d",
  ];
  const hairTones = [
    "#2b1d17",
    "#4a2f21",
    "#6b4b31",
    "#1f2530",
    "#7a5a14",
    "#56231d",
  ];
  const skin = skinTones[hash % skinTones.length];
  const hair = hairTones[(hash >> 3) % hairTones.length];
  const clothingHueOffset =
    motif === "music" ? 210 :
    motif === "leaf" ? 120 :
    motif === "spark" ? 22 :
    motif === "star" ? 262 :
    motif === "book" ? 8 :
    180;

  return {
    skin,
    hair,
    clothing: hsl((hue1 + clothingHueOffset) % 360, 48, 30),
    accent: hsl((hue1 + 160) % 360, 86, 84),
  };
}

export function buildAIAvatar(name: string, description = ""): string {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;

  const cleanDescription = normaliseDescription(description);
  const seed = `${name}|${cleanDescription}`;
  const hash = hashString(seed);
  const hue1 = (hash * 137.5) % 360;
  const hue2 = (hue1 + 55) % 360;
  const motif = getAvatarMotif(cleanDescription);
  const palette = getPalette(hash, hue1, motif);

  drawBackground(ctx, hash, hue1, hue2);
  drawPortrait(ctx, hash, motif, palette);

  if (!cleanDescription) {
    const initials = name
      .split(" ")
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2);

    ctx.fillStyle = "rgba(15,23,42,0.18)";
    ctx.beginPath();
    ctx.arc(256, 254, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "700 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials || "?", 256, 255);
  }

  return canvas.toDataURL("image/png");
}
