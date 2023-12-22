# Supabase Movie Fetcher and Updater

## Overview

This script is designed to fetch popular movie data from an external movie database API and update a Supabase database with this information. It's tailored for execution as a Deno Edge Function, allowing it to handle web requests and interact with Supabase seamlessly.

## Features

- Fetches popular movie data from an external API.
- Checks the existing records in the Supabase database.
- Updates the Supabase database with new movie data.
- Designed to run as a Deno Edge Function.

## Requirements

- Deno Runtime
- Supabase Project Credentials
- Access Token for the Movie Database API

## Installation

Ensure that Deno is installed on your system. Refer to the [official Deno installation guide](https://deno.land/#installation) for instructions.

## Environment Variables

The script requires the following environment variables:

- `SUPABASE_URL`: The URL of your Supabase project.
- `SUPABASE_ANON_KEY`: The anonymous key for your Supabase project.
- `MOVIE_DB_ACCESS_TOKEN`: The access token for the movie database API.

## Functions

### `fetchMoviesPage(page: number): Promise<Array<Object> | undefined>`

Fetches a page of popular movies from the movie database API.

**Parameters:**
- `page`: The page number to fetch.

**Returns:**
- A promise that resolves with an array of movie objects or `undefined` in case of an error.

### `saveMoviesToSupabase(foundMovies: Array<Object>, allMovies: Array<Object>): Promise<void>`

Saves or updates movie records in the Supabase database.

**Parameters:**
- `foundMovies`: Movies already present in the Supabase database.
- `allMovies`: All fetched movies.

### `checkMoviesInSupabase(titles: Array<string>): Promise<Array<Object>>`

Checks for the presence of movies in the Supabase database by their titles.

**Parameters:**
- `titles`: An array of movie titles to check.

**Returns:**
- A promise that resolves with an array of found movies.

## Usage

Run the script using the Deno command:

```bash
deno run --allow-net --allow-env script.js
```

The --allow-net flag permits network requests, and --allow-env allows the script to access environment variables.