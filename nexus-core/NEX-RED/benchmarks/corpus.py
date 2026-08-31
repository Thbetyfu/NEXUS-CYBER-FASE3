"""Labeled SAST corpus for NEX-RED accuracy measurement.

Each case is a small source file plus an expected CWE (or none for safe files).
These samples exist only to score the static analyzer. They are not exploit PoCs.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List


@dataclass(frozen=True)
class CorpusCase:
    case_id: str
    filename: str
    expected_cwe: str | None
    source: str
    language: str


def cases() -> List[CorpusCase]:
    return [
        CorpusCase(
            "VULN-PY-SQLI",
            "vuln_sqli.py",
            "CWE-89",
            "def lookup(user):\n"
            "    q = \"SELECT * FROM accounts WHERE name = '%s'\" % user\n"
            "    cursor.execute(q)\n",
            "python",
        ),
        CorpusCase(
            "SAFE-PY-SQLI",
            "safe_sqli.py",
            None,
            "def lookup(user):\n"
            "    cursor.execute(\"SELECT * FROM accounts WHERE name = %s\", (user,))\n",
            "python",
        ),
        CorpusCase(
            "VULN-PY-EVAL",
            "vuln_eval.py",
            "CWE-95",
            "def run(user_input):\n"
            "    return eval(user_input)\n",
            "python",
        ),
        CorpusCase(
            "SAFE-PY-EVAL",
            "safe_eval.py",
            None,
            "def run():\n"
            "    return eval(\"1 + 1\")\n",
            "python",
        ),
        CorpusCase(
            "VULN-PY-SECRET",
            "vuln_secret.py",
            "CWE-798",
            "api_key = \"NexusLiveSecretKey99\"\n",
            "python",
        ),
        CorpusCase(
            "SAFE-PY-SECRET",
            "safe_secret.py",
            None,
            "import os\n"
            "api_key = os.getenv(\"API_KEY\")\n",
            "python",
        ),
        CorpusCase(
            "VULN-PY-PICKLE",
            "vuln_pickle.py",
            "CWE-502",
            "import pickle\n"
            "def restore(blob):\n"
            "    return pickle.loads(blob)\n",
            "python",
        ),
        CorpusCase(
            "VULN-PY-YAML",
            "vuln_yaml.py",
            "CWE-502",
            "import yaml\n"
            "def parse(stream):\n"
            "    return yaml.load(stream)\n",
            "python",
        ),
        CorpusCase(
            "VULN-PY-SSTI",
            "vuln_ssti.py",
            "CWE-94",
            "from flask import render_template_string\n"
            "def page(body):\n"
            "    return render_template_string(body)\n",
            "python",
        ),
        CorpusCase(
            "VULN-PY-SSRF",
            "vuln_ssrf.py",
            "CWE-918",
            "import requests\n"
            "def fetch():\n"
            "    url = request.args[\"url\"]\n"
            "    return requests.get(url)\n",
            "python",
        ),
        CorpusCase(
            "SAFE-PY-HTTP",
            "safe_http.py",
            None,
            "import requests\n"
            "def fetch():\n"
            "    return requests.get(\"https://example.invalid/health\")\n",
            "python",
        ),
        CorpusCase(
            "VULN-GO-SQLI",
            "vuln_sqli.go",
            "CWE-89",
            "package main\n"
            "func lookup(id string) {\n"
            "    db.Query(fmt.Sprintf(\"SELECT * FROM t WHERE id = %s\", id))\n"
            "}\n",
            "go",
        ),
        CorpusCase(
            "SAFE-GO-SQLI",
            "safe_sqli.go",
            None,
            "package main\n"
            "func lookup(id string) {\n"
            "    db.Query(\"SELECT * FROM t WHERE id = $1\", id)\n"
            "}\n",
            "go",
        ),
        CorpusCase(
            "VULN-JS-XSS",
            "vuln_xss.js",
            "CWE-79",
            "function paint(el, html) {\n"
            "  el.innerHTML = html;\n"
            "}\n",
            "javascript",
        ),
        CorpusCase(
            "SAFE-JS-XSS",
            "safe_xss.js",
            None,
            "function paint(el, text) {\n"
            "  el.textContent = text;\n"
            "}\n",
            "javascript",
        ),
        CorpusCase(
            "VULN-PHP-CMD",
            "vuln_cmd.php",
            "CWE-78",
            "<?php\n"
            "system($cmd);\n",
            "php",
        ),
        CorpusCase(
            "VULN-PY-JWT",
            "vuln_jwt.py",
            "CWE-347",
            "import jwt\n"
            "def identity(token):\n"
            "    return jwt.decode(token, options={\"verify_signature\": False})\n",
            "python",
        ),
        CorpusCase(
            "SAFE-PY-JWT",
            "safe_jwt.py",
            None,
            "import jwt, os\n"
            "def identity(token):\n"
            "    return jwt.decode(token, key=os.getenv(\"JWT_SECRET\"), algorithms=[\"HS256\"])\n",
            "python",
        ),
        CorpusCase(
            "VULN-PY-IDOR",
            "vuln_idor.py",
            "CWE-639",
            "def show_order():\n"
            "    order_id = request.args.get(\"id\")\n"
            "    return Order.objects.get(id=order_id)\n",
            "python",
        ),
        CorpusCase(
            "SAFE-PY-IDOR",
            "safe_idor.py",
            None,
            "def show_order():\n"
            "    order_id = request.args.get(\"id\")\n"
            "    return Order.objects.get(id=order_id, owner_id=current_user.id)\n",
            "python",
        ),
        CorpusCase(
            "VULN-PY-AUTHZ",
            "vuln_authz.py",
            "CWE-306",
            "@app.route(\"/users/<uid>\", methods=[\"DELETE\"])\n"
            "def delete_user(uid):\n"
            "    User.objects.filter(id=uid).delete()\n",
            "python",
        ),
        CorpusCase(
            "SAFE-PY-AUTHZ",
            "safe_authz.py",
            None,
            "@app.route(\"/users/<uid>\", methods=[\"DELETE\"])\n"
            "@login_required\n"
            "def delete_user(uid):\n"
            "    User.objects.filter(id=uid).delete()\n",
            "python",
        ),
        CorpusCase(
            "VULN-JS-IDOR",
            "vuln_idor.js",
            "CWE-639",
            "function show(req, res) {\n"
            "  return User.findById(req.params.id);\n"
            "}\n",
            "javascript",
        ),
        CorpusCase(
            "VULN-GO-JWT",
            "vuln_jwt.go",
            "CWE-347",
            "package main\n"
            "func parse(token string) {\n"
            "    jwt.ParseUnverified(token, jwt.MapClaims{})\n"
            "}\n",
            "go",
        ),
    ]


def materialize(root: Path) -> List[CorpusCase]:
    root.mkdir(parents=True, exist_ok=True)
    catalog = cases()
    for case in catalog:
        (root / case.filename).write_text(case.source, encoding="utf-8")
    return catalog
