import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.bmr_calculator import calculate_bmr, calculate_tdee
from app.utils.aggregations import (
    get_daily_totals,
    get_weight_trend,
    get_weekly_summary,
    calculate_macro_goals,
    get_exercise_totals
)


class TestBMRCalculator:
    def test_mifflin_st_jeor_male(self):
        bmr = calculate_bmr(25, 'male', 175, 70)
        # BMR is rounded to integer
        assert bmr == 1674

    def test_mifflin_st_jeor_female(self):
        bmr = calculate_bmr(30, 'female', 165, 60)
        # BMR is rounded to integer
        assert bmr == 1320

    def test_calculate_tdee_sedentary(self):
        bmr = calculate_bmr(25, 'male', 175, 70)
        tdee = calculate_tdee(bmr, 'sedentary')
        assert tdee > 0
        assert tdee < 3000

    def test_calculate_tdee_very_active(self):
        bmr = calculate_bmr(25, 'male', 175, 70)
        tdee = calculate_tdee(bmr, 'very active')
        assert tdee > 3000


class TestAggregations:
    def test_calculate_macro_goals(self):
        goals = calculate_macro_goals(calorie_goal=2000)
        assert 'protein' in goals
        assert 'carbs' in goals
        assert 'fat' in goals
        assert goals['protein']['grams'] == 150
        assert goals['carbs']['grams'] == 200
        assert goals['fat']['grams'] == 66

    def test_get_daily_totals_empty(self, app):
        with app.app_context():
            from datetime import date
            totals = get_daily_totals(user_id=999, target_date=date.today())
            assert totals['total_calories'] == 0
            assert totals['total_protein'] == 0
            assert totals['total_carbs'] == 0
            assert totals['total_fat'] == 0

    def test_get_weight_trend_empty(self, app):
        with app.app_context():
            trend = get_weight_trend(user_id=999, days=7)
            assert isinstance(trend, list)

    def test_get_weekly_summary_empty(self, app):
        with app.app_context():
            from datetime import date
            summary = get_weekly_summary(user_id=999, week_start=date.today())
            assert 'week_start' in summary
            assert 'week_end' in summary
            assert 'calories' in summary
            assert 'exercises' in summary

    def test_get_exercise_totals_empty(self, app):
        with app.app_context():
            from datetime import date
            totals = get_exercise_totals(user_id=999, target_date=date.today())
            assert totals['total_calories'] == 0
            assert totals['total_duration'] == 0
            assert totals['exercise_count'] == 0


class TestEdgeCases:
    def test_bmr_calculation(self):
        # BMR should work with valid inputs
        bmr = calculate_bmr(25, 'male', 175, 70)
        assert bmr > 0

    def test_tdee_calculation(self):
        bmr = calculate_bmr(25, 'male', 175, 70)
        tdee = calculate_tdee(bmr, 'moderate')
        assert tdee > bmr
