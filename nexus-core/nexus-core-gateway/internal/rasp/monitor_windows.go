//go:build windows

package rasp

import (
	"fmt"
	"syscall"
	"unsafe"
)

// findChildProcesses memindai daftar proses Windows menggunakan Toolhelp32Snapshot untuk menemukan child process dari parentPid
func findChildProcesses(parentPid int) ([]ProcessInfo, error) {
	var children []ProcessInfo

	// Membuat snapshot dari semua proses yang berjalan di Windows
	hSnapshot, err := syscall.CreateToolhelp32Snapshot(syscall.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to create toolhelp snapshot: %v", err)
	}
	defer syscall.CloseHandle(hSnapshot)

	var pe32 syscall.ProcessEntry32
	pe32.Size = uint32(unsafe.Sizeof(pe32))

	err = syscall.Process32First(hSnapshot, &pe32)
	if err != nil {
		return nil, fmt.Errorf("failed to get first process from snapshot: %v", err)
	}

	for {
		if pe32.ParentProcessID == uint32(parentPid) {
			// Konversi nama berkas executable dari UTF-16 ke string Go
			name := syscall.UTF16ToString(pe32.ExeFile[:])

			children = append(children, ProcessInfo{
				Pid:  int(pe32.ProcessID),
				Ppid: int(pe32.ParentProcessID),
				Name: name,
			})
		}

		err = syscall.Process32Next(hSnapshot, &pe32)
		if err != nil {
			break
		}
	}

	return children, nil
}
