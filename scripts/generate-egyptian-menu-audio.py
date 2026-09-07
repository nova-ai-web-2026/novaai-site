from pathlib import Path
import struct

# Original Hayat Masr menu composition.
# The workflow renders this MIDI through a GM SoundFont, so the shipped Ogg uses
# instrument timbres (accordion/organ/reed + hand percussion) instead of raw oscillators.
TPQ = 480
BPM = 102
BAR = TPQ * 4
EIGHTH = TPQ // 2
SIXTEENTH = TPQ // 4
OUT = Path('egypt-life-sim-v2/assets')
OUT.mkdir(parents=True, exist_ok=True)


def vlq(n: int) -> bytes:
    n = max(0, int(n))
    buf = [n & 0x7F]
    n >>= 7
    while n:
        buf.append((n & 0x7F) | 0x80)
        n >>= 7
    return bytes(reversed(buf))


def track_chunk(events):
    events = sorted(events, key=lambda x: (x[0], x[1]))
    data = bytearray()
    last = 0
    for tick, order, payload in events:
        data += vlq(tick - last)
        data += payload
        last = tick
    data += b'\x00\xff\x2f\x00'
    return b'MTrk' + struct.pack('>I', len(data)) + data


def meta_track(total_ticks):
    us = round(60_000_000 / BPM)
    events = [
        (0, 0, b'\xff\x51\x03' + us.to_bytes(3, 'big')),
        (0, 1, b'\xff\x58\x04\x04\x02\x18\x08'),
        (0, 2, b'\xff\x59\x02\x00\x00'),
        (total_ticks, 99, b'\xff\x01\x00'),
    ]
    return track_chunk(events)


def program(ch, num):
    return bytes([0xC0 | ch, num & 0x7F])


def cc(ch, controller, value):
    return bytes([0xB0 | ch, controller & 0x7F, value & 0x7F])


def note_on(ch, note, vel):
    return bytes([0x90 | ch, note & 0x7F, vel & 0x7F])


def note_off(ch, note):
    return bytes([0x80 | ch, note & 0x7F, 0])


def bend(ch, value):
    value = max(0, min(16383, int(value)))
    return bytes([0xE0 | ch, value & 0x7F, (value >> 7) & 0x7F])


def add_note(events, ch, tick, dur, note, vel=90, bend_value=8192, grace=False):
    # Default GM pitch bend is normally +/-2 semitones. 6144 is about -50 cents,
    # giving the characteristic E half-flat colour in D Bayati.
    events.append((tick, 0, bend(ch, bend_value)))
    if grace:
        gdur = max(24, SIXTEENTH // 3)
        lower = max(0, note - 1)
        events.append((tick, 1, note_on(ch, lower, max(35, vel - 25))))
        events.append((tick + gdur, 0, note_off(ch, lower)))
        tick += gdur
        dur = max(48, dur - gdur)
    events.append((tick, 2, note_on(ch, note, vel)))
    events.append((tick + dur, 0, note_off(ch, note)))
    events.append((tick + dur, 1, bend(ch, 8192)))


def write_midi(path, tracks, total_ticks):
    header = b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks) + 1, TPQ)
    body = meta_track(total_ticks) + b''.join(track_chunk(t) for t in tracks)
    path.write_bytes(header + body)


# --- Main menu arrangement: 8 bars / ~19 seconds ---
BARS = 8
TOTAL = BARS * BAR
accordion = []
lead = []
organ_bass = []
drums = []

# GM programs are zero-based: Accordion 21, Drawbar Organ 16, Oboe 68, Finger Bass 33.
accordion += [(0, 0, program(0, 21)), (0, 1, cc(0, 7, 94)), (0, 2, cc(0, 10, 49))]
lead += [(0, 0, program(1, 68)), (0, 1, cc(1, 7, 103)), (0, 2, cc(1, 10, 78))]
organ_bass += [
    (0, 0, program(2, 16)), (0, 1, cc(2, 7, 70)), (0, 2, cc(2, 10, 43)),
    (0, 3, program(3, 33)), (0, 4, cc(3, 7, 76)), (0, 5, cc(3, 10, 64)),
]

# Drum map: 64 low conga ~= DUM, 62/63 high conga ~= TAK, 54 tambourine, 39 clap.
def drum(tick, note, vel, dur=70):
    drums.append((tick, 1, note_on(9, note, vel)))
    drums.append((tick + dur, 0, note_off(9, note)))

for bar in range(BARS):
    base = bar * BAR
    # Baladi / maqsoum family groove: DUM ... TAK TAK ... DUM ... TAK ...
    for sub, vel in ((0, 112), (8, 98)):
        drum(base + sub * SIXTEENTH, 64, vel, 100)
        drum(base + sub * SIXTEENTH, 36, 52 if sub else 62, 80)
    for sub, note, vel in ((4, 63, 92), (6, 62, 72), (12, 63, 96), (14, 62, 76)):
        drum(base + sub * SIXTEENTH, note, vel, 55)
    for sub in (2, 5, 10, 13):
        drum(base + sub * SIXTEENTH, 54, 52, 42)
    for sub in (4, 12):
        drum(base + sub * SIXTEENTH, 39, 42, 50)
    # Small fill on alternate bars.
    if bar % 2 == 1:
        for j, note in enumerate((62, 63, 62)):
            drum(base + 15 * SIXTEENTH + j * 38, note, 54 + j * 7, 34)

    # Shaabi organ drone + simple bass keeps the centre on D without westernising Bayati.
    root = 50  # D3
    fifth = 57 # A3
    add_note(organ_bass, 2, base, BAR - 35, root, 48)
    add_note(organ_bass, 2, base, BAR - 35, fifth, 35)
    for beat, bass_note, vel in ((0, 38, 72), (2, 38, 66), (3, 45, 54)):
        add_note(organ_bass, 3, base + beat * TPQ, EIGHTH, bass_note, vel)

# D Bayati degrees. E half-flat is MIDI E4 (64) bent down ~50 cents.
D4 = (62, 8192)
E_HALF = (64, 6144)
F4 = (65, 8192)
G4 = (67, 8192)
A4 = (69, 8192)
BB4 = (70, 8192)
C5 = (72, 8192)
D5 = (74, 8192)
EB4 = (63, 8192)
FS4 = (66, 8192)

phrases = [
    [D4, E_HALF, F4, E_HALF, D4, G4, F4, E_HALF],
    [D4, D4, A4, G4, F4, E_HALF, D4, None],
    [D4, E_HALF, F4, G4, F4, E_HALF, D4, A4],
    [G4, F4, E_HALF, D4, E_HALF, F4, D4, None],
    [D4, EB4, FS4, G4, FS4, EB4, D4, A4],
    [D5, C5, BB4, A4, G4, FS4, EB4, D4],
    [D4, E_HALF, F4, G4, A4, G4, F4, E_HALF],
    [D4, E_HALF, F4, E_HALF, D4, A4, D5, D4],
]

for bar, phrase in enumerate(phrases):
    base = bar * BAR
    for i, spec in enumerate(phrase):
        if spec is None:
            continue
        note, pb = spec
        tick = base + i * EIGHTH
        add_note(lead, 1, tick, int(EIGHTH * .76), note, 94 if i in (0, 4) else 83,
                 pb, grace=(i in (1, 5) and bar < 4))

    # Accordion/organ-style shaabi answers. Keep them short and syncopated.
    replies = [
        (10, 65, 78), (11, 64, 72), (12, 62, 84),
        (14, 69 if bar % 2 == 0 else 67, 69), (15, 62, 76),
    ]
    for sub, note, vel in replies:
        pb = 6144 if note == 64 and bar < 4 else 8192
        add_note(accordion, 0, base + sub * SIXTEENTH, int(SIXTEENTH * .78), note, vel, pb)

# Strong closing pickup that still loops cleanly back to D.
add_note(accordion, 0, TOTAL - 3 * SIXTEENTH, SIXTEENTH, 65, 74)
add_note(accordion, 0, TOTAL - 2 * SIXTEENTH, SIXTEENTH, 64, 78, 6144)
add_note(accordion, 0, TOTAL - SIXTEENTH, SIXTEENTH - 12, 62, 90)

write_midi(OUT / 'egyptian-menu-loop.mid', [accordion, lead, organ_bass, drums], TOTAL)

# --- Button sting: compact D Bayati / tabla signature ---
STING_TOTAL = int(BAR * .65)
st_acc = [(0, 0, program(0, 21)), (0, 1, cc(0, 7, 105))]
st_lead = [(0, 0, program(1, 68)), (0, 1, cc(1, 7, 108))]
st_drums = []

def sdrum(tick, note, vel, dur=60):
    st_drums.append((tick, 1, note_on(9, note, vel)))
    st_drums.append((tick + dur, 0, note_off(9, note)))

sdrum(0, 64, 114, 95)
sdrum(SIXTEENTH * 2, 54, 65, 45)
sdrum(SIXTEENTH * 3, 63, 92, 50)
add_note(st_lead, 1, SIXTEENTH, SIXTEENTH * 2, 62, 102)
add_note(st_lead, 1, SIXTEENTH * 3, SIXTEENTH * 2, 64, 96, 6144, grace=True)
add_note(st_acc, 0, SIXTEENTH * 5, SIXTEENTH * 2, 65, 96)
add_note(st_acc, 0, SIXTEENTH * 7, SIXTEENTH * 2, 62, 104)
write_midi(OUT / 'egyptian-button-sting.mid', [st_acc, st_lead, st_drums], STING_TOTAL)

print(OUT / 'egyptian-menu-loop.mid', OUT / 'egyptian-button-sting.mid')
