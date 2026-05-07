from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = "apps.users"
    verbose_name = "Users & authentication"

    def ready(self) -> None:
        # Import signals so the post_save handler that auto-creates wallets
        # is registered when Django boots.
        from . import signals  # noqa: F401
