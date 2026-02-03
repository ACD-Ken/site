/**
 * Main JavaScript file for the website
 * Handles common functionality across pages
 */

// Markdown loader and converter
async function loadMarkdown(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load ${filePath}`);
        
        const markdown = await response.text();
        renderMarkdown(markdown);
        generateTOC();
    } catch (error) {
        console.error('Error loading markdown:', error);
        document.getElementById('markdown-content').innerHTML = 
            '<div class="error">Error loading content. Please check if the file exists.</div>';
    }
}

// Simple Markdown to HTML converter
function renderMarkdown(markdown) {
    const contentDiv = document.getElementById('markdown-content');

    // Basic Markdown parsing
    let html = markdown
        // Headers with IDs for TOC
        .replace(/^### (.*$)/gim, (match, title) => `<h3 id="${slugify(title)}">${title}</h3>`)
        .replace(/^## (.*$)/gim, (match, title) => `<h2 id="${slugify(title)}">${title}</h2>`)
        .replace(/^# (.*$)/gim, (match, title) => `<h1 id="${slugify(title)}">${title}</h1>`)
        
        // Lists
        .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gims, '<ol>$1</ol>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
        
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        
        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        
        // Callouts (custom syntax)
        .replace(/^\[!TIP\]([\s\S]*?)(?=\n\n|$)/g, '<div class="callout tip">$1</div>')
        .replace(/^\[!WARNING\]([\s\S]*?)(?=\n\n|$)/g, '<div class="callout warning">$1</div>')
        
        // Steps (custom syntax)
        .replace(/^\[STEP\]([\s\S]*?)(?=\n\n|$)/g, '<div class="step">$1</div>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        
        // Paragraphs
        .replace(/\n\n([^\n]+)/g, '<p>$1</p>')
        
        // Line breaks
        .replace(/\n/g, '<br>');
    
    contentDiv.innerHTML = '<div class="markdown-content">' + html + '</div>';
    
    // Add syntax highlighting to code blocks
    highlightCodeBlocks();
}

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// Generate Table of Contents from headers
function generateTOC() {
    const tocContainer = document.getElementById('toc');
    if (!tocContainer) return;

    const headers = document.querySelectorAll('.markdown-content h2, .markdown-content h3');
    let tocHTML = '';
    const usedIds = new Set();
    
    headers.forEach((header, index) => {
        const baseId = slugify(header.textContent) || `section-${index}`;
        let uniqueId = baseId;
        let counter = 2;
        while (usedIds.has(uniqueId)) {
            uniqueId = `${baseId}-${counter}`;
            counter += 1;
        }
        header.id = uniqueId;
        usedIds.add(uniqueId);
        
        const level = header.tagName.toLowerCase();
        const indent = level === 'h3' ? ' style="margin-left: 1rem;"' : '';
        
        tocHTML += `<a href="#${header.id}"${indent}>${header.textContent}</a>`;
    });
    
    tocContainer.innerHTML = tocHTML;
}

// Simple code block highlighting
function highlightCodeBlocks() {
    document.querySelectorAll('pre code').forEach(block => {
        const text = block.textContent;
        
        // Basic syntax highlighting for common languages
        if (text.includes('docker') || text.includes('Dockerfile')) {
            block.innerHTML = highlightDocker(text);
        } else if (text.includes('brew') || text.includes('curl')) {
            block.innerHTML = highlightBash(text);
        } else if (text.includes('npm') || text.includes('node')) {
            block.innerHTML = highlightJavaScript(text);
        }
    });
}

function highlightDocker(text) {
    return text
        .replace(/(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/g, '<span class="keyword">$1</span>')
        .replace(/(alpine|ubuntu|debian|node|nginx|python)\b/g, '<span class="string">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
}

function highlightBash(text) {
    return text
        .replace(/^(#.*)/gm, '<span class="comment">$1</span>')
        .replace(/\b(brew|curl|wget|git|docker|sudo|chmod|chown|mkdir|cd|ls|pwd)\b/g, '<span class="keyword">$1</span>')
        .replace(/"[^"]*"/g, '<span class="string">$&</span>')
        .replace(/\$[A-Z_]+/g, '<span class="variable">$&</span>');
}

function highlightJavaScript(text) {
    return text
        .replace(/\b(const|let|var|function|return|if|else|for|while|import|from|export|default|class|extends|async|await|try|catch|finally)\b/g, '<span class="keyword">$1</span>')
        .replace(/("[^"]*"|'[^']*')/g, '<span class="string">$1</span>')
        .replace(/\b(true|false|null|undefined)\b/g, '<span class="literal">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
        .replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Shrink navbar slightly on scroll for compact feel
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        const onScroll = () => {
            if (window.scrollY > 10) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
});