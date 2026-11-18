const gallery = document.querySelector(".mask-gallery");
const grid = gallery.querySelector(".mask-grid");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// The middle card leads the zoom. Each side column joins the grid at its own pace.
const columnMotion = [
  { property: "--inner-left", peak: 0.24, end: 0.61, drop: 0.39 },
  { property: "--inner-right", peak: 0.27, end: 0.66, drop: 0.48 },
  { property: "--outer-left", peak: 0.45, end: 0.91, drop: 1.23 },
  { property: "--outer-right", peak: 0.48, end: 0.99, drop: 1.31 },
];

let scene;
let frame;

function clamp(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value) {
  const time = clamp(value);
  return time * time * (3 - 2 * time);
}

function draw() {
  frame = undefined;
  if (!scene) return;

  const { start, distance, entryTop, exitTop, tileHeight, openingScale } = scene;
  const scroll = window.scrollY - start;
  const progress = clamp(scroll / distance);

  if (progress === 1) {
    grid.removeAttribute("style");
    return;
  }

  const zoom = smoothstep(1 - (1 - progress) ** 1.4);
  const scale = openingScale + (1 - openingScale) * zoom;

  // Translate against the natural scroll so the grid lands at its layout position.
  const top = exitTop + (entryTop - exitTop) * (1 - progress) ** 2;
  const offset = top - exitTop - distance + Math.max(0, scroll);
  grid.style.setProperty("--grid-transform", `translateY(${offset}px) scale(${scale})`);

  for (const { property, peak, end, drop } of columnMotion) {
    const rise = smoothstep(progress / peak);
    const settle = smoothstep((progress - peak) / (end - peak));
    const shift = (0.22 + drop * rise) * (1 - settle) * tileHeight;
    grid.style.setProperty(property, `${shift}px`);
  }
}

function measure() {
  if (frame !== undefined) cancelAnimationFrame(frame);

  const viewport = document.documentElement.clientHeight;
  const galleryTop = gallery.getBoundingClientRect().top + window.scrollY;
  const galleryEndPadding = parseFloat(getComputedStyle(gallery).paddingBottom);
  const gridStyle = getComputedStyle(grid);
  const exitTop = Math.max(0, viewport - parseFloat(gridStyle.height) - galleryEndPadding);
  const start = Math.max(0, Math.round(galleryTop - viewport * 0.76));
  const entryTop = galleryTop - start;

  if (reducedMotion.matches || exitTop >= entryTop) {
    scene = undefined;
    gallery.style.removeProperty("--motion-room");
    grid.removeAttribute("style");
    draw();
    return;
  }

  const columns = Number(gridStyle.getPropertyValue("--columns"));
  const leadTile = grid.children[Math.floor(columns / 2)];
  const distance = Math.round(viewport * 1.75);

  // The extra scroll distance shrinks as the transformed grid moves into place.
  gallery.style.setProperty("--motion-room", `${distance - entryTop + exitTop}px`);
  scene = {
    start,
    distance,
    entryTop,
    exitTop,
    tileHeight: leadTile.offsetHeight,
    openingScale: (gallery.offsetWidth * 0.78) / leadTile.offsetWidth,
  };
  draw();
}

window.addEventListener("scroll", () => {
  if (scene && frame === undefined) frame = requestAnimationFrame(draw);
}, { passive: true });
window.addEventListener("resize", measure);
window.addEventListener("pageshow", measure);
reducedMotion.addEventListener("change", measure);
measure();
