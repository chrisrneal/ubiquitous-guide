import { useState, useEffect } from 'react'
import Page from '@/components/page'
import Section from '@/components/section'
import Link from 'next/link'
import { 
  saveGameProgress, 
  loadGameProgress, 
  saveHighScore, 
  getLeaderboard, 
  getCurrentUser,
  supabase  // Import the supabase client
} from '@/utils/supabase'

const AdventureGame = () => {
  // Game state variables
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [showIntro, setShowIntro] = useState(true)
  const [hearts, setHearts] = useState(5)
  const [items, setItems] = useState([])
  const [stars, setStars] = useState(0)
  const [message, setMessage] = useState('')
  const [showMessage, setShowMessage] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [ending, setEnding] = useState('')

  // Supabase integration state variables
  const [userId, setUserId] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [savedGames, setSavedGames] = useState([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState([])
  
  // State for storing game data from the database
  const [gameData, setGameData] = useState(null)
  const [storyPaths, setStoryPaths] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load game data from Supabase
  useEffect(() => {
    async function fetchGameData() {
      try {
        setLoading(true)
        // Fetch the adventure game data from the game_data table
        const { data, error } = await supabase
          .from('game_data')
          .select('*')
          .eq('game_type', 'adventure')
          .single()
        
        if (error) throw error
        
        if (data) {
          // Extract rounds and paths from the database
          setGameData(data.content.rounds || [])
          setStoryPaths(data.content.paths || {})
        }
      } catch (err) {
        console.error('Error fetching game data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchGameData()
  }, [])

  // Check for user authentication on component mount
  useEffect(() => {
    async function checkUserAuth() {
      const { data } = await getCurrentUser()
      if (data && data.user) {
        setUserId(data.user.id)
        setIsLoggedIn(true)
        // Try to load any saved game data
        const { data: progressData } = await loadGameProgress(data.user.id, 'adventure')
        if (progressData) {
          setPlayerName(progressData.player_name || '')
          // We have saved data, show a prompt to load it
          setSavedGames([progressData])
        }
      }
    }
    
    checkUserAuth()
  }, [])

  // Function to save current game progress to Supabase
  const saveProgress = async () => {
    if (!userId) return
    
    setLoadingSave(true)
    try {
      await saveGameProgress(userId, {
        gameType: 'adventure',
        progress: currentRound,
        player_name: playerName,
        items: items,
        hearts: hearts,
        stars: stars
      })
      setMessage('Game progress saved!')
      setShowMessage(true)
      setTimeout(() => setShowMessage(false), 2000)
    } catch (error) {
      console.error('Error saving game:', error)
      setMessage('Failed to save game progress')
      setShowMessage(true)
      setTimeout(() => setShowMessage(false), 2000)
    } finally {
      setLoadingSave(false)
    }
  }

  // Function to load saved game progress
  const loadProgress = async (savedGame) => {
    if (!savedGame) return
    
    setCurrentRound(savedGame.progress || 1)
    setPlayerName(savedGame.player_name || playerName)
    setHearts(savedGame.hearts || 5)
    setStars(savedGame.stars || 0)
    setItems(savedGame.items || [])
    setGameStarted(true)
    setShowIntro(false)
    setSavedGames([])
  }

  // Function to load leaderboard data
  const loadLeaderboard = async () => {
    const { data } = await getLeaderboard('adventure')
    if (data) {
      setLeaderboardData(data)
      setShowLeaderboard(true)
    }
  }

  // Function to submit high score when game ends
  const submitHighScore = async () => {
    if (!userId) return
    
    try {
      await saveHighScore(userId, 'adventure', stars, playerName)
      await loadLeaderboard()
    } catch (error) {
      console.error('Error saving high score:', error)
    }
  }

  const handleStartGame = (e) => {
    e.preventDefault()
    if (playerName.trim()) {
      setGameStarted(true)
      setShowIntro(false)
    }
  }

  const handleChoice = (roundId, choiceId) => {
    if (!storyPaths) return
    
    const pathKey = `${roundId}-${choiceId}`;
    const path = storyPaths[pathKey];
    
    if (!path) return;
    
    // Handle effects
    let newHearts = hearts;
    let newItems = [...items];
    let newStars = stars + 1; // Each choice earns a star
    
    if (path.effect === 'gain') {
      if (path.hearts) {
        newHearts = Math.min(newHearts + path.hearts, 5);
      }
      if (path.item && !newItems.includes(path.item)) {
        newItems.push(path.item);
      }
    } else if (path.effect === 'lose') {
      if (path.hearts) {
        newHearts = Math.max(newHearts - path.hearts, 0);
      }
    } else if (path.effect === 'win') {
      setEnding(path.score);
      setGameOver(true);
    }
    
    // Update player status
    setHearts(newHearts);
    setItems(newItems);
    setStars(newStars);
    
    // Show message about the choice
    setMessage(path.message);
    setShowMessage(true);
    
    // After a delay, hide message and proceed to next round
    setTimeout(() => {
      setShowMessage(false);
      if (path.nextRound > 0) {
        setCurrentRound(path.nextRound);
      }
    }, 2000);
    
    // Check if player lost by running out of hearts
    if (newHearts <= 0) {
      setGameOver(true);
      setEnding('lost');
    }

    // If the user is logged in, automatically save progress after each choice
    if (userId) {
      saveProgress()
    }
  }

  const restartGame = () => {
    setCurrentRound(1);
    setHearts(5);
    setItems([]);
    setStars(0);
    setMessage('');
    setShowMessage(false);
    setGameOver(false);
    setEnding('');
    setShowIntro(true);
    setGameStarted(false);
  }

  // Get data for current round
  const currentRoundData = gameData?.find(r => r.round === currentRound);

  // Show loading state while fetching game data
  if (loading) {
    return (
      <Page>
        <Section>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading adventure...</p>
            </div>
          </div>
        </Section>
      </Page>
    )
  }

  // Show error state if there was a problem loading the game
  if (error) {
    return (
      <Page>
        <Section>
          <div className="bg-red-100 dark:bg-red-900 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Error Loading Game</h2>
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <p className="mt-4">
              Please make sure the database is properly set up and try again. 
              Run the import-data.js script to populate the database.
            </p>
            <Link href="/" className="mt-6 inline-block text-blue-500 hover:text-blue-700">
              Return to Home
            </Link>
          </div>
        </Section>
      </Page>
    )
  }

  return (
    <Page>
      <Section>
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">{gameData?.length > 0 ? "Forest Friends Adventure" : "Loading..."}</h1>
          <div className="flex space-x-4">
            {userId && gameStarted && !gameOver && (
              <button 
                onClick={saveProgress}
                disabled={loadingSave}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                {loadingSave ? 'Saving...' : 'Save Game'}
              </button>
            )}
            <Link href="/" className="text-blue-500 hover:text-blue-700">
              Home
            </Link>
          </div>
        </div>
        
        {/* Saved Game Prompt */}
        {savedGames.length > 0 && showIntro && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <h3 className="font-semibold">Saved Game Found</h3>
            <p className="text-sm mt-1">Would you like to continue your previous adventure?</p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => loadProgress(savedGames[0])}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Continue
              </button>
              <button
                onClick={() => setSavedGames([])}
                className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded text-sm"
              >
                New Game
              </button>
            </div>
          </div>
        )}
        
        {/* Leaderboard Display */}
        {showLeaderboard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Adventure Leaderboard</h2>
              
              {leaderboardData.length > 0 ? (
                <div className="overflow-y-auto max-h-80">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2">Rank</th>
                        <th className="text-left py-2">Player</th>
                        <th className="text-right py-2">Stars</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((entry, index) => (
                        <tr key={index} className="border-b dark:border-gray-700">
                          <td className="py-2">{index + 1}</td>
                          <td className="py-2">{entry.player_name}</td>
                          <td className="py-2 text-right">{entry.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No scores recorded yet. Be the first!</p>
              )}
              
              <button
                onClick={() => setShowLeaderboard(false)}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded w-full"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {showIntro ? (
          <div className="mt-6 space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">Welcome to the adventure!</h2>
              <p>You're about to embark on a magical journey through an enchanted forest. 
                 Make choices wisely as they will affect your path!</p>
            </div>
            
            <form onSubmit={handleStartGame} className="space-y-4">
              <div>
                <label htmlFor="playerName" className="block text-sm font-medium">
                  What is your name, brave adventurer?
                </label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm 
                            focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                            focus:ring-opacity-50 p-2 dark:bg-zinc-800 dark:border-zinc-700"
                  placeholder="Enter your name"
                />
              </div>
              
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              >
                Begin Adventure
              </button>
            </form>
          </div>
        ) : gameOver ? (
          <div className="mt-6 space-y-6">
            <div className={`p-6 rounded-lg text-center ${
              ending === 'lost' 
                ? 'bg-red-100 dark:bg-red-900' 
                : 'bg-green-100 dark:bg-green-900'
            }`}>
              <h2 className="text-xl font-bold mb-3">
                {ending === 'lost' 
                  ? 'Your adventure has ended...' 
                  : 'Congratulations, you completed your quest!'}
              </h2>
              
              <p className="text-lg">
                {ending === 'lost' 
                  ? `Sadly, ${playerName}, you ran out of hearts. Better luck next time!` 
                  : ending === 'crown' 
                    ? `${playerName}, you are now the ruler of the forest kingdom with ${stars} stars!` 
                    : ending === 'wisdom' 
                      ? `${playerName}, you've become a powerful wizard with ${stars} stars of knowledge!` 
                      : `${playerName}, you returned home safely with ${stars} stars and amazing stories to tell!`}
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Your Final Stats:</h3>
              <div className="flex space-x-4">
                <div>❤️ Hearts: {hearts}</div>
                <div>⭐ Stars: {stars}</div>
              </div>
              <div className="mt-2">
                <span className="font-medium">Items collected:</span>{' '}
                {items.length > 0 ? items.join(', ') : 'None'}
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={restartGame}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg"
              >
                Play Again
              </button>
              
              {isLoggedIn && (
                <button
                  onClick={submitHighScore}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Submit Score
                </button>
              )}
              
              <button
                onClick={loadLeaderboard}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg"
              >
                Leaderboard
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Player status bar */}
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{playerName}</span>
                <span>❤️ {hearts}</span>
                <span>⭐ {stars}</span>
              </div>
              <div className="text-sm">
                Round {currentRound}/8
              </div>
            </div>
            
            {/* Scene description */}
            <div className="bg-indigo-50 dark:bg-indigo-900 p-5 rounded-lg text-center">
              <h2 className="text-xl mb-2">{currentRoundData?.scene}</h2>
              <p className="text-sm italic">{currentRoundData?.tip}</p>
            </div>
            
            {/* Choices */}
            {!showMessage && currentRoundData?.options && (
              <div className="space-y-3">
                <h3 className="font-medium">What will you do?</h3>
                <div className="grid gap-3">
                  {currentRoundData.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleChoice(currentRound, option.id)}
                      className="bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 
                               border border-gray-200 dark:border-zinc-600 p-3 rounded-lg text-left 
                               transition-colors flex items-center"
                    >
                      <span className="text-xl mr-3">{option.text.split(' ')[0]}</span>
                      <span>{option.text.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Feedback message */}
            {showMessage && (
              <div className="bg-yellow-100 dark:bg-yellow-800 p-4 rounded-lg text-center animate-pulse">
                <p className="font-medium">{message}</p>
              </div>
            )}
            
            {/* Items inventory */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Your Inventory:</h3>
              <div className="flex flex-wrap gap-2">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <span 
                      key={index}
                      className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">No items yet</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Section>
    </Page>
  )
}

export default AdventureGame