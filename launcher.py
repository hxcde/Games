#!/usr/bin/env python3
"""
SUNSET BLOCK — lokaler Launcher mit Auto-Update.

Holt die neueste Version von GitHub (git pull), startet einen lokalen Webserver
(ES-Module brauchen http://, nicht file://) und öffnet den Browser.

Start:   python3 launcher.py        (oder ./play.sh  /  play.bat)
Flags:   --no-update   Update überspringen
         --port N      festen Port verwenden
"""
import http.server, socketserver, os, sys, subprocess, threading, webbrowser, socket

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)


def update():
    if "--no-update" in sys.argv:
        return
    if not os.path.isdir(os.path.join(ROOT, ".git")):
        print("ⓘ  Kein Git-Repo gefunden — überspringe Update, starte mit lokalen Dateien.")
        print("    (Für Auto-Update das Repo klonen statt als ZIP herunterladen.)")
        return
    try:
        print("⤓  Hole neueste Version von GitHub …")
        r = subprocess.run(["git", "pull", "--ff-only"], cwd=ROOT)
        if r.returncode != 0:
            print("⚠  git pull nicht möglich (lokale Änderungen/Konflikt?). Starte mit aktuellem Stand.")
    except FileNotFoundError:
        print("⚠  git ist nicht installiert — überspringe Update.")


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript",
        ".glb": "model/gltf-binary", ".gltf": "model/gltf+json",
        ".bin": "application/octet-stream", ".wasm": "application/wasm",
        ".hdr": "application/octet-stream",
    }
    def end_headers(self):
        # always serve fresh HTML/JS so updates show immediately
        if self.path == "/" or self.path.endswith((".html", ".js", ".mjs")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()
    def log_message(self, *a):
        pass


def pick_port():
    for a in sys.argv:
        if a.startswith("--port"):
            try: return int(a.split("=")[1]) if "=" in a else int(sys.argv[sys.argv.index(a) + 1])
            except (IndexError, ValueError): pass
    for p in range(8000, 8050):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", p)); return p
            except OSError:
                continue
    return 8000


def main():
    update()
    port = pick_port()
    url = f"http://localhost:{port}/index.html"
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", port), Handler)
    print(f"\n  ▶  SUNSET BLOCK läuft auf  {url}")
    print("     (Strg+C zum Beenden)\n")
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  ⏹  Beendet.")
        httpd.shutdown()


if __name__ == "__main__":
    main()
