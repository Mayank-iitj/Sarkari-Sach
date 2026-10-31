from __future__ import annotations
import asyncio
from typing import AsyncGenerator
import json

# In-memory pub/sub broker & event replay store
_subscribers: dict[str, list[asyncio.Queue]] = {}
_event_history: dict[str, list[dict]] = {}


def register_listener(check_id: str) -> asyncio.Queue:
    if check_id not in _subscribers:
        _subscribers[check_id] = []
    q: asyncio.Queue = asyncio.Queue()
    _subscribers[check_id].append(q)
    return q


def unregister_listener(check_id: str, q: asyncio.Queue):
    if check_id in _subscribers and q in _subscribers[check_id]:
        _subscribers[check_id].remove(q)
        if not _subscribers[check_id]:
            del _subscribers[check_id]


async def emit_event(check_id: str, event_type: str, data: dict):
    """Broadcast an SSE event to all active listeners and record in history for replay."""
    payload = {"event": event_type, "data": data}
    if check_id not in _event_history:
        _event_history[check_id] = []
    _event_history[check_id].append(payload)

    if check_id in _subscribers:
        for q in list(_subscribers[check_id]):
            await q.put(payload)


async def sse_event_stream(check_id: str) -> AsyncGenerator[str, None]:
    # 1. Replay any historical events that occurred prior to subscriber connection
    history = list(_event_history.get(check_id, []))
    done_seen = False
    for msg in history:
        evt = msg.get("event", "message")
        data_str = json.dumps(msg.get("data", {}), ensure_ascii=False)
        yield f"event: {evt}\ndata: {data_str}\n\n"
        if evt in ("done", "error"):
            done_seen = True
            break

    if done_seen:
        return

    # 2. Subscribe for real-time live events
    q = register_listener(check_id)
    try:
        while True:
            try:
                # Wait for next event with 15s heartbeat timeout
                msg = await asyncio.wait_for(q.get(), timeout=15.0)
                evt = msg.get("event", "message")
                data_str = json.dumps(msg.get("data", {}), ensure_ascii=False)
                yield f"event: {evt}\ndata: {data_str}\n\n"
                if evt in ("done", "error"):
                    break
            except asyncio.TimeoutError:
                # SSE heartbeat comment
                yield ": heartbeat\n\n"
    finally:
        unregister_listener(check_id, q)
