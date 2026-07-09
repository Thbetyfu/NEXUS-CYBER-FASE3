package rasp

import (
	"context"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

func TestRASPPrevention(t *testing.T) {
	// 1. Inisialisasi telemetry logger dummy untuk merekam event RASP
	tel, err := logger.NewLogger()
	if err != nil {
		t.Fatalf("Failed to initialize logger: %v", err)
	}
	defer func() {
		tel.Close()
		os.Remove("nexus_traffic.log")
		os.Remove("nexus_ai_events.log")
	}()

	// 2. Jalankan RASP monitor di background dengan interval cepat (50ms)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go StartRASP(ctx, tel, 50*time.Millisecond)

	// Berikan sedikit waktu agar RASP monitor siap
	time.Sleep(100 * time.Millisecond)

	// 3. Melahirkan child process ilegal yang dikontrol
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		// Menggunakan cmd.exe untuk melakukan ping localhost (menghindari timeout command interactive blocks)
		cmd = exec.Command("cmd.exe", "/c", "ping 127.0.0.1 -n 10")
	} else {
		cmd = exec.Command("sh", "-c", "sleep 10")
	}

	err = cmd.Start()
	if err != nil {
		// Degradasi anggun pada lingkungan pengujian sandbox yang membatasi spawn shell process.
		if strings.Contains(err.Error(), "Access is denied") || strings.Contains(err.Error(), "permission denied") {
			t.Skipf("Skipping RASP test: host sandbox restricts spawning child processes (Access Denied). error: %v", err)
			return
		}
		t.Fatalf("Failed to start child process for testing: %v", err)
	}

	// 4. Tunggu beberapa saat agar RASP mendeteksi dan membunuh proses tersebut
	time.Sleep(300 * time.Millisecond)

	// 5. Periksa apakah proses telah terbunuh
	// Jika sudah terbunuh, Wait() akan mengembalikan error "exit status 1" (atau signal killed di Linux)
	waitErr := cmd.Wait()
	if waitErr == nil {
		t.Error("Expected child process to be forcefully terminated by RASP, but it finished successfully")
	}

	// 6. Verifikasi log kejadian AI direkam di telemetry logger
	events := tel.GetRecentAIEvents()
	foundRaspLog := false
	for _, event := range events {
		if event.Layer == "Self-Repair" && strings.Contains(event.DetailAction, "ILLEGAL") {
			foundRaspLog = true
			t.Logf("Found telemetry event: %s", event.DetailAction)
			break
		}
	}

	if !foundRaspLog {
		t.Error("Expected to find RASP prevention log in telemetry AI events, but it was missing")
	}
}
