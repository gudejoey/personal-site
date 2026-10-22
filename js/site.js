// Posters and photos, interleaved on purpose
const gallery = [
  { src: "grease", alt: "Pink neon Grease poster set at a diner counter with showtimes and ticket QR code" },
  { src: "cat", alt: "Tabby and white cat sniffing a white orchid in window light" },
  { src: "lmp", alt: "Night street with a streetlamp whose light cone forms the letter A between L, M and P" },
  { src: "moped", alt: "Boy with a red scarf riding on the back of a scooter in low evening sun" },
  { src: "spring", alt: "Green hills of grass with the word SPRING emerging from them and a child flying a kite" },
  { src: "roses", alt: "Pink roses against a deep blue sky, shot through a soft foreground blur" },
  { src: "noexit", alt: "Green poster with two eyes, arrow-shaped trees and the exit-sign running figure above the word EXIT" },
  { src: "greens", alt: "Young boy with a red scarf carrying a large bunch of greens across a sidewalk" }
];

const $ = (s, r = document) => r.querySelector(s);

// viewer (only on pages that have one)
const dlg = $("#viewer");
function openViewer(src, alt) {
  const vimg = $("#vimg");
  vimg.src = "img/" + src + ".jpg"; vimg.alt = alt;
  if (typeof dlg.showModal === "function") dlg.showModal();
}
if (dlg) {
  $("#vclose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
}

const grid = $("#gallery");
if (grid) {
  grid.innerHTML = gallery.map((p, i) => `<button type="button" data-i="${i}" aria-label="Enlarge image"><img src="img/${p.src}.jpg" alt="${p.alt}" loading="lazy"></button>`).join("");
  grid.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const p = gallery[+b.dataset.i]; openViewer(p.src, p.alt);
  });
}

document.querySelectorAll(".copy").forEach(btn => btn.addEventListener("click", async () => {
  const text = btn.dataset.copy;
  try { await navigator.clipboard.writeText(text); btn.textContent = "copied"; }
  catch { const el = btn.parentNode.querySelector(".em"); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "selected"; }
  setTimeout(() => btn.textContent = "copy", 1600);
}));
