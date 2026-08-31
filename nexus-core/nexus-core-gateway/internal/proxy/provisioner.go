package proxy

import (
	"fmt"
	"net"
	"os/exec"
	"runtime"
	"strconv"
)

// FindFreePort mencari port TCP bebas di host mulai dari port startPort ke atas
func FindFreePort(startPort int) (int, error) {
	for port := startPort; port < 65535; port++ {
		ln, err := net.Listen("tcp", ":"+strconv.Itoa(port))
		if err == nil {
			ln.Close()
			return port, nil
		}
	}
	return 0, fmt.Errorf("no free ports available")
}

// RunProvisioner memicu skrip provisioner untuk meluncurkan (up) atau menghancurkan (down) kontainer tenant
func RunProvisioner(action string, domain string, port int) error {
	var cmd *exec.Cmd
	scriptSh := "../scripts/provisioner.sh"
	scriptPs := "../scripts/provisioner.ps1"

	if runtime.GOOS == "windows" {
		cmd = exec.Command("powershell", "-ExecutionPolicy", "Bypass", "-File", scriptPs,
			"-Action", action, "-Domain", domain, "-Port", strconv.Itoa(port))
	} else {
		cmd = exec.Command("/bin/bash", scriptSh, action, domain, strconv.Itoa(port))
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("provisioner execution failed: %v | Output: %s", err, string(output))
	}
	return nil
}
