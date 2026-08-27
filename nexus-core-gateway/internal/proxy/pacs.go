package proxy

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"math/big"
	"os"
	"strings"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
)

// IsDomainActive checks if the protected domain has an active premium subscription.
// If the DB is unavailable or domain is not found, we fallback to true for stability (fail-open model).
func IsDomainActive(domain string) bool {
	if database.DB == nil {
		return true // Fallback to true in Degraded local mode
	}

	// Strip port if present in domain
	if idx := strings.Index(domain, ":"); idx != -1 {
		domain = domain[:idx]
	}

	var sub models.DomainSubscription
	err := database.DB.Where("domain = ?", domain).First(&sub).Error
	if err != nil {
		// If domain has never been registered, register it automatically as ACTIVE premium
		// so that the zero-config integration works seamlessly out of the box!
		newSub := models.DomainSubscription{
			Domain:   domain,
			OriginIP: "127.0.0.1",
			IsActive: true,
			PlanType: "premium",
		}
		database.DB.Create(&newSub)
		return true
	}

	return sub.IsActive
}

// Helper to generate a cryptographically secure random key
func generateRandomKey(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	k := make([]byte, length)
	for i := 0; i < length; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			k[i] = charset[0]
		} else {
			k[i] = charset[num.Int64()]
		}
	}
	return string(k)
}

// Helper to generate dynamic random variable names for JS obfuscation
func randomVarName(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	b := make([]byte, length)
	// First character must be a letter
	firstNum, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
	b[0] = charset[firstNum.Int64()]
	for i := 1; i < length; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[num.Int64()]
	}
	return "_" + string(b)
}

// ObfuscateHTML converts the backend HTML page into an encrypted Polymorphic Alien-Language (PACS) payload
// which can only be decoded by our customized browser-side virtual decoding runtime.
func ObfuscateHTML(originalHTML string, domain string) string {
	// 1. Check if the domain's subscription is active
	if !IsDomainActive(domain) {
		// If subscription has expired, return a stunning glowing cyber paywall page!
		return getUnlicensedPaywallHTML(domain)
	}

	// 2. Generate random XOR key and encrypt the HTML body
	key := generateRandomKey(8)
	encryptedBytes := make([]byte, len(originalHTML))
	for i := 0; i < len(originalHTML); i++ {
		encryptedBytes[i] = originalHTML[i] ^ key[i%len(key)]
	}
	encodedHTML := base64.StdEncoding.EncodeToString(encryptedBytes)

	// 3. Choose one of 3 decryption templates randomly (Polymorphism)
	templateChoiceBig, _ := rand.Int(rand.Reader, big.NewInt(3))
	templateChoice := int(templateChoiceBig.Int64())

	var jsDecrypterScript string

	switch templateChoice {
	case 0:
		// Template 0: Key represented as a Character Code Array shifted by a random delta
		deltaBig, _ := rand.Int(rand.Reader, big.NewInt(15))
		delta := int(deltaBig.Int64()) + 5 // Delta between 5 and 19
		keyCodes := make([]string, len(key))
		for i := 0; i < len(key); i++ {
			keyCodes[i] = fmt.Sprintf("%d", int(key[i])+delta)
		}
		keyArrayStr := "[" + strings.Join(keyCodes, ",") + "]"

		vSig := randomVarName(6)
		vArr := randomVarName(6)
		vKey := randomVarName(6)
		vBin := randomVarName(6)
		vByt := randomVarName(6)
		vIdx := randomVarName(6)
		vDec := randomVarName(6)

		jsDecrypterScript = fmt.Sprintf(`
    <script>
        (function() {
            const %s = "%s";
            const %s = %s;
            try {
                const %s = %s.map(c => String.fromCharCode(c - %d)).join('');
                const %s = atob(%s);
                const %s = new Uint8Array(%s.length);
                for (let %s = 0; %s < %s.length; %s++) {
                    %s[%s] = %s.charCodeAt(%s) ^ %s.charCodeAt(%s %% %s.length);
                }
                const %s = new TextDecoder().decode(%s);
                setTimeout(() => {
                    document.open();
                    document.write(%s);
                    document.close();
                }, 15);
            } catch(e) {
                document.getElementById('pacs-loader').innerHTML = '<div style="color:#ef4444;">[FAIL] Cryptographic integrity verification failed.</div>';
            }
        })();
    </script>`, vSig, encodedHTML, vArr, keyArrayStr, vKey, vArr, delta, vBin, vSig, vByt, vBin, vIdx, vIdx, vBin, vIdx, vByt, vIdx, vBin, vIdx, vKey, vIdx, vKey, vDec, vByt, vDec)

	case 1:
		// Template 1: Key split into two halves and concatenated at runtime
		mid := len(key) / 2
		part1 := key[:mid]
		part2 := key[mid:]

		vSig := randomVarName(6)
		vP1 := randomVarName(6)
		vP2 := randomVarName(6)
		vKey := randomVarName(6)
		vBin := randomVarName(6)
		vByt := randomVarName(6)
		vIdx := randomVarName(6)
		vDec := randomVarName(6)

		jsDecrypterScript = fmt.Sprintf(`
    <script>
        (function() {
            const %s = "%s";
            const %s = "%s";
            const %s = "%s";
            try {
                const %s = %s + %s;
                const %s = atob(%s);
                const %s = new Uint8Array(%s.length);
                for (let %s = 0; %s < %s.length; %s++) {
                    %s[%s] = %s.charCodeAt(%s) ^ %s.charCodeAt(%s %% %s.length);
                }
                const %s = new TextDecoder().decode(%s);
                setTimeout(() => {
                    document.open();
                    document.write(%s);
                    document.close();
                }, 15);
            } catch(e) {
                document.getElementById('pacs-loader').innerHTML = '<div style="color:#ef4444;">[FAIL] Cryptographic integrity verification failed.</div>';
            }
        })();
    </script>`, vSig, encodedHTML, vP1, part1, vP2, part2, vKey, vP1, vP2, vBin, vSig, vByt, vBin, vIdx, vIdx, vBin, vIdx, vByt, vIdx, vBin, vIdx, vKey, vIdx, vKey, vDec, vByt, vDec)

	default:
		// Template 2: Key characters scattered in a random noise string at regular step intervals
		step := 3
		noiseLength := len(key) * step
		noiseBytes := make([]byte, noiseLength)
		const noiseCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
		for i := 0; i < noiseLength; i++ {
			num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(noiseCharset))))
			noiseBytes[i] = noiseCharset[num.Int64()]
		}
		// Inject key chars at index = i * step
		for i := 0; i < len(key); i++ {
			noiseBytes[i*step] = key[i]
		}
		noiseStr := string(noiseBytes)

		vSig := randomVarName(6)
		vNoise := randomVarName(6)
		vKey := randomVarName(6)
		vLen := randomVarName(6)
		vStep := randomVarName(6)
		vBin := randomVarName(6)
		vByt := randomVarName(6)
		vIdx := randomVarName(6)
		vDec := randomVarName(6)
		vLoop := randomVarName(6)

		jsDecrypterScript = fmt.Sprintf(`
    <script>
        (function() {
            const %s = "%s";
            const %s = "%s";
            const %s = %d;
            const %s = %d;
            try {
                let %s = "";
                for (let %s = 0; %s < %s; %s++) {
                    %s += %s[%s * %s];
                }
                const %s = atob(%s);
                const %s = new Uint8Array(%s.length);
                for (let %s = 0; %s < %s.length; %s++) {
                    %s[%s] = %s.charCodeAt(%s) ^ %s.charCodeAt(%s %% %s.length);
                }
                const %s = new TextDecoder().decode(%s);
                setTimeout(() => {
                    document.open();
                    document.write(%s);
                    document.close();
                }, 15);
            } catch(e) {
                document.getElementById('pacs-loader').innerHTML = '<div style="color:#ef4444;">[FAIL] Cryptographic integrity verification failed.</div>';
            }
        })();
    </script>`, vSig, encodedHTML, vNoise, noiseStr, vLen, len(key), vStep, step, vKey, vLoop, vLoop, vLen, vLoop, vKey, vNoise, vLoop, vStep, vBin, vSig, vByt, vBin, vIdx, vIdx, vBin, vIdx, vByt, vIdx, vBin, vIdx, vKey, vIdx, vKey, vDec, vByt, vDec)
	}

	obfuscatedPage := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus Cyber Immune Shield</title>
    <style>
        body {
            background-color: #030508;
            color: #06b6d4;
            font-family: 'Courier New', Courier, monospace;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }
        .shield-container {
            text-align: center;
            border: 1px solid rgba(6, 182, 212, 0.2);
            padding: 40px;
            border-radius: 12px;
            background: radial-gradient(circle, rgba(5,8,12,1) 0%%, rgba(3,5,8,1) 100%%);
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.1);
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 2px solid rgba(6, 182, 212, 0.1);
            border-top: 2px solid #06b6d4;
            border-radius: 50%%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 20px auto;
        }
        .glitch-text {
            font-size: 10px;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: pulse 1.5s infinite;
        }
        @keyframes spin {
            0%% { transform: rotate(0deg); }
            100%% { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0%% { opacity: 0.6; }
            50%% { opacity: 1; }
            100%% { opacity: 0.6; }
        }
    </style>
</head>
<body>
    <div class="shield-container" id="pacs-loader">
        <div class="spinner"></div>
        <div class="glitch-text">NEXUS COGNITIVE SHIELD ACTIVE: DECODING PAC-SIGNAL...</div>
    </div>
    
    <!-- PACS Dynamic Decoding Script Block -->
    %s
</body>
</html>`, jsDecrypterScript)

	return obfuscatedPage
}

// getUnlicensedPaywallHTML returns a stunning, premium neon warning screen
// notifying the client that their subscription has expired.
func getUnlicensedPaywallHTML(domain string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus Cyber - Shield Deactivated</title>
    <style>
        body {
            background-color: #05080c;
            color: #ef4444;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            max-width: 500px;
            padding: 40px;
            background: #030508;
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 16px;
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.1);
        }
        h1 {
            font-size: 24px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        p {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .domain-tag {
            background: rgba(239, 68, 68, 0.1);
            padding: 6px 12px;
            border-radius: 20px;
            font-family: monospace;
            font-size: 13px;
            display: inline-block;
            margin-bottom: 20px;
        }
        .btn {
            background: linear-gradient(135deg, #ef4444 0%%, #b91c1c 100%%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <div style="font-size: 50px; margin-bottom: 20px;">⚠️</div>
        <h1>Nexus Shield Deactivated</h1>
        <div class="domain-tag">%s</div>
        <p>
            Masa berlangganan perlindungan otonom untuk domain ini telah habis atau belum diaktifkan. 
            Semua lalu lintas menuju website Anda ditangguhkan demi alasan keamanan informasi.
        </p>
        <button class="btn" onclick="window.location.reload()">Re-verify License</button>
    </div>
</body>
</html>`, domain)
}

// SeedInitialDomainSubscriptions seeds lab workspaces for local demo (bukan domain kementerian).
func SeedInitialDomainSubscriptions() {
	if database.DB == nil {
		return
	}

	backendHost := os.Getenv("TARGET_BACKEND_HOST")
	if backendHost == "" {
		backendHost = "host.docker.internal"
	}
	target := os.Getenv("TARGET_BACKEND")
	if target == "" {
		target = fmt.Sprintf("http://%s:3001", backendHost)
	}

	// Hapus seed demo SaaS lama agar tidak muncul di Domain Switcher SOC.
	legacy := []string{
		"ojk.go.id", "bi.go.id", "kemenkeu.go.id",
		"portal.nexus", "audit.nexus", "cloud.nexus",
		"ojk.localhost", "kemenkeu.localhost", "bi.localhost",
	}
	for _, dom := range legacy {
		database.DB.Unscoped().Where("domain = ?", dom).Delete(&models.DomainSubscription{})
	}

	protected := strings.TrimSpace(os.Getenv("PROTECTED_HOST"))
	if protected == "" {
		protected = "portfolio.nexus-lab.test"
	}
	domains := []string{"localhost", protected}
	for _, dom := range domains {
		var count int64
		database.DB.Model(&models.DomainSubscription{}).Where("domain = ?", dom).Count(&count)
		if count == 0 {
			sub := models.DomainSubscription{
				Domain:   dom,
				OriginIP: target,
				IsActive: true,
				PlanType: "premium",
			}
			database.DB.Create(&sub)
		}
	}
	fmt.Printf("[SAAS-INIT] Seeded lab workspaces %v → %s (legacy demo domains purged).\n", domains, target)
}
