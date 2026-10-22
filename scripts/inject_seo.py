#!/usr/bin/env python3
from pathlib import Path

idx = Path("index.html")
t = idx.read_text(encoding="utf-8")
seo = Path("assets/seo-head.snippet.html").read_text(encoding="utf-8").strip()

if "application/ld+json" in t:
    start = t.find('<meta name="robots"')
    if start == -1:
        start = t.find('<script type="application/ld+json">')
    end = t.find("</script>", start if start != -1 else 0)
    if start != -1 and end != -1:
        end = end + len("</script>")
        t = t[:start] + seo + t[end:]
    else:
        raise SystemExit("could not locate existing SEO block")
else:
    needle = '<meta name="author" content="Brianne Salato">'
    if needle not in t:
        raise SystemExit("author meta not found")
    t = t.replace(needle, needle + "\n" + seo, 1)

t = t.replace('href="verichar-whitepaper-v0.7.md"', 'href="verichar-whitepaper-v0.7.pdf"')

t = t.replace(
    "Brianne Salato, Founder and Product Architect",
    "Brianne Salato, Founder, Product Architect, and XRPL Developer",
)
# idempotent if already updated
t = t.replace(
    "Brianne Salato, Founder, Product Architect, and XRPL Developer, and XRPL Developer",
    "Brianne Salato, Founder, Product Architect, and XRPL Developer",
)

old_links = (
    '<p><a href="https://x.com/VeriCharOnChain">@VeriCharOnChain on X</a><br>'
    '<a href="mailto:VeriChar@proton.me">VeriChar@proton.me</a></p>'
)
new_links = (
    '<p><a href="https://verichar.net/">verichar.net</a><br>'
    '<a href="https://x.com/VeriCharOnChain">@VeriCharOnChain on X</a><br>'
    '<a href="mailto:VeriChar@proton.me">VeriChar@proton.me</a></p>'
)
if old_links in t:
    t = t.replace(old_links, new_links, 1)

idx.write_text(t, encoding="utf-8")
print("SEO inject ok")
