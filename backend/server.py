"""
Tiny FastAPI proxy for the Emergent preview environment.

Reason: supervisor is locked to launch uvicorn server:app on port 8001.
This module spawns the real Node.js + Express backend on internal port 9000
and forwards every request to it. For Render deployment, package.json's
`npm start` is used directly and this file is irrelevant.
"""

from __future__ import annotations

import asyncio
import os
import signal
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, Request, Response
from starlette.background import BackgroundTask

BACKEND_DIR = Path(__file__).resolve().parent
NODE_PORT = int(os.environ.get("NODE_PORT", "9000"))
NODE_TARGET = f"http://127.0.0.1:{NODE_PORT}"

_node_proc: subprocess.Popen | None = None


async def _wait_for_node(timeout: float = 30.0) -> None:
    deadline = asyncio.get_event_loop().time() + timeout
    async with httpx.AsyncClient(timeout=1.0) as client:
        while asyncio.get_event_loop().time() < deadline:
            try:
                r = await client.get(f"{NODE_TARGET}/api/health")
                if r.status_code == 200:
                    print("[proxy] node backend is ready")
                    return
            except Exception:
                pass
            await asyncio.sleep(0.5)
    print("[proxy] WARNING: node backend did not become ready in time")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _node_proc
    env = os.environ.copy()
    env["PORT"] = str(NODE_PORT)
    print(f"[proxy] spawning node backend on port {NODE_PORT}")
    _node_proc = subprocess.Popen(
        ["node", "src/index.js"],
        cwd=str(BACKEND_DIR),
        env=env,
        stdout=None,
        stderr=None,
        preexec_fn=os.setsid,
    )
    await _wait_for_node()
    try:
        yield
    finally:
        if _node_proc and _node_proc.poll() is None:
            try:
                os.killpg(os.getpgid(_node_proc.pid), signal.SIGTERM)
                _node_proc.wait(timeout=5)
            except Exception:
                try:
                    os.killpg(os.getpgid(_node_proc.pid), signal.SIGKILL)
                except Exception:
                    pass


app = FastAPI(lifespan=lifespan)

_client = httpx.AsyncClient(base_url=NODE_TARGET, timeout=60.0)


_HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(path: str, request: Request) -> Response:
    url = httpx.URL(path="/" + path, query=request.url.query.encode("utf-8"))
    headers = {k: v for k, v in request.headers.items() if k.lower() not in _HOP_BY_HOP}
    body = await request.body()
    try:
        upstream = await _client.request(
            request.method,
            url,
            headers=headers,
            content=body,
        )
    except httpx.ConnectError:
        return Response(
            content=b'{"error":"backend_unavailable","message":"Node backend not reachable"}',
            status_code=503,
            media_type="application/json",
        )

    out_headers = [
        (k, v) for k, v in upstream.headers.items() if k.lower() not in _HOP_BY_HOP
    ]
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=dict(out_headers),
        media_type=upstream.headers.get("content-type"),
    )
