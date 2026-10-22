from pathlib import Path
p = Path("verichar-whitepaper-v0.7.md")
w = p.read_text(encoding="utf-8")
w = w.replace(
    "**Verifiable charity on the XRP Ledger**  \n*Proof comes before payment.*",
    "**Verifiable giving on the XRP Ledger**  \n*Proof before payment. Encoded transparency for charity.*",
    1,
)
w = w.replace(
    "**Core principle.** Proof comes before payment, not after. Trust should be enforced by code, not demanded by slogans. The code that would enforce full settlement is not finished. Until it is, the public demonstration says so on the screen.",
    "**Core principle.** Proof before payment. **Product:** verifiable giving on XRPL. **Method:** lock funds until invoice and proof of delivery check out, then pay the vendor. The code that would enforce full settlement is not finished. Until it is, the public demonstration says so on the screen.",
    1,
)
p.write_text(w, encoding="utf-8")
print("whitepaper patched")
