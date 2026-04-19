import requests
from app.config import Config


class LLMClient:
    """Client for communicating with local llama.cpp server."""
    
    def __init__(self, api_url=None, timeout=None):
        """Initialize LLM client.
        
        Args:
            api_url: Base URL for llama.cpp server (default: from Config)
            timeout: Request timeout in seconds (default: from Config)
        """
        self.api_url = api_url or Config.LLM_API_URL
        self.timeout = timeout or Config.LLM_TIMEOUT
    
    def chat(self, messages, system_prompt=None, max_tokens=500):
        """Send chat completion request to llama.cpp.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            
        Returns:
            str: Generated response or empty string on error
        """
        url = f"{self.api_url}/chat/completions"
        
        # Prepare messages
        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)
        
        payload = {
            "model": "llama",
            "messages": formatted_messages,
            "max_tokens": max_tokens,
            "temperature": 0.7
        }
        
        try:
            response = requests.post(
                url,
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content']
        except requests.exceptions.Timeout:
            return "Error: Request timed out. The LLM server is taking too long to respond."
        except requests.exceptions.ConnectionError:
            return "Error: Could not connect to LLM server. Make sure it's running at {self.api_url}"
        except (requests.exceptions.RequestException, KeyError, IndexError) as e:
            return f"Error: Failed to process LLM response. {str(e)}"
    
    def analyze_meal_photo(self, image_path):
        """Analyze a meal photo to extract nutritional information.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            dict: Analysis results with food items and estimated nutrition
        """
        system_prompt = """You are a nutrition analysis assistant. Analyze the food in this image and provide:
1. List of food items identified
2. Estimated calories per item
3. Brief description of the meal

Format your response as JSON with keys: 'food_items' (list of dicts with 'name' and 'calories'), 'total_calories' (number), 'description' (string)."""
        
        # Note: For actual implementation, you would need to base64 encode and send the image
        # This is a placeholder for the image analysis logic
        messages = [{
            "role": "user",
            "content": "Analyze this meal photo"
        }]
        
        response = self.chat([{"role": "user", "content": "Analyze this meal photo"}], system_prompt)
        
        return {
            "success": True,
            "analysis": response,
            "image_path": image_path
        }
    
    def generate_exercise_plan(self, user_profile, goals):
        """Generate a personalized exercise plan.
        
        Args:
            user_profile: Dict with user fitness information
            goals: List of fitness goals
            
        Returns:
            str: Generated exercise plan
        """
        system_prompt = """You are a certified personal trainer. Create a safe, effective exercise plan based on the user's profile and goals.
Include specific exercises, sets, reps, and rest periods."""
        
        user_text = f"Age: {user_profile.get('age')}, Gender: {user_profile.get('gender')}, "
        user_text += f"Height: {user_profile.get('height')}cm, Weight: {user_profile.get('weight')}kg, "
        user_text += f"Activity Level: {user_profile.get('activity_level')}"
        
        goals_text = ", ".join(goals)
        
        messages = [
            {"role": "user", "content": f"User Profile: {user_text}\n\nGoals: {goals_text}\n\nCreate an exercise plan:"}
        ]
        
        return self.chat(messages, system_prompt, max_tokens=1000)
    
    def calculate_bmr(self, age, gender, height, weight, activity_level):
        """Calculate BMR and TDEE using Mifflin-St Jeor equation.
        
        Args:
            age: Age in years
            gender: 'male' or 'female'
            height: Height in cm
            weight: Weight in kg
            activity_level: Activity multiplier
            
        Returns:
            dict: BMR, TDEE, and macronutrient recommendations
        """
        # Mifflin-St Jeor Equation
        if gender.lower() == 'male':
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
        else:
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
        
        tdee = bmr * activity_level
        
        # Standard macronutrient split (40% carbs, 30% protein, 30% fat)
        protein_calories = tdee * 0.30
        fat_calories = tdee * 0.30
        carb_calories = tdee * 0.40
        
        return {
            'bmr': round(bmr, 0),
            'tdee': round(tdee, 0),
            'protein_grams': round(protein_calories / 4, 0),
            'fat_grams': round(fat_calories / 9, 0),
            'carb_grams': round(carb_calories / 4, 0)
        }


# Singleton instance
llm_client = LLMClient()
