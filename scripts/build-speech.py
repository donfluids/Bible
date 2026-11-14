#!/usr/bin/env python3
"""The sounds of each Malayalam verse, for the voice the app carries (assets/speech).

The voice (a Piper model) is given speech sounds, not letters. Turning Malayalam letters
into sounds is the work of eSpeak NG, which is under the GPL and so is not put in the
apps; the Bible's text does not change, so it is done here once, and the apps carry only
the result: for each verse, its phrases as the voice's sound numbers, and the rest that
follows each phrase (a breath at a comma, longer at a full stop).

    pip install piper-tts          (brings eSpeak NG; used only on the build machine)
    python3 scripts/build-speech.py assets/db/bible-ml.db MAL <voice.onnx.json> assets/speech/ml.bin

With the config.json of Indic Tiny TTS (scripts/build-tiny-voice.py) in place of the Piper
voice's, the phrases are kept as the model's letters instead: that voice reads Malayalam
script itself, so eSpeak is not needed at all. The text is prepared as the model's own
reader does (its textnorm, read from its page): NFC, the old chillu spellings joined, the
zero-width joiners removed, a colon or semicolon read as a comma, other unknown marks as
spaces.

    python3 scripts/build-speech.py assets/db/bible-ml.db MAL <indic-tiny config.json> assets/speech/ml-letters.bin

The file: "BSP1", the number of chapters, then for each chapter its book, chapter and
where it starts (u8, u8, u32); then each chapter: the number of verses (u8) and for each
the verse (u8), its phrases (u8), and for each phrase the rest after it (u8: 1 short,
2 long), the number of sounds (u16) and the sounds (u8 each). Little-endian.
"""
import json, re, sqlite3, struct, sys, unicodedata

def flatten(text):
    # As flattenVerse() in src/text.ts: what the app reads for a verse.
    return re.sub(r'\s+', ' ', re.sub(r'[\n ]+', ' ', text.replace('¶', ''))).strip()

# Indic Tiny TTS's reading of Malayalam text (its textnorm, version 4, for 'ml').
CHILLU = {'ണ്\u200d': 'ൺ', 'ന്\u200d': 'ൻ', 'ര്\u200d': 'ർ', 'ല്\u200d': 'ൽ', 'ള്\u200d': 'ൾ', 'ക്\u200d': 'ൿ'}
PAUSE_LIKE = {':': ',', ';': ',', '…': '.', '–': ',', '—': ','}

def letters_of(text, ids, unknown):
    t = ' '.join(unicodedata.normalize('NFC', text).split())
    t = t.replace('ന്\u200dറ', 'ന്റ')
    for old, new in CHILLU.items():
        t = t.replace(old, new)
    for c in '\u200d\u200c\u200b\ufeff\u2060\u00ad':
        t = t.replace(c, '')
    out = []
    for ch in t:
        if 'c:' + ch in ids or ch == ' ':
            out.append(ch)
        elif PAUSE_LIKE.get(ch) and 'c:' + PAUSE_LIKE[ch] in ids:
            out.append(PAUSE_LIKE[ch])
        else:
            unknown[ch] = unknown.get(ch, 0) + 1
            out.append(' ')
    return [ids['c:' + ch] for ch in re.sub(r'\s+', ' ', ''.join(out)).strip()]

def main(db_path, translation, config_path, out_path):
    config = json.load(open(config_path, encoding='utf-8'))
    letters = config.get('vocab', {}).get('mode') == 'chr'
    if letters:
        ids = {s: i for i, s in enumerate(config['vocab']['symbols'])}
    else:
        from piper.phonemize_espeak import EspeakPhonemizer
        ids = {k: v[0] for k, v in config['phoneme_id_map'].items()}
        espeak = EspeakPhonemizer()
        voice = config['espeak']['voice']
    assert max(ids.values()) < 256
    db = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    chapters = {}
    unknown = {}
    for book, chapter, verse, text in db.execute('select book, chapter, verse, text from verses where translation = ? order by book, chapter, verse', (translation,)):
        phrases = []
        for words, stop in re.findall(r'([^;,.:!?]+)([;,.:!?]*)', flatten(text)):
            words = words.strip(' "\'“”‘’()[]—-')
            if not words:
                continue
            sounds = []
            if letters:
                sounds = letters_of(words + (stop[:1] or '.'), ids, unknown)
            else:
                for sentence in espeak.phonemize(voice, words + (stop[:1] or '.')):
                    for p in sentence:
                        if p in ids:
                            sounds.append(ids[p])
                        else:
                            unknown[p] = unknown.get(p, 0) + 1
            if sounds:
                phrases.append((2 if stop[:1] in ('.', '!', '?') else 1, sounds))
        assert verse < 256 and len(phrases) < 256, (book, chapter, verse)
        chapters.setdefault((book, chapter), []).append((verse, phrases))
    blocks = []
    for (book, chapter), verses in sorted(chapters.items()):
        assert len(verses) < 256
        b = bytearray([len(verses)])
        for verse, phrases in verses:
            b += bytes([verse, len(phrases)])
            for rest, sounds in phrases:
                b += struct.pack('<BH', rest, len(sounds)) + bytes(sounds)
        blocks.append((book, chapter, bytes(b)))
    offset = 8 + 6 * len(blocks)
    out = bytearray(b'BSP1' + struct.pack('<I', len(blocks)))
    for book, chapter, b in blocks:
        out += struct.pack('<BBI', book, chapter, offset)
        offset += len(b)
    for _, _, b in blocks:
        out += b
    open(out_path, 'wb').write(out)
    print(f'{len(blocks)} chapters, {sum(len(v) for v in chapters.values())} verses, {len(out)} bytes; sounds not in the voice: {unknown}')

if __name__ == '__main__':
    main(*sys.argv[1:5])
