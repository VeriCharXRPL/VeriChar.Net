#!/usr/bin/env python3
"""Replace embedded base64 icons in demo.html with assets/ files."""
from pathlib import Path
import re

p = Path("demo.html")
t = p.read_text(encoding="utf-8")
t2, n1 = re.subn(
    r'<link rel="icon" type="image/png" href="data:image/png;base64,[^"]+">',
    '<link rel="icon" type="image/png" href="assets/favicon.png">',
    t,
    count=1,
)
t3, n2 = re.subn(
    r'<link rel="apple-touch-icon" href="data:image/png;base64,[^"]+">',
    '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">',
    t2,
    count=1,
)
if n1 != 1 or n2 != 1:
    # Already debloated is OK
    if "assets/favicon.png" in t and "data:image/png;base64," not in t:
        print("demo.html already debloated")
        raise SystemExit(0)
    raise SystemExit(f"icon replace failed n1={n1} n2={n2}")
for bad in ("1% fee", "1% planned", "Vendor settlement"):
    if bad.lower() in t3.lower():
        raise SystemExit(f"forbidden copy: {bad}")
p.write_text(t3, encoding="utf-8")
print(f"demo.html {len(t)} -> {len(t3)} bytes (saved {len(t) - len(t3)})")
