# 🍌 Banana Memory Game

A full-stack memory game using the [Official Banana API](http://marcconrad.com/uob/banana/api.php). Memorize the banana image, then type what you saw!

## Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript (pastel theme)
- **Backend:** Node.js, Express, MongoDB (Mongoose), bcryptjs, JWT

## Setup

### 1. Install Dependencies

```bash
cd banana-memory-game
npm install
```

### 2. Configure MongoDB

Open `server.js` and replace the placeholder with your MongoDB connection string:

```javascript
mongoose.connect("PASTE_YOUR_MONGODB_URL_HERE")
```

Example (MongoDB Atlas):
```javascript
mongoose.connect("mongodb+srv://username:password@cluster.mongodb.net/banana-game")
```

### 3. (Optional) Add Sound Files

Place these files in `public/sounds/`:
- `correct.mp3` – Plays on correct answer
- `wrong.mp3` – Plays on wrong answer  
- `bg-music.mp3` – Background music (loops)

The game works without these; audio is skipped if files are missing.

### 4. Start the Server

```bash
npm start
```

The app runs at **http://localhost:3000**

---

## Testing Guide

### Test Login

1. Open http://localhost:3000
2. Click **Sign Up**
3. Enter: Username, Email, Password (min 6 chars)
4. Click **Sign Up** – you should be logged in and see the game area
5. Click **Logout**
6. Click **Login**
7. Enter the same email and password
8. Click **Login** – you should see the game area again

### Test Game

1. Log in first (required)
2. Click **Start Game**
3. A banana puzzle image appears for 5 seconds (Level 1)
4. After the timer, type your answer in the input
5. Click **Submit** or press Enter
6. See correct/wrong feedback
7. After 5 questions, the game ends
8. Your score is saved and the top 5 leaderboard is shown

### Test Leaderboard

1. Complete a game (5 questions)
2. The **Top 5 Leaderboard** appears at the bottom of the Game Over screen
3. Play again with another account to see multiple scores
4. Leaderboard shows highest scores first

---

## API Routes

| Method | Route        | Description                    | Auth   |
|--------|--------------|--------------------------------|--------|
| GET    | /puzzle      | Proxy to Banana API            | No     |
| POST   | /signup      | Register new user              | No     |
| POST   | /login       | Login, returns JWT             | No     |
| POST   | /save-score  | Save score (protected)         | JWT    |
| GET    | /leaderboard | Top 5 scores                   | No     |

---

## Level System

- **Level 1 (Easy):** Image visible for 5 seconds
- **Level 2 (Medium):** Image visible for 3 seconds  
- **Level 3 (Hard):** Image visible for 2 seconds

Level increases every 5 correct answers.

---

## Project Structure

```
banana-memory-game/
├── public/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── sounds/
│       ├── correct.mp3
│       ├── wrong.mp3
│       └── bg-music.mp3
├── server.js
├── package.json
└── README.md
```
