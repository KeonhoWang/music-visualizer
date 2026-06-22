# 🎵 Music Visualizer

An interactive web-based music visualizer that transforms audio into stunning real-time visual effects. Users can upload songs, create playlists, switch between multiple visualization modes, view synchronized lyrics, customize themes, take screenshots, and enjoy an immersive music experience directly in the browser.

---

## 🚀 Features

### 🎶 Audio Playback
- Upload and play local audio files
- Playlist support
- Previous / Next track controls
- Progress tracking and seeking
- Volume control
- Song information display

### 🎨 Visualization Modes
- Bar Spectrum Visualizer
- Circular Audio Visualizer
- Waveform Visualizer
- Particle Visualizer
- Spiral Visualizer
- Mirror Visualizer

### 🎭 Customization
- Multiple color themes
- Dynamic visual effects
- Beat flash effects
- Responsive interface

### 📝 Lyrics Support
- LRC lyric synchronization
- Manual lyric timing
- Beat-synced lyric mode
- Real-time lyric display

### 📋 Playlist Management
- Add multiple songs
- Playlist sidebar
- Quick song switching
- Remove songs from playlist

### ⏱️ Sleep Timer
- 5-minute timer
- 10-minute timer
- 15-minute timer
- 30-minute timer
- 1-hour timer
- Timer cancellation support

### 📸 Additional Features
- Screenshot capture
- Drag-and-drop audio uploads
- Real-time audio analysis
- Animated UI effects

---

## 🛠️ Tech Stack

- HTML5
- CSS3
- JavaScript (ES6)
- Web Audio API
- Canvas API

---

## 📂 Project Structure

```text
music-visualizer/
│
├── index.html
├── style.css
└── visualizer.js
```

---

## 🎮 How It Works

The application uses the Web Audio API to analyze frequency and waveform data from uploaded audio files in real time.

Audio data is processed through an AnalyserNode and rendered onto an HTML5 Canvas using different visualization algorithms. Users can switch between multiple visualization modes while listening to music, creating a unique visual experience synchronized with the audio.

---

## ✨ Visualization Modes

### 📊 Bars
Traditional frequency spectrum visualization displaying audio intensity across frequencies.

### ⭕ Circle
Circular spectrum visualization that reacts dynamically to beats and volume changes.

### 🌊 Wave
Smooth waveform representation of the currently playing audio.

### ✨ Particles
Particle system that responds to frequency peaks and rhythm.

### 🌀 Spiral
Rotating spiral patterns generated from audio frequency data.

### 🪞 Mirror
Symmetrical mirrored visual effects based on the audio spectrum.

---

## 🧩 Challenges & Solutions

### Real-Time Audio Processing

Used the Web Audio API's AnalyserNode to efficiently process audio frequency data while maintaining smooth playback.

### Performance Optimization

Optimized canvas rendering and animation loops to ensure high frame rates and responsive interactions.

### Lyrics Synchronization

Implemented support for both timestamped LRC lyrics and beat-based synchronization for greater flexibility.

### Playlist Management

Created a dynamic playlist system allowing users to manage and switch between multiple audio files seamlessly.

---

## 💡 Skills Demonstrated

- JavaScript Development
- Audio Processing
- Web Audio API
- HTML5 Canvas
- Real-Time Data Visualization
- UI/UX Design
- Animation Systems
- Event-Driven Programming
- Performance Optimization
- Front-End Development

---

## 📈 Future Improvements

- Spotify Integration
- Audio Streaming Support
- More Visualization Modes
- Fullscreen Visualizer Mode
- Audio Recording Support
- Equalizer Controls
- Visualization Presets
- Mobile App Version

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Keonho Wang**

Software Engineering Student passionate about Front-End Development, Interactive Experiences, and Creative Technology.

---
