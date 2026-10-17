# Bundled fonts

Both faces are inlined into the build (`src/fonts/index.ts`) from the pinned Fontsource npm packages. Only the Latin `woff2` subsets are shipped.

| Face | Weights | Package (pinned) | Copyright | Licence |
|---|---|---|---|---|
| Lilita One | 400 | `@fontsource/lilita-one@5.3.0` | © 2011 Juan Montoreano, Reserved Font Name "Lilita One" | SIL Open Font License 1.1 |
| Nunito | 600, 700, 800, 900 | `@fontsource/nunito@5.3.0` | © 2014 The Nunito Project Authors (github.com/googlefonts/nunito) | SIL Open Font License 1.1 |

## What the OFL allows and asks

- The fonts may be used, embedded in and shipped with the game (including the paid iOS app), as long as the fonts themselves are not sold on their own.
- We ship the font files unmodified (the Latin subsets cut by Fontsource), under their original names. If we ever modify a face, the modified version must not use the Reserved Font Name.
- The copyright notice and licence must travel with the font. This file does that for the build. The full licence texts are in `node_modules/@fontsource/lilita-one/LICENSE` and `node_modules/@fontsource/nunito/LICENSE`, and online at https://openfontlicense.org.
- When the iOS app gets an acknowledgements screen, list both fonts there with the notices above.
