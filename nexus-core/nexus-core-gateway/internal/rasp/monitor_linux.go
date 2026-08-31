//go:build linux

package rasp

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// findChildProcesses memindai sistem berkas /proc pada Linux untuk mendeteksi child process dari parentPid
func findChildProcesses(parentPid int) ([]ProcessInfo, error) {
	var children []ProcessInfo

	// Membaca direktori /proc
	files, err := os.ReadDir("/proc")
	if err != nil {
		return nil, fmt.Errorf("failed to read /proc: %v", err)
	}

	for _, file := range files {
		if !file.IsDir() {
			continue
		}

		// Jika nama direktori adalah angka, berarti itu adalah PID proses
		pid, err := strconv.Atoi(file.Name())
		if err != nil {
			continue
		}

		statPath := filepath.Join("/proc", file.Name(), "stat")
		statBytes, err := os.ReadFile(statPath)
		if err != nil {
			continue // Abaikan jika proses sudah ditutup (race condition)
		}

		statStr := string(statBytes)
		
		// Parsing format stat: "PID (Name) State PPID ..."
		// Penanganan aman terhadap nama proses yang memiliki spasi dengan mencari kurung tutup terakhir
		lastParen := strings.LastIndex(statStr, ")")
		if lastParen == -1 || lastParen+2 >= len(statStr) {
			continue
		}

		// Ekstrak nama proses di dalam tanda kurung
		firstParen := strings.Index(statStr, "(")
		var name string
		if firstParen != -1 && firstParen < lastParen {
			name = statStr[firstParen+1 : lastParen]
		} else {
			name = "unknown"
		}

		// Potong sisa string setelah kurung tutup terakhir
		afterParen := statStr[lastParen+2:]
		fields := strings.Fields(afterParen)
		if len(fields) < 2 {
			continue
		}

		// Field ke-2 setelah kurung tutup (indeks 1) adalah PPID
		ppid, err := strconv.Atoi(fields[1])
		if err != nil {
			continue
		}

		if ppid == parentPid {
			children = append(children, ProcessInfo{
				Pid:  pid,
				Ppid: ppid,
				Name: name,
			})
		}
	}

	return children, nil
}
