package mtd

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"net"
	"strings"
	"time"
)

// SSHTarpitServer mengimplementasikan teknik tarpit port SSH untuk menguras sumber daya pemindai otomatis.
type SSHTarpitServer struct {
	ListenAddr       string
	DelayInterval    time.Duration // Jeda waktu pengiriman baris data palsu
	FakeVersion      string        // Banner awal tiruan
	OnAttackerCaught func(ip string)
}

// NewSSHTarpit menginisialisasi server tarpit SSH dengan jeda waktu standar 10 detik.
func NewSSHTarpit(addr string, delay time.Duration) *SSHTarpitServer {
	return &SSHTarpitServer{
		ListenAddr:    addr,
		DelayInterval: delay,
		FakeVersion:   "SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5",
	}
}

// Start menjalankan listener TCP SSH Tarpit secara asinkron.
func (s *SSHTarpitServer) Start() {
	listener, err := net.Listen("tcp", s.ListenAddr)
	if err != nil {
		log.Printf("[SSH-TARPIT-ERROR] Failed to start: %v", err)
		return
	}

	go func() {
		log.Printf("[SSH-TARPIT] SSH Tarpit ACTIVE on %s (delay: %v)", s.ListenAddr, s.DelayInterval)
		defer listener.Close()

		for {
			conn, err := listener.Accept()
			if err != nil {
				continue
			}
			go s.handleConnection(conn)
		}
	}()
}

// handleConnection memproses koneksi klien SSH dan menahannya secara tiada akhir.
func (s *SSHTarpitServer) handleConnection(conn net.Conn) {
	defer conn.Close()

	remoteAddr := conn.RemoteAddr().String()
	attackerIP := remoteAddr
	if idx := strings.Index(remoteAddr, ":"); idx != -1 {
		attackerIP = remoteAddr[:idx]
	}

	// 1. Simpan IP penyerang ke Redis dengan TTL 24 jam (otomatis diblokir oleh WAF)
	if MtdRedis != nil && MtdRedis.Enabled {
		err := MtdRedis.Client.Set(context.Background(), "honeypot:"+attackerIP, time.Now().String(), 24*time.Hour).Err()
		if err != nil {
			log.Printf("[SSH-TARPIT-REDIS] Failed to record attacker IP: %v", err)
		}
	}

	log.Printf("[SSH-TARPIT-TRAP] Attacker caught probing SSH: IP=%s", remoteAddr)

	// Panggil callback telemetry jika terdaftar
	if s.OnAttackerCaught != nil {
		s.OnAttackerCaught(remoteAddr)
	}

	// Atur timeout penulisan awal yang pendek
	_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))

	// 2. Kirim banner versi SSH tiruan pertama kali
	_, err := fmt.Fprintf(conn, "%s\r\n", s.FakeVersion)
	if err != nil {
		return
	}

	// 3. Loop kirim baris data acak secara berkala (tarpit delay)
	for {
		// Set deadline agar koneksi tidak menggantung permanen jika klien mati tanpa close socket
		_ = conn.SetWriteDeadline(time.Now().Add(s.DelayInterval + 5*time.Second))

		time.Sleep(s.DelayInterval)

		// Hasilkan deretan karakter acak menggunakan CSPRNG
		randomStr := generateRandomSSHLine()
		_, err := fmt.Fprintf(conn, "%s\r\n", randomStr)
		if err != nil {
			log.Printf("[SSH-TARPIT-DISCONNECT] Client %s disconnected after starvation.", remoteAddr)
			break
		}
	}
}

// generateRandomSSHLine menghasilkan baris hex acak untuk mengelabui klien SSH
func generateRandomSSHLine() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	nBig, _ := rand.Int(rand.Reader, big.NewInt(1000000))
	return fmt.Sprintf("%x-%08d", b, nBig.Int64())
}
