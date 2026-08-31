import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "cyber_security_dataset.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "checkpoints")
CACHE_DIR = os.path.join(BASE_DIR, ".cache", "huggingface")
FINAL_ADAPTER_DIR = os.path.join(OUTPUT_DIR, "nex_ai_final")
MERGED_DIR = os.path.join(OUTPUT_DIR, "nex_ai_merged")

# Model configuration
MODEL_ID = "Qwen/Qwen2.5-3B-Instruct"
MIN_RECOMMENDED_VRAM_GB = 5.5

def format_prompts(batch, tokenizer):
    texts = []
    for inst, inp, out in zip(batch["instruction"], batch["input"], batch["output"]):
        # Map instruction tuning format to Qwen chat template
        messages = [
            {"role": "system", "content": inst},
            {"role": "user", "content": inp},
            {"role": "assistant", "content": out}
        ]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        texts.append(text)
    return {"text": texts}

def ensure_directories():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)

    # Keep model downloads and caches private to this workspace.
    os.environ.setdefault("HF_HOME", CACHE_DIR)
    os.environ.setdefault("HUGGINGFACE_HUB_CACHE", os.path.join(CACHE_DIR, "hub"))
    os.environ.setdefault("TRANSFORMERS_CACHE", os.path.join(CACHE_DIR, "transformers"))

def validate_runtime():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset tidak ditemukan: {DATASET_PATH}")

    if not torch.cuda.is_available():
        raise RuntimeError(
            "GPU CUDA tidak terdeteksi. Training QLoRA lokal dihentikan agar tidak memaksa pelatihan CPU yang sangat lambat."
        )

    gpu_name = torch.cuda.get_device_name(0)
    total_vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    print(f"[NEX-AI] GPU terdeteksi: {gpu_name} ({total_vram_gb:.2f} GiB VRAM)")

    if total_vram_gb < MIN_RECOMMENDED_VRAM_GB:
        raise RuntimeError(
            f"VRAM tersedia {total_vram_gb:.2f} GiB, di bawah rekomendasi minimal {MIN_RECOMMENDED_VRAM_GB} GiB untuk QLoRA 3B."
        )

def validate_dataset(dataset):
    train_count = len(dataset["train"])
    if train_count == 0:
        raise RuntimeError("Dataset kosong. Training dibatalkan.")
    print(f"[NEX-AI] Dataset siap dilatih dengan {train_count} sampel.")

def main():
    print("[NEX-AI] Memulai proses persiapan pelatihan QLoRA...")
    ensure_directories()
    validate_runtime()
    
    # 1. Konfigurasi Kuantisasi 4-bit (NF4)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True
    )
    
    # 2. Muat Tokenizer dan Model Dasar
    print(f"[NEX-AI] Mengunduh model dasar: {MODEL_ID}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True, cache_dir=CACHE_DIR)
    tokenizer.pad_token = tokenizer.eos_token
    
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
        cache_dir=CACHE_DIR
    )
    
    # Persiapkan model untuk pelatihan presisi rendah
    model = prepare_model_for_kbit_training(model)
    model.gradient_checkpointing_enable()
    model.config.use_cache = False
    
    # 3. Konfigurasi LoRA
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    
    model = get_peft_model(model, lora_config)
    print("[NEX-AI] Konfigurasi LoRA berhasil dipasang pada model dasar.")
    model.print_trainable_parameters()
    
    # 4. Muat dan Tokenisasi Dataset
    print(f"[NEX-AI] Memuat berkas dataset: {DATASET_PATH}")
    dataset = load_dataset("json", data_files=DATASET_PATH)
    validate_dataset(dataset)
    
    # Format ke chat template Qwen
    dataset = dataset.map(lambda x: format_prompts(x, tokenizer), batched=True)
    
    # Tokenisasi data untuk pelatihan
    def tokenize_func(examples):
        result = tokenizer(examples["text"], truncation=True, max_length=1024, padding=False)
        result["labels"] = result["input_ids"].copy()
        return result
        
    tokenized_dataset = dataset.map(tokenize_func, batched=True, remove_columns=["instruction", "input", "output", "text"])
    
    # 5. Parameter Pelatihan (Training Arguments)
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=10,
        num_train_epochs=3,
        optim="paged_adamw_8bit",
        fp16=True,
        gradient_checkpointing=True,
        save_strategy="epoch",
        save_total_limit=2,
        report_to="none",
        remove_unused_columns=False
    )
    
    # 6. Jalankan Proses Training
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        data_collator=DataCollatorForSeq2Seq(tokenizer, pad_to_multiple_of=8, return_tensors="pt", padding=True)
    )
    
    print("[NEX-AI] Memulai pelatihan model...")
    trainer.train()
    
    # Simpan adapter akhir
    model.save_pretrained(FINAL_ADAPTER_DIR)
    tokenizer.save_pretrained(FINAL_ADAPTER_DIR)
    print(f"[NEX-AI] Pelatihan selesai. Adapter tersimpan di: {FINAL_ADAPTER_DIR}")

    # 7. Proses Penggabungan (Merging) LoRA dengan Model Dasar
    print("[NEX-AI] Memulai penggabungan (merging) LoRA adapter dengan model dasar...")
    
    # Hapus model latih untuk membebaskan VRAM guna mencegah OOM
    del model
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    # Muat ulang model dasar dalam presisi FP16 di CPU/system memory untuk merge yang stabil
    print(f"[NEX-AI] Memuat model dasar dalam FP16 di CPU: {MODEL_ID}")
    base_model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16,
        device_map="cpu",
        trust_remote_code=True,
        cache_dir=CACHE_DIR
    )

    from peft import PeftModel
    print("[NEX-AI] Memuat LoRA adapter ke model dasar...")
    peft_model = PeftModel.from_pretrained(base_model, FINAL_ADAPTER_DIR)
    
    print("[NEX-AI] Melakukan merge_and_unload...")
    merged_model = peft_model.merge_and_unload()

    print(f"[NEX-AI] Menyimpan model utuh terintegrasi di: {MERGED_DIR}")
    merged_model.save_pretrained(MERGED_DIR)
    tokenizer.save_pretrained(MERGED_DIR)
    print("[NEX-AI] Proses penggabungan selesai dengan sukses!")

if __name__ == "__main__":
    main()
