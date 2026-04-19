// Main JavaScript for FitnessFriend

// Utility function to show flash messages
function showFlashMessage(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// API helper function
async function apiCall(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API call failed');
    }
    
    return response.json();
}

// Form submission handler
function handleFormSubmit(form, endpoint, successMessage, errorMessage = 'An error occurred') {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            const result = await apiCall(endpoint, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showFlashMessage(successMessage, 'success');
            console.log(result);
        } catch (error) {
            showFlashMessage(error.message || errorMessage, 'error');
            console.error(error);
        }
    });
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('FitnessFriend initialized');
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
});
