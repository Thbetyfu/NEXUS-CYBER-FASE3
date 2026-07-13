from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ColabLayout:
    drive_root: Path
    project_dir: Path
    dataset_dir: Path
    scripts_dir: Path
    outputs_dir: Path
    checkpoints_dir: Path
    dataset_file: Path
    train_script: Path


def build_layout(project_dir_name: str = "NEX-AI-Collab") -> ColabLayout:
    drive_root = Path("/content/drive/MyDrive")
    project_dir = drive_root / project_dir_name
    dataset_dir = project_dir / "dataset"
    scripts_dir = project_dir / "scripts"
    outputs_dir = project_dir / "outputs"
    checkpoints_dir = project_dir / "checkpoints"
    dataset_file = dataset_dir / "cyber_security_dataset.json"
    train_script = scripts_dir / "train_qlora.py"
    return ColabLayout(
        drive_root=drive_root,
        project_dir=project_dir,
        dataset_dir=dataset_dir,
        scripts_dir=scripts_dir,
        outputs_dir=outputs_dir,
        checkpoints_dir=checkpoints_dir,
        dataset_file=dataset_file,
        train_script=train_script,
    )


def verify_layout(layout: ColabLayout) -> dict[str, bool]:
    return {
        "drive_root": layout.drive_root.exists(),
        "project_dir": layout.project_dir.exists(),
        "dataset_dir": layout.dataset_dir.exists(),
        "scripts_dir": layout.scripts_dir.exists(),
        "outputs_dir": layout.outputs_dir.exists(),
        "dataset_file": layout.dataset_file.exists(),
        "train_script": layout.train_script.exists(),
    }


def print_layout(layout: ColabLayout) -> None:
    print("Drive root:", layout.drive_root)
    print("Project dir:", layout.project_dir)
    print("Dataset dir:", layout.dataset_dir)
    print("Scripts dir:", layout.scripts_dir)
    print("Outputs dir:", layout.outputs_dir)
    print("Checkpoints dir:", layout.checkpoints_dir)
    print("Dataset file:", layout.dataset_file)
    print("Train script:", layout.train_script)


if __name__ == "__main__":
    current_layout = build_layout()
    print_layout(current_layout)
    print("Status verifikasi:")
    for key, value in verify_layout(current_layout).items():
        print(f"  - {key}: {value}")
