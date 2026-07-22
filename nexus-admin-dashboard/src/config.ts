/**
 * Nexus SOC OS Configuration
 * 
 * Alasan Arsitektural (Why):
 * Memisahkan konfigurasi lingkungan kerja menjadi 2 mode utama (Development & Production).
 * Ini mencegah terjadinya kegagalan koneksi akibat hardcoded URL lokal ("localhost:8080") saat aplikasi
 * di-deploy ke server produksi awan (GCP/AWS) maupun on-premise.
 */

const IS_PROD = process.env.NODE_ENV === "production";

// Mode 1 (Development): Mengarah ke localhost:8080 untuk kenyamanan debug lokal.
// Mode 2 (Production): Mengarah ke IP/Domain publik Gateway melalui variabel lingkungan (NEXT_PUBLIC_API_URL),
//                      atau menggunakan relative path ("") jika dasbor di-deploy di bawah domain yang sama (Nginx/Gateway Proxy).
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
