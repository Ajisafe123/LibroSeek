let favorites = JSON.parse(localStorage.getItem('libroseek-favorites')) || [];

const navbar = document.querySelector('.navbar');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.navbar ul');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const searchResults = document.getElementById('searchResults');
const categoryResults = document.getElementById('categoryResults');
const favoritesResults = document.getElementById('favoritesResults');
const favoritesContainer = document.getElementById('favoritesContainer');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 100);
});

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.querySelector('i').className = navLinks.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                menuToggle.querySelector('i').className = 'fas fa-bars';
            }
        }
    });
});

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    showLoading(true);
    searchResults.innerHTML = '';
    try {
        const books = await fetchBooks(query);
        displayBooks(books, searchResults);
    } catch (error) {
        searchResults.innerHTML = '<div class="no-books"><i class="fas fa-exclamation-circle"></i><h3>Search failed</h3><p>Please try again later.</p></div>';
    } finally {
        showLoading(false);
    }
}

document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => exploreCategory(card.dataset.category));
});

async function exploreCategory(category) {
    showLoading(true);
    categoryResults.innerHTML = '';
    try {
        const books = await fetchBooks(`subject:${category}`, 20);
        displayBooks(books, categoryResults);
        document.getElementById('categoryResults').scrollIntoView({ behavior: 'smooth' });
    } catch {
        categoryResults.innerHTML = '<div class="no-books"><i class="fas fa-exclamation-circle"></i><h3>Failed to load books</h3><p>Please try again later.</p></div>';
    } finally {
        showLoading(false);
    }
}

async function fetchBooks(query, maxResults = 12) {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&printType=books&orderBy=relevance`);
    if (!response.ok) throw new Error('Failed to fetch books');
    const data = await response.json();
    return data.items || [];
}

function displayBooks(books, container) {
    if (!books || books.length === 0) {
        container.innerHTML = '<div class="no-books"><i class="fas fa-book"></i><h3>No books found</h3><p>Try searching with different keywords.</p></div>';
        return;
    }
    container.innerHTML = books.map(createBookCard).join('');
}

function createBookCard(book) {
    const info = book.volumeInfo;
    const bookId = book.id;
    const title = info.title || 'Unknown Title';
    const authors = info.authors ? info.authors.join(', ') : 'Unknown Author';
    const description = info.description || 'No description available.';
    const thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="%23f0f0f0"/><text x="100" y="150" text-anchor="middle" fill="%23999" font-family="Arial" font-size="16">No Cover</text></svg>';
    const previewLink = info.previewLink || info.infoLink || '#';
    const isFavorite = favorites.some(fav => fav.id === bookId);

    return `
        <div class="book-card" data-book-id="${bookId}">
            <img src="${thumbnail.replace('http:', 'https:')}" alt="${title}" class="book-cover" loading="lazy">
            <div class="book-title">${title}</div>
            <div class="book-author">by ${authors}</div>
            <div class="book-description">${description.replace(/<[^>]*>/g, '').substring(0, 150)}${description.length > 150 ? '...' : ''}</div>
            <div class="book-actions">
                <a href="${previewLink}" target="_blank" class="btn btn-primary"><i class="fas fa-book-open"></i> Read Preview</a>
                <button class="btn btn-favorite ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${bookId}', '${title.replace(/'/g, "\\'")}', '${authors.replace(/'/g, "\\'")}', '${thumbnail.replace('http:', 'https:').replace(/'/g, "\\'")}', '${previewLink.replace(/'/g, "\\'")}')"><i class="fas fa-heart"></i> ${isFavorite ? 'Favorited' : 'Favorite'}</button>
            </div>
        </div>
    `;
}

function toggleFavorite(id, title, authors, thumbnail, previewLink) {
    const index = favorites.findIndex(fav => fav.id === id);
    if (index > -1) favorites.splice(index, 1);
    else favorites.push({ id, title, authors, thumbnail, previewLink });
    localStorage.setItem('libroseek-favorites', JSON.stringify(favorites));
    updateFavoriteButtons();
    displayFavorites();
}

function updateFavoriteButtons() {
    document.querySelectorAll('.btn-favorite').forEach(btn => {
        const bookId = btn.closest('.book-card').dataset.bookId;
        const isFavorite = favorites.some(fav => fav.id === bookId);
        btn.classList.toggle('active', isFavorite);
        btn.innerHTML = `<i class="fas fa-heart"></i> ${isFavorite ? 'Favorited' : 'Favorite'}`;
    });
}

function displayFavorites() {
    if (favorites.length === 0) {
        favoritesContainer.style.display = 'block';
        favoritesResults.innerHTML = '';
        return;
    }
    favoritesContainer.style.display = 'none';
    favoritesResults.innerHTML = favorites.map(book => `
        <div class="book-card" data-book-id="${book.id}">
            <img src="${book.thumbnail}" alt="${book.title}" class="book-cover" loading="lazy">
            <div class="book-title">${book.title}</div>
            <div class="book-author">by ${book.authors}</div>
            <div class="book-actions">
                <a href="${book.previewLink}" target="_blank" class="btn btn-primary"><i class="fas fa-book-open"></i> Read Preview</a>
                <button class="btn btn-favorite active" onclick="removeFavorite('${book.id}')"><i class="fas fa-trash"></i> Remove</button>
            </div>
        </div>
    `).join('');
}

function removeFavorite(id) {
    favorites = favorites.filter(fav => fav.id !== id);
    localStorage.setItem('libroseek-favorites', JSON.stringify(favorites));
    displayFavorites();
    updateFavoriteButtons();
}

function showLoading(show) {
    loading.classList.toggle('active', show);
}

displayFavorites();

window.addEventListener('load', async () => {
    try {
        const popularBooks = await fetchBooks('bestseller fiction', 8);
        if (popularBooks.length) {
            const popularSection = document.createElement('div');
            popularSection.innerHTML = `
                <div class="container">
                    <h3 style="text-align:center;font-size:2rem;margin-bottom:30px;color:#333;">Popular Books</h3>
                    <div class="books-grid">${popularBooks.map(createBookCard).join('')}</div>
                </div>
            `;
            document.getElementById('search').appendChild(popularSection);
        }
    } catch {}
});

const searchSuggestions = ['Harry Potter','Lord of the Rings','Pride and Prejudice','To Kill a Mockingbird','1984','The Great Gatsby','Jane Austen','Stephen King','Agatha Christie','mystery novels','science fiction','romance books'];

searchInput.addEventListener('input', e => {
    const value = e.target.value.toLowerCase();
    if (value.length > 2) searchSuggestions.filter(s => s.toLowerCase().includes(value));
});

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
    });
}, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

document.querySelectorAll('.section').forEach(section => observer.observe(section));

document.addEventListener('error', e => {
    if (e.target.tagName === 'IMG' && e.target.classList.contains('book-cover')) {
        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="%23f0f0f0"/><text x="100" y="140" text-anchor="middle" fill="%23999" font-family="Arial" font-size="14">No Cover</text><text x="100" y="160" text-anchor="middle" fill="%23999" font-family="Arial" font-size="14">Available</text></svg>';
    }
}, true);

function performAdvancedSearch(filters) {
    let query = filters.title || '';
    if (filters.author) query += ` inauthor:${filters.author}`;
    if (filters.subject) query += ` subject:${filters.subject}`;
    if (filters.isbn) query = `isbn:${filters.isbn}`;
    return fetchBooks(query, filters.maxResults || 12);
}

document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        document.getElementById('search').scrollIntoView({ behavior: 'smooth' });
    }
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        menuToggle.querySelector('i').className = 'fas fa-bars';
    }
});

if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    const observeImages = () => {
        document.querySelectorAll('img[loading="lazy"]').forEach(img => imageObserver.observe(img));
    };

    observeImages();
}

function shareBook(title, author, link) {
    if (navigator.share) navigator.share({ title: `${title} by ${author}`, text: `Check out this book: ${title} by ${author}`, url: link });
    else navigator.clipboard.writeText(`${title} by ${author} - ${link}`);
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('libroseek-theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

if (localStorage.getItem('libroseek-theme') === 'dark') document.body.classList.add('dark-theme');

console.log('LibroSeek loaded successfully! ');
