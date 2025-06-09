:warning: This code was AI-generated! Run it at your own risk. :warning:
# Interactive Presentation Polls

A simple, real-time web slideshow and polling app for live presentations.

## Features
- Live and static slideshow modes
- Real-time audience polls with QR code and direct URL voting
- Speaker control interface (token-protected)
- One vote per user (session/IP-based)
- Minimal dependencies, easy deployment (Docker or Node.js)

## Project Structure
- `backend/` — Node.js/Express server, WebSocket, API, slide manifest
- `public/` — Static frontend (HTML, JS, CSS, slides)

## Quick Start (Local)
1. **Install dependencies:**
   ```sh
   cd backend
   npm install
   ```
2. **Start the server:**
   ```sh
   npm run dev
   # or
   npm start
   ```
3. **Open in browser:**
   - Audience: [http://localhost:3000/](http://localhost:3000/)
   - Speaker: [http://localhost:3000/speaker.html](http://localhost:3000/speaker.html)

4. **Speaker Token:**
   - On first run, the backend prints a token to the console and saves it in `.env`.
   - Use this token to log in as the speaker.

---

## 🚀 Deployment Plan

### 1. Build and Deploy the App

#### Option A: Docker (Recommended for Simplicity)
1. **Build the Docker image:**
   ```sh
   docker build -t presentation-polls .
   ```
2. **Run the container:**
   ```sh
   docker run -p 3000:3000 -v $(pwd)/public:/app/../public presentation-polls
   ```
   - This exposes the app on port 3000 and mounts your `public/` directory for static assets and slides.

#### Option B: Node.js Directly
1. **Install dependencies:**
   ```sh
   cd backend
   npm install
   ```
2. **Start the server:**
   ```sh
   npm start
   ```
   - The app will run on port 3000 by default.

### 2. Access the App
- **Audience view:**  
  [http://your-server:3000/](http://your-server:3000/)
- **Speaker control:**  
  [http://your-server:3000/speaker.html](http://your-server:3000/speaker.html)

### 3. Speaker: Retrieve the Control Token
- **On First Deployment:**
  - When the backend starts, it will print a line like:
    ```
    Generated speaker token: <your-long-token>
    ```
    or, if already present:
    ```
    Using speaker token: <your-long-token>
    ```
  - **Copy this token!** This is the only way to access the speaker controls.
- **If you missed the console output:**
  - The token is stored in the `.env` file in your project root (or in the backend directory if you're running from there):
    ```
    SPEAKER_TOKEN=your-long-token
    ```
  - Open `.env` and copy the value after `SPEAKER_TOKEN=`.

### 4. Run the Show as the Speaker
1. **Open the speaker control page:**  
   [http://your-server:3000/speaker.html](http://your-server:3000/speaker.html)
2. **Enter the speaker token** when prompted.
3. **Control the presentation:**
   - Use "Next" and "Previous" to advance slides.
   - Open/close polls as needed.
   - See real-time poll results and slide number.

### 5. Audience Participation
- Audience members visit [http://your-server:3000/](http://your-server:3000/) to follow the show.
- When a poll is active, they can vote via:
  - The on-screen poll UI (in live mode)
  - The QR code or short URL (e.g., `/vote/favorite-color`)

### 6. (Optional) Customization & Content
- **Edit `backend/slides.json`** to define your slides and polls.
- **Add slide HTML files** to `public/slides/`.
- **Restart the backend** after making changes to slides or polls.

### 7. Security Note
- **Keep your speaker token secret!** Anyone with the token can control the show.
- If you need to reset the token, delete the `SPEAKER_TOKEN` line in `.env` and restart the backend.

### 8. Troubleshooting
- If the speaker token is "invalid," check for multiple `SPEAKER_TOKEN` lines in `.env` and keep only the last one.
- Always restart the backend after editing `.env` or slide content.

---

## Slides & Polls
- Edit `backend/slides.json` to define slides and polls.
- Place slide HTML files in `public/slides/`.
- Poll slides must have `type: "poll"` and a unique `pollId`.

## Security
- Speaker control is protected by a random token (see `.env`).
- One vote per user is enforced by session cookie and IP rate limiting.

## Customization
- Edit CSS in `public/css/style.css` for theming.
- Add more slides or polls in `slides.json` and `public/slides/`.

## License
None