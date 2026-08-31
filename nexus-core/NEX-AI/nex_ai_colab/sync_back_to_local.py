from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def copy_tree(source: Path, destination: Path) -> None:
    if not source.exists():
        raise FileNotFoundError(f"Sumber artefak tidak ditemukan: {source}")

    destination.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        target = destination / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sinkronkan artefak hasil Colab ke struktur lokal NEX-AI/checkpoints."
    )
    parser.add_argument(
        "--source",
        required=True,
        type=Path,
        help="Folder sumber hasil ekstraksi Colab, mis. checkpoints/nex_ai_merged.",
    )
    parser.add_argument(
        "--target",
        default=None,
        type=Path,
        help="Folder target lokal. Default diarahkan ke NEX-AI/checkpoints.",
    )
    args = parser.parse_args()

    source = args.source.resolve()
    if args.target is None:
        target = Path(__file__).resolve().parents[1] / "checkpoints"
    else:
        target = args.target.resolve()

    if source.name == "checkpoints":
        final_target = target
    else:
        final_target = target / source.name

    print(f"[sync] Menyalin artefak dari {source} ke {final_target}")
    copy_tree(source, final_target)
    print("[sync] Sinkronisasi selesai.")


if __name__ == "__main__":
    main()
