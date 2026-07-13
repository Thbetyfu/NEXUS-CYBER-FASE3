from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from colab_paths import build_layout, print_layout, verify_layout


def copy_if_missing(source: Path | None, destination: Path) -> None:
    if source is None:
        return
    if not source.exists():
        raise FileNotFoundError(f"Sumber tidak ditemukan: {source}")
    if destination.exists():
        print(f"[bootstrap] Lewati copy karena target sudah ada: {destination}")
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    print(f"[bootstrap] File disalin: {source} -> {destination}")


def ensure_structure(project_dir_name: str) -> None:
    layout = build_layout(project_dir_name)
    layout.project_dir.mkdir(parents=True, exist_ok=True)
    layout.dataset_dir.mkdir(parents=True, exist_ok=True)
    layout.scripts_dir.mkdir(parents=True, exist_ok=True)
    layout.outputs_dir.mkdir(parents=True, exist_ok=True)
    layout.checkpoints_dir.mkdir(parents=True, exist_ok=True)

    print("[bootstrap] Struktur Google Drive siap.")
    print_layout(layout)
    print("[bootstrap] Status verifikasi awal:")
    for key, value in verify_layout(layout).items():
        print(f"  - {key}: {value}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bootstrap workflow NEX-AI untuk Google Colab / IDE extension."
    )
    parser.add_argument(
        "--project-dir-name",
        default="NEX-AI-Collab",
        help="Nama folder project di Google Drive/MyDrive.",
    )
    parser.add_argument(
        "--source-dataset",
        type=Path,
        default=None,
        help="Opsional: sumber lokal dataset untuk disalin ke Google Drive.",
    )
    parser.add_argument(
        "--source-train-script",
        type=Path,
        default=None,
        help="Opsional: sumber lokal train_qlora.py untuk disalin ke Google Drive.",
    )
    args = parser.parse_args()

    ensure_structure(args.project_dir_name)
    layout = build_layout(args.project_dir_name)
    copy_if_missing(args.source_dataset, layout.dataset_file)
    copy_if_missing(args.source_train_script, layout.train_script)

    print("[bootstrap] Bootstrap selesai.")


if __name__ == "__main__":
    main()
