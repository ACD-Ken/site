/**
 * Gallery image loader
 * Automatically loads images from /images/travel folder
 */

// Sample image data (in production, this would be generated server-side or from a JSON file)
const sampleImages = [
    {
        filename: "mountain-view.jpg",
        title: "Mountain Landscape",
        description: "Scenic view of mountains during sunrise",
        category: "nature"
    },
    {
        filename: "city-skyline.jpg",
        title: "City Skyline",
        description: "Downtown skyline at dusk",
        category: "urban"
    },
    {
        filename: "beach-sunset.jpg",
        title: "Beach Sunset",
        description: "Golden hour at the beach",
        category: "nature"
    },
    {
        filename: "architecture-detail.jpg",
        title: "Architectural Detail",
        description: "Historical building details",
        category: "architecture"
    },
    {
        filename: "forest-path.jpg",
        title: "Forest Path",
        description: "Walking path through dense forest",
        category: "nature"
    },
    {
        filename: "market-street.jpg",
        title: "Local Market",
        description: "Busy street market scene",
        category: "urban"
    },
    {
        filename: "lake-reflection.jpg",
        title: "Lake Reflection",
        description: "Perfect reflection in mountain lake",
        category: "nature"
    },
    {
        filename: "modern-building.jpg",
        title: "Modern Architecture",
        description: "Contemporary building design",
        category: "architecture"
    }
];

async function loadGalleryImages() {
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;
    
    try {
        // In a real implementation, you would fetch a list of images from the server
        // For this demo, we'll use the sample data
        const images = await getImageList();
        
        // Update image count
        document.getElementById('image-count').textContent = `${images.length} images loaded`;
        
        // Clear loading state
        galleryContainer.innerHTML = '';
        
        // Create gallery items
        images.forEach((image, index) => {
            const galleryItem = createGalleryItem(image, index);
            galleryContainer.appendChild(galleryItem);
        });
        
        // Initialize modal functionality
        initModal();
        
    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryContainer.innerHTML = `
            <div class="error">
                <p>Unable to load images. Make sure the /images/travel folder exists.</p>
                <p>For demo purposes, placeholder images are shown.</p>
            </div>
        `;
        
        // Load sample images as fallback
        loadSampleImages();
    }
}

async function getImageList() {
    // In a real implementation, this would fetch from an API or directory listing
    // Since we're static, we'll return sample data with placeholder images
    
    return sampleImages.map(img => ({
        ...img,
        // Using placeholder images since we don't have actual files
        url: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000)}?auto=format&fit=crop&w=800&q=80`,
        localPath: `images/travel/${img.filename}`
    }));
}

function createGalleryItem(image, index) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.index = index;
    
    // Create filename from title if not provided
    const filename = image.filename || image.title.toLowerCase().replace(/\s+/g, '-') + '.jpg';
    const altText = image.title || filename.replace(/\.(jpg|jpeg|png|gif)$/i, '').replace(/[-_]/g, ' ');
    
    item.innerHTML = `
        <img 
            src="${image.url}" 
            alt="${altText}"
            loading="lazy"
            data-src="${image.localPath}"
            onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"300\"><rect width=\"100%\" height=\"100%\" fill=\"%23333\"/><text x=\"50%\" y=\"50%\" font-family=\"Arial\" font-size=\"16\" fill=\"white\" text-anchor=\"middle\" dy=\".3em\">${image.title}</text></svg>'"
        >
        <div class="image-caption">
            <strong>${image.title}</strong>
            <p>${image.description || ''}</p>
        </div>
    `;
    
    // Add click event for modal
    item.addEventListener('click', () => openModal(image, index));
    
    return item;
}

function loadSampleImages() {
    const galleryContainer = document.getElementById('gallery-container');
    
    sampleImages.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        // Create a placeholder image using Unsplash
        const unsplashId = ['1506905925346-21bda4d32df4', '1519681393784-d120267933ba', '1505142468610-359e5e6f785e', 
                           '1519996529931-28324d5a630e', '1506905925346-21bda4d32df4', '1519681393784-d120267933ba'][index % 6];
        
        item.innerHTML = `
            <img 
                src="https://images.unsplash.com/photo-${unsplashId}?auto=format&fit=crop&w=800&q=80" 
                alt="${image.title}"
                loading="lazy"
            >
            <div class="image-caption">
                <strong>${image.title}</strong>
                <p>${image.description} (Sample Image)</p>
            </div>
        `;
        
        item.addEventListener('click', () => openModal({
            ...image,
            url: `https://images.unsplash.com/photo-${unsplashId}?auto=format&fit=crop&w=1200&q=80`
        }, index));
        
        galleryContainer.appendChild(item);
    });
    
    initModal();
    document.getElementById('image-count').textContent = `${sampleImages.length} sample images loaded`;
}

function initModal() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.querySelector('.modal-close');
    
    // Close modal when clicking X
    closeBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
}

function openModal(image, index) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDescription');
    
    // Use higher resolution image for modal
    const hiResUrl = image.url.replace(/w=\d+/, 'w=1200').replace(/&q=\d+/, '&q=90');
    
    modalImg.src = hiResUrl;
    modalImg.alt = image.title;
    modalTitle.textContent = image.title;
    modalDesc.textContent = image.description || '';
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}