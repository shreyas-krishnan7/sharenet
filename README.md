# 🚀 ShareNet — Real-Time Communication & File Sharing Platform

![React](https://img.shields.io/badge/React-Frontend-61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248)
![WebSockets](https://img.shields.io/badge/WebSockets-RealTime-orange)
![Twilio](https://img.shields.io/badge/Twilio-Video%20Calling-F22F46)
![Railway](https://img.shields.io/badge/Railway-Backend%20Hosting-0B0D0E)
![Vercel](https://img.shields.io/badge/Vercel-Frontend%20Hosting-black)

ShareNet is a full-stack communication platform that enables users to exchange messages, transfer large files, and conduct real-time audio/video calls through a unified interface.

Built using the MERN stack, WebSockets, and Twilio APIs, ShareNet demonstrates real-time communication, chunk-based file transfer, user presence management, and scalable full-stack application development.

---

## 🌐 Live Demo

**Live Application:** https://sharenet-ashen.vercel.app/

**GitHub Repository:** https://github.com/shreyas-krishnan7/sharenet

---

## 📌 Overview

ShareNet was developed to provide a seamless communication experience by combining instant messaging, file sharing, and voice/video calling within a single application.

The platform enables users to:

* Register and manage accounts
* View currently online users
* Exchange messages in real time
* Transfer large files efficiently
* Conduct audio and video calls
* Communicate through secure encrypted channels

---

## ✨ Features

### 🔐 User Authentication

* User Registration
* User Login
* Secure credential management
* Protected user sessions

### 💬 Real-Time Messaging

* One-to-one private messaging
* Instant message delivery using WebSockets
* Real-time user communication
* Dynamic online user tracking

### 📁 Chunk-Based File Sharing

* Transfer files of virtually any size
* File chunking before transmission
* Receiver-side file reconstruction
* Support for documents, images, videos, archives, and other file formats

### 📞 Audio & Video Calling

* One-to-one audio calling
* One-to-one video calling
* Twilio-powered communication services
* Low-latency call experience

### 🟢 Online Presence System

* View currently active users
* Real-time availability updates
* Live user status management

### 🔒 Secure Communication

* TLS-secured WebSocket communication
* Encrypted audio and video streams through Twilio/WebRTC
* Secure backend API handling

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │       Vercel        │
                    │   React Frontend    │
                    └──────────┬──────────┘
                               │
                               │ HTTPS
                               │
                    ┌──────────▼──────────┐
                    │      Railway        │
                    │ Node.js + Express   │
                    └──────────┬──────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
               ▼                               ▼

      ┌──────────────────┐          ┌──────────────────┐
      │  MongoDB Atlas   │          │      Twilio      │
      │ User Data & Auth │          │ Audio/Video APIs │
      └──────────────────┘          └──────────────────┘

                               │
                               ▼

                    ┌─────────────────────┐
                    │     WebSockets      │
                    │ Real-Time Messaging │
                    └─────────────────────┘
```

---

## 🛠️ Tech Stack

| Category                | Technology    |
| ----------------------- | ------------- |
| Frontend                | React.js      |
| Styling                 | Tailwind CSS  |
| Backend                 | Node.js       |
| Framework               | Express.js    |
| Database                | MongoDB Atlas |
| Real-Time Communication | WebSockets    |
| Audio & Video Calling   | Twilio API    |
| Build Tool              | Vite          |
| Frontend Deployment     | Vercel        |
| Backend Deployment      | Railway       |

---

## ☁️ Deployment

ShareNet is deployed using a cloud-based architecture:

### Frontend

* Hosted on Vercel
* Optimized React production build
* Fast global content delivery

### Backend

* Hosted on Railway
* Handles APIs, authentication, user management, and WebSocket communication

### Database

* MongoDB Atlas for cloud-based data persistence

### Communication Services

* Twilio APIs for real-time audio and video calling

---

## 📂 Project Structure

### Backend

```text
backend
│
├── config/
├── controllers/
├── models/
├── routes/
├── signaling/
├── utils/
│
├── loadenv.js
├── server.js
└── package.json
```

#### Backend Responsibilities

* User Authentication
* Database Operations
* WebSocket Communication
* User Presence Tracking
* Signaling Services
* Twilio Integration

---

### Frontend

```text
softwareproject
│
├── public/
├── src/
│
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

#### Frontend Responsibilities

* Authentication UI
* Chat Interface
* File Sharing Interface
* Audio/Video Call Interface
* User Dashboard
* Real-Time Updates

---

## 🚀 Getting Started

### Prerequisites

Make sure the following are installed:

* Node.js (v18+ recommended)
* npm
* MongoDB Atlas Account
* Twilio Account

---

### Clone Repository

```bash
git clone https://github.com/shreyas-krishnan7/sharenet.git

cd sharenet
```

---

## Backend Setup

```bash
cd backend

npm install
```

Create a `.env` file:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

TWILIO_ACCOUNT_SID=your_account_sid

TWILIO_API_KEY=your_api_key

TWILIO_API_SECRET=your_api_secret
```

Start the backend server:

```bash
npm start
```

Backend will run on:

```text
http://localhost:5000
```

---

## Frontend Setup

```bash
cd softwareproject

npm install
```

Start the frontend:

```bash
npm run dev
```

Frontend will run on:

```text
http://localhost:5173
```

---

## 🎮 How to Use

### Step 1 — Create an Account

Register using the signup page and log in securely.

### Step 2 — View Online Users

Browse the list of currently active users.

### Step 3 — Start a Conversation

Select a user and begin chatting instantly.

### Step 4 — Share Files

Choose a file and send it directly through the platform.

### Step 5 — Make Calls

Initiate audio or video calls directly from the communication interface.

---

## 💡 Technical Highlights

### Real-Time Communication

Implemented WebSocket-based communication for instant messaging and online presence updates.

### Chunk-Based File Transfer

Large files are divided into smaller chunks before transmission and reconstructed at the receiver's end, enabling efficient large-file sharing.

### Cloud-Native Deployment

Frontend and backend are deployed independently using Vercel and Railway, following modern deployment practices.

### Third-Party API Integration

Integrated Twilio APIs to provide reliable real-time audio and video communication.

### Full-Stack Architecture

Built using a complete MERN-based architecture with separate frontend and backend services.

---

## 📈 Future Enhancements

* Group Chats
* Group Audio/Video Calls
* End-to-End Message Encryption
* Read Receipts
* Message Reactions
* Screen Sharing
* File Transfer Progress Indicators
* Message Search Functionality
* Mobile Application Support


