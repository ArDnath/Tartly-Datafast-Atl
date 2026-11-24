# "Who it's for" artwork

The landing page uses three **line illustrations** in the "Who it's for" band
(`src/features/marketing/landing/sections/FounderBand.tsx`). They show people
working; **none of them is a customer, and the captions are not testimonials**.
Do not add a quote or a name that implies endorsement.

The section previously used Pexels photography (`founder-*.webp`). It was
replaced with these drawings on 2026-11-20; the photograph files are no longer
referenced by any code.

## Current assets

| File             | Used for               | Subject                                               |
| ---------------- | ---------------------- | ----------------------------------------------------- |
| `who-solo.png`   | Solo founder           | A founder among a lightbulb, gears, and a chart       |
| `who-team.png`   | Small engineering team | Four teammates celebrating around laptops and code    |
| `who-agency.png` | Small agency           | The wordmark `xyz.com agency` flanked by mark accents |

**Provenance: UNVERIFIED.** These three files were supplied directly by the
project owner and encoded in-repo. No source URL or licence is recorded, unlike
the Pexels images they replaced. Confirm the licence permits commercial use and
record the source here before launch; until then treat them as owner-supplied
placeholders.

## Processing

The supplied originals were black ink on a solid white field. Each one was
converted to **transparent** artwork by deriving alpha from luminance: the image
is read as grayscale and its inverse becomes the alpha channel, then the colour
is flattened to the single ink tone `#171717`. This keeps every light-grey
hairline in the drawing, which a `-transparent white` key with any useful fuzz
threshold destroys.

Export format is **PNG8**, not WebP. These are one-colour line drawings, so an
8-bit palette is lossless in practice, and the PNGs land at 4–13 KB. The same
artwork as lossy WebP with alpha came out at 97–238 KB because the WebP delegate
ignores quality settings once an alpha channel is present.

Output sizes: `who-solo` 554 px, `who-team` and `who-agency` 1000 px on the long
edge.

## Why the CSS looks the way it does

The drawings are not cropped (`object-fit: contain`) because meaning sits at
their edges — a gear or a teammate would be cut off.

There is **no blend mode**. An earlier version relied on
`mix-blend-mode: multiply` to knock the white field out, which looked identical
at rest but flashed white during the scroll reveal: an ancestor mid-fade gets its
own compositing group, so multiply blended the drawing's white against an empty
backdrop instead of the cream page until the fade finished. Real transparency in
the file has no such dependency. Do not reintroduce a blend mode here.

The frame has square bottom corners (`border-radius: 12px 12px 0 0`) and a ring
that fades to nothing before the bottom edge, so the card is defined at the top
and open at the bottom. The ring is 2px and holds near-black to 70% before
dissolving through the last quarter. The cards are static: no hover scale, no
hover tint.

## Swapping an illustration

Take artwork that is black ink on a flat white field, run it through the same
luminance-to-alpha step above, export PNG8 at up to 1200 px, update the `alt`
text in `FounderBand.tsx`, and add a row to the table with a real source and
licence. Alt text describes the drawing; it never names a person.
