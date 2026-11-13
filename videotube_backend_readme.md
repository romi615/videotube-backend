# 🎥 VideoTube Backend

A robust, scalable, and production-ready RESTful API for a video-sharing platform (inspired by YouTube), built with **Node.js**, **Express.js**, and **MongoDB**.

---

## ✨ Features

- **🔐 User Authentication & Authorization:** Secure JWT-based authentication with Access & Refresh tokens, password hashing with `bcrypt`, and protected routes.
- **📹 Video Management:** Upload, publish, update, delete, and stream videos with pagination, sorting, and search filtering.
- **☁️ Cloud Media Storage:** Seamless integration with **Cloudinary** and **Multer** for handling video files, thumbnails, user avatars, and cover images.
- **💬 Engagement System:** Full CRUD operations for video comments, likes/dislikes (on videos, comments, and tweets), and channel subscriptions.
- **🐦 Community Tweets:** Micro-blogging feature allowing creators to post text updates to their subscribers.
- **📂 Playlists & Watch History:** Create and manage custom video playlists and automatically track user watch history.
- **📊 Creator Dashboard:** Analytics endpoints providing channel statistics (total views, subscribers, videos, and likes).

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose (with `mongoose-aggregate-paginate-v2`)
- **Authentication:** JSON Web Tokens (JWT) & `bcrypt`
- **File Handling & Storage:** Multer & Cloudinary
- **Utilities:** `cookie-parser`, `cors`, `dotenv`

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- [Cloudinary Account](https://cloudinary.com/) (For media storage)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/videotube-backend.git
   cd videotube-backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add the following variables:

   ```env
   PORT=8000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net
   CORS_ORIGIN=*

   ACCESS_TOKEN_SECRET=your_super_secret_access_token_key
   ACCESS_TOKEN_EXPIRY=1d
   REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key
   REFRESH_TOKEN_EXPIRY=10d

   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The server should now be running at `http://localhost:8000`.

---

## 📁 Project Structure

```text
├── public/
│   └── temp/               # Temporary storage for Multer file uploads
├── src/
│   ├── controllers/        # Route handlers & business logic
│   ├── db/                 # MongoDB connection setup
│   ├── middlewares/        # Auth verification, Multer config, error handling
│   ├── models/             # Mongoose schemas (User, Video, Comment, Like, etc.)
│   ├── routes/             # Express API route definitions
│   ├── utils/              # Helper classes (ApiError, ApiResponse, asyncHandler, Cloudinary)
│   ├── app.js              # Express app configuration & middleware setup
│   ├── constants.js        # Application-wide constants (e.g., DB_NAME)
│   └── index.js            # Entry point & server initialization
├── .env.sample             # Sample environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## 🛣️ API Endpoints Overview

Base URL: `/api/v1`

| Resource          | Base Endpoint    | Description                                                        |
| :---------------- | :--------------- | :----------------------------------------------------------------- |
| **Healthcheck**   | `/healthcheck`   | Verify API server status                                           |
| **Users**         | `/users`         | Register, login, logout, refresh token, profile & watch history    |
| **Videos**        | `/videos`        | Upload, fetch, update, delete, and toggle publish status           |
| **Comments**      | `/comments`      | Add, update, delete, and fetch video comments                      |
| **Likes**         | `/likes`         | Toggle likes on videos, comments, and tweets; get liked videos     |
| **Subscriptions** | `/subscriptions` | Toggle channel subscription; get subscribers & subscribed channels |
| **Playlists**     | `/playlists`     | Create, update, delete playlists; add/remove videos                |
| **Tweets**        | `/tweets`        | Create, update, delete, and fetch user community posts             |
| **Dashboard**     | `/dashboard`     | Get channel statistics and uploaded videos                         |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/videotube-backend/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
