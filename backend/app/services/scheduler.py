from datetime import datetime, timezone
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from supabase import Client

logger = logging.getLogger("app.scheduler")

scheduler = BackgroundScheduler()


def publish_due_scheduled_articles(client: Client) -> None:
    """
    Finds all articles with status 'SCHEDULED' whose 'scheduled_at' timestamp 
    is in the past (or present) and updates their status to 'PUBLISHED'.
    """
    print(f"--- [SCHEDULER CHECKING AT {datetime.now(timezone.utc)}] ---")
    try:
        now_utc_iso = datetime.now(timezone.utc).isoformat()

        # Query scheduled articles that are due
        response = (
            client.table("articles")
            .select("id, title, scheduled_at")
            .eq("status", "SCHEDULED")
            .lte("scheduled_at", now_utc_iso)
            .execute()
        )

        due_articles = response.data or []
        if not due_articles:
            return

        print(f"INFO: Found {len(due_articles)} article(s) due for publishing.")

        for article in due_articles:
            article_id = article["id"]
            scheduled_at = article.get("scheduled_at") or now_utc_iso

            # Auto-publish article
            client.table("articles").update(
                {
                    "status": "PUBLISHED",
                    "published_at": scheduled_at,
                    "scheduled_at": None,
                }
            ).eq("id", article_id).execute()

            # Optional: Record audit log for background publishing
            try:
                client.table("audit_logs").insert(
                    {
                        "action": "ARTICLE_AUTO_PUBLISHED",
                        "entity_type": "ARTICLE",
                        "entity_id": article_id,
                        "metadata": {
                            "trigger": "APScheduler_Cron",
                            "scheduled_at": scheduled_at,
                        },
                    }
                ).execute()
            except Exception as audit_err:
                logger.warning(
                    f"Failed to record audit log for auto-published article {article_id}: {audit_err}"
                )

            print(
                f"INFO: Successfully auto-published article '{article.get('title')}' ({article_id})."
            )

    except Exception as e:
        logger.error(f"Error executing auto-publish background task: {e}")


def start_article_scheduler(admin_client: Client, interval_minutes: int = 1) -> None:
    """
    Starts the APScheduler instance and registers the publishing task.
    """
    if scheduler.running:
        return

    scheduler.add_job(
        publish_due_scheduled_articles,
        "interval",
        minutes=interval_minutes,
        args=[admin_client],
        id="auto_publish_scheduled_articles",
        replace_existing=True,
    )
    scheduler.start()
    print(
        f"INFO: Article Auto-Publish Scheduler started (Interval: every {interval_minutes} minute(s))."
    )


def shutdown_article_scheduler() -> None:
    """
    Gracefully shuts down the background scheduler.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("INFO: Article Auto-Publish Scheduler shut down.")