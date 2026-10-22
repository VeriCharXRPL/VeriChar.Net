#!/usr/bin/env python3
from pathlib import Path
import re

idx = Path("index.html")
t = idx.read_text(encoding="utf-8")

# What we are building — enterprises line
t = t.replace(
    "<p><b>For enterprises.</b> SaaS tiers with analytics meant to streamline audits, CSR reporting, and documented giving trails — less overhead, clearer evidence. Preview only today; not certified and not tax or legal advice.</p>",
    "<p><b>For enterprises.</b> SaaS tiers with analytics meant to streamline audits, CSR reporting, <b>tax compliance workflows</b>, and documented giving trails — less overhead, clearer evidence. Preview only today; not certified and not tax or legal advice. VeriChar does not file returns for you.</p>",
)

# Business model list items — ensure tax compliance workflows is a first-class bullet
old_biz_ul = (
    '<ul style="margin:10px 0 0 18px;color:var(--soft);font-size:16px">'
    "<li>Analytics that streamline audits and impact reporting</li>"
    "<li>On-chain style trails of gifts when settlement is live — clearer documentation for internal review and external questions</li>"
    "<li>Less stress and overhead assembling records; more energy on actual giving</li>"
    "<li>Exportable records that can <b>support</b> tax and compliance workflows (we do not file returns for you; not legal or tax advice)</li>"
    "</ul>"
)
new_biz_ul = (
    '<ul style="margin:10px 0 0 18px;color:var(--soft);font-size:16px">'
    "<li>Analytics that streamline audits and impact reporting</li>"
    "<li><b>Tax compliance workflows</b> — organized exports and trails that support your tax and regulatory documentation (VeriChar does not file with the IRS or other agencies for you)</li>"
    "<li>On-chain style trails of gifts when settlement is live — clearer documentation for internal review and external questions</li>"
    "<li>Less stress and overhead assembling records; more energy on actual giving</li>"
    "<li>Not legal or tax advice; not a substitute for your CPA or counsel</li>"
    "</ul>"
)
if old_biz_ul in t:
    t = t.replace(old_biz_ul, new_biz_ul, 1)
    print("biz ul updated")
else:
    # already patched or different whitespace — inject if missing phrase
    if "Tax compliance workflows" not in t:
        t = t.replace(
            "<li>Analytics that streamline audits and impact reporting</li>",
            "<li>Analytics that streamline audits and impact reporting</li>"
            "<li><b>Tax compliance workflows</b> — organized exports and trails that support your tax and regulatory documentation (VeriChar does not file with the IRS or other agencies for you)</li>",
            1,
        )
        print("biz ul injected")
    else:
        print("biz already has tax compliance workflows")

# Portal
t = t.replace(
    "Planned SaaS tiers: analytics that streamline audits, documented giving trails, less overhead. Sample data only — not live, not certified, not tax or legal advice.",
    "Planned SaaS tiers: analytics, audit support, <b>tax compliance workflows</b>, documented giving trails, less overhead. Sample data only — not live, not certified. We do not file returns for you; not tax or legal advice.",
)

t = t.replace(
    "Exports are meant to support your filings and audits — VeriChar does not file with the IRS for you. Not legal or tax advice.",
    "Built to support audits and <b>tax compliance workflows</b> — VeriChar does not file with the IRS for you. Not legal or tax advice.",
)

idx.write_text(t, encoding="utf-8")
print("index done")

# README
r = Path("README.md")
if r.exists():
    txt = r.read_text(encoding="utf-8")
    old = (
        "**Enterprise SaaS tiers (paid):** Analytics meant to streamline audits and CSR/impact reporting; clearer documentation of giving; "
        "less stress and overhead assembling records; exports that can **support** tax and compliance workflows "
        "(VeriChar does not file with the IRS for you; not legal or tax advice). Goal: more of each gift reaches the need, with proof that is faster and easier to show."
    )
    new = (
        "**Enterprise SaaS tiers (paid):** Analytics to streamline audits and CSR/impact reporting; **tax compliance workflows** "
        "(organized records and exports that support your tax and regulatory documentation); clearer documentation of giving; "
        "less stress and overhead. VeriChar does not file with the IRS or other agencies for you; not legal or tax advice. "
        "Goal: more of each gift reaches the need, with proof that is faster and easier to show."
    )
    if old in txt:
        txt = txt.replace(old, new, 1)
    elif "tax compliance workflows" not in txt.lower():
        txt = txt.replace(
            "Enterprise SaaS tiers (paid):**",
            "Enterprise SaaS tiers (paid):** **Tax compliance workflows**;",
            1,
        )
    r.write_text(txt, encoding="utf-8")
    print("readme done")

# Whitepaper
wpath = Path("verichar-whitepaper-v0.7.md")
if wpath.exists():
    w = wpath.read_text(encoding="utf-8")
    w = w.replace(
        "exportable evidence that can **support** tax and compliance workflows",
        "**tax compliance workflows** and exportable evidence that can **support** tax and regulatory documentation",
    )
    if "tax compliance workflows" not in w.lower():
        w = w.replace(
            "analytics that **streamline audits** and CSR / impact reporting",
            "analytics that **streamline audits**, **tax compliance workflows**, and CSR / impact reporting",
        )
    wpath.write_text(w, encoding="utf-8")
    print("wp done")

# SEO snippet
seo = Path("assets/seo-head.snippet.html")
if seo.exists():
    s = seo.read_text(encoding="utf-8")
    s = s.replace(
        "Enterprise SaaS tiers for audit-ready analytics and less overhead",
        "Enterprise SaaS tiers: audits, tax compliance workflows, less overhead",
    )
    s = s.replace(
        "Enterprise SaaS for streamlined audits and documented impact",
        "Enterprise SaaS: audits, tax compliance workflows, documented impact",
    )
    s = s.replace(
        "charity escrow",
        "tax compliance workflows, charity escrow",
    )
    seo.write_text(s, encoding="utf-8")
    # refresh in index if robots block present
    t = idx.read_text(encoding="utf-8")
    block = s.strip()
    if "application/ld+json" in t:
        start = t.find('<meta name="robots"')
        if start == -1:
            start = t.find('<script type="application/ld+json">')
        end = t.find("</script>", start if start != -1 else 0)
        if start != -1 and end != -1:
            t = t[:start] + block + t[end + len("</script>"):]
            idx.write_text(t, encoding="utf-8")
            print("seo in index refreshed")
