class MemoryGame {
    constructor() {
        this.cards = [];
        this.flippedCards = [];
        this.gameStarted = false;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.generatedImages = [];
        this.setupEventListeners();
        
        // Unsplash API key
        this.unsplashAccessKey = 'Qqf-I1Diq4ssTjGU500VrAF6t2O2c11o-k6yzVBk2mc';
    }

    setupEventListeners() {
        document.getElementById('imageUpload').addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('startGame').addEventListener('click', () => this.startGame());
        document.getElementById('playerCount').addEventListener('change', () => this.updatePlayerScores());
        document.getElementById('generateImages').addEventListener('click', () => this.searchImages());
    }

    async searchImages() {
        const prompt = document.getElementById('imagePrompt').value.trim();
        const count = parseInt(document.getElementById('imageCount').value);
        
        if (!prompt) {
            alert('Please enter search terms for the images.');
            return;
        }

        if (count < 2 || count > 10) {
            alert('Please choose between 2 and 10 images.');
            return;
        }

        const generateSection = document.querySelector('.generate-section');
        generateSection.classList.add('loading');
        
        try {
            const response = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(prompt)}&count=${count}`, {
                headers: {
                    'Authorization': `Client-ID ${this.unsplashAccessKey}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch images');
            }

            const data = await response.json();
            this.generatedImages = data.map(photo => ({
                url: photo.urls.regular,
                alt: photo.alt_description || 'Unsplash Image'
            }));

            const generatedImagesDiv = document.getElementById('generatedImages');
            generatedImagesDiv.innerHTML = '';
            
            this.generatedImages.forEach((image, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'generated-image';
                
                const img = document.createElement('img');
                img.src = image.url;
                img.alt = image.alt;
                imgContainer.appendChild(img);
                
                generatedImagesDiv.appendChild(imgContainer);
            });

            // Enable start game button and prepare cards
            this.cards = [];
            this.generatedImages.forEach(image => {
                this.cards.push({ id: this.cards.length, url: image.url });
                this.cards.push({ id: this.cards.length + 1, url: image.url });
            });
            
            document.getElementById('startGame').disabled = false;
            
        } catch (error) {
            alert('Error fetching images: ' + error.message);
        } finally {
            generateSection.classList.remove('loading');
        }
    }

    handleImageUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length < 2) {
            alert('Please upload at least 2 images to play the game.');
            return;
        }
        
        this.cards = [];
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            this.cards.push({ id: this.cards.length, url });
            this.cards.push({ id: this.cards.length + 1, url });
        });
        
        document.getElementById('startGame').disabled = false;
    }

    updatePlayerScores() {
        const playerCount = parseInt(document.getElementById('playerCount').value);
        this.players = Array.from({ length: playerCount }, (_, i) => ({
            id: i + 1,
            score: 0
        }));
        
        this.renderPlayerScores();
    }

    renderPlayerScores() {
        const scoresDiv = document.getElementById('playerScores');
        scoresDiv.innerHTML = '';
        
        this.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player-score ${index === this.currentPlayerIndex ? 'active' : ''}`;
            playerDiv.textContent = `Player ${player.id}: ${player.score}`;
            scoresDiv.appendChild(playerDiv);
        });

        const currentPlayerDiv = document.getElementById('currentPlayer');
        if (this.gameStarted) {
            currentPlayerDiv.textContent = `Current Turn: Player ${this.players[this.currentPlayerIndex].id}`;
        } else {
            currentPlayerDiv.textContent = '';
        }
    }

    startGame() {
        if (this.cards.length < 4) {
            alert('Please upload or search for at least 2 images first!');
            return;
        }

        if (!this.players.length) {
            this.updatePlayerScores();
        }

        this.gameStarted = true;
        this.flippedCards = [];
        this.currentPlayerIndex = 0;
        this.players.forEach(player => player.score = 0);
        this.shuffleCards();
        this.renderBoard();
        this.renderPlayerScores();
        
        // Disable image inputs during game
        document.getElementById('imageUpload').disabled = true;
        document.getElementById('generateImages').disabled = true;
        document.getElementById('imagePrompt').disabled = true;
        document.getElementById('imageCount').disabled = true;
        document.getElementById('startGame').disabled = true;
    }

    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        this.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            
            const img = document.createElement('img');
            img.src = card.url;
            cardElement.appendChild(img);
            
            cardElement.addEventListener('click', () => this.flipCard(cardElement, index));
            gameBoard.appendChild(cardElement);
        });
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.renderPlayerScores();
    }

    flipCard(cardElement, index) {
        if (!this.gameStarted || 
            this.flippedCards.length >= 2 || 
            this.flippedCards.includes(index) ||
            cardElement.classList.contains('matched')) {
            return;
        }

        cardElement.classList.add('flipped');
        this.flippedCards.push(index);

        if (this.flippedCards.length === 2) {
            setTimeout(() => this.checkMatch(), 300);
        }
    }

    checkMatch() {
        const [firstIndex, secondIndex] = this.flippedCards;
        const firstCard = this.cards[firstIndex];
        const secondCard = this.cards[secondIndex];
        
        if (firstCard.url === secondCard.url) {
            // Match found
            document.querySelectorAll('.card')[firstIndex].classList.add('matched');
            document.querySelectorAll('.card')[secondIndex].classList.add('matched');
            this.players[this.currentPlayerIndex].score++;
            this.renderPlayerScores();
            this.flippedCards = [];
            
            // Check if game is complete
            if (document.querySelectorAll('.matched').length === this.cards.length) {
                const winners = this.getWinners();
                const winnerText = winners.length > 1 
                    ? `It's a tie between Players ${winners.join(' and ')}!`
                    : `Player ${winners[0]} wins!`;
                alert(`Game Over! ${winnerText}`);
                this.gameStarted = false;
            }
        } else {
            // No match
            setTimeout(() => {
                document.querySelectorAll('.card')[firstIndex].classList.remove('flipped');
                document.querySelectorAll('.card')[secondIndex].classList.remove('flipped');
                this.flippedCards = [];
                this.nextPlayer();
            }, 1000);
        }
    }

    getWinners() {
        const maxScore = Math.max(...this.players.map(p => p.score));
        return this.players
            .filter(p => p.score === maxScore)
            .map(p => p.id);
    }
}

// Initialize the game
const game = new MemoryGame();
