"""
Python AST analyzer.

Walks real CPython ASTs to find dynamic sinks (SQL, command, eval, pickle, SSRF-ish URL calls)
and hardcoded secrets. This is static analysis, not exploit generation.
"""

from __future__ import annotations

import ast
import hashlib
import re
from pathlib import Path
from typing import Iterable, List, Optional, Set

from core.types import Evidence, FindingSeverity, FindingSource, VulnerabilityFinding


_SECRET_NAMES = {
    "password", "passwd", "pwd", "secret", "api_key", "apikey", "jwt_secret",
    "private_key", "access_token", "auth_token",
}
_PLACEHOLDER_SECRETS = {
    "changeme", "password", "secret", "your-key", "xxx", "dummy", "placeholder",
    "test", "example", "todo",
}


class PythonAstAnalyzer:
    def analyze_file(self, filepath: str, repo_root: str) -> List[VulnerabilityFinding]:
        try:
            source = Path(filepath).read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []
        try:
            tree = ast.parse(source)
        except SyntaxError:
            return []
        visitor = _SinkVisitor(filepath=filepath, repo_root=repo_root, source=source)
        visitor.visit(tree)
        return visitor.findings


class _SinkVisitor(ast.NodeVisitor):
    def __init__(self, filepath: str, repo_root: str, source: str) -> None:
        self.filepath = filepath
        self.repo_root = repo_root
        self.source_lines = source.splitlines()
        self.tainted: Set[str] = set()
        self.findings: List[VulnerabilityFinding] = []
        self.relpath = _rel(filepath, repo_root)

    def visit_Assign(self, node: ast.Assign) -> None:
        if self._is_taint_expr(node.value) or self._is_interpolated(node.value):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    self.tainted.add(target.id)
        self._check_hardcoded_secret(node)
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if node.value is not None and self._is_taint_expr(node.value):
            if isinstance(node.target, ast.Name):
                self.tainted.add(node.target.id)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        name = _call_name(node)
        if name in {"eval", "exec"} and node.args and not isinstance(node.args[0], ast.Constant):
            self._add(
                title="Dynamic code execution sink",
                severity=FindingSeverity.CRITICAL,
                cwe_id="CWE-95",
                owasp="A03:2021-Injection",
                node=node,
                snippet=self._line(node),
                remediation="Never pass untrusted data to eval/exec. Use literal parsers or allow-lists.",
            )
        elif name in {"system", "popen", "check_output", "check_call", "call", "run", "Popen"} and node.args:
            if self._is_unsafe_command_arg(node.args[0]) or self._uses_shell_true(node):
                self._add(
                    title="Command injection sink (os/subprocess)",
                    severity=FindingSeverity.HIGH,
                    cwe_id="CWE-78",
                    owasp="A03:2021-Injection",
                    node=node,
                    snippet=self._line(node),
                    remediation="Use subprocess with a list of arguments and shell=False. Never interpolate user input.",
                )
        elif name in {"execute", "executemany", "executescript", "raw"} and node.args:
            if self._is_dynamic(node.args[0]):
                self._add(
                    title="SQL query built with dynamic string",
                    severity=FindingSeverity.HIGH,
                    cwe_id="CWE-89",
                    owasp="A03:2021-Injection",
                    node=node,
                    snippet=self._line(node),
                    remediation="Use parameterized queries / bound parameters instead of string formatting.",
                )
        elif name in {"loads", "load"} and _attr_root(node) in {"pickle", "shelve", "marshal"}:
            self._add(
                title="Insecure deserialization sink",
                severity=FindingSeverity.HIGH,
                cwe_id="CWE-502",
                owasp="A08:2021-Software and Data Integrity Failures",
                node=node,
                snippet=self._line(node),
                remediation="Do not unpickle untrusted data. Use JSON or a signed serialization format.",
            )
        elif name == "load" and _attr_root(node) == "yaml":
            self._add(
                title="Unsafe YAML load",
                severity=FindingSeverity.HIGH,
                cwe_id="CWE-502",
                owasp="A08:2021-Software and Data Integrity Failures",
                node=node,
                snippet=self._line(node),
                remediation="Use yaml.safe_load() instead of yaml.load().",
            )
        elif name in {"get", "post", "put", "request"} and _attr_root(node) in {"requests", "httpx", "urllib"}:
            if node.args and self._is_dynamic(node.args[0]):
                self._add(
                    title="Server-side request with dynamic URL",
                    severity=FindingSeverity.MEDIUM,
                    cwe_id="CWE-918",
                    owasp="A10:2021-Server-Side Request Forgery",
                    node=node,
                    snippet=self._line(node),
                    remediation="Allow-list destination hosts. Block link-local and loopback ranges.",
                )
        elif name in {"render_template_string", "from_string"}:
            if node.args and not isinstance(node.args[0], ast.Constant):
                self._add(
                    title="Server-side template injection sink",
                    severity=FindingSeverity.HIGH,
                    cwe_id="CWE-94",
                    owasp="A03:2021-Injection",
                    node=node,
                    snippet=self._line(node),
                    remediation="Never render templates from user input. Use static templates with escaped context.",
                )
        elif name == "decode" and _attr_root(node).lower() in {"jwt", "pyjwt"} and _jwt_decode_is_insecure(node):
            self._add(
                title="JWT decoded without a verified algorithm/signature",
                severity=FindingSeverity.HIGH,
                cwe_id="CWE-347",
                owasp="A07:2021-Identification and Authentication Failures",
                node=node,
                snippet=self._line(node),
                remediation="Use jwt.decode(..., algorithms=[\"HS256\"|\"RS256\"], key=secret) and never disable signature verification.",
            )
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._scan_missing_route_auth(node)
        self._scan_idor(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._scan_missing_route_auth(node)
        self._scan_idor(node)
        self.generic_visit(node)

    def _check_hardcoded_secret(self, node: ast.Assign) -> None:
        if not isinstance(node.value, ast.Constant) or not isinstance(node.value.value, str):
            return
        secret = node.value.value.strip()
        if len(secret) < 12 or secret.lower() in _PLACEHOLDER_SECRETS:
            return
        for target in node.targets:
            name = target.id.lower() if isinstance(target, ast.Name) else ""
            if not name:
                continue
            if any(token in name for token in _SECRET_NAMES):
                self._add(
                    title="Hardcoded credential in source",
                    severity=FindingSeverity.CRITICAL,
                    cwe_id="CWE-798",
                    owasp="A07:2021-Identification and Authentication Failures",
                    node=node,
                    snippet=f"{name} = ***",
                    remediation="Load secrets from environment variables or a secret manager. Rotate the exposed value.",
                    source_hint=name,
                )

    def _is_taint_expr(self, node: Optional[ast.AST]) -> bool:
        if node is None:
            return False
        if isinstance(node, ast.Name) and node.id in self.tainted:
            return True
        if isinstance(node, ast.Attribute):
            chain = _attr_chain(node)
            joined = ".".join(chain)
            return any(
                marker in joined
                for marker in (
                    "request.args", "request.form", "request.json", "request.GET",
                    "request.POST", "request.data", "request.values", "request.files",
                    "request.params", "sys.argv",
                )
            )
        if isinstance(node, ast.Call):
            if _call_name(node) in {"input", "getenv"}:
                return True
            if isinstance(node.func, ast.Attribute) and self._is_taint_expr(node.func.value):
                return True
        if isinstance(node, ast.Subscript):
            return self._is_taint_expr(node.value)
        return False

    def _is_interpolated(self, node: ast.AST) -> bool:
        if isinstance(node, ast.JoinedStr):
            return True
        if isinstance(node, ast.BinOp):
            return True
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "format":
            return True
        return False

    def _is_dynamic(self, node: ast.AST) -> bool:
        if isinstance(node, ast.Constant):
            return False
        if self._is_interpolated(node):
            return True
        if isinstance(node, ast.Name):
            return node.id in self.tainted
        if isinstance(node, ast.Attribute):
            return self._is_taint_expr(node)
        if isinstance(node, ast.Call) and _call_name(node) in {"input", "getenv"}:
            return True
        return self._is_taint_expr(node)

    def _scan_missing_route_auth(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        if _has_auth_decorator(node):
            return
        mutating = False
        route_node: Optional[ast.AST] = None
        for decorator in node.decorator_list:
            if _decorator_name(decorator) != "route":
                continue
            methods = _route_methods(decorator)
            if methods & {"POST", "PUT", "PATCH", "DELETE"}:
                mutating = True
                route_node = decorator
                break
        if not mutating or route_node is None:
            return
        self._add(
            title="Mutating HTTP route without an authentication decorator",
            severity=FindingSeverity.HIGH,
            cwe_id="CWE-306",
            owasp="A07:2021-Identification and Authentication Failures",
            node=node,
            snippet=self._line(route_node),
            remediation="Protect POST/PUT/PATCH/DELETE routes with login_required, jwt_required, or equivalent authorization.",
        )

    def _scan_idor(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        if _has_auth_decorator(node):
            return
        local_taint: Set[str] = set(_route_param_names(node))
        for arg in node.args.args:
            if arg.arg in local_taint:
                local_taint.add(arg.arg)
        uses_auth = False
        sink: Optional[ast.Call] = None
        for child in _walk_current_function(node):
            if isinstance(child, ast.Assign):
                if self._is_taint_expr(child.value) or (
                    isinstance(child.value, ast.Name) and child.value.id in local_taint
                ):
                    for target in child.targets:
                        if isinstance(target, ast.Name):
                            local_taint.add(target.id)
            if _is_auth_context(child):
                uses_auth = True
            if isinstance(child, ast.Call) and _is_orm_lookup(child) and _call_uses_object_id(child, local_taint, self):
                sink = child
        if sink is not None and not uses_auth:
            self._add(
                title="Object lookup uses a request identifier without an ownership check",
                severity=FindingSeverity.HIGH,
                cwe_id="CWE-639",
                owasp="A01:2021-Broken Access Control",
                node=sink,
                snippet=self._line(sink),
                remediation="Authorize the resource: compare owner_id to the authenticated user before returning or mutating the object.",
            )

    def _is_unsafe_command_arg(self, node: ast.AST) -> bool:
        if isinstance(node, ast.Constant):
            return False
        if isinstance(node, (ast.List, ast.Tuple)):
            return any(not isinstance(elt, ast.Constant) for elt in node.elts)
        return self._is_dynamic(node) or not isinstance(node, ast.Constant)

    def _uses_shell_true(self, node: ast.Call) -> bool:
        for kw in node.keywords:
            if kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                return True
        return False

    def _line(self, node: ast.AST) -> str:
        lineno = getattr(node, "lineno", 1)
        if 1 <= lineno <= len(self.source_lines):
            return self.source_lines[lineno - 1].strip()[:240]
        return ""

    def _add(
        self,
        *,
        title: str,
        severity: FindingSeverity,
        cwe_id: str,
        owasp: str,
        node: ast.AST,
        snippet: str,
        remediation: str,
        source_hint: str = "",
    ) -> None:
        line = getattr(node, "lineno", 0)
        loc = f"{self.relpath}:L{line}"
        digest = hashlib.sha1(f"{cwe_id}:{loc}:{title}".encode("utf-8")).hexdigest()[:8].upper()
        self.findings.append(
            VulnerabilityFinding(
                id=f"NEXRED-{digest}",
                title=title,
                severity=severity,
                cwe_id=cwe_id,
                owasp_category=owasp,
                target_endpoint=loc,
                param_or_source=source_hint or snippet[:80],
                proof_of_concept=f"Static evidence at {loc}: {snippet}",
                remediation=remediation,
                source=FindingSource.PYTHON_AST,
                confidence=0.78 if severity in {FindingSeverity.CRITICAL, FindingSeverity.HIGH} else 0.6,
                evidence=[
                    Evidence(
                        kind="source_location",
                        summary=f"{title} at {loc}",
                        file_path=self.relpath,
                        line=line,
                        snippet=snippet,
                    )
                ],
            )
        )


def _call_name(node: ast.Call) -> str:
    if isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node.func, ast.Attribute):
        return node.func.attr
    return ""


def _attr_root(node: ast.Call) -> str:
    func = node.func
    while isinstance(func, ast.Attribute):
        if isinstance(func.value, ast.Name):
            return func.value.id
        func = func.value
    if isinstance(func, ast.Name):
        return func.id
    return ""


def _attr_chain(node: ast.Attribute) -> List[str]:
    parts: List[str] = []
    cur: ast.AST = node
    while isinstance(cur, ast.Attribute):
        parts.append(cur.attr)
        cur = cur.value
    if isinstance(cur, ast.Name):
        parts.append(cur.id)
    parts.reverse()
    return parts


def _rel(filepath: str, repo_root: str) -> str:
    try:
        return str(Path(filepath).resolve().relative_to(Path(repo_root).resolve())).replace("\\", "/")
    except ValueError:
        return filepath.replace("\\", "/")


_AUTH_DECORATORS = {
    "login_required",
    "jwt_required",
    "auth_required",
    "permission_required",
    "roles_required",
    "admin_required",
    "require_auth",
}
_OBJECT_ID_KEYWORDS = {"id", "pk", "user_id", "uid", "order_id", "account_id", "profile_id"}


def _decorator_name(node: ast.AST) -> str:
    target = node.func if isinstance(node, ast.Call) else node
    if isinstance(target, ast.Name):
        return target.id
    if isinstance(target, ast.Attribute):
        return target.attr
    return ""


def _has_auth_decorator(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    return any(_decorator_name(item) in _AUTH_DECORATORS for item in node.decorator_list)


def _route_methods(decorator: ast.AST) -> Set[str]:
    if not isinstance(decorator, ast.Call):
        return {"GET"}
    for keyword in decorator.keywords:
        if keyword.arg != "methods":
            continue
        values: Set[str] = set()
        if isinstance(keyword.value, (ast.List, ast.Tuple)):
            for element in keyword.value.elts:
                if isinstance(element, ast.Constant) and isinstance(element.value, str):
                    values.add(element.value.upper())
        return values or {"GET"}
    return {"GET"}


def _route_param_names(node: ast.FunctionDef | ast.AsyncFunctionDef) -> Set[str]:
    names: Set[str] = set()
    for decorator in node.decorator_list:
        if _decorator_name(decorator) != "route" or not isinstance(decorator, ast.Call):
            continue
        if decorator.args and isinstance(decorator.args[0], ast.Constant) and isinstance(decorator.args[0].value, str):
            path = decorator.args[0].value
            names.update(re.findall(r"<(\w+)>", path))
            names.update(re.findall(r"<[^:]+:(\w+)>", path))
    return names


def _walk_current_function(node: ast.AST) -> Iterable[ast.AST]:
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        yield child
        yield from _walk_current_function(child)


def _is_auth_context(node: ast.AST) -> bool:
    if isinstance(node, ast.Name) and node.id in {"current_user", "session"}:
        return True
    if isinstance(node, ast.Call) and _call_name(node) in {"get_jwt_identity", "get_current_user"}:
        return True
    if isinstance(node, ast.Attribute):
        chain = ".".join(_attr_chain(node))
        return chain in {"request.user", "g.user", "auth.user"}
    return False


def _is_orm_lookup(node: ast.Call) -> bool:
    if not isinstance(node.func, ast.Attribute):
        return False
    if node.func.attr not in {"get", "filter", "filter_by", "first", "get_object_or_404"}:
        return False
    chain = _attr_chain(node.func)
    joined = ".".join(chain)
    if any(part in {"args", "form", "json", "headers", "cookies"} for part in chain):
        return False
    return "objects" in chain or node.func.attr == "get_object_or_404"


def _call_uses_object_id(node: ast.Call, local_taint: Set[str], analyzer: _SinkVisitor) -> bool:
    for keyword in node.keywords:
        if keyword.arg not in _OBJECT_ID_KEYWORDS:
            continue
        if analyzer._is_taint_expr(keyword.value):
            return True
        if isinstance(keyword.value, ast.Name) and keyword.value.id in local_taint:
            return True
    if node.args:
        first = node.args[0]
        if isinstance(first, ast.Name) and first.id in local_taint:
            return True
        if analyzer._is_taint_expr(first):
            return True
    return False


def _jwt_decode_is_insecure(node: ast.Call) -> bool:
    has_algorithms = False
    for keyword in node.keywords:
        if keyword.arg == "verify" and isinstance(keyword.value, ast.Constant) and keyword.value.value is False:
            return True
        if keyword.arg == "algorithms":
            has_algorithms = True
            if _sequence_contains_none(keyword.value):
                return True
        if keyword.arg == "options" and _verify_signature_disabled(keyword.value):
            return True
    return not has_algorithms


def _sequence_contains_none(node: ast.AST) -> bool:
    if isinstance(node, (ast.List, ast.Tuple)):
        for element in node.elts:
            if isinstance(element, ast.Constant) and str(element.value).lower() == "none":
                return True
    return False


def _verify_signature_disabled(node: ast.AST) -> bool:
    if not isinstance(node, ast.Dict):
        return False
    for key, value in zip(node.keys, node.values):
        if isinstance(key, ast.Constant) and key.value == "verify_signature":
            return isinstance(value, ast.Constant) and value.value is False
    return False
