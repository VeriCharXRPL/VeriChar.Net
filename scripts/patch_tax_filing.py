#!/usr/bin/env python3
from pathlib import Path

idx = Path("index.html")
t = idx.read_text(encoding="utf-8")

# What — enterprises
old_ent = (
    "<p><b>For enterprises.</b> SaaS tiers with analytics meant to streamline audits, CSR reporting, "
    "<b>tax compliance workflows</b>, and documented giving trails — less overhead, clearer evidence. "
    "Preview only today; not certified and not tax or legal advice. VeriChar does not file returns for you.</p>"
)
new_ent = (
    "<p><b>For enterprises.</b> SaaS tiers with analytics for audits and CSR, <b>tax compliance workflows</b>, "
    "planned <b>tax filing integration</b> (exports and connections that feed your filing tools — we do not submit "
    "returns for you), and documented giving trails. Preview only today; not certified; not tax or legal advice.</p>"
)
if old_ent in t:
    t = t.replace(old_ent, new_ent, 1)
    print("what enterprises updated")
elif "tax filing integration" not in t:
    t = t.replace(
        "tax compliance workflows</b>, and documented giving trails",
        "tax compliance workflows</b>, planned <b>tax filing integration</b>, and documented giving trails",
        1,
    )
    print("what enterprises injected")
else:
    print("what already has filing integration")

# Business model bullets
old_li = (
    "<li><b>Tax compliance workflows</b> — organized exports and trails that support your tax and regulatory "
    "documentation (VeriChar does not file with the IRS or other agencies for you)</li>"
)
new_li = (
    "<li><b>Tax compliance workflows</b> — organized exports and trails that support your tax and regulatory documentation</li>"
    "<li><b>Tax filing integration</b> (planned) — structured exports and tool connections so records can flow into "
    "the software or advisor workflow you already use for filings; VeriChar does not file with the IRS or other "
    "agencies for you</li>"
)
if old_li in t:
    t = t.replace(old_li, new_li, 1)
    print("biz bullets updated")
elif "Tax filing integration" not in t:
    # try shorter pattern
    marker = "Tax compliance workflows</b>"
    if marker in t:
        # insert after first tax compliance li closing
        i = t.find(marker)
        close = t.find("</li>", i)
        if close != -1:
            insert = (
                "</li>"
                "<li><b>Tax filing integration</b> (planned) — structured exports and tool connections so records "
                "can flow into the software or advisor workflow you already use for filings; VeriChar does not file "
                "with the IRS or other agencies for you"
            )
            t = t[:close] + insert + t[close:]
            print("biz bullets injected")
        else:
            print("biz inject failed close")
    else:
        print("biz pattern miss")
else:
    print("biz already has filing")

# Portal copy
t = t.replace(
    "Planned SaaS tiers: analytics, audit support, <b>tax compliance workflows</b>, documented giving trails, less overhead. Sample data only — not live, not certified. We do not file returns for you; not tax or legal advice.",
    "Planned SaaS tiers: analytics, audit support, tax compliance workflows, <b>tax filing integration</b> (exports into your filing tools — we do not submit returns), documented giving trails. Sample data only — not live, not certified; not tax or legal advice.",
)
t = t.replace(
    "Built to support audits and <b>tax compliance workflows</b> — VeriChar does not file with the IRS for you. Not legal or tax advice.",
    "Built to support audits, tax compliance workflows, and planned tax filing integration — VeriChar does not file with the IRS for you. Not legal or tax advice.",
)

# meta keywords
if "tax filing integration" not in t:
    t = t.replace(
        "tax compliance workflows, charity escrow",
        "tax compliance workflows, tax filing integration, charity escrow",
        1,
    )

idx.write_text(t, encoding="utf-8")
print("index done")

# README
r = Path("README.md")
if r.exists():
    txt = r.read_text(encoding="utf-8")
    old = (
        "**Enterprise SaaS tiers (paid):** Analytics to streamline audits and CSR/impact reporting; **tax compliance workflows** "
        "(organized records and exports that support your tax and regulatory documentation); clearer documentation of giving; "
        "less stress and overhead. VeriChar does not file with the IRS or other agencies for you; not legal or tax advice. "
        "Goal: more of each gift reaches the need, with proof that is faster and easier to show."
    )
    new = (
        "**Enterprise SaaS tiers (paid):** Analytics to streamline audits and CSR/impact reporting; **tax compliance workflows**; "
        "planned **tax filing integration** (structured exports / connections into the filing software or advisor workflow you "
        "already use — VeriChar does not submit returns to the IRS or other agencies); clearer documentation of giving; less "
        "stress and overhead. Not legal or tax advice. Goal: more of each gift reaches the need, with proof that is faster and easier to show."
    )
    if old in txt:
        txt = txt.replace(old, new, 1)
        print("readme updated")
    elif "tax filing integration" not in txt.lower():
        txt = txt.replace(
            "**tax compliance workflows**",
            "**tax compliance workflows**; planned **tax filing integration**",
            1,
        )
        print("readme injected")
    else:
        print("readme already ok")
    r.write_text(txt, encoding="utf-8")

# Whitepaper
wpath = Path("verichar-whitepaper-v0.7.md")
if wpath.exists():
    w = wpath.read_text(encoding="utf-8")
    if "tax filing integration" not in w.lower():
        w = w.replace(
            "**tax compliance workflows** and exportable evidence that can **support** tax and regulatory documentation",
            "**tax compliance workflows**, planned **tax filing integration** (exports into customer filing tools — "
            "VeriChar does not submit returns), and exportable evidence that can **support** tax and regulatory documentation",
        )
        w = w.replace(
            "analytics that **streamline audits**, **tax compliance workflows**, and CSR / impact reporting",
            "analytics that **streamline audits**, **tax compliance workflows**, planned **tax filing integration**, and CSR / impact reporting",
        )
        print("wp patched")
    else:
        print("wp already has filing")
    wpath.write_text(w, encoding="utf-8")

# SEO snippet if present
seo = Path("assets/seo-head.snippet.html")
if seo.exists():
    s = seo.read_text(encoding="utf-8")
    if "tax filing" not in s.lower():
        s = s.replace(
            "tax compliance workflows, less overhead",
            "tax compliance workflows, tax filing integration, less overhead",
        )
        s = s.replace(
            "tax compliance workflows, documented impact",
            "tax compliance workflows, tax filing integration, documented impact",
        )
        seo.write_text(s, encoding="utf-8")
        print("seo snippet updated")
