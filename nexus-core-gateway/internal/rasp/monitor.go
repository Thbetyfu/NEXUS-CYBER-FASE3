package rasp

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

// ProcessInfo menampung data proses sistem operasi yang ditemukan
type ProcessInfo struct {
	Pid  int
	Ppid int
	Name string
}

// Daftar nama berkas executable shell dan interpreter yang dilarang dieksekusi sebagai child process gateway
var dangerousExecutables = map[string]bool{
	"cmd.exe":        true,
	"powershell.exe": true,
	"pwsh.exe":       true,
	"pwsh":           true,
	"sh":             true,
	"bash":           true,
	"zsh":            true,
	"ash":            true,
	"dash":           true,
	"ksh":            true,
	"csh":            true,
	"tcsh":           true,
	"python":         true,
	"python3":        true,
	"python.exe":     true,
	"perl":           true,
	"perl.exe":       true,
}

// StartRASP menjalankan loop pemantauan child process secara periodik di background
func StartRASP(ctx context.Context, telemetry *logger.Logger, interval time.Duration) {
	myPid := os.Getpid()
	log.Printf("[RASP] Runtime Application Self-Protection active for Gateway PID: %d (Interval: %v)", myPid, interval)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			scanAndMitigate(myPid, telemetry)
		case <-ctx.Done():
			log.Println("[RASP] Runtime Application Self-Protection stopped.")
			return
		}
	}
}

// scanAndMitigate memindai semua child process dan membunuh paksa jika terdeteksi berbahaya
func scanAndMitigate(myPid int, telemetry *logger.Logger) {
	children, err := findChildProcesses(myPid)
	if err != nil {
		return
	}

	for _, child := range children {
		execName := strings.ToLower(child.Name)
		if dangerousExecutables[execName] || isDangerousCommand(execName) {
			mitigateProcess(child, telemetry)
		}
	}
}

// isDangerousCommand memeriksa apakah akhiran nama proses cocok dengan shell terlarang
func isDangerousCommand(name string) bool {
	name = strings.ToLower(name)
	for d := range dangerousExecutables {
		if name == d || strings.HasSuffix(name, "/"+d) || strings.HasSuffix(name, "\\"+d) {
			return true
		}
	}
	return false
}

// mitigateProcess membunuh paksa child process ilegal dan mengirim log peringatan ke SOC dashboard
func mitigateProcess(proc ProcessInfo, telemetry *logger.Logger) {
	p, err := os.FindProcess(proc.Pid)
	if err != nil {
		return
	}

	start := time.Now()
	err = p.Kill()
	latency := time.Since(start)

	if err == nil {
		logMsg := fmt.Sprintf("[RASP_PREVENTION] Spawning child process '%s' (PID: %d) is ILLEGAL. Process forcefully killed in %v to prevent shell access.", proc.Name, proc.Pid, latency)
		log.Printf("[RASP] %s", logMsg)

		if telemetry != nil {
			telemetry.LogAIEvent(logger.AIEventLog{
				Timestamp:    time.Now(),
				Layer:        "Self-Repair",
				Status:       "REPAIRING",
				DetailAction: logMsg,
			})
		}
	}
}
