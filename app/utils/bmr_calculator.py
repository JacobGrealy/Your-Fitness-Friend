"""BMR and TDEE calculator utilities."""


def get_activity_multiplier(level):
    """Get activity multiplier based on activity level.
    
    Args:
        level: Activity level string (sedentary, light, moderate, active, very active)
        
    Returns:
        float: Activity multiplier
    """
    multipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very active': 1.9
    }
    return multipliers.get(level.lower().strip(), 1.55)


def calculate_bmr(age, gender, height, weight):
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.
    
    Args:
        age: Age in years
        gender: 'male' or 'female'
        height: Height in cm
        weight: Weight in kg
        
    Returns:
        float: BMR in calories per day
    """
    if gender.lower() == 'male':
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
    else:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
    
    return round(bmr, 0)


def calculate_tdee(bmr, activity_level):
    """Calculate Total Daily Energy Expenditure.
    
    Args:
        bmr: Basal Metabolic Rate
        activity_level: Activity level string
        
    Returns:
        float: TDEE in calories per day
    """
    multiplier = get_activity_multiplier(activity_level)
    return round(bmr * multiplier, 0)


def calculate_macros(tdee, goal='maintain'):
    """Calculate macronutrient recommendations based on TDEE and goal.
    
    Args:
        tdee: Total Daily Energy Expenditure
        goal: Goal type ('lose', 'maintain', 'gain')
        
    Returns:
        dict: Macronutrient recommendations in grams
    """
    if goal == 'lose':
        tdee *= 0.85  # 15% deficit
    elif goal == 'gain':
        tdee *= 1.10  # 10% surplus
    
    # Standard split: 40% carbs, 30% protein, 30% fat
    protein_calories = tdee * 0.30
    fat_calories = tdee * 0.30
    carb_calories = tdee * 0.40
    
    return {
        'calories': round(tdee, 0),
        'protein_grams': round(protein_calories / 4, 0),
        'fat_grams': round(fat_calories / 9, 0),
        'carb_grams': round(carb_calories / 4, 0)
    }


def calculate_bmr_and_macros(user_profile):
    """Calculate BMR and macros from user profile.
    
    Args:
        user_profile: Dict with age, gender, height, weight, activity_level
        
    Returns:
        dict: Complete nutritional profile
    """
    bmr = calculate_bmr(
        user_profile['age'],
        user_profile['gender'],
        user_profile['height'],
        user_profile['weight']
    )
    
    tdee = calculate_tdee(bmr, user_profile['activity_level'])
    macros = calculate_macros(tdee)
    
    return {
        'bmr': bmr,
        'tdee': tdee,
        **macros
    }
