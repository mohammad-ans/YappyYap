from __future__ import annotations
import asyncio, json, os
from typing import Callable, Awaitable, Optional
from redis.asyncio import Redis
from redis.exceptions import RedisError

class RedisWs:
    def __init__(self, grp: str, on_event: Callable[[dict], Awaitable], url : Optional[str] = None):
        self.grp = grp
        self.on_event = on_event
        self.url = url or os.getenv("REDIS_URL")
        self.redis: Optional[Redis] = None
        self.listener_task: Optional[asyncio.Task] = None
        self.stopping = None

    async def start(self):
        self.stopping = False
        self.redis = Redis.from_url(self.url, decode_response=True, socket_keepalive=True, health_check_interval=30)
        try:
            await self.redis.ping()
        except RedisError as e:
            print("Could not reach redis")
        self.listener_task = asyncio.create_task(self.listen_forever())

    async def listen_forever(self):
        delay = 0.5
        while not self.stopping:
            try:
                pubsub = self.redis.pubsub()
                await pubsub.subscribe(self.grp)
                delay = 0.5
                async for msg in pubsub.listen():
                    if self.stopping:
                        break
                    if msg.get("type") != "message":
                        continue
                    try:
                        data = json.loads(msg["data"])
                    except (TypeError, ValueError):
                        continue
                    try:
                        await self.on_event(data)
                    except:
                        pass
            except (RedisError, OSError, ConnectionError):
                if self.stopping:
                    break
                await asyncio.sleep(delay)
                delay = min(delay * 2, 15)
            finally:
                try:
                    await pubsub.unsubscribe(self.grp)
                    await pubsub.close()
                except:
                    pass

    async def stop(self):
        self.stopping = True
        if self.listener_task:
            self.listener_task.cancel()
            try:
                await self.listener_task()
            except:
                pass
        if self.redis:
            try:
                await self.redis.close()
            except:
                pass

    async def publish(self, payload: dict):
        if self.redis is None:
            return
        try:
            await self.redis.publish(self.grp, json.dumps(payload, default=str))
        except:
            pass