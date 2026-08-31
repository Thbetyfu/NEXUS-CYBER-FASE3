#!/usr/bin/env python3
"""CLI for Nexus Channel Starter (Milestone 18)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from channel_starter.config import SERVE_PORT, SITES_DIR
from channel_starter.deploy import apply_routing, deploy_manifest, reload_caddy
from channel_starter.generator import generate_from_dict, generate_site, list_sites
from channel_starter.types import SiteCategory, SiteForm, PricingTier
from channel_starter.upsell import disable_upsell, enable_upsell, upsell_status
from channel_starter.vercel_publish import publish_all, publish_slug


def cmd_generate(args: argparse.Namespace) -> int:
    if args.json_file:
        data = json.loads(Path(args.json_file).read_text(encoding="utf-8"))
        manifest = generate_from_dict(data, sites_root=args.sites_dir)
    else:
        form = SiteForm(
            business_name=args.name,
            category=SiteCategory(args.category),
            whatsapp=args.whatsapp,
            address=args.address or "",
            email=args.email or "",
            tagline=args.tagline or "",
            description=args.description or "",
            theme=args.theme,
            primary_color=args.color or "",
            custom_domain=args.domain or "",
            tier=PricingTier(args.tier),
            slug=args.slug or "",
        )
        manifest = generate_site(form, sites_root=args.sites_dir)

    deploy = deploy_manifest(manifest, sites_root=args.sites_dir)
    print(json.dumps({"manifest": manifest.model_dump(mode="json"), "deploy": deploy}, indent=2))
    return 0


def cmd_publish(args: argparse.Namespace) -> int:
    if args.all:
        result = publish_all(sites_root=args.sites_dir)
    elif args.slug:
        result = publish_slug(args.slug, sites_root=args.sites_dir)
    else:
        print(json.dumps({"ok": False, "error": "publish requires --slug or --all"}), file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    if result.get("ok") or result.get("skipped"):
        return 0
    return 1


def cmd_list(args: argparse.Namespace) -> int:
    sites = list_sites(args.sites_dir)
    print(json.dumps([s.model_dump(mode="json") for s in sites], indent=2))
    return 0


def cmd_deploy_apply(args: argparse.Namespace) -> int:
    result = apply_routing(sites_root=args.sites_dir)
    print(json.dumps(result, indent=2))
    if args.reload:
        reload_result = reload_caddy(container=args.caddy_container)
        print(json.dumps({"reload": reload_result}, indent=2))
        return 0 if reload_result.get("ok") else 1
    return 0


def cmd_deploy_reload(args: argparse.Namespace) -> int:
    result = reload_caddy(container=args.caddy_container)
    print(json.dumps(result, indent=2))
    return 0 if result.get("ok") else 1


def cmd_upsell_enable(args: argparse.Namespace) -> int:
    try:
        result = enable_upsell(
            args.slug,
            tier=PricingTier(args.tier),
            sites_root=args.sites_dir,
            create_job=not args.no_job,
            create_loop=args.loop,
            loop_interval_hours=args.loop_hours,
            bridge_url=args.bridge_url,
            reload_caddy_after=args.reload,
        )
    except (KeyError, ValueError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


def cmd_upsell_disable(args: argparse.Namespace) -> int:
    try:
        result = disable_upsell(args.slug, sites_root=args.sites_dir, reload_caddy_after=args.reload)
    except KeyError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


def cmd_upsell_status(args: argparse.Namespace) -> int:
    print(json.dumps(upsell_status(sites_root=args.sites_dir), indent=2))
    return 0


def cmd_serve(args: argparse.Namespace) -> int:
    from channel_starter.server import main

    if args.port:
        import channel_starter.config as cfg

        cfg.SERVE_PORT = args.port
    main()
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Nexus Channel Starter CLI")
    parser.add_argument(
        "--sites-dir",
        type=Path,
        default=SITES_DIR,
        help=f"Output directory (default: {SITES_DIR})",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    gen = sub.add_parser("generate", help="Generate static site from form data")
    gen.add_argument("--name", help="Business name")
    gen.add_argument("--category", choices=[c.value for c in SiteCategory], default="profil")
    gen.add_argument("--whatsapp", help="WhatsApp number")
    gen.add_argument("--address", default="")
    gen.add_argument("--email", default="")
    gen.add_argument("--tagline", default="")
    gen.add_argument("--description", default="")
    gen.add_argument("--theme", choices=["hijau", "biru", "navy", "hutan"], default="hijau")
    gen.add_argument("--color", default="", help="Ignored unless it matches a theme hex; prefer --theme")
    gen.add_argument("--domain", default="", help="Custom domain host, e.g. tokoanda.com")
    gen.add_argument("--tier", choices=[t.value for t in PricingTier], default="starter")
    gen.add_argument("--slug", default="")
    gen.add_argument("--json-file", help="Path to JSON form payload")
    gen.set_defaults(func=cmd_generate)

    lst = sub.add_parser("list", help="List generated sites")
    lst.set_defaults(func=cmd_list)

    pub = sub.add_parser("publish", help="Deploy one site folder to Vercel (not the Nexus monorepo)")
    pub.add_argument("--slug", default="", help="Site slug")
    pub.add_argument("--all", action="store_true", help="Publish every generated client site")
    pub.set_defaults(func=cmd_publish)

    dep = sub.add_parser("deploy", help="Apply multi-tenant Caddy routing")
    dep_sub = dep.add_subparsers(dest="deploy_command", required=True)
    dep_apply = dep_sub.add_parser("apply", help="Regenerate aggregate Caddy + hosts registry")
    dep_apply.add_argument("--reload", action="store_true", help="Reload deploy-local Caddy after apply")
    dep_apply.add_argument("--caddy-container", default=None)
    dep_apply.set_defaults(func=cmd_deploy_apply)
    dep_reload = dep_sub.add_parser("reload", help="Reload deploy-local Caddy container")
    dep_reload.add_argument("--caddy-container", default=None)
    dep_reload.set_defaults(func=cmd_deploy_reload)

    ups = sub.add_parser("upsell", help="GaaS upsell — satu PROTECTED_HOST aktif")
    ups_sub = ups.add_subparsers(dest="upsell_command", required=True)
    ups_enable = ups_sub.add_parser("enable", help="Enable WAF + optional Job Cowork for a site")
    ups_enable.add_argument("--slug", required=True)
    ups_enable.add_argument("--tier", choices=["tepi", "cowork"], default="cowork")
    ups_enable.add_argument("--no-job", action="store_true", help="Skip NEX-RED Job creation")
    ups_enable.add_argument("--loop", action="store_true", help="Add Loop GaaS schedule (cowork tier)")
    ups_enable.add_argument("--loop-hours", type=int, default=168)
    ups_enable.add_argument("--bridge-url", default=None)
    ups_enable.add_argument("--reload", action="store_true")
    ups_enable.set_defaults(func=cmd_upsell_enable)
    ups_disable = ups_sub.add_parser("disable", help="Revert site to static Channel Starter")
    ups_disable.add_argument("--slug", required=True)
    ups_disable.add_argument("--reload", action="store_true")
    ups_disable.set_defaults(func=cmd_upsell_disable)
    ups_status = ups_sub.add_parser("status", help="Show active GaaS upsell")
    ups_status.set_defaults(func=cmd_upsell_status)

    srv = sub.add_parser("serve", help="Run form wizard HTTP server")
    srv.add_argument("--port", type=int, default=SERVE_PORT)
    srv.set_defaults(func=cmd_serve)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "generate" and not args.json_file and (not args.name or not args.whatsapp):
        parser.error("generate requires --name and --whatsapp, or --json-file")
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
