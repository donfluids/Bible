# Verse card artwork

Watercolour paintings made for this app with FLUX.2 [klein] 4B (Black Forest Labs, Apache
2.0), run on a CPU with stable-diffusion.cpp: the GGUF Q4_0 weights
(leejet/FLUX.2-klein-4B-GGUF), the FLUX.2 VAE from black-forest-labs/FLUX.2-klein-4B and
Qwen3-4B Q4_K_M as the text encoder; 448 × 768, 4 steps, CFG scale 1.0, saved as JPEG
(quality 90). The prompts and seeds are below, so each picture can be made again.

    sd-cli --diffusion-model flux-2-klein-4b-Q4_0.gguf --vae flux2_vae.safetensors \
      --llm Qwen3-4B-Q4_K_M.gguf --cfg-scale 1.0 --steps 4 -W 448 -H 768 -s <seed> -p "<prompt>"

- `painting_birthday.jpg` (seed 101): loose modern watercolour painting for a greeting card, a small birthday cake with lit candles and pink roses painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of pale peach and cream with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `painting_party.jpg` (seed 202): loose modern watercolour painting for a greeting card, a bouquet of garden flowers tied with a silk ribbon painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of pale cream and soft gold with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `painting_wedding.jpg` (seed 101): loose modern watercolour painting for a greeting card, white lilies with two gold wedding rings painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of pale ivory and champagne with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `painting_anniversary.jpg` (seed 101): loose modern watercolour painting for a greeting card, two turtle doves side by side on a blossoming branch painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of pale blush pink with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `painting_getwell.jpg` (seed 101): loose modern watercolour painting for a greeting card, a few tulips with leaves painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of pale spring green and cream with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `painting_sympathy.jpg` (seed 202): loose modern watercolour painting for a greeting card, a single white rose on a long stem painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of soft pale grey-blue with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `painting_christmas.jpg` (seed 101): loose modern watercolour painting for a greeting card, a sprig of holly with red berries and a small shining star above painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of deep midnight blue with faint stars with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `painting_easter.jpg` (seed 202): loose modern watercolour painting for a greeting card, white easter lilies before a soft sunrise painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of pale gold and morning cream with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `painting_newyear.jpg` (seed 101): loose modern watercolour painting for a greeting card, a white dove flying with a green olive branch in its beak painted in the lower third of the page, the upper two thirds an open calm soft wet-on-wet wash of pale sky blue with lots of empty space, delicate fine pen lines, gentle light, white watercolour paper texture
- `wash_lavender.jpg` (seed 5): abstract soft watercolour wash, pale lavender and white, gentle wet-on-wet blooms, white watercolour paper texture, calm and simple, lots of empty space
- `wash_peach.jpg` (seed 5): abstract soft watercolour wash, pale peach and cream, gentle wet-on-wet blooms, white watercolour paper texture, calm and simple, lots of empty space
- `wash_sage.jpg` (seed 5): abstract soft watercolour wash, pale sage green and cream, gentle wet-on-wet blooms, white watercolour paper texture, calm and simple, lots of empty space
- `wash_gold.jpg` (seed 5): abstract soft watercolour wash, warm pale gold and ivory, gentle wet-on-wet blooms, white watercolour paper texture, calm and simple, lots of empty space
