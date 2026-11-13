#!/usr/bin/env python3
"""Reads John 1 in Malayalam with one open speech model, so the models can be compared by ear.

    python compare.py parler            # AI4Bharat Indic Parler-TTS: a voice described in words
    python compare.py svara             # Kenpath Svara-TTS v1 (Orpheus family)
    python compare.py f5                # AI4Bharat IndicF5: speaks in the voice of a reference clip
    python compare.py mock              # no model: a tone per phrase, to try the script itself

Each model needs its own Python environment (their requirements clash): run.sh sets the
three up and runs them in turn. Output, under out/<model>/:
    v01.wav ... v51.wav   one file a verse
    john1.wav             the chapter, verses joined with a rest between them
    report.json           seconds of sound, seconds taken, and how many times real time

Nothing is uploaded: the models are downloaded once from Hugging Face and run here.
"""
import argparse
import json
import math
import re
import struct
import sys
import time
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
PHRASE_REST = 0.30  # seconds of silence after a phrase inside a verse
VERSE_REST = 0.60  # and after a verse
MAX_PHRASE = 140  # letters; a longer phrase is cut at its commas


def phrases(text):
    """A verse as the phrases a reader would take in one breath."""
    parts = [p.strip() for p in re.split(r"(?<=[.;:?!])\s+", text) if p.strip()]
    out = []
    for part in parts:
        if len(part) <= MAX_PHRASE:
            out.append(part)
            continue
        piece = ""
        for clause in re.split(r"(?<=,)\s+", part):
            if piece and len(piece) + 1 + len(clause) > MAX_PHRASE:
                out.append(piece)
                piece = clause
            else:
                piece = f"{piece} {clause}".strip()
        if piece:
            out.append(piece)
    return out


def write_wav(path, samples, rate):
    """Mono 16-bit WAV from floats between -1 and 1."""
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767)) for s in samples))


def as_floats(audio):
    """A model's sound as a flat list of floats, whatever it handed back."""
    import numpy as np

    a = np.asarray(audio)
    if a.dtype == np.int16:
        a = a.astype(np.float32) / 32768.0
    return a.astype(np.float32).reshape(-1).tolist()


# --- the models: each returns (speak, rate), where speak(text) gives floats ---


def load_mock(args):
    rate = 22050

    def speak(text):
        n = int(rate * (0.4 + len(text) * 0.05))
        return [0.2 * math.sin(2 * math.pi * 220 * i / rate) for i in range(n)]

    return speak, rate


def load_parler(args):
    # Model card: https://huggingface.co/ai4bharat/indic-parler-tts (accept its terms there first).
    import torch
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer

    name = "ai4bharat/indic-parler-tts"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = ParlerTTSForConditionalGeneration.from_pretrained(name).to(device).eval()
    tokenizer = AutoTokenizer.from_pretrained(name)
    describer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    description = describer(args.description, return_tensors="pt").to(device)

    def speak(text):
        prompt = tokenizer(text, return_tensors="pt").to(device)
        with torch.inference_mode():
            sound = model.generate(
                input_ids=description.input_ids,
                attention_mask=description.attention_mask,
                prompt_input_ids=prompt.input_ids,
                prompt_attention_mask=prompt.attention_mask,
            )
        return as_floats(sound.cpu().numpy().squeeze())

    return speak, model.config.sampling_rate


def load_svara(args):
    # Model card: https://huggingface.co/kenpath/svara-tts-v1. The prompt and the decoding
    # follow the authors' demo (huggingface.co/spaces/kenpath/svara-tts, app.py).
    import torch
    from snac import SNAC
    from transformers import AutoModelForCausalLM, AutoTokenizer

    name = "kenpath/svara-tts-v1"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    codec = SNAC.from_pretrained("hubertsiuzdak/snac_24khz").to(device).eval()
    tokenizer = AutoTokenizer.from_pretrained(name)
    model = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.float16 if device == "cuda" else torch.float32).to(device).eval()
    tail = f" <{args.style}>" if args.style and args.style != "neutral" else ""

    def speak(text):
        ids = tokenizer(f"Malayalam ({args.gender}): {text}{tail}", return_tensors="pt").input_ids
        ids = torch.cat([torch.tensor([[128259]]), ids, torch.tensor([[128009, 128260]])], dim=1).to(device)
        with torch.inference_mode():
            made = model.generate(
                input_ids=ids,
                attention_mask=torch.ones_like(ids),
                max_new_tokens=2048,
                do_sample=True,
                temperature=0.7,
                top_p=0.8,
                repetition_penalty=1.1,
                num_return_sequences=1,
                eos_token_id=128258,
            )
        # The sound's tokens come after the last <head> (128257); <eos> (128258) is dropped.
        row = made[0]
        heads = (row == 128257).nonzero(as_tuple=True)[0]
        if len(heads):
            row = row[heads[-1] + 1 :]
        codes = [int(t) - 128266 for t in row[row != 128258]]
        codes = codes[: len(codes) // 7 * 7]
        if not codes:
            raise RuntimeError("no sound was made for this phrase")
        one, two, three = [], [], []
        for i in range(0, len(codes), 7):
            one.append(codes[i])
            two.append(codes[i + 1] - 4096)
            three.append(codes[i + 2] - 2 * 4096)
            three.append(codes[i + 3] - 3 * 4096)
            two.append(codes[i + 4] - 4 * 4096)
            three.append(codes[i + 5] - 5 * 4096)
            three.append(codes[i + 6] - 6 * 4096)
        layers = [torch.tensor(x, device=device).unsqueeze(0) for x in (one, two, three)]
        with torch.inference_mode():
            return as_floats(codec.decode(layers).detach().squeeze().cpu().numpy())

    return speak, 24000


def load_f5(args):
    # Model card: https://huggingface.co/ai4bharat/IndicF5 (accept its terms there first).
    # trust_remote_code runs the model's own Python from that page: read it if you wish to.
    from transformers import AutoModel

    if not args.ref_audio or not args.ref_text:
        ref, words = HERE / "out" / "parler" / "ref.wav", HERE / "out" / "parler" / "ref.txt"
        if not ref.exists():
            sys.exit("f5 needs a voice to copy: give --ref-audio and --ref-text (a 5 to 12 second clip and its exact words), or run parler first and its first phrase is used.")
        args.ref_audio, args.ref_text = str(ref), words.read_text(encoding="utf-8").strip()
        print(f"f5: copying the voice of {ref} (made by parler); a person's reading, given with --ref-audio, should sound better")
    model = AutoModel.from_pretrained("ai4bharat/IndicF5", trust_remote_code=True)

    def speak(text):
        return as_floats(model(text, ref_audio_path=args.ref_audio, ref_text=args.ref_text))

    return speak, 24000


LOADERS = {"mock": load_mock, "parler": load_parler, "svara": load_svara, "f5": load_f5}


def main():
    p = argparse.ArgumentParser(description="Read John 1 in Malayalam with one speech model.")
    p.add_argument("model", choices=sorted(LOADERS))
    p.add_argument("--verses", default="1-51", help="which verses, as first-last (default: the chapter)")
    p.add_argument("--out", default=str(HERE / "out"))
    p.add_argument("--threads", type=int, default=32, help="processor threads for the model (default 32)")
    p.add_argument("--seed", type=int, default=1, help="the same seed gives the same reading again")
    p.add_argument(
        "--description",
        default="Harish speaks slowly and clearly in a calm, deep, measured voice, as one reads scripture aloud. The recording is very high quality, with the speaker close to the microphone and no background noise.",
        help="parler: the voice in words. Its card names Anjali and Harish for Malayalam.",
    )
    p.add_argument("--gender", default="Male", choices=["Male", "Female"], help="svara: which Malayalam voice")
    p.add_argument("--style", default="clear", help="svara: neutral, formal, clear, ... (default clear)")
    p.add_argument("--ref-audio", help="f5: a 5 to 12 second WAV of the voice to copy")
    p.add_argument("--ref-text", help="f5: the exact words spoken in that clip")
    args = p.parse_args()

    first, _, last = args.verses.partition("-")
    first, last = int(first), int(last or first)
    verses = [v for v in json.loads((HERE / "john1-ml.json").read_text(encoding="utf-8")) if first <= v["verse"] <= last]
    out = Path(args.out) / args.model
    out.mkdir(parents=True, exist_ok=True)

    if args.model != "mock":
        import torch

        torch.set_num_threads(args.threads)
        torch.manual_seed(args.seed)
    began = time.time()
    speak, rate = LOADERS[args.model](args)
    loaded = time.time() - began
    print(f"{args.model}: ready in {loaded:.0f} s")

    chapter, report, working = [], [], time.time()
    for v in verses:
        started, sound = time.time(), []
        for n, phrase in enumerate(phrases(v["text"])):
            spoken = speak(phrase)
            if args.model == "parler" and v["verse"] == verses[0]["verse"] and n == 0:
                # Kept as a voice for f5 to copy when no person's recording is given.
                write_wav(out / "ref.wav", spoken, rate)
                (out / "ref.txt").write_text(phrase, encoding="utf-8")
            sound += spoken + [0.0] * int(rate * PHRASE_REST)
        write_wav(out / f"v{v['verse']:02d}.wav", sound, rate)
        chapter += sound + [0.0] * int(rate * (VERSE_REST - PHRASE_REST))
        took, length = time.time() - started, len(sound) / rate
        report.append({"verse": v["verse"], "seconds_of_sound": round(length, 2), "seconds_taken": round(took, 2)})
        print(f"  verse {v['verse']:2d}: {length:5.1f} s of sound in {took:6.1f} s")
    write_wav(out / "john1.wav", chapter, rate)
    total, took = len(chapter) / rate, time.time() - working
    summary = {
        "model": args.model,
        "verses": f"{first}-{last}",
        "threads": args.threads,
        "seconds_to_load": round(loaded, 1),
        "seconds_of_sound": round(total, 1),
        "seconds_taken": round(took, 1),
        "times_real_time": round(total / took, 3) if took else None,
        "each": report,
    }
    (out / "report.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(f"{args.model}: {total:.0f} s of sound in {took:.0f} s ({total / took:.2f} times real time) -> {out / 'john1.wav'}")


if __name__ == "__main__":
    main()
