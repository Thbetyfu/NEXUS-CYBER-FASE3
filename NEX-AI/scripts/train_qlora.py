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

# Model configuration
MODEL_ID = "Qwen/Qwen2.5-3B-Instruct"

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

def main():
    print("[NEX-AI] Memulai proses persiapan pelatihan QLoRA...")
    
    # 1. Konfigurasi Kuantisasi 4-bit (NF4)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True
    )
    
    # 2. Muat Tokenizer dan Model Dasar
    print(f"[NEX-AI] Mengunduh model dasar: {MODEL_ID}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )
    
    # Persiapkan model untuk pelatihan presisi rendah
    model = prepare_model_for_kbit_training(model)
    
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
    final_checkpoint_path = os.path.join(OUTPUT_DIR, "nex_ai_final")
    model.save_pretrained(final_checkpoint_path)
    tokenizer.save_pretrained(final_checkpoint_path)
    print(f"[NEX-AI] Pelatihan selesai. Adapter tersimpan di: {final_checkpoint_path}")

if __name__ == "__main__":
    main()
