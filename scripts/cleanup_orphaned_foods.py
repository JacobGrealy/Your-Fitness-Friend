"""One-time cleanup script to remove orphaned food entries.

An orphaned food is a Food entry with no matching FoodLog entries
for the same food_name.

Run with: ./venv/bin/python scripts/cleanup_orphaned_foods.py
"""
from app import create_app
from app.models.food import Food
from app.models.food_log import FoodLog
from app import db


def cleanup_orphaned_foods():
    app = create_app()
    with app.app_context():
        foods = Food.query.all()
        logs = FoodLog.query.all()

        log_names = set(log.food_name for log in logs)
        orphaned = [f for f in foods if f.name not in log_names]

        if not orphaned:
            print("No orphaned foods found. Database is clean.")
            return

        print(f"Found {len(orphaned)} orphaned food(s):")
        for f in orphaned:
            print(f"  id={f.id} name='{f.name}' brand={f.brand} user_id={f.user_id}")

        for food in orphaned:
            db.session.delete(food)

        db.session.commit()
        print(f"\nDeleted {len(orphaned)} orphaned food(s).")


if __name__ == '__main__':
    cleanup_orphaned_foods()
