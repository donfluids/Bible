#!/usr/bin/env python3
"""The sounds of each Malayalam verse, for the voice the app carries (assets/speech).

The voice (a Piper model) is given speech sounds, not letters. Turning Malayalam letters
into sounds is the work of eSpeak NG, which is under the GPL and so is not put in the
apps; the Bible's text does not change, so it is done here once, and the apps carry only
the result: for each verse, its phrases as the voice's sound numbers, and the rest that
follows each phrase (a breath at a comma, longer at a full stop).

    pip install piper-tts          (brings eSpeak NG; used only on the build machine)
    python3 scripts/build-speech.py assets/db/bible-ml.db MAL <voice.onnx.json> assets/speech/ml.bin

The file: "BSP1", the number of chapters, then for each chapter its book, chapter and
where it starts (u8, u8, u32); then each chapter: the number of verses (u8) and for each
the verse (u8), its phrases (u8), and for each phrase the rest after it (u8: 1 short,
2 long), the number of sounds (u16) and the sounds (u8 each). Little-endian.
"""
import json, re, sqlite3, struct, sys

def flatten(text):
    # As flattenVerse() in src/text.ts: what the app reads for a verse.
    return re.sub(r'\s+', ' ', re.sub(r'[\n ]+', ' ', text.replace('¶', ''))).strip()

def main(db_path, translation, config_path, out_path):
    from piper.phonemize_espeak import EspeakPhonemizer
    config = json.load(open(config_path, encoding='utf-8'))
    ids = {k: v[0] for k, v in config['phoneme_id_map'].items()}
    assert max(ids.values()) < 256
    espeak = EspeakPhonemizer()
    voice = config['espeak']['voice']
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
