#!/usr/bin/env python3
"""Servidor de solo lectura para la versión final del Atlas docente."""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import json
import os


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "contenidos"
DESIGN = ROOT / "design-targets.json"


def content():
    blocks = [
        json.loads(path.read_text())
        for path in sorted(DATA.glob("*.json"))
        if path.name != "presentacion.json"
    ]
    presentation = json.loads((DATA / "presentacion.json").read_text())
    return {"blocks": blocks, "presentation": presentation}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/content":
            return self.send_json(content())
        if path == "/api/design":
            return self.send_json(json.loads(DESIGN.read_text()))
        if path.startswith(("/.", "/server.py", "/iniciar", "/package.json")):
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        self.send_error(405, "La versión final es de solo lectura")

    def do_PUT(self):
        self.send_error(405, "La versión final es de solo lectura")

    def do_PATCH(self):
        self.send_error(405, "La versión final es de solo lectura")

    def do_DELETE(self):
        self.send_error(405, "La versión final es de solo lectura")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "5174")))
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    args = parser.parse_args()
    print(f"Atlas docente · versión final · http://{args.host}:{args.port}", flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
