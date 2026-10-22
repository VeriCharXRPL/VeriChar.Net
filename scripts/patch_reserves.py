#!/usr/bin/env python3
"""Add api_version: 2 to account_info in reserves.js (xrpl.js / API v2 style)."""
from pathlib import Path

p = Path("backend/src/reserves.js")
t = p.read_text(encoding="utf-8")
if "api_version: 2" in t:
    print("reserves.js already has api_version 2")
    raise SystemExit(0)
old = """  const info = await client.request({
    command: 'account_info',
    account: address,
    ledger_index: 'validated',
  });"""
new = """  const info = await client.request({
    command: 'account_info',
    account: address,
    ledger_index: 'validated',
    api_version: 2,
  });"""
if old not in t:
    raise SystemExit("reserves.js account_info block not found")
p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("reserves.js: api_version 2 added")
