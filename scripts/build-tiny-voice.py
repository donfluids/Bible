#!/usr/bin/env python3
"""Indic Tiny TTS (Malayalam) as one model the app's voice module can run unchanged.

The released model is three ONNX graphs (text encoder, flow decoder, Vocos vocoder) with
the steps between them done in Python: durations, a four-step Euler solver, and an
inverse STFT. Here all of it becomes one graph with the same inputs and output as the
Piper voice it replaces, so modules/bible-voice (Kotlin and Swift) needs no change:

    input          int64 [1, N]   the phrase's letters, a blank (0) between and around them
    input_lengths  int64 [1]      N
    scales         float [3]      noise (the model's temperature), pace (its length scale),
                                  voice (0 the female reader, 1 the male)
    output         float [samples] at 24 kHz

The steps follow the model's own ONNX runtime (indic_tiny_tts/export/onnx_infer.py),
read from its page and written again here; none of its Python is used. The result is
checked against a plain NumPy version of those steps, then stored with 16-bit tables
like the Piper voice (scripts/shrink-voice.py).

    python3 -m pip install onnx onnxruntime numpy
    (download from https://huggingface.co/sulabhkatiyar/indic-tiny-tts-malayalam:
     config.json and onnx/{text_encoder,flow_decoder,vocoder}.onnx, into one folder)
    python3 scripts/build-tiny-voice.py <that folder> assets/speech/ml-tiny.onnx
"""
import json
import os
import sys

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

STEPS = 4  # the model's Euler steps (config synthesis.n_timesteps)


def const(name, value, dtype=np.float32):
    return numpy_helper.from_array(np.asarray(value, dtype=dtype), name)


def inline(nodes, inits, model, prefix, inputs, outputs, shared):
    """Copies a graph's nodes into `nodes`, its inputs and outputs wired to the names given;
    its tables go once into `inits` under `shared` + name (reused by a graph inlined again)."""
    g = model.graph
    names = {i.name for i in g.initializer}
    for init in g.initializer:
        if shared + init.name not in inits:
            t = onnx.TensorProto()
            t.CopyFrom(init)
            t.name = shared + init.name
            inits[t.name] = t

    def rename(n, out):
        # An output can also feed later steps of its own graph: it is renamed everywhere.
        if n == "":
            return n
        if n in inputs:
            return inputs[n]
        if n in outputs:
            return outputs[n]
        if n in names:
            return shared + n
        return prefix + n

    for node in g.node:
        copy = onnx.NodeProto()
        copy.CopyFrom(node)
        del copy.input[:]
        del copy.output[:]
        copy.input.extend(rename(n, False) for n in node.input)
        copy.output.extend(rename(n, True) for n in node.output)
        copy.name = prefix + (node.name or node.op_type)
        nodes.append(copy)


def build(folder):
    cfg = json.load(open(os.path.join(folder, "config.json"), encoding="utf-8"))
    enc = onnx.load(os.path.join(folder, "onnx", "text_encoder.onnx"))
    dec = onnx.load(os.path.join(folder, "onnx", "flow_decoder.onnx"))
    voc = onnx.load(os.path.join(folder, "onnx", "vocoder.onnx"))
    ids = cfg["ids"]
    female, male = ids["speakers"]["ml_F"], ids["speakers"]["ml_M"]
    assert male == female + 1, "the voice switch below expects the male reader right after the female"
    mel_mean, mel_std = cfg["mel_stats"]
    head = cfg["vocoder"]["head"]
    n_fft, hop = int(head["n_fft"]), int(head["hop_length"])
    assert head.get("padding", "same") == "center"

    N, H = (helper.make_node, helper.make_tensor_value_info)
    nodes, inits = [], {}
    add = lambda *a, **k: nodes.append(N(*a, **k))  # noqa: E731
    for c in [
        const("zero_i", [0], np.int64), const("one_i", [1], np.int64),
        const("lang", [ids["language"]], np.int64), const("style", [ids["styles"]["read"]], np.int64),
        const("female", [female], np.float32), const("f0", 0.0), const("f1", 1.0), const("f2", 2.0),
        const("zero_vec", [0.0]), const("flat", [-1], np.int64), const("rows", [0], np.int64),
        const("mel_mean", mel_mean), const("mel_std", mel_std), const("tiny", 1e-11), const("lo", -1.0),
        const("dt", 1.0 / STEPS), const("n_fft_f", float(n_fft)), const("hop_i", [hop], np.int64),
        const("n_fft_i", [n_fft], np.int64), const("half_i", [n_fft // 2], np.int64),
        const("half_bins", float(n_fft // 2 + 1)), const("two_pi_n", 2.0 * np.pi / n_fft),
        const("axis2", [2], np.int64), const("axis0", [0], np.int64), const("axis1", [1], np.int64),
        const("neg1_i", [-1], np.int64), const("img_shape_head", [1], np.int64), const("f0_5", 0.5),
    ]:
        inits[c.name] = c
    for k in range(STEPS):
        inits[f"t{k}"] = const(f"t{k}", [k / STEPS])
    inits["s0"], inits["s1"], inits["s2"] = (const(f"s{i}", i, np.int64) for i in range(3))

    # The three settings, and the reader: female + round(voice), kept to the two readers.
    add("Gather", ["scales", "s0"], ["temperature"])
    add("Gather", ["scales", "s1"], ["length_scale"])
    add("Gather", ["scales", "s2"], ["voice"])
    add("Round", ["voice"], ["voice_r"])
    add("Clip", ["voice_r", "f0", "f1"], ["voice_c"])
    add("Add", ["female", "voice_c"], ["speaker_f"])
    add("Cast", ["speaker_f"], ["speaker"], to=TensorProto.INT64)

    # 1. Text encoder.
    inline(nodes, inits, enc, "enc/", {"tokens": "input", "token_lengths": "input_lengths", "language": "lang", "speaker": "speaker", "style": "style"},
           {"mu_x": "mu_x", "logw": "logw", "cond": "cond"}, "enc/")

    # 2. Durations: w = ceil(exp(logw)) * length_scale; frame j copies letter i when
    #    cum[i-1] <= j < cum[i]; y_len = max(sum w, 1) truncated, padded to an even count.
    add("Reshape", ["logw", "flat"], ["logw_f"])
    add("Exp", ["logw_f"], ["w_exp"])
    add("Ceil", ["w_exp"], ["w_ceil0"])
    add("Mul", ["w_ceil0", "length_scale"], ["w"])
    add("CumSum", ["w", "rows"], ["cum"])
    add("Slice", ["cum", "zero_i", "neg1_i", "axis0"], ["cum_head"])
    add("Concat", ["zero_vec", "cum_head"], ["cum_prev"], axis=0)
    add("ReduceSum", ["w"], ["w_sum"], keepdims=0)
    add("Max", ["w_sum", "f1"], ["w_sum1"])
    add("Floor", ["w_sum1"], ["y_len"])
    add("Div", ["y_len", "f2"], ["y_half"])
    add("Ceil", ["y_half"], ["y_half_c"])
    add("Mul", ["y_half_c", "f2"], ["y_pad"])
    add("Range", ["f0", "y_pad", "f1"], ["frames_j"])
    add("Unsqueeze", ["frames_j", "axis0"], ["j_row"])
    add("Unsqueeze", ["cum_prev", "axis1"], ["prev_col"])
    add("Unsqueeze", ["cum", "axis1"], ["cum_col"])
    add("GreaterOrEqual", ["j_row", "prev_col"], ["after_start"])
    add("Less", ["j_row", "cum_col"], ["before_end"])
    add("Less", ["j_row", "y_len"], ["in_length"])
    add("And", ["after_start", "before_end"], ["in_letter"])
    add("And", ["in_letter", "in_length"], ["path_b"])
    add("Cast", ["path_b"], ["path"], to=TensorProto.FLOAT)
    add("MatMul", ["mu_x", "path"], ["mu_y"])
    add("ReduceSum", ["path", "axis0"], ["mask_row"], keepdims=1)
    add("Unsqueeze", ["mask_row", "axis0"], ["mask"])

    # 3. Noise, then the Euler steps of the flow decoder.
    add("RandomNormalLike", ["mu_y"], ["noise"], dtype=TensorProto.FLOAT)
    add("Mul", ["noise", "temperature"], ["x0"])
    for k in range(STEPS):
        inline(nodes, inits, dec, f"dec{k}/", {"x": f"x{k}", "mask": "mask", "mu": "mu_y", "t": f"t{k}", "cond": "cond"}, {"v": f"v{k}"}, "dec/")
        add("Mul", [f"v{k}", "dt"], [f"dx{k}"])
        add("Add", [f"x{k}", f"dx{k}"], [f"x{k + 1}"])

    # 4. The mel spectrogram, cut to its length and un-normalised.
    add("Cast", ["y_len"], ["y_len_i0"], to=TensorProto.INT64)
    add("Reshape", ["y_len_i0", "neg1_i"], ["y_len_i"])
    add("Slice", [f"x{STEPS}", "zero_i", "y_len_i", "axis2"], ["mel_n"])
    add("Mul", ["mel_n", "mel_std"], ["mel_s"])
    add("Add", ["mel_s", "mel_mean"], ["mel"])

    # 5. Vocos: the spectrum of each frame.
    inline(nodes, inits, voc, "voc/", {"mel": "mel"}, {"real": "real", "imag": "imag"}, "voc/")

    # 6. Inverse STFT (Hann window, centre padding), as torch.istft: each frame's inverse
    #    real FFT as two matrix products, then overlap-add (Col2Im) divided by the window's.
    add("Range", ["f0", "n_fft_f", "f1"], ["n"])
    add("Range", ["f0", "half_bins", "f1"], ["k"])
    add("Mul", ["n", "two_pi_n"], ["n_angle"])
    add("Cos", ["n_angle"], ["cos_n"])
    add("Mul", ["cos_n", "f0_5"], ["half_cos"])
    add("Sub", ["f0_5", "half_cos"], ["window"])
    add("Mul", ["window", "window"], ["window2"])
    add("Unsqueeze", ["k", "axis1"], ["k_col"])
    add("Unsqueeze", ["n_angle", "axis0"], ["angle_row"])
    add("Mul", ["k_col", "angle_row"], ["angle"])
    add("Cos", ["angle"], ["cos_kn"])
    add("Sin", ["angle"], ["sin_kn"])
    # Each bin counts twice but the first and last (k = 0 and n/2), over n points, windowed.
    weight = np.full((n_fft // 2 + 1, 1), 2.0 / n_fft, dtype=np.float32)
    weight[0, 0] = weight[-1, 0] = 1.0 / n_fft
    inits["bin_weight"] = const("bin_weight", weight)
    add("Unsqueeze", ["window", "axis0"], ["window_row"])
    add("Mul", ["cos_kn", "bin_weight"], ["cos_w"])
    add("Mul", ["cos_w", "window_row"], ["basis_re"])
    add("Mul", ["sin_kn", "bin_weight"], ["sin_w"])
    add("Mul", ["sin_w", "window_row"], ["sin_ww"])
    add("Neg", ["sin_ww"], ["basis_im"])
    add("Squeeze", ["real", "axis0"], ["re"])
    add("Squeeze", ["imag", "axis0"], ["im"])
    add("Transpose", ["re"], ["re_t"], perm=[1, 0])
    add("Transpose", ["im"], ["im_t"], perm=[1, 0])
    add("MatMul", ["re_t", "basis_re"], ["frames_re"])
    add("MatMul", ["im_t", "basis_im"], ["frames_im"])
    add("Add", ["frames_re", "frames_im"], ["frames"])  # [T, n_fft]
    add("Transpose", ["frames"], ["frames_c"], perm=[1, 0])
    add("Unsqueeze", ["frames_c", "axis0"], ["blocks"])  # [1, n_fft, T]
    add("Shape", ["frames"], ["frames_shape"])
    add("Slice", ["frames_shape", "zero_i", "one_i", "axis0"], ["count"])
    add("Sub", ["count", "one_i"], ["count_1"])
    add("Mul", ["count_1", "hop_i"], ["span"])
    add("Add", ["span", "n_fft_i"], ["total"])
    add("Concat", ["img_shape_head", "total"], ["image_shape"], axis=0)
    inits["block_shape"] = const("block_shape", [1, n_fft], np.int64)
    add("Col2Im", ["blocks", "image_shape", "block_shape"], ["summed"], strides=[1, hop])
    add("Unsqueeze", ["window2", "axis1"], ["window2_col"])
    add("Unsqueeze", ["window2_col", "axis0"], ["window2_blk"])  # [1, n_fft, 1]
    add("Concat", ["one_i", "n_fft_i", "count"], ["blocks_shape"], axis=0)
    add("Expand", ["window2_blk", "blocks_shape"], ["window_blocks"])
    add("Col2Im", ["window_blocks", "image_shape", "block_shape"], ["envelope"], strides=[1, hop])
    add("Reshape", ["summed", "flat"], ["summed_f"])
    add("Reshape", ["envelope", "flat"], ["envelope_f"])
    add("Sub", ["total", "half_i"], ["end"])
    add("Slice", ["summed_f", "half_i", "end", "axis0"], ["signal"])
    add("Slice", ["envelope_f", "half_i", "end", "axis0"], ["envelope_c"])
    add("Max", ["envelope_c", "tiny"], ["envelope_s"])
    add("Div", ["signal", "envelope_s"], ["wave"])
    add("Clip", ["wave", "lo", "f1"], ["output"])

    graph = helper.make_graph(
        nodes,
        "indic-tiny-tts-malayalam",
        [H("input", TensorProto.INT64, [1, "N"]), H("input_lengths", TensorProto.INT64, [1]), H("scales", TensorProto.FLOAT, [3])],
        [H("output", TensorProto.FLOAT, ["samples"])],
        list(inits.values()),
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 18)], producer_name="build-tiny-voice")
    model.ir_version = 10
    onnx.checker.check_model(model)
    return model, cfg


def reference(folder, cfg, ids, temperature, length_scale, voice, noise_fn):
    """The model's own steps in NumPy (as onnx_infer.py), for checking the merged graph."""
    import onnxruntime as ort

    run = {g: ort.InferenceSession(os.path.join(folder, "onnx", f"{g}.onnx"), providers=["CPUExecutionProvider"]) for g in ("text_encoder", "flow_decoder", "vocoder")}
    i64 = np.int64
    spk = cfg["ids"]["speakers"]["ml_M" if voice else "ml_F"]
    mu_x, logw, cond = run["text_encoder"].run(None, {"tokens": np.asarray([ids], i64), "token_lengths": np.asarray([len(ids)], i64), "language": np.asarray([cfg["ids"]["language"]], i64), "speaker": np.asarray([spk], i64), "style": np.asarray([cfg["ids"]["styles"]["read"]], i64)})
    w = np.ceil(np.exp(logw[0, 0].astype(np.float32))).astype(np.float32) * np.float32(length_scale)
    y_len = int(max(np.float32(np.sum(w, dtype=np.float64)), np.float32(1.0)))
    y_pad = -(-y_len // 2) * 2
    cum = np.cumsum(w.astype(np.float64)).astype(np.float32)
    j = np.arange(y_pad, dtype=np.float32)
    tok = np.searchsorted(cum, j, side="right")
    valid = (tok < len(cum)) & (j < y_len)
    mu_y = np.where(valid[None, :], mu_x[0][:, np.minimum(tok, len(cum) - 1)], 0).astype(np.float32)
    x = noise_fn((1, *mu_y.shape)) * np.float32(temperature)
    mask = valid.astype(np.float32).reshape(1, 1, -1)
    for k in range(STEPS):
        v = run["flow_decoder"].run(None, {"x": x, "mask": mask, "mu": mu_y[None], "t": np.asarray([k / STEPS], np.float32), "cond": cond})[0]
        x = x + np.float32(1.0 / STEPS) * v
    mel_mean, mel_std = cfg["mel_stats"]
    mel = (x[:, :, :y_len] * np.float32(mel_std) + np.float32(mel_mean)).astype(np.float32)
    real, imag = run["vocoder"].run(None, {"mel": mel})
    head = cfg["vocoder"]["head"]
    n_fft, hop = int(head["n_fft"]), int(head["hop_length"])
    spec = real[0].astype(np.float64) + 1j * imag[0].astype(np.float64)
    t = spec.shape[1]
    window = 0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(n_fft) / n_fft)
    frames = np.fft.irfft(spec, n=n_fft, axis=0).T * window
    total = n_fft + hop * (t - 1)
    y, env = np.zeros(total), np.zeros(total)
    for i in range(t):
        y[i * hop : i * hop + n_fft] += frames[i]
        env[i * hop : i * hop + n_fft] += window * window
    pad = n_fft // 2
    return np.clip(y[pad : total - pad] / np.maximum(env[pad : total - pad], 1e-11), -1, 1).astype(np.float32)


def log_spectrum(x):
    frames = np.lib.stride_tricks.sliding_window_view(x, 1024)[::256] * np.hanning(1024)
    return 20 * np.log10(np.abs(np.fft.rfft(frames, axis=1)) + 1e-5)


def check(model_path, folder, cfg, exact):
    """The merged graph against the reference, with the noise off. Exact: sample for sample
    (the 32-bit merge). Otherwise (16-bit tables, which move the fine waveform a little):
    the same length, and loud parts of the spectrum within a fraction of a decibel, far
    below what is heard and below what the model's own noise changes from take to take."""
    import onnxruntime as ort

    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    symbols = {s: i for i, s in enumerate(cfg["vocab"]["symbols"])}
    text = "ആദിയിൽ വചനം ഉണ്ടായിരുന്നു; വചനം ദൈവത്തോടുകൂടെ ആയിരുന്നു."
    letters = [symbols["c:" + ch] for ch in text]
    ids = [0] * (2 * len(letters) + 1)
    ids[1::2] = letters
    for voice in (0, 1):
        pace = cfg["synthesis"]["length_scale"]["ml_M" if voice else "ml_F"]
        mine = session.run(None, {"input": np.asarray([ids], np.int64), "input_lengths": np.asarray([len(ids)], np.int64), "scales": np.asarray([0.0, pace, voice], np.float32)})[0]
        theirs = reference(folder, cfg, ids, 0.0, pace, voice, lambda shape: np.zeros(shape, np.float32))
        if mine.shape != theirs.shape:
            sys.exit(f"the merged model gives {mine.size} samples, the reference {theirs.size}")
        if exact:
            diff = float(np.max(np.abs(mine - theirs)))
            print(f"  voice {voice}: {mine.size} samples, largest difference from the reference {diff:.1e}")
            ok = diff <= 1e-3
        else:
            a, b = log_spectrum(theirs), log_spectrum(mine)
            loud = a > a.max() - 60
            diff = float(np.abs(a - b)[loud].mean())
            print(f"  voice {voice}: {mine.size} samples, spectrum within {diff:.2f} dB of the reference")
            ok = diff <= 0.5
        if not ok:
            sys.exit("the merged model does not match the reference")
    noisy = session.run(None, {"input": np.asarray([ids], np.int64), "input_lengths": np.asarray([len(ids)], np.int64), "scales": np.asarray([0.667, 1.0, 0], np.float32)})[0]
    print(f"  with noise: {noisy.size} samples, peak {np.abs(noisy).max():.2f}")


def main(folder, out):
    model, cfg = build(folder)
    full = out + ".full.onnx"
    onnx.save(model, full)
    print(f"merged: {len(model.graph.node)} steps, {os.path.getsize(full) / 1e6:.1f} MB")
    check(full, folder, cfg, exact=True)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    shrink = __import__("shrink-voice")
    shrink.main(full, out)
    os.remove(full)
    print(f"stored with 16-bit tables: {os.path.getsize(out) / 1e6:.1f} MB")
    check(out, folder, cfg, exact=False)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
