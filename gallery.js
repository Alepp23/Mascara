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
let activeCard;

function setFlipped(card, flipped) {
  if (!flipped && card.back.contains(document.activeElement)) {
    card.toggle.focus({ preventScroll: true });
  }
  card.tile.toggleAttribute("data-flipped", flipped);
  card.toggle.setAttribute("aria-expanded", String(flipped));
  card.back.inert = !flipped;
}

function revealCard(card) {
  if (activeCard === card) return;
  if (activeCard) setFlipped(activeCard, false);
  activeCard = card;
  if (activeCard) setFlipped(activeCard, true);
}

for (const tile of grid.children) {
  const toggle = tile.querySelector(".mask-toggle");
  const card = { tile, toggle, back: tile.querySelector(".mask-back"), hovered: false };
  toggle.hidden = false;

  tile.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    card.hovered = true;
    if (!activeCard?.back.contains(document.activeElement)) revealCard(card);
  });

  tile.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    card.hovered = false;
    if (activeCard === card && !tile.contains(document.activeElement)) revealCard(null);
  });

  toggle.addEventListener("click", () => revealCard(activeCard === card ? null : card));
  tile.addEventListener("focusout", (event) => {
    if (activeCard === card && !card.hovered && !tile.contains(event.relatedTarget)) revealCard(null);
  });
}

document.addEventListener("pointerdown", (event) => {
  if (activeCard && !activeCard.tile.contains(event.target)) revealCard(null);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeCard) {
    event.preventDefault();
    revealCard(null);
  }
});

grid.addEventListener("focusin", (event) => {
  if (!scene || !event.target.matches(".mask-toggle:focus-visible")) return;
  const settled = scene.start + scene.distance;
  if (window.scrollY < settled) {
    window.scrollTo(0, settled);
    draw();
  }
});

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
  const galleryStyle = getComputedStyle(gallery);
  const gridStyle = getComputedStyle(grid);
  const exitTop = Math.max(
    parseFloat(galleryStyle.scrollMarginBlockStart),
    viewport - parseFloat(gridStyle.height) - parseFloat(galleryStyle.paddingBottom),
  );
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
