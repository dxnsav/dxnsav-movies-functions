// Import the Supabase client
import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase

const supabaseUrl = 'https://ybrwimxtjailumgoocni.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicndpbXh0amFpbHVtZ29vY25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDE2Mjk5MDMsImV4cCI6MjAxNzIwNTkwM30.7ONm6hBlkNu0jepIlkGksIma_86fUFBsQAuTipMkd4Q';


// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Your access token for the movie database API
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwMTg3MzBmYjc3Njg5YTU0NjFhNzY4NDg4NjNkN2FjYyIsInN1YiI6IjYwYjY1YWM2ZjQ0ZjI3MDAyOTQzOTQ2YyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.qEBg2KHPQG5nVg9KAFubehOozy9Ume_dsVLC2O0rMdY";

let titles = [];
let allMovies = [];

// Function to fetch movies
async function fetchMoviesPage(page) {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/popular?language=uk-UK&page=${page}&region=ua`, {
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
}

async function saveMoviesToSupabase(foundMovies, allMovies) {
  const moviesToSave = foundMovies.map(foundMovie => {
    const movie = allMovies.find(m => m.original_title === foundMovie.title_en);
    return movie ? { ...foundMovie, popularity: movie.popularity, tmdb_id: movie.id } : null;
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
    const insertResponse = await supabase
      .from('weekly_movies')
      .insert(moviesToSave);

    if (insertResponse.error) {
      console.error('Ошибка при вставке данных в базу:', insertResponse.error);
    }
  }
}

async function checkMoviesInSupabase(titles) {
  let foundMovies = [];

  for (let title of titles) {
    let { data, error } = await supabase
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

// Main handler for the Edge Function
Deno.serve(async (_req) => {
  try {
    const pagesToFetch = 3;
    const movies = await Promise.all([...Array(pagesToFetch)].map((_, i) => fetchMoviesPage(i + 1)));
    const allMovies = movies.flat();
    const titles = allMovies.map(movie => movie.original_title);

    const foundMovies = await checkMoviesInSupabase(titles);
    await saveMoviesToSupabase(foundMovies, allMovies);

    return new Response(`Movies updated successfully\n ${JSON.stringify(foundMovies, null, 2)}`, {
			status: 200,
		});
  } catch (err) {
    console.error('Error:', err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});