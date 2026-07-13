import shutil
import subprocess
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
CHECKPOINT_DIR = BASE_DIR / "checkpoints" / "nex_ai_merged"
OUTPUT_DIR = BASE_DIR / "build"
LLAMA_CPP_DIR = BASE_DIR / "llama.cpp"
FP16_GGUF_PATH = OUTPUT_DIR / "nex_ai_fp16.gguf"
Q4_GGUF_PATH = OUTPUT_DIR / "nex_ai_q4_k_m.gguf"
FINAL_GGUF_PATH = BASE_DIR / "nex_ai_q4_k_m.gguf"


def run(cmd, cwd=None):
    print(f"[NEX-AI] Menjalankan: {' '.join(str(part) for part in cmd)}")
    subprocess.run(cmd, cwd=cwd, check=True)


def ensure_prerequisites():
    if not CHECKPOINT_DIR.exists():
        raise FileNotFoundError(
            f"Checkpoint model gabungan belum ditemukan di: {CHECKPOINT_DIR}. Jalankan train_qlora.py lebih dulu."
        )

    for binary in ("git", "cmake"):
        if shutil.which(binary) is None:
            raise EnvironmentError(f"Dependency '{binary}' tidak ditemukan di PATH.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def ensure_llama_cpp():
    if not LLAMA_CPP_DIR.exists():
        run(["git", "clone", "https://github.com/ggerganov/llama.cpp.git", str(LLAMA_CPP_DIR)])

    build_dir = LLAMA_CPP_DIR / "build"
    build_dir.mkdir(parents=True, exist_ok=True)

    if sys.platform.startswith("win"):
        run(
            [
                "cmake",
                "-S",
                str(LLAMA_CPP_DIR),
                "-B",
                str(build_dir),
                "-DGGML_CUDA=ON",
            ]
        )
        run(["cmake", "--build", str(build_dir), "--config", "Release"])
    else:
        run(["cmake", "-S", str(LLAMA_CPP_DIR), "-B", str(build_dir), "-DGGML_CUDA=ON"])
        run(["cmake", "--build", str(build_dir), "--config", "Release"])


def find_quantize_binary():
    candidates = [
        LLAMA_CPP_DIR / "build" / "bin" / "Release" / "llama-quantize.exe",
        LLAMA_CPP_DIR / "build" / "bin" / "llama-quantize.exe",
        LLAMA_CPP_DIR / "build" / "bin" / "Release" / "quantize.exe",
        LLAMA_CPP_DIR / "build" / "bin" / "quantize.exe",
        LLAMA_CPP_DIR / "build" / "bin" / "llama-quantize",
        LLAMA_CPP_DIR / "build" / "bin" / "quantize",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Binary quantize llama.cpp tidak ditemukan setelah proses build.")


def convert_to_gguf():
    converter_script = LLAMA_CPP_DIR / "convert_hf_to_gguf.py"
    if not converter_script.exists():
        raise FileNotFoundError(f"Script converter GGUF tidak ditemukan di: {converter_script}")

    run(
        [
            sys.executable,
            str(converter_script),
            str(CHECKPOINT_DIR),
            "--outfile",
            str(FP16_GGUF_PATH),
            "--outtype",
            "f16",
        ]
    )


def quantize_gguf():
    quantize_binary = find_quantize_binary()
    run([str(quantize_binary), str(FP16_GGUF_PATH), str(Q4_GGUF_PATH), "Q4_K_M"])
    shutil.copy2(Q4_GGUF_PATH, FINAL_GGUF_PATH)


def main():
    print("[NEX-AI] Memulai pipeline konversi dan quantization model untuk Windows/local.")
    ensure_prerequisites()
    ensure_llama_cpp()
    convert_to_gguf()
    quantize_gguf()
    print("[NEX-AI] Selesai. Artefak final tersedia di:")
    print(f"  - {Q4_GGUF_PATH}")
    print(f"  - {FINAL_GGUF_PATH}")
    print("[NEX-AI] Langkah berikutnya:")
    print(f"  ollama create nex-ai-protect -f {BASE_DIR / 'Modelfile.production'}")
    print(f"  ollama create nex-ai-reflex -f {BASE_DIR / 'Modelfile.production'}")


if __name__ == "__main__":
    main()
