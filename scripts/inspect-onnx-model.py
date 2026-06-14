import sys
from pathlib import Path

import onnx

model_path = Path(sys.argv[1])
print("Model:", model_path)
print("Exists:", model_path.exists())
print("Size:", model_path.stat().st_size if model_path.exists() else None)

model = onnx.load(str(model_path), load_external_data=True)

print("\nIR version:", model.ir_version)
print("Producer:", model.producer_name, model.producer_version)
print("Opset:")
for opset in model.opset_import:
    print(" ", opset.domain or "ai.onnx", opset.version)

print("\nInputs:")
for i in model.graph.input:
    print(" ", i.name, i.type)

print("\nOutputs:")
for o in model.graph.output:
    print(" ", o.name, o.type)

print("\nRunning checker...")
onnx.checker.check_model(model)
print("Checker: OK")

print("\nRunning shape inference...")
try:
    inferred = onnx.shape_inference.infer_shapes(model)
    print("Shape inference: OK")
except Exception as e:
    print("Shape inference: FAILED")
    print(type(e).__name__, e)
    raise