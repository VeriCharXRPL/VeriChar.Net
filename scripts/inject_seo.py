#!/usr/bin/env python3
from pathlib import Path

idx = Path("index.html")
t = idx.read_text(encoding="utf-8")
seo = Path("assets/seo-head.snippet.html").read_text(encoding="utf-8").strip()

if "application/ld+json" not in t:
    needle = '<meta name="author" content="Brianne Salato">'
    if needle not in t:
        raise SystemExit("author meta not found")
    t = t.replace(needle, needle + "\n" + seo, 1)

# Prefer PDF whitepaper links
t = t.replace('href="verichar-whitepaper-v0.7.md"', 'href="verichar-whitepaper-v0.7.pdf"')

old_founder = (
    '<p class="by">Brianne Salato, Founder and Product Architect</p>'
    '<p><a href="https://x.com/VeriCharOnChain">@VeriCharOnChain on X</a><br>'
    '<a href="mailto:VeriChar@proton.me">VeriChar@proton.me</a></p>'
)
new_founder = (
    '<p class="by">Brianne Salato, Founder and Product Architect</p>'
    '<p><a href="https://verichar.net/">verichar.net</a><br>'
    '<a href="https://x.com/VeriCharOnChain">@VeriCharOnChain on X</a><br>'
    '<a href="mailto:VeriChar@proton.me">VeriChar@proton.me</a></p>'
)
if old_founder in t:
    t = t.replace(old_founder, new_founder, 1)

idx.write_text(t, encoding="utf-8")
print("SEO inject ok")
