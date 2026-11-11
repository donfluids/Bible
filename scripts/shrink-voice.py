#!/usr/bin/env python3
"""Halves a voice model's size for the app: its large tables of numbers are kept as 16-bit
floats, each followed by a step that turns it back into 32-bit when the model is loaded.
The model still computes in 32-bit, so it runs as before on any phone; only the stored
numbers are rounded (to about four significant digits), which is not heard.

    pip install onnx
    python3 scripts/shrink-voice.py <voice.onnx> assets/speech/ml-meera.onnx
"""
import sys
import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

def main(src, dst):
    model = onnx.load(src)
    graph = model.graph
    casts = []
    changed = 0
    for i, init in enumerate(list(graph.initializer)):
        if init.data_type != TensorProto.FLOAT:
            continue
        values = numpy_helper.to_array(init)
        # Small tables stay as they are; so does any with a number too large or too fine for 16 bits.
        if values.size < 256 or np.abs(values).max() > 6.0e4:
            continue
        half = numpy_helper.from_array(values.astype(np.float16), init.name + '_half')
        graph.initializer.remove(init)
        graph.initializer.append(half)
        casts.append(helper.make_node('Cast', [half.name], [init.name], to=TensorProto.FLOAT, name=f'restore_{i}'))
        changed += 1
    # The restoring steps come first, before anything that uses their numbers.
    nodes = list(graph.node)
    del graph.node[:]
    graph.node.extend(casts + nodes)
    onnx.checker.check_model(model)
    onnx.save(model, dst)
    print(f'{changed} tables stored as 16-bit')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
