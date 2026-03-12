#!/usr/bin/env python3
"""
Lee config.json (csvPath) y genera data.js con el contenido del CSV.
Uso: python3 update_data.py
Para cambiar el CSV: editá config.json (csvPath) y volvé a ejecutar este script.
"""
import json
import os

dir_path = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(dir_path, "config.json")
with open(config_path, encoding="utf-8") as f:
    config = json.load(f)
csv_path = os.path.normpath(os.path.join(dir_path, config["csvPath"]))

if not os.path.isfile(csv_path):
    print("No se encontró el CSV en:", csv_path)
    print("Revisá config.json → csvPath.")
    raise SystemExit(1)

with open(csv_path, encoding="utf-8") as f:
    csv_content = f.read()
# Escapar para template literal JS: \ ` $
escaped = csv_content.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")
escaped = escaped.replace("\r\n", "\n").replace("\r", "\n")

out = """// Generado por update_data.py (o update-data.js) desde config.json → csvPath. No editar a mano.
window.TALENT_POOL_CSV = `""" + escaped + "`;\n"

data_js_path = os.path.join(dir_path, "data.js")
with open(data_js_path, "w", encoding="utf-8") as f:
    f.write(out)
print("OK: data.js generado desde", config["csvPath"])
