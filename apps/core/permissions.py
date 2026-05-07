"""
Aurix - Custom DRF permission classes.
"""
from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Allow access only if the object's `user` attribute equals request.user.
    Use on object-level (DRF will call has_object_permission for retrieve/update).
    """

    def has_object_permission(self, request, view, obj) -> bool:
        return getattr(obj, "user_id", None) == request.user.id


class IsSelfOrAdmin(BasePermission):
    """
    For URLs that take a user_id path param. Allow if it's the caller's own
    id, or if the caller is staff.
    """

    def has_permission(self, request, view) -> bool:
        target = view.kwargs.get("user_id")
        if target is None:
            return True
        try:
            target_id = int(target)
        except (TypeError, ValueError):
            return False
        return request.user.is_staff or request.user.id == target_id
