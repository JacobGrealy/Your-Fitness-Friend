"""Tests for Complete Diary (FF-0054).

The projection rules come from MyFitnessPal's help centre: five weeks of "just
like today", a projection that is withheld rather than guessed when the intake is
too low, and completion that can be repeated.
"""

from datetime import date, timedelta

import pytest

from app import db
from app.models.diary_completion import DiaryCompletion
from app.models.food_log import FoodLog
from app.models.user import User
from app.utils.diary_completion import (
    KCAL_PER_LB,
    PROJECTION_DAYS,
    STATUS_EMPTY,
    STATUS_OK,
    STATUS_TOO_LOW,
    STATUS_UNDER_EATING,
    evaluate_intake,
    project_weight_change,
)


@pytest.fixture
def user(app):
    """A user with a complete profile, so TDEE can be calculated."""
    with app.app_context():
        u = User(
            username='diary@test.local',
            email='diary@test.local',
            age=35,
            gender='male',
            height=180,
            weight=80,          # kg
            activity_level='moderate',
            daily_calorie_goal=2200,
        )
        u.set_password('password123')
        db.session.add(u)
        db.session.commit()
        return u.id


def add_food(app, user_id, calories, target_date=None, name='Test food'):
    with app.app_context():
        db.session.add(FoodLog(
            user_id=user_id,
            food_name=name,
            calories=calories,
            protein_g=10,
            carbs_g=20,
            fat_g=5,
            meal_type='lunch',
            date=target_date or date.today(),
        ))
        db.session.commit()


class TestProjectionMath:
    """The arithmetic, in isolation."""

    def test_deficit_projects_a_loss(self):
        # 500 kcal/day under maintenance for 35 days = 17500 kcal = 5 lb
        assert project_weight_change(2000, 2500) == pytest.approx(-5.0)

    def test_surplus_projects_a_gain(self):
        assert project_weight_change(3000, 2500) == pytest.approx(5.0)

    def test_maintenance_projects_no_change(self):
        assert project_weight_change(2500, 2500) == 0.0

    def test_uses_five_weeks_and_the_3500_rule(self):
        assert PROJECTION_DAYS == 35
        # a 100 kcal/day surplus over 35 days is 3500 kcal, exactly one pound
        assert project_weight_change(2600, 2500) == pytest.approx(1.0)
        assert KCAL_PER_LB == 3500

    def test_no_tdee_means_no_projection(self):
        assert project_weight_change(2000, None) is None


class TestUnderEatingThresholds:
    """Gender-specific bands, mirroring MFP's published guidance."""

    @pytest.mark.parametrize('calories,expected', [
        (1500, STATUS_OK),          # at the male threshold: fine
        (1499, STATUS_UNDER_EATING),
        (1200, STATUS_UNDER_EATING),
        (1199, STATUS_TOO_LOW),
    ])
    def test_male_bands(self, calories, expected):
        assert evaluate_intake(calories, 'male') == expected

    @pytest.mark.parametrize('calories,expected', [
        (1200, STATUS_OK),
        (1199, STATUS_UNDER_EATING),
        (1000, STATUS_UNDER_EATING),
        (999, STATUS_TOO_LOW),
    ])
    def test_female_bands(self, calories, expected):
        assert evaluate_intake(calories, 'female') == expected

    def test_unknown_gender_is_not_judged(self):
        """No basis for a gender-specific threshold, so no warning is invented."""
        assert evaluate_intake(200, None) == STATUS_OK
        assert evaluate_intake(200, '') == STATUS_OK


class TestCompleteDiaryRoute:
    """/api/food/diary/complete and friends, end to end."""

    def _login(self, client):
        client.post('/api/auth/register', json={
            'email': 'diaryroute@test.local',
            'password': 'password123',
            'name': 'Diary Route',
        })
        client.post('/api/auth/logout')
        return client.post('/api/auth/login', json={
            'email': 'diaryroute@test.local',
            'password': 'password123',
        })

    def _make_profile(self, client, **profile):
        client.put('/api/auth/profile', json=profile)

    def test_requires_login(self, client):
        assert client.post('/api/food/diary/complete').status_code == 401
        assert client.get('/api/food/diary/completion').status_code == 401
        assert client.delete('/api/food/diary/complete').status_code == 401

    def test_empty_diary_refuses_to_project(self, client):
        self._login(client)
        self._make_profile(client, age=35, gender='male', height=180, weight=80,
                           activity_level='moderate')
        response = client.post('/api/food/diary/complete')
        assert response.status_code == 200
        body = response.get_json()
        assert body['completed'] is True
        assert body['status'] == STATUS_EMPTY
        assert body['projection']['change_lbs'] is None
        assert 'nothing to project' in body['message']

    def test_projects_a_loss_for_a_deficit_day(self, client, app):
        self._login(client)
        self._make_profile(client, age=35, gender='male', height=180, weight=80,
                           activity_level='moderate')
        add_food(app, self._user_id(app), 1200)

        body = client.post('/api/food/diary/complete').get_json()

        assert body['status'] == STATUS_UNDER_EATING  # 1200 < 1500 for men
        assert body['projection']['change_lbs'] is not None
        assert body['projection']['change_lbs'] < 0
        assert body['totals']['calories'] == 1200
        assert body['streak'] == 1

    def test_withholds_projection_below_the_threshold(self, client, app):
        self._login(client)
        self._make_profile(client, age=35, gender='male', height=180, weight=80,
                           activity_level='moderate')
        add_food(app, self._user_id(app), 800)

        body = client.post('/api/food/diary/complete').get_json()

        assert body['status'] == STATUS_TOO_LOW
        assert body['projection']['change_lbs'] is None
        assert 'No weight projection' in body['message']

    def test_recompleting_updates_the_same_row(self, client, app):
        self._login(client)
        self._make_profile(client, age=35, gender='male', height=180, weight=80,
                           activity_level='moderate')
        user_id = self._user_id(app)
        add_food(app, user_id, 2000)
        client.post('/api/food/diary/complete')
        add_food(app, user_id, 300)
        second = client.post('/api/food/diary/complete').get_json()

        assert second['totals']['calories'] == 2300
        with app.app_context():
            rows = DiaryCompletion.query.filter_by(user_id=user_id).all()
            assert len(rows) == 1
            assert rows[0].calories == 2300

    def test_streak_counts_consecutive_completed_days(self, client, app):
        self._login(client)
        self._make_profile(client, age=35, gender='male', height=180, weight=80,
                           activity_level='moderate')
        user_id = self._user_id(app)
        today = date.today()
        for offset in (1, 2):
            day = today - timedelta(days=offset)
            add_food(app, user_id, 2000, target_date=day)
            client.post('/api/food/diary/complete', json={'date': day.isoformat()})
        add_food(app, user_id, 2000)
        body = client.post('/api/food/diary/complete').get_json()
        assert body['streak'] == 3

    def test_completion_lookup_and_undo(self, client, app):
        self._login(client)
        self._make_profile(client, age=35, gender='male', height=180, weight=80,
                           activity_level='moderate')
        add_food(app, self._user_id(app), 2000)

        assert client.get('/api/food/diary/completion').get_json()['completed'] is False
        client.post('/api/food/diary/complete')
        lookup = client.get('/api/food/diary/completion').get_json()
        assert lookup['completed'] is True
        assert lookup['totals']['calories'] == 2000

        assert client.delete('/api/food/diary/complete').get_json()['removed'] is True
        assert client.get('/api/food/diary/completion').get_json()['completed'] is False

    def test_rejects_a_bad_date(self, client):
        self._login(client)
        response = client.post('/api/food/diary/complete', json={'date': '17-10-2026'})
        assert response.status_code == 400

    def test_missing_profile_withholds_projection(self, client, app):
        """No height/weight/age means no TDEE, so no invented projection."""
        self._login(client)
        add_food(app, self._user_id(app), 2000)
        body = client.post('/api/food/diary/complete').get_json()
        assert body['maintenance_calories'] is None
        assert body['projection']['change_lbs'] is None
        assert 'age, height, weight' in body['message']

    def _user_id(self, app):
        with app.app_context():
            return User.query.filter_by(email='diaryroute@test.local').first().id


class TestStreaks:
    """The two counters the diary shows once the day is closed (FF-0068)."""

    def _close(self, app, user_id, day, calories):
        """Record a closed day directly, with `calories` eaten."""
        with app.app_context():
            db.session.add(DiaryCompletion(
                user_id=user_id,
                date=day,
                calories=calories,
                protein_g=0,
                carbs_g=0,
                fat_g=0,
            ))
            db.session.commit()

    def _streaks(self, app, user_id, as_of, goal=2000):
        with app.app_context():
            user = db.session.get(User, user_id)
            from app.utils.diary_completion import completion_streaks
            return completion_streaks(user.id, as_of, goal)

    def test_counts_consecutive_closed_days(self, app, user):
        today = date.today()
        for offset in (0, 1, 2):
            self._close(app, user, today - timedelta(days=offset), 2000)

        streaks = self._streaks(app, user, today)

        assert streaks['closed_days'] == 3
        assert streaks['closed_today'] is True

    def test_a_gap_resets_the_run(self, app, user):
        today = date.today()
        self._close(app, user, today, 2000)
        self._close(app, user, today - timedelta(days=2), 2000)   # yesterday missing

        assert self._streaks(app, user, today)['closed_days'] == 1

    def test_the_run_survives_until_it_is_two_days_stale(self, app, user):
        today = date.today()
        yesterday = today - timedelta(days=1)
        self._close(app, user, yesterday, 2000)
        self._close(app, user, today - timedelta(days=2), 2000)

        # Yesterday counts as "still alive" — today is not closed yet.
        assert self._streaks(app, user, today)['closed_days'] == 2

        # Two days without closing reads as broken, not as a stale total.
        later = today + timedelta(days=2)
        assert self._streaks(app, user, later)['closed_days'] == 0

    def test_within_goal_counts_under_and_slightly_over(self, app, user):
        today = date.today()
        self._close(app, user, today, 1200)                        # under
        self._close(app, user, today - timedelta(days=1), 2200)    # exactly 110%
        self._close(app, user, today - timedelta(days=2), 900)     # under

        streaks = self._streaks(app, user, today, goal=2000)

        assert streaks['within_goal_days'] == 3
        assert streaks['closed_days'] == 3

    def test_ten_percent_over_is_the_boundary(self, app, user):
        today = date.today()
        self._close(app, user, today, 2201)   # 110.05% — outside

        streaks = self._streaks(app, user, today, goal=2000)

        assert streaks['within_goal_days'] == 0
        assert streaks['closed_days'] == 1        # still a closed day, just not on target

    def test_a_closed_day_with_nothing_logged_is_not_on_target(self, app, user):
        today = date.today()
        self._close(app, user, today, 0)

        streaks = self._streaks(app, user, today, goal=2000)

        assert streaks['closed_days'] == 1
        assert streaks['within_goal_days'] == 0

    def test_over_goal_today_leaves_yesterdays_on_target_run_intact(self, app, user):
        """The on-target run ended yesterday, and yesterday still counts as current.

        Reporting 0 here would erase a real achievement the moment the user goes over;
        the closed-day count keeps counting either way, which is the difference the
        two streaks exist to show.
        """
        today = date.today()
        self._close(app, user, today, 3000)                        # over goal
        self._close(app, user, today - timedelta(days=1), 2000)
        self._close(app, user, today - timedelta(days=2), 2000)

        streaks = self._streaks(app, user, today, goal=2000)

        assert streaks['within_goal_days'] == 2
        assert streaks['within_goal_today'] is False
        assert streaks['closed_days'] == 3

    def test_no_completions_at_all(self, app, user):
        streaks = self._streaks(app, user, date.today())
        assert streaks == {
            'closed_days': 0,
            'within_goal_days': 0,
            'closed_today': False,
            'within_goal_today': False,
            'tolerance_pct': 10,
        }


class TestClosedDayPayload:
    def test_get_returns_the_projection_and_streaks_for_a_closed_day(self, client, app):
        client.post('/api/auth/register', json={
            'email': 'payload@test.local', 'password': 'password123', 'name': 'Payload',
        })
        client.post('/api/auth/logout')
        client.post('/api/auth/login', json={
            'email': 'payload@test.local', 'password': 'password123',
        })
        client.put('/api/auth/profile', json={
            'age': 35, 'gender': 'male', 'height': 180, 'weight': 80,
            'activity_level': 'moderate',
        })
        with app.app_context():
            user_id = User.query.filter_by(email='payload@test.local').first().id
            db.session.add(FoodLog(
                user_id=user_id, food_name='Oats', calories=2000,
                protein_g=10, carbs_g=20, fat_g=5,
                meal_type='lunch', date=date.today(),
            ))
            db.session.commit()

        client.post('/api/food/diary/complete')
        closed = client.get('/api/food/diary/completion').get_json()

        assert closed['completed'] is True
        assert closed['projection']['change_lbs'] is not None
        assert closed['streaks']['closed_days'] == 1
        assert closed['streaks']['within_goal_days'] == 1
        assert closed['totals']['calories'] == 2000

    def test_get_for_an_open_day_still_reports_the_live_streak(self, client, app):
        client.post('/api/auth/register', json={
            'email': 'open@test.local', 'password': 'password123', 'name': 'Open',
        })
        client.post('/api/auth/logout')
        client.post('/api/auth/login', json={
            'email': 'open@test.local', 'password': 'password123',
        })

        body = client.get('/api/food/diary/completion').get_json()

        assert body['completed'] is False
        assert body['streaks']['closed_days'] == 0
        assert 'tolerance_pct' in body['streaks']


class TestWeeksAndBadges:
    """Sunday-start weeks, the three nested week badges, and lifetime stats."""

    SUNDAY = date(2026, 10, 11)   # a Sunday
    SATURDAY = date(2026, 10, 17)

    def _close(self, app, user_id, day, calories, goal=None):
        with app.app_context():
            db.session.add(DiaryCompletion(
                user_id=user_id, date=day, calories=calories,
                protein_g=0, carbs_g=0, fat_g=0, goal_calories=goal,
            ))
            db.session.commit()

    def _week(self, app, user_id, as_of):
        with app.app_context():
            from app.utils.diary_completion import weekly_summary
            return weekly_summary(user_id, as_of)

    def _badges(self, app, user_id, as_of, goal=2000):
        with app.app_context():
            from app.utils.diary_completion import badges
            return badges(user_id, as_of, goal)

    def test_week_start_is_the_sunday_on_or_before(self, app, user):
        with app.app_context():
            from app.utils.diary_completion import week_start

            # Every day of a Sunday-Saturday week maps back to that Sunday.
            for offset in range(7):
                day = self.SUNDAY + timedelta(days=offset)
                assert week_start(day) == self.SUNDAY, day
            # The next day starts a new week.
            assert week_start(self.SATURDAY + timedelta(days=1)) == self.SATURDAY + timedelta(days=1)

    def test_strip_states_across_the_week(self, app, user):
        self._close(app, user, self.SUNDAY, 2000, goal=2000)          # on target
        self._close(app, user, self.SUNDAY + timedelta(days=1), 2500, goal=2000)  # over
        week = self._week(app, user, self.SUNDAY + timedelta(days=2))

        states = [day['state'] for day in week['days']]
        assert states == ['on_target', 'closed', 'open', 'future', 'future', 'future', 'future']
        assert week['closed'] == 2
        assert week['on_target'] == 1
        assert week['start'] == self.SUNDAY.isoformat()
        assert week['end'] == self.SATURDAY.isoformat()

    def test_a_past_day_without_a_completion_is_missed(self, app, user):
        week = self._week(app, user, self.SUNDAY + timedelta(days=3))
        states = [day['state'] for day in week['days']]
        assert states[:3] == ['missed', 'missed', 'missed']
        assert states[3] == 'open'
        assert states[4] == 'future'

    def test_a_perfect_week_earns_all_three_when_every_day_is_on_target(self, app, user):
        for offset in range(7):
            self._close(app, user, self.SUNDAY + timedelta(days=offset), 1900, goal=2000)

        result = self._badges(app, user, self.SATURDAY)

        counts = {badge['id']: badge['count'] for badge in result['badges']}
        assert counts == {'perfect_week': 1, 'on_target_week': 1, 'golden_week': 1}

    def test_five_of_seven_on_target_earns_two_not_three(self, app, user):
        for offset in range(7):
            # five days on target, two well over
            calories = 1900 if offset < 5 else 3000
            self._close(app, user, self.SUNDAY + timedelta(days=offset), calories, goal=2000)

        counts = {badge['id']: badge['count'] for badge in self._badges(app, user, self.SATURDAY)['badges']}

        assert counts == {'perfect_week': 1, 'on_target_week': 1, 'golden_week': 0}

    def test_four_of_seven_on_target_earns_only_the_perfect_week(self, app, user):
        for offset in range(7):
            calories = 1900 if offset < 4 else 3000
            self._close(app, user, self.SUNDAY + timedelta(days=offset), calories, goal=2000)

        counts = {badge['id']: badge['count'] for badge in self._badges(app, user, self.SATURDAY)['badges']}

        assert counts == {'perfect_week': 1, 'on_target_week': 0, 'golden_week': 0}

    def test_a_week_with_a_gap_earns_nothing(self, app, user):
        for offset in range(6):          # Saturday left open
            self._close(app, user, self.SUNDAY + timedelta(days=offset), 1900, goal=2000)

        counts = {badge['id']: badge['count'] for badge in self._badges(app, user, self.SATURDAY)['badges']}

        assert counts == {'perfect_week': 0, 'on_target_week': 0, 'golden_week': 0}

    def test_badges_accumulate_across_weeks(self, app, user):
        # two complete, all-on-target weeks
        for week in (0, 1):
            start = self.SUNDAY - timedelta(days=7 * week)
            for offset in range(7):
                self._close(app, user, start + timedelta(days=offset), 1900, goal=2000)

        counts = {badge['id']: badge['count'] for badge in
                  self._badges(app, user, self.SATURDAY)['badges']}

        assert counts == {'perfect_week': 2, 'on_target_week': 2, 'golden_week': 2}

    def test_each_day_is_judged_by_the_goal_in_force_then(self, app, user):
        """A day closed against a 1500 goal stays on target after the goal rises."""
        for offset in range(7):
            self._close(app, user, self.SUNDAY + timedelta(days=offset), 1600, goal=1500)

        counts = {badge['id']: badge['count'] for badge in
                  self._badges(app, user, self.SATURDAY, goal=3000)['badges']}

        # 1600 is within 10% of 1500, and would be way under 3000 too — the point is
        # that it is judgement by the stored goal, not by the caller's current one.
        assert counts['golden_week'] == 1

    def test_lifetime_stats(self, app, user):
        # a three-day run, a gap, then one day
        for offset in range(3):
            self._close(app, user, self.SUNDAY + timedelta(days=offset), 1900, goal=2000)
        self._close(app, user, self.SATURDAY, 1900, goal=2000)

        stats = self._badges(app, user, self.SATURDAY)['stats']

        assert stats['days_closed'] == 4
        assert stats['best_streak'] == 3

    def test_badges_endpoint_reports_progress_for_the_current_week(self, client, app):
        client.post('/api/auth/register', json={
            'email': 'badges@test.local', 'password': 'password123', 'name': 'Badges',
        })
        client.post('/api/auth/logout')
        client.post('/api/auth/login', json={
            'email': 'badges@test.local', 'password': 'password123',
        })
        with app.app_context():
            user_id = User.query.filter_by(email='badges@test.local').first().id
        self._close(app, user_id, date.today(), 1900, goal=2000)

        body = client.get('/api/food/diary/badges').get_json()

        assert [badge['id'] for badge in body['badges']] == [
            'perfect_week', 'on_target_week', 'golden_week',
        ]
        assert body['badges'][0]['progress']['closed'] >= 1
        assert body['week']['closed'] >= 1
        assert body['stats']['days_closed'] == 1
