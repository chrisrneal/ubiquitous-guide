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
  supabase
} from '@/utils/supabase'

const SentenceBuilder = () => {
  // Game state
  const [currentLevel, setCurrentLevel] = useState(0)
  const [availableWords, setAvailableWords] = useState([])
  const [selectedWords, setSelectedWords] = useState([])
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [message, setMessage] = useState('')
  
  // Supabase integration
  const [userId, setUserId] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [savedGames, setSavedGames] = useState([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState([])
  const [playerName, setPlayerName] = useState('')
  
  // Data loading state
  const [sentenceSets, setSentenceSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load sentence data from Supabase
  useEffect(() => {
    async function fetchSentenceData() {
      try {
        setLoading(true)
        // Fetch the sentence builder game data from the game_data table
        const { data, error } = await supabase
          .from('game_data')
          .select('*')
          .eq('game_type', 'sentence-builder')
          .single()
        
        if (error) throw error
        
        if (data && data.content && data.content.sentences) {
          setSentenceSets(data.content.sentences)
        } else {
          throw new Error('Invalid game data format')
        }
      } catch (err) {
        console.error('Error fetching sentence data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSentenceData()
  }, [])
  
  // Initialize level when sentence sets are loaded or level changes
  useEffect(() => {
    if (sentenceSets.length > 0 && currentLevel < sentenceSets.length) {
      // Get current sentence set and shuffle the words
      const currentSet = [...sentenceSets[currentLevel].words]
      const shuffledWords = currentSet.sort(() => Math.random() - 0.5)
      
      setAvailableWords(
        shuffledWords.map((word, index) => ({
          id: `word-${index}`,
          text: word,
        }))
      )
      
      setSelectedWords([])
      setIsCorrect(null)
      setShowFeedback(false)
    }
  }, [currentLevel, sentenceSets])

  // Check for user authentication on component mount
  useEffect(() => {
    async function checkUserAuth() {
      const { data } = await getCurrentUser()
      if (data && data.user) {
        setUserId(data.user.id)
        setIsLoggedIn(true)
        // Try to load any saved game data
        const { data: progressData } = await loadGameProgress(data.user.id, 'sentence-builder')
        if (progressData) {
          // We have saved data, show a prompt to load it
          setSavedGames([progressData])
        }
      }
    }
    
    checkUserAuth()
  }, [])

  // Handle word selection
  const selectWord = (word) => {
    // Move word from available to selected
    setAvailableWords(availableWords.filter(w => w.id !== word.id))
    setSelectedWords([...selectedWords, word])
  }

  // Handle removing a word from the sentence
  const removeWord = (word) => {
    // Move word from selected back to available
    setSelectedWords(selectedWords.filter(w => w.id !== word.id))
    setAvailableWords([...availableWords, word])
  }

  // Check if sentence is correct
  const checkSentence = () => {
    if (!sentenceSets[currentLevel]) return
    
    const builtSentence = selectedWords.map(w => w.text).join(' ')
    const correctSentence = sentenceSets[currentLevel].correct
    
    const correct = builtSentence === correctSentence
    setIsCorrect(correct)
    setShowFeedback(true)
    
    if (correct) {
      setScore(score + 20)
      
      // Proceed to next level after delay
      setTimeout(() => {
        if (currentLevel < sentenceSets.length - 1) {
          setCurrentLevel(currentLevel + 1)
          
          // Save progress if user is logged in
          if (userId) {
            saveProgress()
          }
        }
        setShowFeedback(false)
      }, 2000)
    }
  }

  // Function to save current game progress to Supabase
  const saveProgress = async () => {
    if (!userId) return
    
    setLoadingSave(true)
    try {
      await saveGameProgress(userId, {
        gameType: 'sentence-builder',
        progress: currentLevel,
        player_name: playerName,
        score: score,
        selectedWords: selectedWords,
        availableWords: availableWords
      })
      setMessage('Game progress saved!')
      setShowFeedback(true)
      setIsCorrect(null)
      setTimeout(() => {
        setShowFeedback(false)
      }, 2000)
    } catch (error) {
      console.error('Error saving game:', error)
      setMessage('Failed to save game')
      setShowFeedback(true)
      setIsCorrect(false)
      setTimeout(() => {
        setShowFeedback(false)
      }, 2000)
    } finally {
      setLoadingSave(false)
    }
  }

  // Function to load saved game progress
  const loadProgress = async (savedGame) => {
    if (!savedGame) return
    
    setCurrentLevel(savedGame.progress || 0)
    setPlayerName(savedGame.player_name || '')
    setScore(savedGame.score || 0)
    if (savedGame.selectedWords) {
      setSelectedWords(savedGame.selectedWords)
    }
    if (savedGame.availableWords) {
      setAvailableWords(savedGame.availableWords)
    } else {
      // Initialize level if no saved words
      resetLevel()
    }
    setSavedGames([])
  }

  // Function to load leaderboard data
  const loadLeaderboard = async () => {
    const { data } = await getLeaderboard('sentence-builder')
    if (data) {
      setLeaderboardData(data)
      setShowLeaderboard(true)
    }
  }

  // Function to submit high score when game ends
  const submitHighScore = async () => {
    if (!userId || !playerName) return
    
    try {
      await saveHighScore(userId, 'sentence-builder', score, playerName)
      await loadLeaderboard()
    } catch (error) {
      console.error('Error saving high score:', error)
    }
  }

  // Reset the current level
  const resetLevel = () => {
    if (!sentenceSets[currentLevel]) return
    
    // Reset the current level
    const currentSet = [...sentenceSets[currentLevel].words]
    const shuffledWords = currentSet.sort(() => Math.random() - 0.5)
    
    setAvailableWords(
      shuffledWords.map((word, index) => ({
        id: `word-${index}`,
        text: word,
      }))
    )
    
    setSelectedWords([])
    setIsCorrect(null)
    setShowFeedback(false)
  }

  // Start over completely
  const restartGame = () => {
    setCurrentLevel(0)
    setScore(0)
    setSelectedWords([])
    setIsCorrect(null)
    setShowFeedback(false)
  }

  // Show loading state while fetching sentence data
  if (loading) {
    return (
      <Page>
        <Section>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sentences...</p>
            </div>
          </div>
        </Section>
      </Page>
    )
  }

  // Show error state if there was a problem loading the game
  if (error || sentenceSets.length === 0) {
    return (
      <Page>
        <Section>
          <div className="bg-red-100 dark:bg-red-900 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Error Loading Game</h2>
            <p className="text-red-700 dark:text-red-300">{error || 'No sentence data found'}</p>
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
          <h1 className="text-xl font-bold">Sentence Builder</h1>
          <div className="flex space-x-4">
            {userId && !showFeedback && (
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
        {savedGames.length > 0 && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <h3 className="font-semibold">Saved Game Found</h3>
            <p className="text-sm mt-1">Would you like to continue your previous game?</p>
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
        
        {/* Player Name Input */}
        {isLoggedIn && !playerName && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
            <form onSubmit={(e) => {
              e.preventDefault();
              const nameInput = document.getElementById('playerNameInput');
              if (nameInput && nameInput.value.trim()) {
                setPlayerName(nameInput.value.trim());
              }
            }}>
              <label htmlFor="playerNameInput" className="block text-sm font-medium mb-2">
                Enter your name to track scores:
              </label>
              <div className="flex">
                <input
                  id="playerNameInput"
                  type="text"
                  className="flex-1 rounded-l-md border border-gray-300 dark:border-gray-700 p-2 
                           dark:bg-gray-800"
                  placeholder="Your name"
                />
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md"
                >
                  Set
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Leaderboard Display */}
        {showLeaderboard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Sentence Builder Leaderboard</h2>
              
              {leaderboardData.length > 0 ? (
                <div className="overflow-y-auto max-h-80">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2">Rank</th>
                        <th className="text-left py-2">Player</th>
                        <th className="text-right py-2">Score</th>
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
        
        <div className="mt-4 p-2 bg-blue-100 dark:bg-blue-900 rounded text-center">
          <p className="font-medium">Level: {currentLevel + 1}/{sentenceSets.length}</p>
          <p>Score: {score}</p>
          {playerName && <p className="text-sm">Player: {playerName}</p>}
        </div>
        
        {currentLevel < sentenceSets.length ? (
          <>
            {/* Sentence area - where words are placed */}
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 min-h-[100px] rounded-lg border-2 border-dashed border-yellow-300 flex flex-wrap gap-2 items-center">
              {selectedWords.length > 0 ? (
                selectedWords.map((word) => (
                  <div 
                    key={word.id}
                    onClick={() => removeWord(word)}
                    className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-md shadow cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
                  >
                    {word.text}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-center w-full">
                  Click on words below to build your sentence
                </p>
              )}
            </div>
            
            {/* Feedback area */}
            {showFeedback && (
              <div className={`mt-4 p-3 rounded-lg text-center ${
                isCorrect === true ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                isCorrect === false ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
              }`}>
                {isCorrect === true ? (
                  <p className="font-bold">Great job! That's correct!</p>
                ) : isCorrect === false ? (
                  <div>
                    <p className="font-bold">Not quite right. Try again!</p>
                    <p className="text-sm mt-1">Hint: Make sure your words are in the right order.</p>
                  </div>
                ) : (
                  <p className="font-bold">{message}</p>
                )}
              </div>
            )}
            
            {/* Available words */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Available Words:</h3>
              <div className="flex flex-wrap gap-2">
                {availableWords.map((word) => (
                  <div 
                    key={word.id}
                    onClick={() => selectWord(word)}
                    className="bg-purple-100 dark:bg-purple-800 px-3 py-2 rounded-md shadow cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-700"
                  >
                    {word.text}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="mt-8 flex gap-3 justify-center">
              <button
                onClick={checkSentence}
                disabled={selectedWords.length === 0 || availableWords.length > 0}
                className={`px-4 py-2 rounded-md font-medium ${
                  selectedWords.length === 0 || availableWords.length > 0
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                Check Sentence
              </button>
              
              <button
                onClick={resetLevel}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md font-medium"
              >
                Reset
              </button>
            </div>
          </>
        ) : (
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-green-500">Congratulations!</h2>
            <p className="mt-2">You've completed all sentences with a score of {score}!</p>
            
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={restartGame}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              >
                Play Again
              </button>
              
              {isLoggedIn && playerName && (
                <button
                  onClick={submitHighScore}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
                >
                  Submit Score
                </button>
              )}
              
              <button
                onClick={loadLeaderboard}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              >
                Leaderboard
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Arrange the words to form a correct sentence!
          </p>
        </div>
      </Section>
    </Page>
  )
}

export default SentenceBuilder