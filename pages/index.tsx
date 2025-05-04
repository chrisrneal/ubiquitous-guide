import { useState } from 'react'
import Page from '@/components/page'
import Section from '@/components/section'
import Link from 'next/link'

const Index = () => {
  const [name, setName] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      setShowWelcome(true)
    }
  }

  return (
    <Page>
      <Section>
        <h1 className='text-2xl font-bold text-zinc-800 dark:text-zinc-200'>
          Reading Adventure
        </h1>

        <div className='mt-4'>
          {!showWelcome ? (
            <div className='space-y-4'>
              <p className='text-zinc-600 dark:text-zinc-400'>
                Welcome to Reading Adventure! This fun game will help you practice your reading skills.
              </p>
              
              <form onSubmit={handleSubmit} className='space-y-3'>
                <div>
                  <label htmlFor='name' className='block text-sm font-medium'>
                    What's your name?
                  </label>
                  <input
                    type='text'
                    id='name'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                              focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                              focus:ring-opacity-50 p-2 dark:bg-zinc-800 dark:border-zinc-700'
                    placeholder='Enter your name'
                  />
                </div>
                
                <button
                  type='submit'
                  className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
                >
                  Let's Play!
                </button>
              </form>
            </div>
          ) : (
            <div className='space-y-6'>
              <div className='bg-green-100 dark:bg-green-800 p-4 rounded-lg'>
                <p className='text-xl font-semibold'>
                  Hi {name}! Ready to start your reading adventure?
                </p>
              </div>
              
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Link href="/adventure-game" className='block p-6 bg-purple-100 dark:bg-purple-900 rounded-lg hover:shadow-lg transition-all'>
                  <h3 className='text-lg font-bold'>Forest Adventure</h3>
                  <p className='mt-2'>Embark on a magical journey through the forest! 🌳✨</p>
                </Link>
                
                <Link href="/sentence-builder" className='block p-6 bg-yellow-100 dark:bg-yellow-900 rounded-lg hover:shadow-lg transition-all'>
                  <h3 className='text-lg font-bold'>Sentence Builder</h3>
                  <p className='mt-2'>Create fun sentences by arranging words!</p>
                </Link>
              </div>
              
              <div className='flex justify-center'>
                <button
                  onClick={() => setShowWelcome(false)}
                  className='text-sm text-blue-500 hover:text-blue-700'
                >
                  Not {name}? Click here to change your name
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </Page>
  )
}

export default Index
