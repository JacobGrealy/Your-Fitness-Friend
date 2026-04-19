import requests
import json
import base64
import re
from app.config import Config


class QwenClient:
    """Client for Qwen AI API to estimate exercise calories and analyze meal photos."""
    
    def __init__(self, base_url=None):
        self.base_url = base_url or Config.QWEN_BASE_URL
        self.timeout = Config.QWEN_TIMEOUT
    
    def estimate_exercise_calories(self, description, duration_min, weight_kg):
        """
        Estimate calories burned for an exercise.
        
        Args:
            description: Exercise description
            duration_min: Duration in minutes
            weight_kg: User's weight in kg
            
        Returns:
            dict with 'calories' key
            
        Raises:
            ValueError: If response is invalid
            requests.exceptions.RequestException: If API call fails
        """
        prompt = (
            f"Estimate calories burned for {description} for {duration_min} minutes "
            f"for a person weighing {weight_kg}kg. "
            "Return ONLY valid JSON: {{\"calories\": number}}"
        )
        
        payload = {
            "model": "qwen",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 50
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            content = data['choices'][0]['message']['content']
            
            # Parse JSON response
            try:
                result = json.loads(content.strip())
                if 'calories' in result and isinstance(result['calories'], (int, float)):
                    return {'calories': float(result['calories'])}
            except (json.JSONDecodeError, KeyError, TypeError):
                pass
            
            # Fallback: try to extract number from response
            import re
            numbers = re.findall(r'[\d]+\.?[\d]*', content)
            if numbers:
                return {'calories': float(numbers[0])}
            
            raise ValueError("Could not parse calories from response")
            
        except requests.exceptions.Timeout:
            raise requests.exceptions.Timeout(
                "Qwen API request timed out. The AI server may be slow."
            )
        except requests.exceptions.ConnectionError:
            raise requests.exceptions.ConnectionError(
                "Could not connect to Qwen AI server. Make sure it's running."
            )
    
    def analyze_meal_photo(self, image_base64):
        """
        Analyze a meal photo to estimate nutrition.
        
        Args:
            image_base64: Base64 encoded image string
            
        Returns:
            dict with 'calories', 'protein', 'carbs', 'fat', 'items' keys
            
        Raises:
            ValueError: If response is invalid
            requests.exceptions.RequestException: If API call fails
        """
        prompt = (
            "Analyze this meal photo. Estimate total calories, protein (g), "
            "carbohydrates (g), and fat (g). Also list the food items you see. "
            "Return ONLY valid JSON: {\"calories\": number, \"protein\": number, "
            "\"carbs\": number, \"fat\": number, \"items\": [\"item1\", \"item2\"]}"
        )
        
        payload = {
            "model": "qwen",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.3,
            "max_tokens": 200
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            content = data['choices'][0]['message']['content']
            
            # Parse JSON response
            try:
                result = json.loads(content.strip())
                required_fields = ['calories', 'protein', 'carbs', 'fat', 'items']
                if all(field in result for field in required_fields):
                    if (isinstance(result['calories'], (int, float)) and
                        isinstance(result['protein'], (int, float)) and
                        isinstance(result['carbs'], (int, float)) and
                        isinstance(result['fat'], (int, float)) and
                        isinstance(result['items'], list)):
                        return {
                            'calories': float(result['calories']),
                            'protein': float(result['protein']),
                            'carbs': float(result['carbs']),
                            'fat': float(result['fat']),
                            'items': result['items']
                        }
            except (json.JSONDecodeError, KeyError, TypeError):
                pass
            
            raise ValueError("Could not parse nutrition data from response")
            
        except requests.exceptions.Timeout:
            raise requests.exceptions.Timeout(
                "Qwen API request timed out. The AI server may be slow."
            )
        except requests.exceptions.ConnectionError:
            raise requests.exceptions.ConnectionError(
                "Could not connect to Qwen AI server. Make sure it's running."
            )


qwen_client = QwenClient()
