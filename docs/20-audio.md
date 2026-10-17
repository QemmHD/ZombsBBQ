# 20 — Sound bed (sampled audio layer)

Goal: make Zombs BBQ *sound* like the 2011 original. The originals (user-owned local copies under
`C:\Downloads\zombiecafe-assets\audio\`) are **reference only**: nothing from them is shipped or
committed. Every shipped file is generated with the Higgsfield CLI (Seed Audio 1.0) from a prompt
that describes the *sound*, then matched against a measured fingerprint of the original.

## How it is wired

- `game/src/audio/sfx.ts` — trigger names. `SYNTH_NAMES` (35) have synth recipes; `SYNTH_ALIAS` adds
  the 26 sample-only names (tip, doorOpen, doorClose, page, groupScream, chew, mutter, refresh, panic,
  rareArrival, feast, bones, punch, knockdown, revive, hungry, outOfFood, burnSoon, cookStove/Grill/
  Smoker/Fryer/Cauldron/Kiln/Pit/Tomb) and says which synth recipe stands in when the file is missing.
  `SFX_NAMES` is the union (61 names); `LOOP_NAMES` are the 9 beds.
- `game/src/audio/manifest.ts` — **generated** by `node tools/audio-manifest.mjs` from
  `public/audio/{sfx,music}/*.ogg`. Trigger name = file name minus a trailing variant digit
  (`mutter1.ogg`..`mutter4.ogg` → `mutter`, picked at random). Per-category gain trims live in the tool.
  It also enforces the byte budget (2.5 MB SFX, 1.5 MB per music track).
- `game/src/audio/samples.ts` — `SampleBank`: fetch + `decodeAudioData`, 4 at a time, priority order,
  best-effort (a missing file is just `failed`).
- `game/src/audio/index.ts` — `AudioEngine.play()` uses the decoded sample when it is ready, else the
  synth recipe (same voice limits, pitch → `playbackRate`, pan). New: `loop(key, name, vol)` /
  `stopLoop(key)` for keyed beds (max 3), `setDucked(bool)` (beds ×0.25, music ×0.7 while a modal is
  open), music plays the looping sample for a track when `public/audio/music/<track>.ogg` exists and
  falls back to the procedural song after a 2.5 s grace (crossfading to the sample when it lands).
  `AudioEngine.useSamples = false` forces synth-only.
- `game/src/game/soundscape.ts` — `planLoops(state, mode)`: diner ambience (`room`) whenever not in a
  raid (half volume when closed) + one cooking loop per stove that is `cooking` with a cook at it,
  keyed by station, at most 2, longest-running first. `applySoundscape()` runs from the HUD's 200 ms
  refresh and also ducks when `hud.modalOpen`. Ambience therefore starts on the first user gesture
  (unlock) via the next refresh.
- Call sites added: tip vs coin on `coin` events, `panic` sting + `groupScream`, `rareArrival`,
  `hungry`, `outOfFood`, `burnSoon`, `feast` + delayed `bones` on `eaten`, `refresh` on refill / waking,
  `doorOpen`/`doorClose` on the front-door swing edge, random `chew` per seated diner (2–4.5 s),
  random `mutter` per idle zombie (9–22 s), `page` on shop / clipboard tabs; raid: `knockdown`+`ko`,
  `revive`, `punch` on jabs, `doorOpen` on arrivals.
- Volume / mute settings are unchanged: samples and loops run through the SFX bus, music through the
  music bus, everything under the master + limiter.

### Single-file build

`dist/zombs-bbq.html` does **not** inline audio (it would add several MB of base64). The page fetches
`./audio/sfx/*.ogg` and `./audio/music/*.ogg` relative to itself; Vite copies `public/audio/` to
`dist/audio/`, so GitHub Pages / any static host serves it. Opened as a lone file, every sound falls
back to the synth recipes and there is simply no ambience / cooking bed.

## Reference inventory

`tools/audio/fingerprint.py` measured every original (229 `.caf` + 20 `.mp3`): duration, channels,
rate, trimmed length, peak/RMS dBFS, 10-bin RMS envelope, spectral centroid, spectral flatness
(0 tonal … 1 noise), zero-crossing pitch, rough BPM. The table (`originals.csv`) stays in the
scratchpad, not the repo (it describes Capcom files; it is regenerated in seconds).

Event groups found by name: door (DoorOpen1), cash/tip (Cash1-3, Cash2Tip), chew/eat (AnimalEating*,
ZombieEating4), scream (Scream*, Female/ManScream*, *GroupScream*), groan/mutter (Groan1-10,
Grunt1-23, Male/FemaleGrunt*, Brains1-6), bite (Hit1-5), cooking (Frying, LongCook, Blender,
Chopping1), UI (Click1-21, Select1-6, PageFlip1-4, BookClose1, TextboxPop1, Pop4, BuyError1),
level/unlock (UnlockDialog1, Zombie Sting 1-6g, Stinger Short), placement (ObjectPlacement*, Rotate*,
PickUp/PutDownItem), raid (Impact*, Hit*, YetiPunch/Smash, *Dying*), revive/refresh (PetRobotRevive,
ZombieRefresh*, AnimalRefresh*), ambience (DinnerAmbientLoop, 102 s, −46 dBFS RMS, centroid 2.3 kHz,
flatness 0.41), music (Zombie Jazz 134 s ≈ 86 BPM swing; Haunted House 61 s; Theme V1/V3/V4/V5;
Cue Transition Groove 1–3; Mini Cue 1–3 are full 60 s cues, not stings).

## Target set, prompts, scores

The full target list with prompts and reference files is `game/tools/audio/targets.json` (64 SFX
targets incl. 4 mutter variants and 9 loops, 3 music tracks). Scoring (`gen.py pick`): one-shots
0.3 duration ratio + 0.3 envelope correlation + 0.25 centroid (log distance) + 0.15 flatness;
loops: steadiness/centroid/flatness/envelope; music adds BPM closeness. Mastering: silence trim,
−16 LUFS (SFX) / −18 LUFS (music), limiter at −1 dBTP, mono 22.05 kHz Vorbis q3 for SFX; stereo
44.1 kHz q4 for music, cut to whole bars from the measured BPM with a 0.5 s crossfaded seam
(loops: 0.35 s seam).

### Shipped so far (`game/tools/audio/report.json` has the full numbers)

| name | file | matched original (trimmed s / centroid Hz / flatness) | got | score | bytes |
|---|---|---|---|---|---|
| open | sfx/open.ogg | Select1-3, TextboxPop1 (0.49 / 1383 / 0.20) | 0.18 / 2180 / 0.42 | 0.62 | 4,825 |
| tip | sfx/tip.ogg | Cash2Tip (0.51 / 7207 / 0.50) | 0.68 / 4379 / 0.42 | 0.74 | 7,619 |
| flag | sfx/flag.ogg | — (no original whistle; duration only) | 0.21 / 3849 / 0.61 | 0.50 | 5,099 |
| joint | music/joint.ogg | Zombie Jazz (86 BPM / 2047 / 0.30) | 72 BPM* / 1158 / 0.16, 26.6 s loop | 0.55 | 395,543 |

\* BPM is a rough onset autocorrelation; the clip is a lazy 2-feel swing that the estimator reads at
the half-time pulse.

Prompts used (verbatim): `open` "a quick bubbly cartoon 'bwoop' pop as a menu card swings open,
rising pitch, 0.2 seconds, dry, no music"; `tip` "a single short cartoon cash register bell
'cha-ching' with a coin drop, bright and metallic, 1 second, dry, no music, no voice"; `flag` "a single
referee whistle blast 'fweeet', short, 0.4 seconds, dry, no music"; `joint` "Instrumental music,
seamless loop: lazy swing jazz at 86 BPM in a minor key, muted trumpet lead, walking upright bass,
brushed drums, vibraphone stabs, slightly spooky lounge mood, cartoon haunted diner. 30 seconds, no
vocals."

Total shipped: 17.5 KB SFX + 386 KB music; mean similarity 0.60.

## Remaining (not yet generated)

The Higgsfield account hit `grace_daily_limit_reached` after 7 Seed Audio jobs (the error also blocks
Mirelo / Sonilo), so 63 targets are still synth-only. In priority order:

ambience, chew, chomp, scream, groupScream, cashRegister, coin, doorOpen, doorClose, cookStove,
cookGrill, cookSmoker, cookFryer, cookCauldron, cookKiln, cookPit, cookTomb, tap, close, page,
purchase, raid (music), map (music), groan, mutter1-4, sizzle, ding, plate, burn, levelUp, feast, bones,
hungry, panic, rareArrival, refresh, outOfFood, burnSoon, hit, punch, knockdown, ko, revive, raidWin,
raidLose, infect, daydream, snore, error, place, rotate, sell, expand, whack, zap, heal, summon,
dogBark, pugSnort, stomp.

## Regeneration recipe

Prerequisites: `higgsfield` CLI logged in, `ffmpeg`/`ffprobe` on PATH, Python 3 (no numpy needed).
Work in a scratch folder (`AUDIO_WORK`), never inside the repo, because the candidate WAVs are large.

```bash
export AUDIO_WORK=/path/to/scratch/audio          # gen/, out/, originals.csv live here
mkdir -p "$AUDIO_WORK"
# 1. fingerprint the reference originals (local, never committed)
python -I game/tools/audio/fingerprint.py "$AUDIO_WORK/originals.csv" /path/to/originals/*.caf /path/to/originals/*.mp3
# 2. generate candidates (resumable; skips what exists; exits 2 when the daily quota bites)
python -I game/tools/audio/gen.py generate --jobs 4 --max-per 1      # first candidate of every target, priority order
python -I game/tools/audio/gen.py generate --jobs 4                  # then the 2nd/3rd candidates
#    or leave `bash game/tools/audio/genloop.sh` running: it retries every 15 min until done
# 3. score, pick the best candidate per target, master to OGG -> $AUDIO_WORK/out/{sfx,music}
python -I game/tools/audio/gen.py pick
# 4. ship
cp "$AUDIO_WORK"/out/sfx/*.ogg game/public/audio/sfx/ && cp "$AUDIO_WORK"/out/music/*.ogg game/public/audio/music/
cp "$AUDIO_WORK"/out/report.json game/tools/audio/report.json
cd game && node tools/audio-manifest.mjs && npm test && npm run typecheck && npm run build
```

Prompts live in `targets.json`; edit a prompt, delete that target's `gen/<name>/` folder and rerun
steps 2–4 for `--only <name>`. Keep candidate count at 2–3 per SFX; each Seed Audio job costs
~0.2–0.8 credits. Seed Audio takes no duration parameter: state the length in the prompt (one-shots
come back 1.5–5 s and are trimmed to their first event / `max`; music always 30 s).
