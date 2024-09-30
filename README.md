# Minehaul TCP

This is a Node.js backend application built with Express.js and TypeScript, designed to manage and serve API endpoints for a mining haulage system.

## Features

- **TypeScript**: Leveraging TypeScript for type safety and better developer experience.
- **PostgreSQL ORM**: Uses an ORM to interact with a PostgreSQL database.
- **API Versioning**: Supports versioning to maintain backward compatibility.
- **Docker**: Contains Docker configurations for containerized deployment.

## Project Structure

    minehaul-tcp/
    ├── src/
    │   ├── configs/
    │   ├── controllers/
    │   ├── routes/
    │   │   └── v1/
    │   └── services/
    ├── .env.example
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    └── tsconfig.json

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Afatkharrofiqi/minehaul-tcp.git
   cd minehaul-tcp
   ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Set up environment variables copy **.env.example** to **.env** and update the necessary
    ```bash
    DB_HOST=pgdb
    DB_PORT=5432
    DB_USERNAME=user
    DB_PASSWORD=pass
    DB_NAME=minehaul
    DB_SYNCHRONIZE=true

    PORT=3000

    TCP_HOST=0.0.0.0
    TCP_PORT=8080
    ```

4. Run the application:
    ```bash
    npm run start:dev 
    ```

## Docker Deployment

1. Build and run the containers:
   ```bash
   docker-compose up --build -d
   ```

2. Access the API at http://localhost:3000

3. Access TCP at telnet localhost 8080

## Usage

- Versioned API:
    - Access versioned endpoints using /v1/, /v2/, etc.

## Contributing
1. Fork the repository.
2. Create a feature branch (git checkout -b feature-branch).
3. Commit your changes (git commit -m 'Add some feature').
4. Push to the branch (git push origin feature-branch).
5. Open a Pull Request.