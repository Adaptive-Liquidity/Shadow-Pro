#!/usr/bin/env python3
"""Validate the repository's local-only Anchor configuration without execution."""

from __future__ import annotations

from pathlib import Path
import sys
import tomllib


def check_anchor_toml(path: str = "Anchor.toml") -> list[str]:
    with Path(path).open("rb") as handle:
        data = tomllib.load(handle)

    errors: list[str] = []
    provider = data.get("provider")
    if not isinstance(provider, dict):
        return ["[provider] table is required"]

    cluster = provider.get("cluster")
    if not isinstance(cluster, str) or cluster.lower() != "localnet":
        errors.append(f'provider.cluster must be "Localnet", got: {cluster!r}')

    wallet = provider.get("wallet")
    if not isinstance(wallet, str) or "LOCAL_ONLY_DO_NOT_FUND" not in wallet:
        errors.append(
            "provider.wallet must reference a LOCAL_ONLY_DO_NOT_FUND keypair, "
            f"got: {wallet!r}"
        )

    return errors


def main() -> int:
    errors = check_anchor_toml()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Anchor.toml local-only checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
