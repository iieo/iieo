# Next.js template

## Requirements

1. [fnm](https://github.com/Schniz/fnm)

## Usage

Setup all the required tools

```
fnm use
npm i -g pnpm@latest
pnpm i
```

## Get started

You need an `.env` file at the top of the project to inject the database url into.

```.env
DATABASE_URL=[YOUR_DATABASE_URL]
NEXTAUTH_SECRET=[SOME_RANDOM_STRING]
```

## Local Database

To develop on a local db you can you the docker compose inside the docker folder:

```sh
docker compose -f docker/docker-compose.db.yml up --build -d # start
docker compose -f docker/docker-compose.db.yml down # start
```

To connect to the db use the following connection string:

```toml
# .env
DATABASE_URL="postgresql://example_user:example_password@127.0.0.1:5432/example_db"
```

> To do a migration, you have to remove temporarily the `ssl: 'require'` inside the `migrate.ts` file
> as the local database is only http.

## Start

Start the application

```
pnpm dev
```

## Code checks

```
pnpm format
pnpm format:check
pnpm types
pnpm lint
```
# leo-homepage
