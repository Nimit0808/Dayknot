# 🚀 Dayknot - Smart Habit & Routine Tracker

Dayknot is a modern Progressive Web App (PWA) designed to help users build consistent habits, track daily routines, maintain streaks, and stay productive through smart reminders and insightful analytics.

Built with a lightweight full-stack architecture using Vanilla JavaScript, Node.js Serverless Functions, MongoDB Atlas, Google OAuth, and OneSignal Push Notifications.

## 🌐 Live Demo

https://dayknot.vercel.app

---

## ✨ Features

### 🔐 Authentication & Security

* Email Sign Up & Login
* Google Sign-In (OAuth 2.0)
* Email Verification
* Password Reset via Email
* Change Email
* Change Password
* Delete Account
* Secure User Authentication

### 👤 User Profile

* Profile Picture Support
* Custom Username
* Account Management
* Personalized Experience

### ✅ Habit & Task Tracking

* Create Daily Habits
* Mark Habits as Complete
* Monthly Calendar View
* Habit Completion History
* Task Synchronization

### 🔥 Streak Tracking

* Daily Streak Counter
* Best Streak Record
* Consistency Tracking
* Motivation Through Progress

### 📊 Analytics Dashboard

* Weekly Completion Percentage
* Monthly Completion Percentage
* Best Habit Streak
* Habit Heatmap
* Progress Insights

### 🎨 Modern UI

* Dark Mode
* Multiple Color Themes
* Responsive Design
* Mobile Friendly
* Clean & Minimal Interface

### 📱 Progressive Web App (PWA)

* Installable on Android/Desktop
* Standalone App Experience
* Offline Support for Static Assets
* Service Worker Integration
* Home Screen Installation

### 🔔 Smart Notifications

* Habit Reminder Notifications
* Background Push Notifications
* OneSignal Integration
* Reminder Scheduling
* Test Notification Support

---

## 🛠 Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript (ES6+)

### Backend

* Node.js
* Vercel Serverless Functions

### Database

* MongoDB Atlas

### Authentication

* Google OAuth 2.0
* Email Authentication

### Notifications

* OneSignal Web Push

### Email Service

* Resend

### Deployment

* Vercel

### Version Control

* Git
* GitHub

---

## 🏗 Architecture

User
↓
Dayknot PWA
(HTML + CSS + JavaScript)
↓
Vercel Serverless APIs
↓
MongoDB Atlas

External Services:

* Google OAuth
* Resend Email Service
* OneSignal Push Notifications

---

## 📂 Project Structure

```text
Dayknot/
│
├── api/
│   ├── auth.js
│   ├── auth-google.js
│   ├── verify.js
│   ├── profile.js
│   ├── tasks.js
│   ├── sync.js
│   ├── completions.js
│   ├── password-reset.js
│   ├── password-reset-request.js
│   ├── change-password.js
│   ├── change-email-request.js
│   ├── change-email-verify.js
│   ├── delete-account.js
│   └── _mongodb.js
│
├── app.js
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── package.json
└── vercel.json
```

## ⚙️ Environment Variables

Create a `.env` file:

```env
MONGODB_URI=your_mongodb_connection_string

GOOGLE_CLIENT_ID=your_google_client_id

RESEND_API_KEY=your_resend_api_key

ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key
```

## 🚀 Local Setup

### Clone Repository

```bash
git clone https://github.com/Nimit0808/Dayknot.git
cd Dayknot
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
vercel dev
```

Open:

```text
http://localhost:3000
```

## 📈 Lighthouse Performance

### Mobile

* Performance: 90+
* Accessibility: 100
* Best Practices: 100
* SEO: 100

### Desktop

* Performance: 98+
* Accessibility: 100
* Best Practices: 100
* SEO: 100

---

## 🎯 Future Improvements

* Native Android APK/AAB
* Habit Categories
* Social Challenges
* Shared Habit Groups
* AI Productivity Insights
* Data Export & Backup
* Advanced Analytics

---

## 👨‍💻 Author

Nimit Jain

GitHub: https://github.com/Nimit0808

---

## 📜 License

This project is licensed under the MIT License.

Feel free to use, modify, and contribute.
