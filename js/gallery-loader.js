const TRAVEL_PASSWORD = 'AlsoCanDo';
const TRAVEL_DATA_URL = 'data/travel-stories.json?v=20260518-facebook-details';

const travelState = {
    stories: [],
    activeFilter: 'all',
    personalUnlocked: sessionStorage.getItem('travelAuth') === 'true'
};

const travelFilters = [
    { id: 'all', label: 'All', matches: () => true },
    { id: 'business', label: 'Business Trips', matches: story => story.type === 'business' },
    { id: 'personal', label: 'Personal Travel', matches: story => story.type === 'personal' },
    { id: 'event', label: 'Events', matches: story => story.tags.includes('event') },
    { id: 'city', label: 'Cities', matches: story => story.tags.includes('city') },
    { id: 'nature', label: 'Nature', matches: story => story.tags.includes('nature') }
];

async function loadTravelJournal() {
    const journalContainer = document.getElementById('travel-journal');
    if (!journalContainer) return;

    renderLoadingState(journalContainer);

    try {
        const response = await fetch(TRAVEL_DATA_URL, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Unable to load ${TRAVEL_DATA_URL}`);
        }

        const stories = await response.json();
        travelState.stories = stories.map(normalizeStory);
        renderTravelJournal();
    } catch (error) {
        console.error('Error loading travel stories:', error);
        renderErrorState(journalContainer);
    }
}

function normalizeStory(story) {
    return {
        id: story.id,
        title: story.title,
        location: story.location,
        date: story.date,
        type: story.type,
        visibility: story.visibility,
        summary: story.summary,
        source: story.source,
        image: story.image,
        tags: Array.isArray(story.tags) ? story.tags : []
    };
}

function renderTravelJournal() {
    renderFilters();
    renderUnlockState();
    renderStoryCards();
}

function renderFilters() {
    const filterContainer = document.getElementById('travel-filters');
    if (!filterContainer) return;

    filterContainer.innerHTML = '';

    travelFilters.forEach(filter => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `travel-filter${travelState.activeFilter === filter.id ? ' active' : ''}`;
        button.textContent = filter.label;
        button.setAttribute('aria-pressed', String(travelState.activeFilter === filter.id));
        button.addEventListener('click', () => {
            travelState.activeFilter = filter.id;
            renderTravelJournal();
        });
        filterContainer.appendChild(button);
    });
}

function renderUnlockState() {
    const unlockButton = document.getElementById('unlock-personal-travel');
    const unlockNote = document.getElementById('travel-unlock-note');
    if (!unlockButton || !unlockNote) return;

    if (travelState.personalUnlocked) {
        unlockButton.textContent = 'Personal travel unlocked';
        unlockButton.disabled = true;
        unlockNote.textContent = 'Private personal stories are visible in this browser session.';
        return;
    }

    unlockButton.textContent = 'Unlock personal travel';
    unlockButton.disabled = false;
    unlockNote.textContent = 'Personal stories stay private until unlocked.';
}

function renderStoryCards() {
    const journalContainer = document.getElementById('travel-journal');
    const countElement = document.getElementById('image-count');
    if (!journalContainer) return;

    const visibleStories = getVisibleStories();
    journalContainer.innerHTML = '';

    if (visibleStories.length === 0) {
        renderEmptyState(journalContainer);
    } else {
        visibleStories.forEach(story => {
            journalContainer.appendChild(createStoryCard(story));
        });
    }

    if (countElement) {
        const publicCount = travelState.stories.filter(story => story.visibility === 'public').length;
        const privateCount = travelState.stories.length - publicCount;
        countElement.textContent = travelState.personalUnlocked
            ? `${visibleStories.length} stories shown`
            : `${publicCount} public stories · ${privateCount} private`;
    }
}

function getVisibleStories() {
    const activeFilter = travelFilters.find(filter => filter.id === travelState.activeFilter) || travelFilters[0];

    return travelState.stories.filter(story => {
        const canShow = story.visibility === 'public' || travelState.personalUnlocked;
        return canShow && activeFilter.matches(story);
    });
}

function createStoryCard(story) {
    const article = document.createElement('article');
    article.className = `travel-story-card ${story.type === 'business' ? 'business-trip' : 'personal-trip'}`;

    const imageWrap = document.createElement('button');
    imageWrap.type = 'button';
    imageWrap.className = 'travel-story-image';
    imageWrap.setAttribute('aria-label', `View details for ${story.title}`);
    imageWrap.addEventListener('click', () => openModal(story));

    const image = document.createElement('img');
    image.src = story.image || createFallbackImage(story);
    image.alt = story.title;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
        image.src = createFallbackImage(story);
    }, { once: true });
    imageWrap.appendChild(image);

    const body = document.createElement('div');
    body.className = 'travel-story-body';

    const meta = document.createElement('div');
    meta.className = 'travel-story-meta';
    meta.textContent = `${story.location} · ${formatTravelDate(story.date)}`;

    const title = document.createElement('h2');
    title.textContent = story.title;

    const summary = document.createElement('p');
    summary.textContent = story.summary;

    const badges = document.createElement('div');
    badges.className = 'travel-story-tags';
    uniqueTags(story).forEach(tag => {
        const badge = document.createElement('span');
        badge.textContent = formatTag(tag);
        badges.appendChild(badge);
    });

    body.append(meta, title, summary, badges);
    article.append(imageWrap, body);
    return article;
}

function formatTravelDate(value) {
    if (!value) return 'Date to confirm';
    const [year, month] = value.split('-');
    if (!month) return year;

    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
}

function formatTag(tag) {
    return tag
        .replace(/-/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatSource(source) {
    if (!source) return 'Manual review';

    const words = source.replace(/-/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function uniqueTags(story) {
    return [...new Set([story.type, ...story.tags])];
}

function createFallbackImage(story) {
    const title = encodeURIComponent(story.title);
    const typeColor = story.type === 'business' ? '0D9488' : '38BDF8';
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%23020617"/><stop offset="1" stop-color="%23${typeColor}"/></linearGradient></defs><rect width="900" height="620" fill="url(%23g)"/><text x="60" y="310" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="white">${title}</text><text x="60" y="370" font-family="Arial, sans-serif" font-size="24" fill="%23dbeafe">${encodeURIComponent(story.location)}</text></svg>`;
}

function renderLoadingState(container) {
    container.innerHTML = `
        <div class="loading-gallery">
            <div class="spinner"></div>
            <p>Loading travel stories...</p>
        </div>
    `;
}

function renderErrorState(container) {
    container.innerHTML = `
        <div class="travel-empty-state">
            <h2>Travel stories could not be loaded</h2>
            <p>Check that data/travel-stories.json is available.</p>
        </div>
    `;
}

function renderEmptyState(container) {
    if (travelState.activeFilter === 'personal' && !travelState.personalUnlocked) {
        container.innerHTML = `
            <div class="travel-empty-state">
                <h2>Unlock personal travel</h2>
                <p>Personal travel stories are hidden until you enter the password.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="travel-empty-state">
            <h2>No stories match this filter</h2>
            <p>Try another travel category or unlock personal travel.</p>
        </div>
    `;
}

function initTravelUnlock() {
    const unlockButton = document.getElementById('unlock-personal-travel');
    if (!unlockButton) return;

    unlockButton.addEventListener('click', () => {
        const password = prompt('Enter password to view personal travel:');
        if (password !== TRAVEL_PASSWORD) {
            renderUnlockState();
            return;
        }

        sessionStorage.setItem('travelAuth', 'true');
        travelState.personalUnlocked = true;
        renderTravelJournal();
    });
}

function initModal() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.querySelector('.modal-close');
    if (!modal || !closeBtn) return;

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
}

function openModal(story) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDescription');
    if (!modal || !modalImg || !modalTitle || !modalDesc) return;

    const fallbackUrl = createFallbackImage(story);
    modalImg.onerror = () => {
        modalImg.onerror = null;
        modalImg.src = fallbackUrl;
    };
    modalImg.src = story.image || fallbackUrl;
    modalImg.alt = story.title;
    modalTitle.textContent = story.title;
    modalDesc.textContent = [
        `${story.location} · ${formatTravelDate(story.date)}`,
        story.summary,
        `Tags: ${uniqueTags(story).map(formatTag).join(', ')}`,
        `Source: ${formatSource(story.source)}`
    ].filter(Boolean).join('\n\n');

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    if (!modal) return;

    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}
