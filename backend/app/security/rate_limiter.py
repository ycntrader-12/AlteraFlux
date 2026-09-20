import time
import logging
from typing import Tuple, Dict
from fastapi import Request

logger = logging.getLogger("alteraflux.rate_limiter")

# Cache mémoire des délais de conversion par identifiant client (IP ou Client-ID)
_conversion_cooldowns: Dict[str, float] = {}

def get_client_identifier(request: Request) -> str:
    """
    Extrait un identifiant unique et fiable pour le client public :
    1. Header x-client-id personnalisé envoyé par le frontend (UUID par navigateur)
    2. Header X-Forwarded-For (si derrière reverse proxy, CDN ou passerelle)
    3. Adresse IP directe request.client.host
    """
    client_id = request.headers.get("x-client-id")
    if client_id and len(client_id.strip()) > 8:
        return f"cid:{client_id.strip()}"

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        if client_ip:
            return f"ip:{client_ip}"

    if request.client and request.client.host:
        return f"ip:{request.client.host}"

    return "anonymous_client"

def check_conversion_rate_limit(request: Request, cooldown_seconds: int = 300) -> Tuple[bool, int]:
    """
    Vérifie si le client doit patienter 5 minutes (300s) avant de relancer une conversion.
    Retourne (is_allowed, remaining_seconds).
    """
    ident = get_client_identifier(request)
    now = time.time()

    last_time = _conversion_cooldowns.get(ident)
    if last_time is not None:
        elapsed = now - last_time
        if elapsed < cooldown_seconds:
            remaining = int(cooldown_seconds - elapsed)
            return False, max(1, remaining)

    return True, 0

def record_conversion_usage(request: Request):
    """
    Enregistre le démarrage d'une conversion pour le client, démarrant le compte à rebours de 5 minutes.
    """
    ident = get_client_identifier(request)
    _conversion_cooldowns[ident] = time.time()
    logger.info(f"Délai de 5 minutes activé pour le client: {ident}")

def reset_client_cooldown(request: Request):
    """Permet de réinitialiser le délai en cas d'annulation ou d'erreur immédiate"""
    ident = get_client_identifier(request)
    _conversion_cooldowns.pop(ident, None)
