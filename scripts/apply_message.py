#!/usr/bin/env python3
"""Apply VeriChar public message stack + enterprise SaaS value."""
from pathlib import Path

idx = Path("index.html")
t = idx.read_text(encoding="utf-8")

# --- Hero / chrome (idempotent where possible) ---
pairs = [
    ("<title>VeriChar – Charity you can verify and trust</title>",
     "<title>VeriChar – Verifiable giving on XRPL</title>"),
    ("<title>VeriChar – Verifiable giving on XRPL</title>",
     "<title>VeriChar – Verifiable giving on XRPL</title>"),
    (
        '<meta name="description" content="VeriChar is a verification layer for charitable giving on the XRP Ledger. Proof comes before payment. Free for donors, charities, and vendors. Working prototype; no real donations are processed.">',
        '<meta name="description" content="Verifiable giving on XRPL. Proof before payment. Free for donors, charities, and vendors. Enterprise SaaS for audit-ready analytics. Prototype — no real donations yet.">',
    ),
    (
        '<meta name="description" content="Verifiable giving on the XRP Ledger. Funds lock until invoice and proof of delivery check out, then go to the vendor. Free for donors, charities, and vendors. Working prototype; no real donations yet.">',
        '<meta name="description" content="Verifiable giving on XRPL. Proof before payment. Free for donors, charities, and vendors. Enterprise SaaS for audit-ready analytics. Prototype — no real donations yet.">',
    ),
    ('<p class="tag">Building accountability for charitable giving on XRPL</p>',
     '<p class="tag">Verifiable giving on XRPL</p>'),
    ("<h1>Charity you can verify and trust.</h1>",
     "<h1>Charity people can actually verify.</h1>"),
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
        '<p class="sub2" style="margin-top:12px">Encoded transparency. Less overhead on giving — more reaches the need. Prototype today.</p>',
    ),
    (
        '<p class="sub2" style="margin-top:12px">Encoded transparency for charity. Prototype today — simulation only; no real donations yet.</p>',
        '<p class="sub2" style="margin-top:12px">Encoded transparency. Less overhead on giving — more reaches the need. Prototype today.</p>',
    ),
    ("Prototype · simulated demo · no real donations are processed",
     "Verifiable giving · prototype · simulation · no real donations yet"),
    ("Verifiable giving · prototype · simulation · no real donations yet",
     "Verifiable giving · prototype · simulation · no real donations yet"),
]

for old, new in pairs:
    if old in t:
        t = t.replace(old, new, 1)

# --- Section blocks (replace whole cards by id) ---
who = '''<section class="view" id="who" hidden><div class="card"><h2>Who we are</h2><p>VeriChar is building <b>verifiable giving</b> on the XRP Ledger — charity people can actually verify.</p><p><b>What we are creating.</b> Itemized needs. Funds locked until invoice and proof of delivery check out. Then payment goes to the vendor, documented on-chain where the design is live.</p><p><b>Why it matters.</b> Less stress and overhead chasing paper trails. More of each gift reaches where it should, faster and easier to show.</p><p><b>How we fund the build.</b> Free for donors, charities, and vendors. Support comes from donations to VeriChar and optional <b>enterprise SaaS tiers</b> — not a take-rate on giving.</p></div></section>'''

what = '''<section class="view" id="what" hidden><div class="card"><h2>What we are building</h2><p><b>Product.</b> Verifiable giving on XRPL — proof before payment.</p><p><b>For donors.</b> Fund one itemized need and follow the outcome. Free. Live giving is not open yet.</p><p><b>For charities.</b> Verification and itemized needs, free when they open. Clearer records, less admin drag. Not live yet.</p><p><b>For vendors.</b> Named as the payout destination after review. Free to participate. Payouts are not live yet.</p><p><b>For enterprises.</b> SaaS tiers with analytics meant to streamline audits, CSR reporting, and documented giving trails — less overhead, clearer evidence. Preview only today; not certified and not tax or legal advice.</p></div></section>'''

biz = '''<section class="view" id="biz" hidden><div class="card"><h2>Business model</h2><p><b>Free for donors, charities, and vendors.</b> No settlement fees on giving flows. No 1% vendor fee.</p><p><b>Path A — Donate to VeriChar.</b> Support the platform. As the system matures, platform funding should be as inspectable as charity funding.</p><p><b>Path B — Enterprise SaaS tiers.</b> Organizations license tools so charitable giving is easier to <b>track, document, and review</b>:</p><ul style="margin:10px 0 0 18px;color:var(--soft);font-size:16px"><li>Analytics that streamline audits and impact reporting</li><li>On-chain style trails of gifts when settlement is live — clearer documentation for internal review and external questions</li><li>Less stress and overhead assembling records; more energy on actual giving</li><li>Exportable records that can <b>support</b> tax and compliance workflows (we do not file returns for you; not legal or tax advice)</li></ul><p style="margin-top:10px">When the rails are live, the goal is simple: more of each gift reaches the need, with proof that is faster and easier to show.</p><div class="btns"><a class="cta" href="mailto:VeriChar@proton.me?subject=Donate%20to%20VeriChar">Donate to VeriChar</a><a class="ghost" href="mailto:VeriChar@proton.me?subject=Enterprise%20SaaS%20tiers">Enterprise SaaS tiers</a></div></div></section>'''

import re

def replace_section(html, section_id, new_block):
    pat = re.compile(
        rf'<section class="view" id="{section_id}"[^>]*>.*?</section>',
        re.DOTALL,
    )
    if not pat.search(html):
        print("WARN section missing:", section_id)
        return html
    return pat.sub(new_block, html, count=1)

t = replace_section(t, "who", who)
t = replace_section(t, "what", what)
t = replace_section(t, "biz", biz)

# How heading + sim
t = t.replace("<h2>How the proposed flow could work</h2>", "<h2>How we intend to achieve it</h2>")
t = t.replace(
    '<p class="sim">This is a proposed workflow, not a live service. The simulation below makes no XRPL transactions and verifies no evidence.</p>',
    '<p class="sim">Intended method: lock → prove → pay the vendor. Not a live service yet. The simulation makes no XRPL transactions and verifies no evidence.</p>',
)

# Enterprise portal copy
t = t.replace(
    "<h2 id=\"pT\">Corporate impact reporting</h2>",
    "<h2 id=\"pT\">Enterprise SaaS · impact &amp; audit analytics</h2>",
)
t = t.replace(
    '<p class="pm">Audit-ready records of verified giving, built on a public ledger. Sample data only.</p>',
    '<p class="pm">Planned SaaS tiers: analytics that streamline audits, documented giving trails, less overhead. Sample data only — not live, not certified, not tax or legal advice.</p>',
)
t = t.replace(
    '<p class="note">Illustrative sample data. Not certified, and not legal or tax advice.</p>',
    '<p class="note">Illustrative sample data. Exports are meant to support your filings and audits — VeriChar does not file with the IRS for you. Not legal or tax advice.</p>',
)
t = t.replace(
    "mailto:VeriChar@proton.me?subject=Enterprise%20Portal%20access",
    "mailto:VeriChar@proton.me?subject=Enterprise%20SaaS%20tiers",
)

t = t.replace('href="verichar-whitepaper-v0.7.md"', 'href="verichar-whitepaper-v0.7.pdf"')

idx.write_text(t, encoding="utf-8")
print("index.html updated")
