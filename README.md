# Paint Web

Project made for and by the Code Potes on [Twitch](https://twitch.tv/devgirl_).

This is a fun project where you draw at the same time with your friends, yay 🚀

[Production Site](https://paint.lauradurieux.dev)

## How to run

You will need to have Node.js installed on your computer

1. Install dependencies

```
npm install
```

2. Run the build

This command will also watch all the changes that you do and rebuild.

```
npm run watch
```

3. Run the server

⚠️ You don't need to have the rebuild running, but you need to **build at least one time**.

```
npm run start
```

## Docker

### Docker usage

You will need to have docker installed.

1. Build the Docker image

```
docker build --no-cache --tag paint:latest .
```

2. Run the Docker container

```
docker run -p 5001:5001 paint
```

### Docker Compose

You will need to have docker and docker-compose installed.

1. Build and run the application

```
docker compose up
# docker compose up -d  (detach mode)
```

2. Stop the application

```
docker compose down
```

## Environment

Here, ViteJS is used as a bundler tool, only to build and compress the files, it is not used to run a dev server.

The real server use Express.
