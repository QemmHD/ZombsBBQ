"""Generate, score, pick and master the Zombs BBQ sound bed.

  python -I gen.py generate [--only name,name] [--jobs 6]   -> gen/<name>/<i>.wav (+ .json fingerprint)
  python -I gen.py pick [--only name,name]                  -> out/sfx/<name>.ogg, out/music/<name>.ogg, out/report.json

Paths are fixed relative to this file's parent (the scratchpad audio folder); originals.csv is the
fingerprint table of the reference set.
"""
import csv
import json
import math
import os
import subprocess
import sys
import threading
import shutil
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("AUDIO_WORK", os.path.dirname(HERE))
GEN = os.path.join(ROOT, 'gen')
OUT = os.path.join(ROOT, 'out')
sys.path.insert(0, HERE)
import fingerprint as fpmod  # noqa: E402

TARGETS = json.load(open(os.path.join(HERE, 'targets.json'), encoding='utf-8'))
_ORIG_CSV = os.path.join(ROOT, 'originals.csv')
ORIG = {r['file']: r for r in csv.DictReader(open(_ORIG_CSV, encoding='utf-8'))} if os.path.exists(_ORIG_CSV) else {}
LOCK = threading.Lock()
QUOTA = threading.Event()
HF = shutil.which('higgsfield.cmd') or shutil.which('higgsfield') or 'higgsfield'


def log(*a):
    with LOCK:
        print(*a, file=sys.stderr, flush=True)


def all_targets():
    for name, t in TARGETS['sfx'].items():
        yield name, t
    for name, t in TARGETS['music'].items():
        yield name, t


# --- generation ------------------------------------------------------------------------------

def generate_one(name, t, i):
    d = os.path.join(GEN, name)
    os.makedirs(d, exist_ok=True)
    wav = os.path.join(d, f'{i}.wav')
    if os.path.exists(wav) and os.path.getsize(wav) > 1000:
        return 'cached'
    cmd = [HF, 'generate', 'create', 'seed_audio', '--prompt', t['prompt'], '--format', 'wav',
           '--sample_rate', '44100', '--wait', '--wait-timeout', '15m', '--json']
    for attempt in range(2):
        p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if 'grace_daily_limit_reached' in p.stderr or 'grace_daily_limit_reached' in p.stdout:
            log(f'  quota: {name}#{i}')
            QUOTA.set()
            return 'quota'
        try:
            jobs = json.loads(p.stdout[p.stdout.index('['):])
            url = jobs[0].get('result_url')
            if jobs[0].get('status') == 'completed' and url:
                r = subprocess.run(['curl', '-sL', '-o', wav, url], capture_output=True)
                if r.returncode == 0 and os.path.getsize(wav) > 1000:
                    with open(os.path.join(d, f'{i}.job.json'), 'w', encoding='utf-8') as fh:
                        json.dump({'id': jobs[0].get('id'), 'url': url, 'prompt': t['prompt']}, fh)
                    return 'ok'
        except (ValueError, IndexError, KeyError, OSError):
            pass
        log(f'  retry {name}#{i} ({attempt + 1}): {p.stdout[-200:]} {p.stderr[-200:]}')
    return 'failed'


PRIORITY = ['ambience', 'chew', 'chomp', 'scream', 'groupScream', 'cashRegister', 'tip', 'coin', 'doorOpen', 'doorClose',
            'cookStove', 'cookGrill', 'cookSmoker', 'cookFryer', 'cookCauldron', 'cookKiln', 'cookPit', 'cookTomb',
            'tap', 'open', 'close', 'page', 'purchase', 'joint', 'raid', 'map', 'groan', 'mutter1', 'mutter2', 'mutter3', 'mutter4',
            'sizzle', 'ding', 'plate', 'burn', 'levelUp', 'feast', 'bones', 'hungry', 'panic', 'rareArrival', 'refresh',
            'outOfFood', 'burnSoon', 'hit', 'punch', 'knockdown', 'ko', 'revive', 'raidWin', 'raidLose']


def cmd_generate(only, jobs, max_per=99):
    order = {n: i for i, n in enumerate(PRIORITY)}
    names = sorted(((n, t) for n, t in all_targets() if not only or n in only), key=lambda x: order.get(x[0], 999))
    # round-robin: every target's first candidate before anyone's second
    todo = [(n, t, i) for i in range(max_per) for n, t in names if i < t['n']]
    log(f'{len(todo)} generations')
    done = {'ok': 0, 'cached': 0, 'failed': 0, 'quota': 0}

    def work(item):
        n, t, i = item
        if QUOTA.is_set():
            wav = os.path.join(GEN, n, f'{i}.wav')
            if not os.path.exists(wav):
                with LOCK:
                    done['quota'] += 1
                return
        r = generate_one(n, t, i)
        with LOCK:
            done[r] += 1
        log(f'{n}#{i}: {r}  ({sum(done.values())}/{len(todo)})')
        wav = os.path.join(GEN, n, f'{i}.wav')
        if os.path.exists(wav) and not os.path.exists(wav[:-4] + '.json'):
            fp = fpmod.fingerprint(wav)
            if fp:
                json.dump(fp, open(wav[:-4] + '.json', 'w', encoding='utf-8'))

    with ThreadPoolExecutor(max_workers=jobs) as ex:
        list(ex.map(work, todo))
    log(done)


# --- scoring -----------------------------------------------------------------------------------

def ref_fp(t):
    rows = [ORIG[r] for r in t['refs'] if r in ORIG]
    if not rows:
        return None
    n = len(rows)
    env = [sum(float(r[f'env{i}']) for r in rows) / n for i in range(10)]
    return {
        'files': [r['file'] for r in rows],
        'trim_dur': sum(float(r['trim_dur']) for r in rows) / n,
        'centroid': math.exp(sum(math.log(max(50, float(r['centroid']))) for r in rows) / n),
        'flatness': sum(float(r['flatness']) for r in rows) / n,
        'env': env,
        'bpm': sum(float(r['bpm']) for r in rows if r['bpm']) / max(1, sum(1 for r in rows if r['bpm'])),
    }


def corr(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    va = math.sqrt(sum((x - ma) ** 2 for x in a))
    vb = math.sqrt(sum((x - mb) ** 2 for x in b))
    if va < 1e-9 or vb < 1e-9:
        return 0.0
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (va * vb)


def score(t, ref, fp):
    kind = t['kind']
    c_cent = 1 - min(1.0, abs(math.log2(max(50, fp['centroid']) / ref['centroid'])) / 2) if ref else 0.5
    c_flat = 1 - min(1.0, abs(fp['flatness'] - ref['flatness']) * 2) if ref else 0.5
    c_env = (corr(fp['env'], ref['env']) + 1) / 2 if ref else 0.5
    parts = {}
    if kind == 'shot':
        want = ref['trim_dur'] if ref else t['max'] * 0.7
        want = min(want, t['max'])
        got = fp['trim_dur']
        parts = {'dur': min(want, got) / max(want, got, 1e-6), 'env': c_env, 'centroid': c_cent, 'flatness': c_flat}
        w = {'dur': 0.3, 'env': 0.3, 'centroid': 0.25, 'flatness': 0.15}
    elif kind == 'loop':
        e = fp['env']
        m = sum(e) / len(e)
        steady = 1 - min(1.0, math.sqrt(sum((x - m) ** 2 for x in e) / len(e)) * 3)
        parts = {'steady': steady, 'centroid': c_cent, 'flatness': c_flat, 'env': c_env}
        w = {'steady': 0.3, 'centroid': 0.35, 'flatness': 0.25, 'env': 0.1}
    else:
        bpm = fp['bpm'] or 0
        rb = ref['bpm'] if ref and ref['bpm'] else 0
        c_bpm = 1 - min(1.0, min(abs(bpm - rb), abs(bpm * 2 - rb), abs(bpm / 2 - rb)) / 30) if bpm and rb else 0.5
        parts = {'bpm': c_bpm, 'centroid': c_cent, 'flatness': c_flat, 'env': c_env}
        w = {'bpm': 0.3, 'centroid': 0.3, 'flatness': 0.2, 'env': 0.2}
    total = sum(parts[k] * w[k] for k in w)
    return round(total, 3), {k: round(v, 3) for k, v in parts.items()}


# --- mastering ---------------------------------------------------------------------------------

def ff(args):
    p = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-nostats'] + args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if p.returncode != 0:
        raise RuntimeError(p.stderr[-500:])
    return p


def duration(path):
    return fpmod.probe(path)[0]


def loudness(path):
    p = subprocess.run(['ffmpeg', '-v', 'info', '-nostats', '-i', path, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    txt = p.stderr
    try:
        j = json.loads(txt[txt.rindex('{'):txt.rindex('}') + 1])
        i = float(j['input_i'])
        if math.isfinite(i) and i > -60:
            return i
    except (ValueError, KeyError):
        pass
    fp = fpmod.fingerprint(path)
    return fp['rms_db'] + 3 if fp else -20  # rough: RMS dBFS of a sine is ~3 dB under its LUFS


def master_shot(src, dst, t):
    tmp = dst + '.tmp.wav'
    # trim leading / trailing silence, mono
    ff(['-i', src, '-af', 'aformat=channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-38dB:start_silence=0.01,'
        'areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse', '-ar', '44100', tmp])
    d = duration(tmp)
    mx = t['max']
    cut = ''
    if d > mx:
        cut = f',atrim=0:{mx},afade=t=out:st={mx - 0.06:.3f}:d=0.06'
    gain = -16 - loudness(tmp)
    ff(['-i', tmp, '-af', f'volume={gain:.2f}dB,alimiter=limit=0.891:attack=1:release=40:level=false{cut}', '-ar', '22050',
        '-c:a', 'libvorbis', '-q:a', '3', dst])
    os.remove(tmp)


def master_loop(src, dst, t, stereo=False, target_lufs=-16, q=3, rate=22050, bars_of=None):
    tmp = dst + '.tmp.wav'
    ff(['-i', src, '-af', ('' if stereo else 'aformat=channel_layouts=mono,') + 'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.02',
        '-ar', '44100', tmp])
    d = duration(tmp)
    x = 0.5 if stereo else 0.35          # crossfade seam
    a = 0.3                               # skip the first bit (attack / fade-in)
    avail = d - a - x - 0.2
    if bars_of:
        bar = bars_of
        L = max(1, math.floor(avail / bar)) * bar
    else:
        L = min(t['len'], avail)
    graph = (f'[0:a]atrim=start={a}:end={a + x},asetpts=PTS-STARTPTS[head];'
             f'[0:a]atrim=start={a + x}:end={a + x + L},asetpts=PTS-STARTPTS[body];'
             f'[body][head]acrossfade=d={x}:c1=tri:c2=tri[out]')
    tmp2 = dst + '.tmp2.wav'
    ff(['-i', tmp, '-filter_complex', graph, '-map', '[out]', tmp2])
    gain = target_lufs - loudness(tmp2)
    ff(['-i', tmp2, '-af', f'volume={gain:.2f}dB,alimiter=limit=0.891:attack=1:release=60:level=false', '-ar', str(rate),
        '-ac', '2' if stereo else '1', '-c:a', 'libvorbis', '-q:a', str(q), dst])
    os.remove(tmp)
    os.remove(tmp2)
    return L


def cmd_pick(only):
    report = {}
    for name, t in all_targets():
        if only and name not in only:
            continue
        d = os.path.join(GEN, name)
        cands = []
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if f.endswith('.wav'):
                    jf = os.path.join(d, f[:-4] + '.json')
                    fp = json.load(open(jf, encoding='utf-8')) if os.path.exists(jf) else fpmod.fingerprint(os.path.join(d, f))
                    if fp:
                        json.dump(fp, open(jf, 'w', encoding='utf-8'))
                        cands.append((f, fp))
        if not cands:
            report[name] = {'status': 'missing'}
            log(f'{name}: no candidates')
            continue
        ref = ref_fp(t)
        scored = sorted(((score(t, ref, fp), f, fp) for f, fp in cands), key=lambda x: -x[0][0])
        (best, parts), bf, bfp = scored[0]
        sub = 'music' if t['kind'] == 'music' else 'sfx'
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
        dst = os.path.join(OUT, sub, f'{name}.ogg')
        src = os.path.join(d, bf)
        try:
            if t['kind'] == 'shot':
                master_shot(src, dst, t)
                L = duration(dst)
            elif t['kind'] == 'loop':
                L = master_loop(src, dst, t)
            else:
                bpm = bfp['bpm'] or (ref['bpm'] if ref else 100)
                L = master_loop(src, dst, t, stereo=True, target_lufs=-18, q=4, rate=44100, bars_of=4 * 60 / bpm)
        except RuntimeError as e:
            log(f'{name}: master failed: {e}')
            report[name] = {'status': 'failed', 'error': str(e)}
            continue
        size = os.path.getsize(dst)
        report[name] = {
            'status': 'ok', 'kind': t['kind'], 'file': f'{sub}/{name}.ogg', 'bytes': size, 'seconds': round(L, 2),
            'prompt': t['prompt'], 'picked': bf, 'score': best, 'parts': parts,
            'candidates': [{'file': f, 'score': s[0], 'dur': fp['trim_dur'], 'centroid': fp['centroid'], 'flatness': fp['flatness'], 'bpm': fp['bpm']} for s, f, fp in scored],
            'ref': ref and {'files': ref['files'], 'trim_dur': round(ref['trim_dur'], 2), 'centroid': round(ref['centroid']), 'flatness': round(ref['flatness'], 3), 'bpm': round(ref['bpm'], 1) if ref['bpm'] else None},
            'got': {'trim_dur': bfp['trim_dur'], 'centroid': bfp['centroid'], 'flatness': bfp['flatness'], 'bpm': bfp['bpm']},
        }
        log(f'{name}: {bf} score {best} {parts} -> {size} B, {L:.2f} s')
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w', encoding='utf-8'), indent=1)
    ok = [r for r in report.values() if r.get('status') == 'ok']
    sfx = [r for r in ok if r['kind'] != 'music']
    mus = [r for r in ok if r['kind'] == 'music']
    log(f"kept {len(ok)} ({len(sfx)} sfx = {sum(r['bytes'] for r in sfx)} B, {len(mus)} music = {sum(r['bytes'] for r in mus)} B); "
        f"mean score {sum(r['score'] for r in ok) / max(1, len(ok)):.3f}")


if __name__ == '__main__':
    args = sys.argv[1:]
    only = set()
    jobs = 6
    if '--only' in args:
        only = set(args[args.index('--only') + 1].split(','))
    if '--jobs' in args:
        jobs = int(args[args.index('--jobs') + 1])
    max_per = int(args[args.index('--max-per') + 1]) if '--max-per' in args else 99
    if args[0] == 'generate':
        cmd_generate(only, jobs, max_per)
        sys.exit(2 if QUOTA.is_set() else 0)
    elif args[0] == 'pick':
        cmd_pick(only)
