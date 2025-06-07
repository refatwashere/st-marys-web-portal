# SMIS - WEB PORTAL Backend

This is the Node.js/Express backend for the SMIS - WEB PORTAL application.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd smis-web-portal-backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create a `.env` file:**
    Create a file named `.env` in the root directory and add your database connection string and JWT secret:
    ```dotenv
    DATABASE_URL=your_postgresql_connection_string
    JWT_SECRET=your_super_secret_key
    PORT=3001
    ```
4.  **Run the database setup function (if needed):** The `setupDatabase` function in `server.js` is designed to create tables and a default 'teacher' user if they don't exist when the server starts. Ensure your `DATABASE_URL` points to a valid PostgreSQL database.
5.  **Run the server:**
    *   In development (with nodemon):
        ```bash
        npm run dev
        ```
    *   In production:
        ```bash
        npm start
        ```

The backend will start and listen on the specified PORT (defaulting to 3001).
