"""Weight calculation utilities."""
from typing import List, Tuple, Optional
from app.models.weight_log import WeightLog


def calculate_weight_trend(logs: List[WeightLog]) -> Tuple[float, str]:
    """
    Calculate average weight over a period.
    
    Args:
        logs: List of WeightLog entries sorted by date
        
    Returns:
        Tuple of (average_weight, period_description)
    """
    if not logs:
        return 0.0, "No data"
    
    total = sum(log.weight for log in logs)
    count = len(logs)
    average = total / count
    
    first_date = logs[0].recorded_at.strftime('%Y-%m-%d')
    last_date = logs[-1].recorded_at.strftime('%Y-%m-%d')
    period = f"{first_date} to {last_date}"
    
    return round(average, 2), period


def calculate_weight_change(logs: List[WeightLog]) -> Tuple[float, float]:
    """
    Calculate weight change from first to last entry.
    
    Args:
        logs: List of WeightLog entries sorted by date
        
    Returns:
        Tuple of (weight_change, percentage_change)
    """
    if len(logs) < 2:
        return 0.0, 0.0
    
    first_weight = logs[0].weight
    last_weight = logs[-1].weight
    
    change = last_weight - first_weight
    percentage = (change / first_weight) * 100 if first_weight > 0 else 0.0
    
    return round(change, 2), round(percentage, 2)


def get_weight_statistics(logs: List[WeightLog]) -> dict:
    """
    Calculate comprehensive weight statistics.
    
    Args:
        logs: List of WeightLog entries
        
    Returns:
        Dictionary with weight statistics
    """
    if not logs:
        return {
            'entries': 0,
            'average_weight': None,
            'first_weight': None,
            'last_weight': None,
            'weight_change': 0,
            'weight_change_percentage': 0
        }
    
    first_weight = logs[0].weight
    last_weight = logs[-1].weight
    weight_change = last_weight - first_weight
    percentage = (weight_change / first_weight) * 100 if first_weight > 0 else 0.0
    
    avg_weight, period = calculate_weight_trend(logs)
    
    return {
        'entries': len(logs),
        'average_weight': round(avg_weight, 2),
        'period': period,
        'first_weight': round(first_weight, 2),
        'first_date': logs[0].recorded_at.strftime('%Y-%m-%d'),
        'last_weight': round(last_weight, 2),
        'last_date': logs[-1].recorded_at.strftime('%Y-%m-%d'),
        'weight_change': round(weight_change, 2),
        'weight_change_percentage': round(percentage, 2)
    }
