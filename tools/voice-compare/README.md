# Comparing Malayalam voices on John 1

Reads John 1 (Sathyavedapusthakam 1910, 51 verses) with three open speech models, so the
readings can be compared by ear before one is chosen for the whole Bible. It runs on your
own machine; nothing is uploaded.

| Name | Model | Voice comes from | Licence |
|---|---|---|---|
| `parler` | [ai4bharat/indic-parler-tts](https://huggingface.co/ai4bharat/indic-parler-tts) | a description in words | Apache 2.0 |
| `svara` | [kenpath/svara-tts-v1](https://huggingface.co/kenpath/svara-tts-v1) (Orpheus family) | a built-in Malayalam male or female voice | Apache 2.0 |
| `f5` | [ai4bharat/IndicF5](https://huggingface.co/ai4bharat/IndicF5) | a short recording it copies | MIT |

## Before the first run

1. Python 3.10 or newer, `git`, and about 40 GB of free disk (models and three environments).
2. A free Hugging Face account. Open the `parler` and `f5` pages above while signed in and
   accept their terms; both are gated and will not download otherwise.
3. `pip install huggingface_hub`, then `huggingface-cli login` with a read token.

## Running

```bash
VERSES=1-5 bash run.sh     # a short trial first: a few minutes, and it shows the speed
bash run.sh                # all three, the whole chapter
bash run.sh svara          # one model
```

Each model's reading lands in `out/<model>/`: `john1.wav` (the chapter), `v01.wav` to
`v51.wav` (each verse), and `report.json` (seconds of sound, seconds taken, times real
time). The last lines printed compare the three speeds.

## Choosing the voice

- `parler`: `bash run.sh parler -- --description "Anjali speaks slowly ..."`. Its card
  names Anjali and Harish as the Malayalam voices; the default describes Harish reading
  scripture slowly.
- `svara`: `-- --gender Female`, `-- --style formal` (default `clear`).
- `f5`: `-- --ref-audio reader.wav --ref-text "the exact words in the clip"`, with a 5 to
  12 second recording of a reader who agrees to it. Without one, it copies the first
  phrase `parler` made, which is enough to hear the model but not its best.

`--seed 2` gives a different take of the same text; the same seed repeats a reading.

## What to know

- The model calls are written from each model's own card and demo and have not been run
  against the real models: the machine this was written on had no room for them. The
  rest (splitting verses, joining, files, the report) was run with `python compare.py mock`.
  If a model stops with an error, the message and the model's card are the place to look.
- `f5` loads with `trust_remote_code`, which runs Python from the model's page.
- `THREADS=32` by default. For the whole Bible the speed comes from many such processes
  side by side, not from more threads in one; that is a later script.
- These models can misread, skip or repeat words. Listen to the whole chapter, not the
  first verse.
