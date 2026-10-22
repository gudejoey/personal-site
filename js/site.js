const posters = [
  { src: "grease", t: "Grease", m: "Poster, 2026", note: "For the PUSD high schools' Grease. The poster is the Burger Palace counter; showtimes and credits sit on the menu boards.", alt: "Pink neon Grease poster set at a diner counter with showtimes and ticket QR code" },
  { src: "babyzilla", t: "Babyzilla", m: "Poster", note: "A movie poster. Giant rubber ducks, one small boat, and a cast list made mostly of baby puns.", alt: "Blue poster of giant rubber ducks surrounding a tiny rowboat, titled Babyzilla" },
  { src: "spring", t: "Spring", m: "Poster", note: "The title grows out of the grass.", alt: "Green hills of grass with the word SPRING emerging from them and a child flying a kite" },
  { src: "lmp", t: "LMP", m: "Poster", note: "The streetlight's beam is the missing A.", alt: "Night street with a streetlamp whose light cone forms the letter A between L, M and P" },
  { src: "noexit", t: "There Is No Exit", m: "Poster", note: "The running man from an exit sign, lost in a forest of arrows.", alt: "Green poster with two eyes, arrow-shaped trees and the exit-sign running figure above the word EXIT" }
];
const photos = [
  { src: "cat", f: "MG_5696", sel: true, t: "Cat and orchid", alt: "Tabby and white cat sniffing a white orchid in window light" },
  { src: "moped", f: "MG_7946", sel: true, t: "After school", alt: "Boy with a red scarf riding on the back of a scooter in low evening sun" },
  { src: "greens", f: "MG_7967", sel: true, t: "Groceries", alt: "Young boy with a red scarf carrying a large bunch of greens across a sidewalk" },
  { src: "roses", f: "Blossomed", sel: false, t: "Roses", alt: "Pink roses against a deep blue sky, shot through a soft foreground blur" },
  { src: "burger", f: "MG_1126", sel: false, t: "Burger", alt: "Cheeseburger and herbed fries on a wooden board against a dark background" }
];

const $ = (s, r = document) => r.querySelector(s);

// viewer (only on pages that have one)
const dlg = $("#viewer");
function openViewer(src, alt, caption) {
  const vimg = $("#vimg");
  vimg.src = "img/" + src + ".jpg"; vimg.alt = alt; $("#vcap").textContent = caption;
  if (typeof dlg.showModal === "function") dlg.showModal();
}
if (dlg) {
  $("#vclose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
}

const posterGrid = $("#posters");
if (posterGrid) {
  posterGrid.innerHTML = posters.map((p, i) => `
    <button type="button" data-i="${i}" aria-label="Enlarge ${p.t}">
      <div class="frame"><img src="img/${p.src}.jpg" alt="${p.alt}" loading="lazy"></div>
      <div class="label"><span class="pl">Pl. ${i + 4}</span><span class="t">${p.t} <i>· ${p.m}</i></span><span class="note">${p.note}</span></div>
    </button>`).join("");
  posterGrid.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const p = posters[+b.dataset.i]; openViewer(p.src, p.alt, `Pl. ${+b.dataset.i + 4} · ${p.t}, ${p.m.toLowerCase()}. ${p.note}`);
  });
}

const strip = $("#strip");
if (strip) {
  const selected = photos.filter(p => p.sel).concat(photos.filter(p => !p.sel)).slice(0, 4);
  strip.innerHTML = selected.map(p => `<button type="button" data-i="${photos.indexOf(p)}" aria-label="Enlarge ${p.t}"><img src="img/${p.src}.jpg" alt="${p.alt}" loading="lazy"></button>`).join("");
  strip.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const p = photos[+b.dataset.i]; openViewer(p.src, p.alt, p.t); });
}

document.querySelectorAll(".copy").forEach(btn => btn.addEventListener("click", async () => {
  const text = btn.dataset.copy;
  try { await navigator.clipboard.writeText(text); btn.textContent = "copied"; }
  catch { const el = btn.parentNode.querySelector(".em"); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "selected"; }
  setTimeout(() => btn.textContent = "copy", 1600);
}));
