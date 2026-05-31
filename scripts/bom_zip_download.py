#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path


BASE_URL = (
    "http://www.bom.gov.au/web03/ncc/www/awap/solar/solarave/daily/"
    "grid/0.05/history/nat"
)


def parse_date(value: str) -> dt.date:
    try:
        return dt.datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"Invalid date '{value}'. Use YYYY-MM-DD format."
        ) from exc


def iter_dates(start: dt.date, end: dt.date):
    current = start
    while current <= end:
        yield current
        current += dt.timedelta(days=1)


def filename_for(day: dt.date) -> str:
    ymd = day.strftime("%Y%m%d")
    return f"{ymd}{ymd}.grid.Z"


def download_bytes(url: str, timeout: int) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "bom-zip-downloader/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download BOM .grid.Z files for a date range and bundle them in one ZIP."
    )
    parser.add_argument("--start", required=True, type=parse_date, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", required=True, type=parse_date, help="End date YYYY-MM-DD")
    parser.add_argument(
        "--output",
        default="bom-grid.zip",
        help="Output zip path (default: bom-grid.zip)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="HTTP timeout seconds per file (default: 30)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Stop on first failed download (default: skip failures and continue)",
    )
    args = parser.parse_args()

    if args.end < args.start:
        print("End date must be on or after start date.", file=sys.stderr)
        return 2

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total = (args.end - args.start).days + 1
    success = 0
    failed: list[str] = []

    with zipfile.ZipFile(output_path, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for idx, day in enumerate(iter_dates(args.start, args.end), start=1):
            name = filename_for(day)
            url = f"{BASE_URL}/{name}"
            print(f"[{idx}/{total}] Downloading {name}")
            try:
                data = download_bytes(url, timeout=args.timeout)
                zf.writestr(name, data)
                success += 1
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
                failed.append(name)
                print(f"  Failed: {exc}", file=sys.stderr)
                if args.strict:
                    print("Aborting because --strict was provided.", file=sys.stderr)
                    return 1

    print(f"\nCreated {output_path} with {success} files.")
    if failed:
        print(f"Skipped {len(failed)} files.")
        print("First failures:")
        for item in failed[:10]:
            print(f"- {item}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
