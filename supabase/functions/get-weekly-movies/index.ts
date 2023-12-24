// deno-lint-ignore-file no-explicit-any
/**
 * @fileoverview This script fetches and handles data using the Supabase client and movie database API.
 * @author dxnsav
 */

// Import the Supabase client
/** @type {createClient} function from '@supabase/supabase-js' module */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js';

// Environment variables for Supabase
/** @type {string} Supabase URL */
const supabaseUrl: string = Deno.env.get('SUPABASE_URL') ?? '';
/** @type {string} Supabase anonymous key */
const supabaseKey: string = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
/** @type {string} tmdb anonymous key */
const tmdbKey: string = Deno.env.get('TMDB_KEY') ?? '';

// Initialize the Supabase client
/** @type {SupabaseClient} Our Supabase client instance */
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Your access token for the movie database API
/** @type {string} Movie database API access token */
const ACCESS_TOKEN: string = Deno.env.get('MOVIE_DB_ACCESS_TOKEN') ?? '';

/**
 * Function to fetch movies page.
 * @async
 * @param {number} page - The movie page number to fetch.
 * @returns {Promise<Array<Object>>} - Returns a promise that resolves with an array of movie objects.
 */
async function fetchMoviesPage(page: number): Promise<Array<object> | undefined> {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/movie/week?language=uk-UK`, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`
      }
    });
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching movies:', error);
  }
  return undefined;
}

/**
 * Asynchronously saves movies to Supabase. It maps the foundMovies with 
 * corresponding allMovies data, deletes old weekly_movies records in 
 * Supabase and inserts 20 the new records.
 *
 * @async
 * @param {Array<Object>} foundMovies - Array of movie objects to be saved in Supabase.
 * @param {Array<Object>} allMovies - Array of all fetched movie objects.
 * @returns {Promise<void>}
 */
async function saveMoviesToSupabase(foundMovies: Array<unknown>, allMovies: Array<unknown>): Promise<void> {
  const moviesToSave = foundMovies.map((foundMovie: any) => {
    const movie: any = allMovies.find((m: any) => m.original_title === foundMovie.title_en);
    return movie ? Object.assign({}, foundMovie, { popularity: movie.popularity, tmdb_id: movie.id }) : null;
  }).filter(m => m !== null);

  if (moviesToSave.length > 0) {
    const deleteResponse = await supabase
      .from('weekly_movies')
      .delete()
      .not('id', 'is', null);

    if (deleteResponse.error) {
      console.error('Ошибка при удалении данных из базы:', deleteResponse.error);
      return;
    }

    const moviesToSaveWithBackdrop = await Promise.all(moviesToSave.slice(0, 20).map(async (movie: any) => {
      const backdrop = await fetchTmdbBackdrop(movie.tmdb_id);
      return Object.assign({}, movie, { backdrop });
    }
    ));

    const insertResponse = await supabase
      .from('weekly_movies')
      .insert(moviesToSaveWithBackdrop);


    if (insertResponse.error) {
      console.error('Ошибка при вставке данных в базу:', insertResponse.error);
    }
  }
}

/**
 * Checks for movies in Supabase by their titles.
 *
 * @async
 * @param {Array<string>} titles - An array of movie titles.
 * @returns {Promise<Array<Object>>} Array of movies found in Supabase.
 */
async function checkMoviesInSupabase(titles: string[]): Promise<Array<object>> {
  const foundMovies = [];

  for (const title of titles) {
    const { data } = await supabase
      .from('movie')
      .select('*')
      .eq('title_en', title)
      .neq('movie_url', null)
      .eq('movie_type', 'movie');

    if (data && data.length > 0) {
      foundMovies.push(data[0]);
    }
  }

  return foundMovies;
}

/**
 * Fetch a backdrop image with preference for Ukrainian language. If no Ukrainian backdrop is available,
 * it will fetch an English one. The fetch is done from themoviedb.org API.
 *
 * @async
 * @function
 * @param {number} tmdbId - The id of the movie from themoviedb.org.
 * @returns {Promise<string | null>} A promise that resolves to the URL of the backdrop image or null if none is found.
 *
 * @example
 * // Usage:
 * fetchTmdbBackdrop(12345)
 *   .then(backdropUrl => console.log(backdropUrl))
 *   .catch(e => console.error(e));
 */
const fetchTmdbBackdrop = async (tmdbId: number) => {
  const options = {
    headers: {
      Authorization: `Bearer ${tmdbKey}`,
      accept: 'application/json'
    },
    method: 'GET'
  }

  const fetchTmdb = async (language: string) => {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/images?include_image_language=${language}`, options);
    const data = await response.json();
    return data?.backdrops?.length ? `https://image.tmdb.org/t/p/w500${data.backdrops[0].file_path}` : null;
  }

  // Try to get backdrop with Ukrainian language
  let backdrop = await fetchTmdb('uk');

  // If no data, call again with English
  if (!backdrop) {
    backdrop = await fetchTmdb('en');
  }

  return backdrop;
}


/**
 * Main handler for the Edge Function.
 * @async
 * @param {Request} _req - The incoming request.
 * @returns {Promise<Response>} - Returns a promise that resolves with a Response object.
 */
Deno.serve(async (_req) => {
  try {
    const pagesToFetch = 1;
    const movies = await Promise.all([...Array(pagesToFetch)].map((_, i) => fetchMoviesPage(i + 1)));
    const allMovies = movies.flat();
    const titles = allMovies.map((movie: any) => movie.original_title);

    const foundMovies = await checkMoviesInSupabase(titles);
    await saveMoviesToSupabase(foundMovies, allMovies);

    return new Response('Movies updated successfully', {
      status: 200,
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});