import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to fetch game data
export async function fetchGameData(gameType) {
  const { data, error } = await supabase
    .from('game_data')
    .select('*')
    .eq('game_type', gameType)
    .single()

  if (error) {
    console.error('Error fetching game data:', error)
    return { data: null, error }
  }

  return { data, error }
}

// Helper function to save game progress
export async function saveGameProgress(userId, gameType, progressData) {
  if (!userId) return { data: null, error: new Error('User ID is required') }

  // Check if progress already exists
  const { data: existingData, error: checkError } = await supabase
    .from('game_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('game_type', gameType)
    .single()

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
    console.error('Error checking existing progress:', checkError)
    return { data: null, error: checkError }
  }

  // Use upsert to either update or insert
  const { data, error } = await supabase
    .from('game_progress')
    .upsert({
      id: existingData?.id,
      user_id: userId,
      game_type: gameType,
      progress: progressData,
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) {
    console.error('Error saving game progress:', error)
  }

  return { data, error }
}

// Helper function to load game progress
export async function loadGameProgress(userId, gameType) {
  if (!userId) return { data: null, error: new Error('User ID is required') }

  const { data, error } = await supabase
    .from('game_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('game_type', gameType)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
    console.error('Error loading game progress:', error)
  }

  return { data, error }
}

// Helper function to save high scores
export async function saveHighScore(userId, userName, gameType, score, metadata = {}) {
  if (!userId) return { data: null, error: new Error('User ID is required') }
  if (!userName) return { data: null, error: new Error('User name is required') }

  const { data, error } = await supabase
    .from('high_scores')
    .insert({
      user_id: userId,
      user_name: userName,
      game_type: gameType,
      score,
      metadata
    })
    .select()

  if (error) {
    console.error('Error saving high score:', error)
  }

  return { data, error }
}

// Helper function to get leaderboard data
export async function getLeaderboard(gameType, limit = 10) {
  const { data, error } = await supabase
    .from('high_scores')
    .select('*')
    .eq('game_type', gameType)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching leaderboard:', error)
  }

  return { data, error }
}

// Helper functions for user authentication
export async function signUpUser(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  return { data, error }
}

export async function signInUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

// Helper function to get specific game content
export async function getAdventureGameContent() {
  const { data, error } = await fetchGameData('adventure')
  
  if (error || !data) {
    console.error('Error fetching adventure game content:', error)
    return null
  }
  
  return data.content
}

export async function getSentenceBuilderContent() {
  const { data, error } = await fetchGameData('sentence-builder')
  
  if (error || !data) {
    console.error('Error fetching sentence builder content:', error)
    return null
  }
  
  return data.content
}