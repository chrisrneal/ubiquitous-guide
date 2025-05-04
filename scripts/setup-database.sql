-- SQL script to create the necessary database tables and functions for the game app
-- This will be executed as part of the import-data.js script

-- Database setup for Reading Adventure Game
-- This script creates the necessary tables, functions, and policies for the application

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';
ALTER DATABASE postgres SET "app.jwt_exp" TO '3600';

CREATE OR REPLACE FUNCTION create_db_functions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enable UUID extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  -- Create functions to get JWT claims
  CREATE OR REPLACE FUNCTION auth.jwt()
  RETURNS jsonb AS $$
  BEGIN
    RETURN nullif(current_setting('request.jwt.claim', true), '')::jsonb;
  EXCEPTION
    WHEN others THEN RETURN null::jsonb;
  END;
  $$ LANGUAGE plpgsql;
  
  -- Create helper function to get current user ID
  CREATE OR REPLACE FUNCTION auth.uid()
  RETURNS uuid AS $$
  BEGIN
    RETURN (auth.jwt() ->> 'sub')::uuid;
  EXCEPTION
    WHEN others THEN RETURN null::uuid;
  END;
  $$ LANGUAGE plpgsql;

  -- This function will create all other DB functions
  EXECUTE '
    CREATE OR REPLACE FUNCTION create_game_data_table()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      -- Check if table exists
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = ''public'' AND tablename = ''game_data'') THEN
        -- Create game_data table to store game configuration
        CREATE TABLE public.game_data (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          game_type TEXT NOT NULL,
          title TEXT NOT NULL,
          content JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );

        -- Add unique constraint on game_type
        ALTER TABLE public.game_data ADD CONSTRAINT unique_game_type UNIQUE (game_type);

        -- Add RLS policies
        ALTER TABLE public.game_data ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow anyone to read game data
        CREATE POLICY "Game data is readable by everyone" 
          ON public.game_data FOR SELECT USING (true);
          
        -- Create policy to allow only authenticated users to insert/update/delete
        CREATE POLICY "Game data can be modified by authenticated users with admin role" 
          ON public.game_data FOR ALL
          USING (auth.jwt() ? ''role'' AND auth.jwt()->>''role'' = ''admin'')
          WITH CHECK (auth.jwt() ? ''role'' AND auth.jwt()->>''role'' = ''admin'');
      ELSE
        RAISE NOTICE ''Table game_data already exists'';
      END IF;
    END;
    $func$;
    
    CREATE OR REPLACE FUNCTION create_game_progress_table()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      -- Check if table exists
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = ''public'' AND tablename = ''game_progress'') THEN
        -- Create game_progress table to store player progress
        CREATE TABLE public.game_progress (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          game_type TEXT NOT NULL,
          progress INTEGER DEFAULT 1,
          player_name TEXT,
          items JSONB DEFAULT ''[]''::jsonb,
          hearts INTEGER DEFAULT 5,
          stars INTEGER DEFAULT 0,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
          
          -- Data specific to different games
          selected_words JSONB DEFAULT NULL,
          available_words JSONB DEFAULT NULL,
          score INTEGER DEFAULT 0
        );

        -- Add unique constraint on user_id and game_type
        ALTER TABLE public.game_progress 
          ADD CONSTRAINT unique_user_game_progress 
          UNIQUE (user_id, game_type);

        -- Add RLS policies
        ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow users to read their own progress
        CREATE POLICY "Users can read their own game progress" 
          ON public.game_progress FOR SELECT
          USING (auth.uid() = user_id);
          
        -- Create policy to allow users to insert their own progress
        CREATE POLICY "Users can insert their own game progress" 
          ON public.game_progress FOR INSERT
          WITH CHECK (auth.uid() = user_id);
          
        -- Create policy to allow users to update their own progress
        CREATE POLICY "Users can update their own game progress" 
          ON public.game_progress FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
          
        -- Create policy to allow users to delete their own progress
        CREATE POLICY "Users can delete their own game progress" 
          ON public.game_progress FOR DELETE
          USING (auth.uid() = user_id);
      ELSE
        RAISE NOTICE ''Table game_progress already exists'';
      END IF;
    END;
    $func$;
    
    CREATE OR REPLACE FUNCTION create_high_scores_table()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      -- Check if table exists
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = ''public'' AND tablename = ''high_scores'') THEN
        -- Create high_scores table
        CREATE TABLE public.high_scores (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          game_type TEXT NOT NULL,
          score INTEGER NOT NULL,
          player_name TEXT NOT NULL,
          achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );

        -- Add index for faster leaderboard queries
        CREATE INDEX high_scores_game_type_score_idx 
          ON public.high_scores (game_type, score DESC);

        -- Add RLS policies
        ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow everyone to read high scores
        CREATE POLICY "High scores are readable by everyone" 
          ON public.high_scores FOR SELECT
          USING (true);
          
        -- Create policy to allow authenticated users to insert their own scores
        CREATE POLICY "Users can insert their own high scores" 
          ON public.high_scores FOR INSERT
          WITH CHECK (auth.uid() = user_id);
          
        -- Create policy to prevent updates to high scores
        CREATE POLICY "High scores cannot be updated" 
          ON public.high_scores FOR UPDATE
          USING (false);
          
        -- Create policy to allow users to delete their own high scores
        CREATE POLICY "Users can delete their own high scores" 
          ON public.high_scores FOR DELETE
          USING (auth.uid() = user_id);
      ELSE
        RAISE NOTICE ''Table high_scores already exists'';
      END IF;
    END;
    $func$;
  ';
END;
$$;

-- Create tables for the games

-- Table to store game data
CREATE TABLE IF NOT EXISTS public.game_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store game progress
CREATE TABLE IF NOT EXISTS public.game_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  progress JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

-- Table to store high scores
CREATE TABLE IF NOT EXISTS public.high_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_progress_user_id ON public.game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_game_type ON public.game_progress(game_type);
CREATE INDEX IF NOT EXISTS idx_high_scores_game_type ON public.high_scores(game_type);
CREATE INDEX IF NOT EXISTS idx_high_scores_score ON public.high_scores(score DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE public.game_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Anyone can read game data
CREATE POLICY "Allow anyone to read game data" ON public.game_data
  FOR SELECT USING (true);

-- Only authenticated users can insert/update game data (you might want to further restrict this in production)
CREATE POLICY "Allow authenticated users to manage game data" ON public.game_data
  FOR ALL USING (auth.role() = 'authenticated');

-- Users can only read/write their own progress data
CREATE POLICY "Users can read their own progress" ON public.game_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.game_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.game_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can read high scores
CREATE POLICY "Anyone can read high scores" ON public.high_scores
  FOR SELECT USING (true);

-- Users can only insert their own high scores
CREATE POLICY "Users can insert their own high scores" ON public.high_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update timestamp
CREATE TRIGGER update_game_data_updated_at
BEFORE UPDATE ON public.game_data
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_progress_updated_at
BEFORE UPDATE ON public.game_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();