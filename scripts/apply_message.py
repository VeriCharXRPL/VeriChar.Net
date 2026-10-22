#!/usr/bin/env python3
"""Apply VeriChar public message stack to index.html and related SEO."""
from pathlib import Path

# Message stack:
# Dream: Charity people can actually verify.
# Product: Verifiable giving on XRPL.
# Method: Funds lock until invoice + proof of delivery; pay the vendor.
# Model: Free for donors, charities, vendors; donate to VeriChar or SaaS.
# Status: Prototype; simulation; Testnet-proven helpers; no real donations yet.

idx = Path("index.html")
t = idx.read_text(encoding="utf-8")

replacements = [
    (
        "<title>VeriChar – Charity you can verify and trust</title>",
        "<title>VeriChar – Verifiable giving on XRPL</title>",
    ),
    (
        '<meta name="description" content="VeriChar is a verification layer for charitable giving on the XRP Ledger. Proof comes before payment. Free for donors, charities, and vendors. Working prototype; no real donations are processed.">',
        '<meta name="description" content="Verifiable giving on the XRP Ledger. Funds lock until invoice and proof of delivery check out, then go to the vendor. Free for donors, charities, and vendors. Working prototype; no real donations yet.">',
    ),
    (
        '<p class="tag">Building accountability for charitable giving on XRPL</p>',
        '<p class="tag">Verifiable giving on XRPL</p>',
    ),
    (
        "<h1>Charity you can verify and trust.</h1>",
        "<h1>Charity people can actually verify.</h1>",
    ),
    (
        '<p class="sub">Verified charities. Itemized needs. Funds released only on cryptographic proof of delivery.</p>',
        '<p class="sub">Funds lock until an itemized invoice and proof of delivery check out — then they go straight to the vendor.</p>',
    ),
    (
        '<p class="sub2">Free for donors, charities, and vendors. Every step is public, so you never have to take our word for it.</p>',
        '<p class="sub2">Proof before payment. Free for donors, charities, and vendors.</p>',
    ),
    (
        '<p class="sub2" style="margin-top:12px">Become part of the charity transparency revolution.</p>',
        '<p class="sub2" style="margin-top:12px">Encoded transparency for charity. Prototype today — simulation only; no real donations yet.</p>',
    ),
    (
        '<section class="view" id="who" hidden><div class="card"><h2>Who we are</h2><p>VeriChar (Verified Charity On-Chain) is a verification layer for charitable giving, built on the XRP Ledger.</p><p><b>Our mission.</b> Make every charitable dollar traceable, so people can give with confidence and good organizations can prove their impact.</p><p><b>Our vision.</b> A world where “where did my money go?” always has a clear, checkable answer.</p></div></section>',
        '<section class="view" id="who" hidden><div class="card"><h2>Who we are</h2><p>VeriChar (Verified Charity On-Chain) is building <b>verifiable giving</b> on the XRP Ledger: charity people can actually verify.</p><p><b>What we are creating.</b> Itemized needs, funds locked in escrow, release to the vendor only after invoice and proof of delivery check out.</p><p><b>How we fund the build.</b> Free for donors, charities, and vendors. Support comes from donations to VeriChar and optional enterprise SaaS — not a take-rate on giving.</p></div></section>',
    ),
    (
        '<section class="view" id="what" hidden><div class="card"><h2>What we are building</h2><p><b>For donors.</b> Choose a specific, itemized need and follow its funding and outcome. Free.</p><p><b>For charities.</b> Apply for verification and, if approved, publish itemized needs. Free. Charity verification and need publishing are not live yet.</p><p><b>For vendors.</b> Receive funds after required review — free to participate. Vendor payments are not live.</p></div></section>',
        '<section class="view" id="what" hidden><div class="card"><h2>What we are building</h2><p><b>Product.</b> Verifiable giving on XRPL — proof before payment.</p><p><b>For donors.</b> Fund one itemized need and follow the outcome. Free. Live giving is not open yet.</p><p><b>For charities.</b> Verification and itemized needs, free when they open. Not live yet.</p><p><b>For vendors.</b> Named as the payout destination after review. Free to participate. Payouts are not live yet.</p></div></section>',
    ),
    (
        "<h2>How the proposed flow could work</h2>",
        "<h2>How we intend to achieve it</h2>",
    ),
    (
        '<p class="sim">This is a proposed workflow, not a live service. The simulation below makes no XRPL transactions and verifies no evidence.</p>',
        '<p class="sim">Intended method: lock → prove → pay the vendor. Not a live service yet. The simulation makes no XRPL transactions and verifies no evidence.</p>',
    ),
    (
        "Prototype · simulated demo · no real donations are processed",
        "Verifiable giving · prototype · simulation · no real donations yet",
    ),
]

for old, new in replacements:
    if old not in t:
        print("WARN missing:", old[:80])
    else:
        t = t.replace(old, new, 1)
        print("ok:", new[:60])

t = t.replace('href="verichar-whitepaper-v0.7.md"', 'href="verichar-whitepaper-v0.7.pdf"')

idx.write_text(t, encoding="utf-8")
print("index.html message stack applied")
