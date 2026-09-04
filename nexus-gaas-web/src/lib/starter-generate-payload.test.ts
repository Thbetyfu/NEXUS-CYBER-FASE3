import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CATEGORY_COPY,
  DEFAULT_STARTER_THEME,
  EMPTY_STARTER_EXTRAS,
  applyFillSlotsToExtras,
  buildStarterGeneratePairs,
  categoryPresetSlots,
  fillCopySourceLabel,
  fillStarterCopy,
  splitStorySentences,
} from "./starter-generate-payload.ts";

function mapFrom(pairs: [string, string][]): Record<string, string> {
  return Object.fromEntries(pairs);
}

test("cerita kosong memakai preset kategori (cta + hero + jam)", () => {
  const fnb = fillStarterCopy("fnb", "   ");
  assert.equal(fnb.cta_label, CATEGORY_COPY.fnb.cta_label);
  assert.equal(fnb.headline, CATEGORY_COPY.fnb.headline);
  assert.equal(fnb.tagline, CATEGORY_COPY.fnb.tagline);
  assert.equal(fnb.about_body, CATEGORY_COPY.fnb.about_body);

  const payload = mapFrom(
    buildStarterGeneratePairs({
      businessName: "Warung Bu Siti",
      category: "fnb",
      whatsapp: "081234567890",
    }),
  );
  assert.equal(payload.theme, DEFAULT_STARTER_THEME);
  assert.equal(payload.cta_label, "Pesan via WhatsApp");
  assert.equal(payload.hours, CATEGORY_COPY.fnb.hours);
  assert.equal(payload.tier, "starter");
  assert.equal(payload.create_loop, undefined);
  assert.equal(payload.create_job, undefined);
  assert.equal(payload.offering_1_title, "");
});

test("cerita dipecah ke tagline, hero, about — tanpa LLM", () => {
  const story =
    "Nasi uduk kami masak setiap pagi dengan santan kental. Langganan tetangga sudah lima tahun. Chat WA sebelum jam sembilan agar porsi tidak habis.";
  const sentences = splitStorySentences(story);
  assert.equal(sentences.length, 3);

  const copy = fillStarterCopy("profil", story);
  assert.equal(copy.tagline.startsWith("Nasi uduk"), true);
  assert.match(copy.headline, /Nasi uduk/i);
  assert.match(copy.about_body, /Langganan tetangga/);
  assert.equal(copy.description, story);
  assert.equal(copy.cta_label, CATEGORY_COPY.profil.cta_label);
});

test("applyFillSlots menimpa tagline/hero/tentang; label sumber jujur", () => {
  const filled = applyFillSlotsToExtras(EMPTY_STARTER_EXTRAS, {
    tagline: "Rasa pagi",
    hero: "Nasi uduk setiap pagi untuk tetangga",
    about_body: "Masak sebelum fajar.",
    cta_label: "Pesan via WhatsApp",
  });
  assert.equal(filled.tagline, "Rasa pagi");
  assert.equal(filled.about_body, "Masak sebelum fajar.");
  assert.equal(filled.headline.startsWith("Nasi"), true);
  assert.equal(fillCopySourceLabel(true), "Teks dari template kategori (bukan model lokal).");
  assert.match(fillCopySourceLabel(false), /model lokal/);
  assert.equal(categoryPresetSlots("fnb").cta_label, CATEGORY_COPY.fnb.cta_label);
});

test("Lengkapi nanti menimpa default; palet default hijau", () => {
  const payload = mapFrom(
    buildStarterGeneratePairs({
      businessName: "Bengkel Rapi",
      category: "jasa",
      whatsapp: "081111111111",
      extras: { theme: "navy", cta_label: "Hubungi bengkel", hours: "Sabtu 08.00–12.00" },
    }),
  );
  assert.equal(payload.theme, "navy");
  assert.equal(payload.cta_label, "Hubungi bengkel");
  assert.equal(payload.hours, "Sabtu 08.00–12.00");
  assert.equal(payload.headline, CATEGORY_COPY.jasa.headline);
});

test("checkout generate tidak mengirim slug atau replaceExisting", () => {
  const payload = mapFrom(
    buildStarterGeneratePairs({
      businessName: "Bu Grace",
      category: "fnb",
      whatsapp: "081234567890",
    }),
  );
  assert.equal(payload.slug, undefined);
  assert.equal(payload.replaceExisting, undefined);
  assert.equal(payload.replace_existing, undefined);
});
