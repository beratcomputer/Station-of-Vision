/**
 * Station of Vision - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    let allCategories = [];
    let allVideos = [];

    // DOM Elements
    const navbar = document.getElementById('navbar');
    const searchInput = document.getElementById('searchInput');
    const categoryContainer = document.getElementById('categoryContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    
    // Hero Elements
    const heroBg = document.getElementById('heroBg');
    const heroTitle = document.getElementById('heroTitle');
    const heroDesc = document.getElementById('heroDesc');
    const heroPlayBtn = document.getElementById('heroPlayBtn');
    let currentHeroVideo = null;

    // Player Elements
    const playerModal = document.getElementById('playerModal');
    const playerBackdrop = document.getElementById('playerBackdrop');
    const closePlayerBtn = document.getElementById('closePlayerBtn');
    const mainVideoPlayer = document.getElementById('mainVideoPlayer');
    const videoSource = document.getElementById('videoSource');
    const playerVideoTitle = document.getElementById('playerVideoTitle');

    // ─── Navbar Scroll Effect ─────────────────────────────────────────
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // ─── Format File Size ─────────────────────────────────────────────
    function formatBytes(bytes, decimals = 1) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // ─── Load Categories & Videos ─────────────────────────────────────
    async function loadContent() {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) throw new Error('Kategoriler alınamadı');
            
            allCategories = await response.json();
            
            // Flatten all videos for search and hero selection
            allVideos = [];
            allCategories.forEach(cat => {
                cat.videos.forEach(v => {
                    allVideos.push({ ...v, categoryName: cat.name });
                });
            });

            renderCategories(allCategories);
            setupHero();
        } catch (err) {
            console.error('İçerik yükleme hatası:', err);
            loadingSpinner.classList.add('hidden');
            emptyState.classList.remove('hidden');
        }
    }

    // ─── Render Category Rows ─────────────────────────────────────────
    function renderCategories(categories) {
        loadingSpinner.classList.add('hidden');
        categoryContainer.innerHTML = '';

        if (!categories || categories.length === 0 || allVideos.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        categories.forEach((cat, index) => {
            if (!cat.videos || cat.videos.length === 0) return;

            const row = document.createElement('section');
            row.className = 'category-row';
            row.innerHTML = `
                <div class="category-header">
                    <h2 class="category-title">
                        <span>${escapeHtml(cat.name)}</span>
                    </h2>
                    <span class="category-count">${cat.videos.length} video</span>
                </div>
                <div class="carousel-wrapper">
                    <button class="carousel-btn prev" aria-label="Geri">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div class="carousel-track" id="track-${index}">
                        ${cat.videos.map(video => createVideoCardHtml(video)).join('')}
                    </div>
                    <button class="carousel-btn next" aria-label="İleri">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
            `;

            categoryContainer.appendChild(row);

            // Setup Carousel Scrolling
            const track = row.querySelector('.carousel-track');
            const prevBtn = row.querySelector('.carousel-btn.prev');
            const nextBtn = row.querySelector('.carousel-btn.next');

            prevBtn.addEventListener('click', () => {
                track.scrollBy({ left: -track.clientWidth * 0.75, behavior: 'smooth' });
            });

            nextBtn.addEventListener('click', () => {
                track.scrollBy({ left: track.clientWidth * 0.75, behavior: 'smooth' });
            });

            // Card click listener
            track.querySelectorAll('.video-card').forEach(card => {
                card.addEventListener('click', () => {
                    const videoId = card.getAttribute('data-id');
                    const videoName = card.getAttribute('data-name');
                    openPlayer(videoId, videoName);
                });
            });
        });
    }

    // ─── Generate Card HTML ───────────────────────────────────────────
    function createVideoCardHtml(video) {
        const thumbUrl = `/api/thumbnail/${video.id}`;
        return `
            <div class="video-card" data-id="${video.id}" data-name="${escapeHtml(video.name)}">
                <div class="video-thumb-wrapper">
                    <img class="video-thumb" src="${thumbUrl}" alt="${escapeHtml(video.name)}" loading="lazy" onerror="this.src='/static/img/thumbnail.jfif'">
                    <div class="video-play-overlay">
                        <div class="play-circle">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                </div>
                <div class="video-info">
                    <div class="video-title" title="${escapeHtml(video.name)}">${escapeHtml(video.name)}</div>
                    <div class="video-meta">
                        <span>MP4</span>
                        <span>${formatBytes(video.size)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── Setup Hero Section ───────────────────────────────────────────
    function setupHero() {
        if (allVideos.length === 0) return;

        // Choose random featured video
        currentHeroVideo = allVideos[Math.floor(Math.random() * allVideos.length)];

        heroTitle.textContent = currentHeroVideo.name;
        heroDesc.textContent = `${currentHeroVideo.categoryName} kategorisinden yerel video. Yüksek hızda akış ve sıfır gecikme ile hemen izleyin.`;
        heroBg.style.backgroundImage = `url('/api/thumbnail/${currentHeroVideo.id}'), url('/static/img/thumbnail.jfif')`;

        heroPlayBtn.onclick = () => {
            if (currentHeroVideo) {
                openPlayer(currentHeroVideo.id, currentHeroVideo.name);
            }
        };
    }

    // ─── Video Player Modal Functions ─────────────────────────────────
    function openPlayer(videoId, videoTitle) {
        playerVideoTitle.textContent = videoTitle;
        const streamUrl = `/api/video/${videoId}`;
        
        videoSource.src = streamUrl;
        mainVideoPlayer.load();
        playerModal.classList.add('open');
        mainVideoPlayer.play().catch(e => console.log('Autoplay engellendi:', e));
        document.body.style.overflow = 'hidden';
    }

    function closePlayer() {
        playerModal.classList.remove('open');
        mainVideoPlayer.pause();
        videoSource.src = '';
        mainVideoPlayer.load();
        document.body.style.overflow = '';
    }

    closePlayerBtn.addEventListener('click', closePlayer);
    playerBackdrop.addEventListener('click', closePlayer);

    // Escape Key to close player
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && playerModal.classList.contains('open')) {
            closePlayer();
        }
    });

    // ─── Search Filtering ─────────────────────────────────────────────
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        if (!query) {
            renderCategories(allCategories);
            return;
        }

        const filteredCategories = allCategories.map(cat => {
            const matchedVideos = cat.videos.filter(v => 
                v.name.toLowerCase().includes(query) || 
                v.filename.toLowerCase().includes(query)
            );
            return {
                ...cat,
                videos: matchedVideos
            };
        }).filter(cat => cat.videos.length > 0);

        renderCategories(filteredCategories);
    });

    // ─── Helper: HTML Escape ──────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Start loading
    loadContent();
});
