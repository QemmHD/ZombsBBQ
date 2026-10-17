"""Compact audio fingerprints with ffmpeg + pure python (no numpy).

usage: python -I fingerprint.py out.csv file1 file2 ...
       python -I fingerprint.py --json file   (prints one fingerprint as JSON)

Per file: duration, channels, rate, trimmed length, peak/rms dBFS, 10-bin RMS envelope (normalised),
spectral centroid (Hz, mean over frames), spectral flatness (0 tonal .. 1 noise), zero-crossing
pitch estimate, BPM (files > 8 s, onset autocorrelation).
"""
import array
import csv
import json
import math
import os
import subprocess
import sys

SR = 22050
BINS = 10


def run(cmd):
    return subprocess.run(cmd, capture_output=True, check=False)


def probe(path):
    p = run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path])
    try:
        j = json.loads(p.stdout.decode('utf-8', 'replace') or '{}')
    except json.JSONDecodeError:
        j = {}
    st = next((s for s in j.get('streams', []) if s.get('codec_type') == 'audio'), {})
    dur = float(j.get('format', {}).get('duration') or st.get('duration') or 0)
    return dur, int(st.get('channels') or 0), int(st.get('sample_rate') or 0), st.get('codec_name', '')


def pcm(path):
    p = run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'])
    a = array.array('h')
    a.frombytes(p.stdout[: len(p.stdout) // 2 * 2])
    return a


def spectral(path):
    p = run(['ffmpeg', '-v', 'error', '-nostats', '-i', path, '-af',
             f'aformat=channel_layouts=mono,aresample={SR},aspectralstats=win_size=1024:measure=centroid+flatness,'
             'ametadata=mode=print:file=-', '-f', 'null', '-'])
    cents, flats = [], []
    for line in p.stdout.decode('utf-8', 'replace').splitlines():
        if '.centroid=' in line:
            try:
                cents.append(float(line.split('=')[1]))
            except ValueError:
                pass
        elif '.flatness=' in line:
            try:
                flats.append(float(line.split('=')[1]))
            except ValueError:
                pass
    return cents, flats


def fingerprint(path):
    dur, ch, rate, codec = probe(path)
    a = pcm(path)
    n = len(a)
    if n == 0:
        return None
    peak = max(1, max(abs(x) for x in a))
    # trim: first/last 10 ms block whose RMS is above -40 dB re peak
    blk = SR // 100
    thr = (peak * 0.01) ** 2
    nb = n // blk
    bl = []
    for i in range(nb):
        s = a[i * blk:(i + 1) * blk]
        bl.append(sum(x * x for x in s) / blk)
    first = next((i for i, v in enumerate(bl) if v > thr), 0)
    last = next((i for i in range(nb - 1, -1, -1) if bl[i] > thr), nb - 1)
    t0, t1 = first * blk, min(n, (last + 1) * blk)
    seg = a[t0:t1] if t1 > t0 else a
    m = len(seg)
    rms = math.sqrt(sum(x * x for x in seg) / m)
    env = []
    for b in range(BINS):
        s = seg[b * m // BINS:(b + 1) * m // BINS]
        env.append(math.sqrt(sum(x * x for x in s) / max(1, len(s))))
    emax = max(env) or 1
    env = [round(e / emax, 3) for e in env]
    zc = sum(1 for i in range(1, m) if (seg[i] >= 0) != (seg[i - 1] >= 0))
    zcr_hz = zc / 2 / (m / SR)
    cents, flats = spectral(path)
    # frames in silence drag the mean; keep the loud 60 % of frames via the 10 ms envelope grid
    centroid = sum(cents) / len(cents) if cents else 0
    flat = sum(flats) / len(flats) if flats else 0
    bpm = ''
    if dur > 8:
        # onset envelope at 100 Hz from bl (already 10 ms RMS)
        on = [max(0.0, math.sqrt(bl[i]) - math.sqrt(bl[i - 1])) for i in range(1, len(bl))]
        mean = sum(on) / len(on)
        on = [v - mean for v in on]
        best, bl_ag = 0, 0
        for lag in range(30, 151):  # 200 .. 40 bpm
            c = sum(on[i] * on[i - lag] for i in range(lag, len(on)))
            if c > best:
                best, bl_ag = c, lag
        if bl_ag:
            bpm = round(6000 / bl_ag, 1)
            # fold into 70..180
            while bpm < 70:
                bpm *= 2
            while bpm > 180:
                bpm /= 2
            bpm = round(bpm, 1)
    return {
        'file': os.path.basename(path), 'dur': round(dur, 3), 'ch': ch, 'rate': rate, 'codec': codec,
        'trim_dur': round(m / SR, 3), 'peak_db': round(20 * math.log10(peak / 32768), 1),
        'rms_db': round(20 * math.log10(max(rms, 1) / 32768), 1), 'env': env,
        'centroid': round(centroid), 'flatness': round(flat, 3), 'zcr_hz': round(zcr_hz), 'bpm': bpm,
    }


def main(argv):
    if argv and argv[0] == '--json':
        print(json.dumps(fingerprint(argv[1])))
        return
    out, files = argv[0], argv[1:]
    rows = []
    for i, f in enumerate(files):
        fp = fingerprint(f)
        if fp:
            rows.append(fp)
        print(f'{i + 1}/{len(files)} {os.path.basename(f)}', file=sys.stderr)
    cols = ['file', 'dur', 'ch', 'rate', 'codec', 'trim_dur', 'peak_db', 'rms_db', 'centroid', 'flatness', 'zcr_hz', 'bpm'] + [f'env{i}' for i in range(BINS)]
    with open(out, 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh)
        w.writerow(cols)
        for r in rows:
            w.writerow([r[c] for c in cols[:12]] + r['env'])


if __name__ == '__main__':
    main(sys.argv[1:])
