// Editor utilities for FastAPI Markdown CMS

// Auto-save functionality
let autoSaveTimer;

function enableAutoSave(editor, saveCallback, delay = 3000) {
    editor.codemirror.on('change', function() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveCallback();
        }, delay);
    });
}

// Slug generator
function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Form validation
function validateMarkdownForm(formData) {
    const errors = [];
    
    if (!formData.title || formData.title.trim().length === 0) {
        errors.push('Title is required');
    }
    
    if (!formData.slug || formData.slug.trim().length === 0) {
        errors.push('Slug is required');
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
    }
    
    if (!formData.content || formData.content.trim().length === 0) {
        errors.push('Content is required');
    }
    
    return errors;
}

// API helper
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('access_token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('access_token');
            window.location.href = '/admin/login';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        enableAutoSave,
        generateSlug,
        validateMarkdownForm,
        apiRequest,
        showNotification
    };
}
