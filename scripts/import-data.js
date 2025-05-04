require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

// Supabase connection setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials.')
  console.error('Please create a .env.local file based on the .env.local.example template')
  process.exit(1)
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// Adventure game data
const adventureGameData = {
  title: 'The Enchanted Forest Adventure',
  rounds: [
    {
      round: 1,
      scene: 'You stand at the entrance of a mysterious forest. The trees seem to whisper secrets.',
      tip: 'Choose your path wisely, brave adventurer.',
      options: [
        { id: 1, text: '🚶‍♂️ Enter the forest cautiously' },
        { id: 2, text: '🏃‍♂️ Run boldly into the forest' },
        { id: 3, text: '🗺️ Consult your map first' }
      ]
    },
    {
      round: 2,
      scene: 'You discover a bubbling brook with crystal clear water. Your throat is parched from traveling.',
      tip: 'Water is essential for any journey.',
      options: [
        { id: 1, text: '🥤 Drink from the brook' },
        { id: 2, text: "🧪 Test the water first" },
        { id: 3, text: '🚶‍♂️ Ignore it and continue' }
      ]
    },
    {
      round: 3,
      scene: 'A small cottage appears between the trees. Smoke rises from its chimney.',
      tip: 'Locals might offer valuable information or items.',
      options: [
        { id: 1, text: '🚪 Knock on the door' },
        { id: 2, text: '👀 Peek through the window' },
        { id: 3, text: '🚶‍♂️ Avoid the cottage' }
      ]
    },
    {
      round: 4,
      scene: 'You encounter an old wizard sitting on a tree stump, reading an ancient book.',
      tip: 'The wise often share knowledge with those who ask respectfully.',
      options: [
        { id: 1, text: '👋 Greet the wizard' },
        { id: 2, text: '📚 Ask about the book' },
        { id: 3, text: '🎒 Offer an item from your pack' }
      ]
    },
    {
      round: 5,
      scene: 'A fork in the path presents itself. One way is dark but direct, the other is bright but winding.',
      tip: 'Sometimes the longer path is safer.',
      options: [
        { id: 1, text: '🌑 Take the dark path' },
        { id: 2, text: '☀️ Take the bright path' },
        { id: 3, text: '🧭 Check your compass' }
      ]
    },
    {
      round: 6,
      scene: 'You find a chest partially buried under a fallen tree.',
      tip: 'Fortune favors the bold, but caution keeps you alive.',
      options: [
        { id: 1, text: '🔓 Open the chest immediately' },
        { id: 2, text: '🔍 Examine it for traps' },
        { id: 3, text: '⚔️ Break it open with force' }
      ]
    },
    {
      round: 7,
      scene: 'A magnificent deer with glowing antlers blocks your path. It stares at you intently.',
      tip: 'Forest creatures often have deep connections to magic.',
      options: [
        { id: 1, text: '🍎 Offer it food' },
        { id: 2, text: '🧎‍♂️ Bow respectfully' },
        { id: 3, text: '🚶‍♂️ Try to walk around it' }
      ]
    },
    {
      round: 8,
      scene: 'You reach a clearing with an ancient stone pedestal in the center. Three objects rest upon it.',
      tip: 'Your final choice will determine your fate.',
      options: [
        { id: 1, text: '👑 Take the golden crown' },
        { id: 2, text: '📜 Take the ancient scroll' },
        { id: 3, text: '🔑 Take the silver key' }
      ]
    }
  ],
  paths: {
    // Round 1 paths
    '1-1': {
      message: 'You carefully enter the forest, staying alert. You find a hidden path!',
      nextRound: 2,
      effect: 'gain',
      item: 'compass'
    },
    '1-2': {
      message: 'You trip over a root and hurt yourself. Be more careful next time!',
      nextRound: 2,
      effect: 'lose',
      hearts: 1
    },
    '1-3': {
      message: 'Smart thinking! Your map reveals a safe route through the forest.',
      nextRound: 2,
      effect: 'gain',
      hearts: 1
    },
    // Round 2 paths
    '2-1': {
      message: 'The water is refreshing and magical! You feel invigorated.',
      nextRound: 3,
      effect: 'gain',
      hearts: 1
    },
    '2-2': {
      message: "Good call! The water was enchanted, but it's safe to drink.",
      nextRound: 3,
      effect: 'gain',
      item: 'water flask'
    },
    '2-3': {
      message: 'You continue your journey, but your thirst grows worse.',
      nextRound: 3,
      effect: 'lose',
      hearts: 1
    },
    // Round 3 paths
    '3-1': {
      message: 'A friendly old woman invites you in and gives you a magical cookie!',
      nextRound: 4,
      effect: 'gain',
      item: 'magic cookie'
    },
    '3-2': {
      message: "You see strange shadows moving inside. Maybe it's best not to knock.",
      nextRound: 4,
      effect: 'none'
    },
    '3-3': {
      message: 'As you walk away, you hear a cackle from inside. You made a safe choice.',
      nextRound: 4,
      effect: 'gain',
      hearts: 1
    },
    // Round 4 paths
    '4-1': {
      message: 'The wizard smiles and gives you a protective charm.',
      nextRound: 5,
      effect: 'gain',
      item: 'protection charm'
    },
    '4-2': {
      message: 'The wizard shows you the book of forest secrets. You learn valuable knowledge!',
      nextRound: 5,
      effect: 'gain',
      item: 'forest knowledge'
    },
    '4-3': {
      message: 'The wizard is offended by your offer and disappears in a puff of smoke.',
      nextRound: 5,
      effect: 'lose',
      hearts: 1
    },
    // Round 5 paths
    '5-1': {
      message: 'The dark path is full of thorns that scratch you, but it saves time.',
      nextRound: 6,
      effect: 'lose',
      hearts: 2
    },
    '5-2': {
      message: 'The bright path is longer but pleasant. You find healing berries along the way!',
      nextRound: 6,
      effect: 'gain',
      hearts: 2,
      item: 'healing berries'
    },
    '5-3': {
      message: "Your compass reveals a hidden third path that's both safe and direct!",
      nextRound: 6,
      effect: 'gain',
      hearts: 1
    },
    // Round 6 paths
    '6-1': {
      message: 'The chest was trapped! A cloud of poison gas escapes.',
      nextRound: 7,
      effect: 'lose',
      hearts: 2
    },
    '6-2': {
      message: 'You find and disarm a trap, then safely open the chest to find a magic sword!',
      nextRound: 7,
      effect: 'gain',
      item: 'magic sword'
    },
    '6-3': {
      message: 'You smash the chest open. Inside is a potion, but you broke half of it!',
      nextRound: 7,
      effect: 'gain',
      item: 'half potion'
    },
    // Round 7 paths
    '7-1': {
      message: 'The deer accepts your offering and leads you to a secret grove with healing spring.',
      nextRound: 8,
      effect: 'gain',
      hearts: 2
    },
    '7-2': {
      message: 'The deer bows in return and grants you passage. You feel blessed!',
      nextRound: 8,
      effect: 'gain',
      item: 'forest blessing'
    },
    '7-3': {
      message: 'The deer blocks your path. You must turn back and take a longer route.',
      nextRound: 8,
      effect: 'lose',
      hearts: 1
    },
    // Round 8 paths (endings)
    '8-1': {
      message: 'The crown glows as you take it. You are now the rightful ruler of the forest kingdom!',
      nextRound: -1,
      effect: 'win',
      score: 'crown'
    },
    '8-2': {
      message: "The scroll contains ancient spells. You've become a guardian of forest wisdom!",
      nextRound: -1,
      effect: 'win',
      score: 'wisdom'
    },
    '8-3': {
      message: 'The key opens a hidden door back to your world. You return home safely with treasures!',
      nextRound: -1,
      effect: 'win',
      score: 'home'
    }
  }
}

// Sentence builder data
const sentenceBuilderData = {
  sentences: [
    {
      id: 1,
      words: ['The', 'cat', 'sleeps', 'on', 'the', 'mat'],
      correct: 'The cat sleeps on the mat'
    },
    {
      id: 2,
      words: ['She', 'reads', 'a', 'book', 'every', 'day'],
      correct: 'She reads a book every day'
    },
    {
      id: 3,
      words: ['They', 'play', 'soccer', 'in', 'the', 'park'],
      correct: 'They play soccer in the park'
    },
    {
      id: 4,
      words: ['The', 'dog', 'barks', 'at', 'the', 'mailman'],
      correct: 'The dog barks at the mailman'
    },
    {
      id: 5,
      words: ['We', 'eat', 'dinner', 'together', 'at', 'home'],
      correct: 'We eat dinner together at home'
    },
    {
      id: 6,
      words: ['Birds', 'fly', 'high', 'in', 'the', 'sky'],
      correct: 'Birds fly high in the sky'
    },
    {
      id: 7,
      words: ['Children', 'build', 'sandcastles', 'on', 'the', 'beach'],
      correct: 'Children build sandcastles on the beach'
    },
    {
      id: 8,
      words: ['I', 'write', 'letters', 'to', 'my', 'friend'],
      correct: 'I write letters to my friend'
    },
    {
      id: 9,
      words: ['She', 'sings', 'beautiful', 'songs', 'at', 'concerts'],
      correct: 'She sings beautiful songs at concerts'
    },
    {
      id: 10,
      words: ['Teachers', 'help', 'students', 'learn', 'new', 'things'],
      correct: 'Teachers help students learn new things'
    }
  ]
}

// Execute SQL statements in smaller batches
async function executeSql(sqlScript) {
  // We'll execute by RPC instead of REST API since the custom SQL API may not be enabled
  console.log('Executing SQL setup as separate statements...')
  
  // Split the SQL script into individual statements (rough approximation)
  const statements = sqlScript
    .replace(/\n/g, ' ')
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  console.log(`Found ${statements.length} SQL statements to execute`)
  
  // Create functions first
  try {
    console.log('Creating UUID extension...')
    await supabase.rpc('execute_sql', { sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' })
    console.log('UUID extension created or already exists')
  } catch (error) {
    console.log('Error creating UUID extension (it may already exist)')
  }
  
  return true
}

// Main function to set up the database
async function setupDatabase() {
  console.log('Setting up database and importing data...')
  
  try {
    // Read the SQL file just to have it available
    const sqlFilePath = path.join(__dirname, 'setup-database.sql')
    console.log(`Reading SQL file from: ${sqlFilePath}`)
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8')
    console.log(`SQL file loaded, size: ${sqlScript.length} characters`)
    
    // Execute SQL
    await executeSql(sqlScript)
    
    // Create tables directly via RPC
    console.log('Creating database tables...')
    
    // Create game_data table
    try {
      await supabase.rpc('execute_sql', { 
        sql: `
        CREATE TABLE IF NOT EXISTS public.game_data (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          game_type TEXT NOT NULL,
          title TEXT NOT NULL,
          content JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        ALTER TABLE IF EXISTS public.game_data DROP CONSTRAINT IF EXISTS unique_game_type;
        ALTER TABLE public.game_data ADD CONSTRAINT unique_game_type UNIQUE (game_type);
        
        ALTER TABLE public.game_data ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Game data is readable by everyone" ON public.game_data;
        CREATE POLICY "Game data is readable by everyone" 
          ON public.game_data FOR SELECT USING (true);
        `
      })
      console.log('Created or updated game_data table')
    } catch (error) {
      console.log('Error with game_data table, continuing:', error.message)
    }
    
    // Create auth functions
    try {
      await supabase.rpc('execute_sql', { 
        sql: `
        CREATE OR REPLACE FUNCTION auth.uid()
        RETURNS uuid AS $$
        BEGIN
          RETURN coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), '')::uuid;
        EXCEPTION
          WHEN others THEN RETURN null::uuid;
        END;
        $$ LANGUAGE plpgsql;
        `
      })
      console.log('Created auth.uid() function')
    } catch (error) {
      console.log('Error with auth functions, continuing:', error.message)
    }
    
    // Create game_progress table
    try {
      await supabase.rpc('execute_sql', { 
        sql: `
        CREATE TABLE IF NOT EXISTS public.game_progress (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          game_type TEXT NOT NULL,
          progress INTEGER DEFAULT 1,
          player_name TEXT,
          items JSONB DEFAULT '[]'::jsonb,
          hearts INTEGER DEFAULT 5,
          stars INTEGER DEFAULT 0,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
          
          -- Data specific to different games
          selected_words JSONB DEFAULT NULL,
          available_words JSONB DEFAULT NULL,
          score INTEGER DEFAULT 0
        );
        
        ALTER TABLE IF EXISTS public.game_progress DROP CONSTRAINT IF EXISTS unique_user_game_progress;
        ALTER TABLE public.game_progress 
          ADD CONSTRAINT unique_user_game_progress 
          UNIQUE (user_id, game_type);
        
        ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can read their own game progress" ON public.game_progress;
        CREATE POLICY "Users can read their own game progress" 
          ON public.game_progress FOR SELECT
          USING (auth.uid() = user_id);
          
        DROP POLICY IF EXISTS "Users can insert their own game progress" ON public.game_progress;
        CREATE POLICY "Users can insert their own game progress" 
          ON public.game_progress FOR INSERT
          WITH CHECK (auth.uid() = user_id);
          
        DROP POLICY IF EXISTS "Users can update their own game progress" ON public.game_progress;
        CREATE POLICY "Users can update their own game progress" 
          ON public.game_progress FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
          
        DROP POLICY IF EXISTS "Users can delete their own game progress" ON public.game_progress;
        CREATE POLICY "Users can delete their own game progress" 
          ON public.game_progress FOR DELETE
          USING (auth.uid() = user_id);
        `
      })
      console.log('Created or updated game_progress table')
    } catch (error) {
      console.log('Error with game_progress table, continuing:', error.message)
    }
    
    // Create high_scores table
    try {
      await supabase.rpc('execute_sql', { 
        sql: `
        CREATE TABLE IF NOT EXISTS public.high_scores (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          game_type TEXT NOT NULL,
          score INTEGER NOT NULL,
          player_name TEXT NOT NULL,
          achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        DROP INDEX IF EXISTS high_scores_game_type_score_idx;
        CREATE INDEX high_scores_game_type_score_idx 
          ON public.high_scores (game_type, score DESC);
        
        ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "High scores are readable by everyone" ON public.high_scores;
        CREATE POLICY "High scores are readable by everyone" 
          ON public.high_scores FOR SELECT
          USING (true);
          
        DROP POLICY IF EXISTS "Users can insert their own high scores" ON public.high_scores;
        CREATE POLICY "Users can insert their own high scores" 
          ON public.high_scores FOR INSERT
          WITH CHECK (auth.uid() = user_id);
          
        DROP POLICY IF EXISTS "High scores cannot be updated" ON public.high_scores;
        CREATE POLICY "High scores cannot be updated" 
          ON public.high_scores FOR UPDATE
          USING (false);
          
        DROP POLICY IF EXISTS "Users can delete their own high scores" ON public.high_scores;
        CREATE POLICY "Users can delete their own high scores" 
          ON public.high_scores FOR DELETE
          USING (auth.uid() = user_id);
        `
      })
      console.log('Created or updated high_scores table')
    } catch (error) {
      console.log('Error with high_scores table, continuing:', error.message)
    }
    
    console.log('Database schema setup complete')
    
    // Check if data already exists
    const { data: existingData, error: checkError } = await supabase
      .from('game_data')
      .select('game_type')
    
    if (checkError) {
      throw new Error(`Error checking existing data: ${checkError.message}`)
    }
    
    // If we have data, ask if we should replace it
    if (existingData && existingData.length > 0) {
      const gameTypes = existingData.map(item => item.game_type).join(', ')
      console.log(`Found existing game data for: ${gameTypes}`)
      console.log('Deleting existing game data before importing new data...')
      
      // Delete existing data
      const { error: deleteError } = await supabase
        .from('game_data')
        .delete()
        .gte('id', '0') // This will match all records
      
      if (deleteError) {
        throw new Error(`Error deleting existing data: ${deleteError.message}`)
      }
      
      console.log('Existing data deleted successfully')
    }
    
    // Import adventure game data
    const { error: adventureError } = await supabase
      .from('game_data')
      .insert({
        game_type: 'adventure',
        title: adventureGameData.title,
        content: {
          rounds: adventureGameData.rounds,
          paths: adventureGameData.paths
        }
      })
    
    if (adventureError) {
      throw new Error(`Error importing adventure game data: ${adventureError.message}`)
    }
    
    console.log('Adventure game data imported successfully')
    
    // Import sentence builder data
    const { error: sentenceError } = await supabase
      .from('game_data')
      .insert({
        game_type: 'sentence-builder',
        title: 'Sentence Builder',
        content: sentenceBuilderData
      })
    
    if (sentenceError) {
      throw new Error(`Error importing sentence builder data: ${sentenceError.message}`)
    }
    
    console.log('Sentence builder data imported successfully')
    
    console.log('Database setup complete! 🎉')
    console.log('\nYou can now use the application with the database.\n')
    console.log('Next steps:')
    console.log('1. Make sure your .env.local file contains the correct Supabase credentials')
    console.log('2. Run the application with "npm run dev"')
    console.log('3. Sign up or log in to save game progress and submit scores')
    
  } catch (error) {
    console.error('Error setting up database:')
    console.error(error)
    process.exit(1)
  }
}

// Run the setup
setupDatabase()