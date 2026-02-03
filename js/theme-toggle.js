/**
 * Dark/light theme toggle functionality
 */

class ThemeToggle {
    constructor() {
        this.themeToggleBtn = document.querySelector('.theme-toggle');
        this.darkCSS = document.getElementById('dark-css');
        this.isDarkMode = false;
        
        this.init();
    }
    
    init() {
        // Load saved theme preference
        this.loadThemePreference();
        
        // Add event listeners
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
        // Listen for system theme changes
        this.watchSystemTheme();
    }
    
    loadThemePreference() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            this.enableDarkMode();
        } else {
            this.disableDarkMode();
        }
    }
    
    toggleTheme() {
        if (this.isDarkMode) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
        
        // Save preference
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
        
        // Animate toggle button
        this.animateToggle();
    }
    
    enableDarkMode() {
        this.darkCSS.disabled = false;
        this.isDarkMode = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        this.updateToggleIcon();
    }
    
    disableDarkMode() {
        this.darkCSS.disabled = true;
        this.isDarkMode = false;
        document.documentElement.removeAttribute('data-theme');
        this.updateToggleIcon();
    }
    
    updateToggleIcon() {
        const icon = this.themeToggleBtn.querySelector('.toggle-icon');
        if (icon) {
            icon.textContent = this.isDarkMode ? '☀️' : '🌙';
            icon.setAttribute('aria-label', this.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }
    
    animateToggle() {
        this.themeToggleBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.themeToggleBtn.style.transform = 'scale(1)';
        }, 150);
    }
    
    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem('theme')) {
                if (e.matches) {
                    this.enableDarkMode();
                } else {
                    this.disableDarkMode();
                }
            }
        });
    }
}

// Initialize theme toggle when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ThemeToggle();
    
    // Also add event listener to footer toggle if it exists
    const footerToggle = document.querySelector('.theme-toggle-footer');
    if (footerToggle) {
        footerToggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.theme-toggle').click();
        });
    }
});