import sys
import os
import mimetypes
import json
import urllib.parse

# Setup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app as fastapi_app

# Locate dist directory
dist_dir = os.path.join(root_dir, "dist")
if not os.path.exists(dist_dir):
    dist_dir = os.path.join(root_dir, "frontend", "dist")

MIME_TYPES = {
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
}

async def send_response(send, status, content_type, body_bytes, cache_control="public, max-age=3600"):
    headers = [
        (b"content-type", content_type.encode("utf-8")),
        (b"content-length", str(len(body_bytes)).encode("utf-8")),
        (b"cache-control", cache_control.encode("utf-8")),
        (b"access-control-allow-origin", b"*"),
    ]
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": headers,
    })
    await send({
        "type": "http.response.body",
        "body": body_bytes,
    })

async def serve_file(send, file_path):
    _, ext = os.path.splitext(file_path.lower())
    content_type = MIME_TYPES.get(ext)
    if not content_type:
        content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "application/octet-stream"

    try:
        with open(file_path, "rb") as f:
            data = f.read()
        await send_response(send, 200, content_type, data)
    except Exception as e:
        await send_response(send, 500, "text/plain", f"Error reading file: {e}".encode())

async def app(scope, receive, send):
    if scope["type"] != "http":
        await fastapi_app(scope, receive, send)
        return

    path = scope.get("path", "")
    method = scope.get("method", "GET").upper()

    # Extract headers
    headers_dict = {}
    for k, v in scope.get("headers", []):
        try:
            headers_dict[k.decode("latin1").lower()] = v.decode("latin1")
        except Exception:
            pass

    # 1. Check if Vercel passed target path via __path query parameter
    qs = scope.get("query_string", b"").decode("latin1")
    if "__path" in qs:
        query_params = urllib.parse.parse_qs(qs)
        if "__path" in query_params:
            path = query_params["__path"][0]
            scope["path"] = path
            filtered = [(k, v) for k, vs in query_params.items() if k != "__path" for v in vs]
            scope["query_string"] = urllib.parse.urlencode(filtered).encode("latin1")

    # 2. Check if Vercel passed x-matched-path
    matched_path = headers_dict.get("x-matched-path", "")
    if path in ("/api/index.py", "api/index.py", "/api/index", "/index.py", "") and matched_path:
        path = matched_path
        scope["path"] = matched_path

    # Diagnostic debug endpoint
    if path == "/api/debug":
        debug_info = {
            "status": "online",
            "scope_path": scope.get("path"),
            "matched_path": matched_path,
            "resolved_path": path,
            "dist_dir": dist_dir,
            "dist_exists": os.path.exists(dist_dir),
            "dist_contents": os.listdir(dist_dir) if os.path.exists(dist_dir) else [],
            "headers": headers_dict,
        }
        await send_response(send, 200, "application/json", json.dumps(debug_info, indent=2).encode(), "no-cache")
        return

    # Check if request is for FastAPI API endpoints or Swagger docs
    is_api_route = (
        path.startswith("/api") or
        path == "/api" or
        path.startswith("/docs") or
        path.startswith("/openapi.json") or
        path.startswith("/redoc")
    )

    if is_api_route:
        # Pass directly to FastAPI
        await fastapi_app(scope, receive, send)
        return

    # For non-API routes (Frontend / SPA):
    if method in ("GET", "HEAD"):
        if os.path.exists(dist_dir):
            rel = path.lstrip("/")
            target_file = os.path.join(dist_dir, rel)

            # If user requested a specific existing static file (e.g. assets/..., favicon.svg)
            if rel and os.path.isfile(target_file):
                await serve_file(send, target_file)
                return

            # Otherwise, serve index.html for SPA client-side routing
            index_file = os.path.join(dist_dir, "index.html")
            if os.path.isfile(index_file):
                await serve_file(send, index_file)
                return

    # Fallback to FastAPI
    await fastapi_app(scope, receive, send)