"""
Aurix - Cross-cutting middleware.
"""
from __future__ import annotations

import uuid


class RequestIDMiddleware:
    """
    Attach a unique `request_id` to every request and echo it back in the
    response header. Useful for log correlation across services.

    Honours an inbound `X-Request-ID` header so an upstream gateway can
    propagate its own trace id.
    """

    HEADER = "HTTP_X_REQUEST_ID"
    RESPONSE_HEADER = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = request.META.get(self.HEADER) or uuid.uuid4().hex
        response = self.get_response(request)
        response[self.RESPONSE_HEADER] = request.request_id
        return response
