/**
 * @fileoverview This script fetches and handles data using the Supabase client and movie database API.
 * @author dxnsav
 */

// Import the Supabase client
import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase
const supabaseUrl = 'https://ybrwimxtjailumgoocni.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicndpbXh0amFpbHVtZ29vY25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDE2Mjk5MDMsImV4cCI6MjAxNzIwNTkwM30.7ONm6hBlkNu0jepIlkGksIma_86fUFBsQAuTipMkd4Q';

// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Your access token for the movie database API
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwMTg3MzBmYjc3Njg5YTU0NjFhNzY4NDg4NjNkN2FjYyIsInN1YiI6IjYwYjY1YWM2ZjQ0ZjI3MDAyOTQzOTQ2YyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.qEBg2KHPQG5nVg9KAFubehOozy9Ume_dsVLC2O0rMdY";

async function fetchMoviesPage(page) {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/tv/week?language=uk-UK`, {
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

async function saveMoviesToSupabase(foundMovies, allMovies) {
  const moviesToSave = foundMovies.map((foundMovie) => {
    const movie = allMovies.find((m) => m.original_name === foundMovie.title_en);
    return movie ? Object.assign({}, foundMovie, { popularity: movie.popularity, tmdb_id: movie.id }) : null;
  }).filter(m => m !== null);

  if (moviesToSave.length > 0) {
    const deleteResponse = await supabase
      .from('weekly_serials')
      .delete()
      .not('id', 'is', null);

    if (deleteResponse.error) {
      console.error('Ошибка при удалении данных из базы:', deleteResponse.error);
      return;
    }

		moviesToSave.forEach((movie) => {
			delete movie.id
		})

    const insertResponse = await supabase
      .from('weekly_serials')
      .insert(moviesToSave.slice(0, 20));

    if (insertResponse.error) {
      console.error('Ошибка при вставке данных в базу:', insertResponse.error);
    }
  }
}

async function checkMoviesInSupabase(titles) {
  const foundMovies = [];

  for (const title of titles) {
    const { data } = await supabase
      .from('movie')
      .select('*')
      .eq('title_en', title)
      .neq('serial_data', null)
      .eq('movie_type', 'serial');

    if (data && data.length > 0) {
      foundMovies.push(data[0]);
    }
  }
  return foundMovies;
}

async function mainHandler(_req) {
  try {
    const pagesToFetch = 1;
    const movies = await Promise.all([...Array(pagesToFetch)].map((_, i) => fetchMoviesPage(i + 1)));
    const allMovies = movies.flat();
    const titles = allMovies.map((movie) => movie.original_name);

    const foundMovies = await checkMoviesInSupabase(titles);
    await saveMoviesToSupabase(foundMovies, allMovies);

    return new Response(`Serials updated successfully\n ${JSON.stringify(foundMovies, null, 2)}`, {
      status: 200,
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
}

mainHandler()