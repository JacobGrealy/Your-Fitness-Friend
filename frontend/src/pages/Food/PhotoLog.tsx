import { useState, useRef, useCallback, useEffect } from 'react'
import PhotoSourceChooser from '@/components/common/PhotoSourceChooser'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mealsAiLogApi } from '@/api/mealsAiLog'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import Loading from '@/components/common/Loading'
import type { FoodPhotoLogEntry, FoodPhotoMessage } from '@/types/foodPhotoLog'
import { MEAL_LABELS, MEAL_TYPES } from '@/utils/constants'
import { isMealType } from '@/utils/meal'
import { requestedLocalDate } from '@/utils/localDate'
import { saveAcceptedEntries } from '@/utils/photoLogEntries'
import { useFoodStore } from '@/store/foodStore'

type Step = 'capture' | 'review' | 'loading'

/**
 * Estimations arrive as floats and are edited in number inputs; round them once at the
 * boundary so the field shows what a person would type (FF-0092). Full precision is not
 * lost from anything already stored - this only shapes the draft the AI proposed.
 */
function normaliseEntryMacros<T extends { protein_g?: number | null; carbs_g?: number | null; fat_g?: number | null }>(entry: T): T {
  const round = (value: number | null | undefined) =>
    value === null || value === undefined || !Number.isFinite(value) ? value : Math.round(value * 100) / 100
  return { ...entry, protein_g: round(entry.protein_g), carbs_g: round(entry.carbs_g), fat_g: round(entry.fat_g) }
}

export default function PhotoLog() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const foodStore = useFoodStore()
  const [accepting, setAccepting] = useState(false)

  const [step, setStep] = useState<Step>('capture')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Opened from the diary's Add Food screen with the meal the user was looking at;
  // the photo's analysis is filed under that meal rather than a default (FF-0038).
  const [searchParams] = useSearchParams()
  const mealFromUrl = searchParams.get('meal')
  const logDate = requestedLocalDate(searchParams.get('date'))
  const [mealType, setMealType] = useState<string>(isMealType(mealFromUrl) ? mealFromUrl : 'lunch')
  const [logEntries, setLogEntries] = useState<FoodPhotoLogEntry[]>([])
  const [messages, setMessages] = useState<FoodPhotoMessage[]>([])
  const [userMessage, setUserMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { setTitle('Log Food Photo') }, [setTitle])

  useEffect(() => {
    if (step === 'review' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [step, messages])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }, [])

  const handleCapture = useCallback(async () => {
    if (!selectedFile || isSubmitting) return
    setIsSubmitting(true)
    setStep('loading')

    const formData = new FormData()
    formData.append('photo', selectedFile)
    formData.append('meal_type', mealType)
    formData.append('date', logDate)

    try {
      const response = await mealsAiLogApi.analyzePhoto(formData)
      setLogEntries(response.logs.map(normaliseEntryMacros))
      setMessages(response.conversation_history)
      setStep('review')
      setIsSubmitting(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze photo')
      setStep('capture')
      setIsSubmitting(false)
    }
  }, [selectedFile, mealType, logDate, isSubmitting])

  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim() || isSubmitting) return
    setIsSubmitting(true)
    setStep('loading')

    const newMessages: FoodPhotoMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ]

    try {
      const response = await mealsAiLogApi.sendMessage(
        newMessages.filter(m => m.role === 'ai'),
        userMessage,
      )

      // Append new AI message
      const aiMessage = response.conversation_history.find(
        m => m.role === 'ai' && m.content !== newMessages[newMessages.length - 1]?.content,
      )
      if (aiMessage) {
        setMessages([...newMessages, aiMessage])
      } else {
        setMessages([...newMessages])
      }

      // Prepend new log entries
      if (response.logs && response.logs.length > 0) {
        setLogEntries(prev => [...prev, ...response.logs.map(normaliseEntryMacros)])
      }

      setUserMessage('')
      setStep('review')
      setIsSubmitting(false)
    } catch (err: any) {
      setMessages([...newMessages, { role: 'ai', content: err.response?.data?.error || 'Failed to get response' }])
      setError(err.response?.data?.error || 'Failed to get response')
      setStep('review')
      setIsSubmitting(false)
    }
  }, [userMessage, messages, isSubmitting])

  const handleEditEntry = useCallback((index: number, field: keyof FoodPhotoLogEntry, value: string | number) => {
    setLogEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        return { ...entry, [field]: value }
      }
      return entry
    }))
  }, [])

  const handleDeleteEntry = useCallback((index: number) => {
    setLogEntries(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleAccept = useCallback(async () => {
    if (logEntries.length === 0 || accepting) return
    setAccepting(true)
    setStep('loading')

    try {
      // Entries normally carry an id from /api/meals/ai-log; anything without one
      // is created rather than silently dropped (FF-0042).
      await saveAcceptedEntries(logEntries, {
        updateFoodLog: (id, data) => foodStore.updateFoodLog(id, data),
        logFood: (data) => foodStore.logFood(data),
      })
      navigate('/food/daily')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save food logs')
      setStep('review')
      setAccepting(false)
    }
  }, [logEntries, foodStore, navigate, accepting])

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <div className="bg-[#f2f2f2] pt-14 sm:pt-0 pb-20 sm:pb-0">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#185ADB] text-white px-4 py-3 flex items-center gap-3 z-10 sm:hidden">
        <button onClick={handleBack} className="text-white text-xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Log Food Photo</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        </div>
      )}

      {/* Capture Step */}
       {step === 'capture' && (
         <div className="p-4 space-y-4">
           <PhotoSourceChooser inline onSelect={handleFileSelect} />

          {previewUrl && (
            <div className="bg-white rounded-xl p-3 space-y-3">
              <img src={previewUrl} alt="Preview" className="w-full max-h-[300px] object-contain rounded-lg" />
              <div>
                <label className="block text-xs text-[#757575] mb-1">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                >
                  {MEAL_TYPES.map(type => (
                    <option key={type} value={type}>{MEAL_LABELS[type]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                   onClick={() => {
                     setSelectedFile(null)
                     setPreviewUrl(null)
                   }}
                  className="flex-1 py-2 text-sm font-medium text-[#185ADB] border border-[#185ADB] rounded-lg"
                >
                  Retake
                </button>
                <button
                  onClick={handleCapture}
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-sm font-medium text-white bg-[#185ADB] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analyze
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Step */}
      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loading text={messages.length > 0 ? 'Updating macros...' : 'Analyzing food...'} />
        </div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        // pb clears the floating Accept bar above, not the nav (FF-0053); the
        // shell's own padding only clears the nav.
        <div className="px-4 space-y-4 pb-12">
          {/* Photo preview */}
          {previewUrl && (
            <div className="bg-white rounded-xl p-3">
              <img src={previewUrl} alt="Food" className="w-full max-h-[200px] object-contain rounded-lg" />
            </div>
          )}

          {/* Log Entries */}
          {logEntries.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#212121]">Food Logs</h2>
              {logEntries.map((entry, index) => (
                <div key={`${index}-${entry.id}`} className="bg-white rounded-xl p-4 space-y-3">
                  {/* Row 1: Name + Delete */}
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      value={entry.food_name}
                      onChange={(e) => handleEditEntry(index, 'food_name', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                    />
                    <button
                      onClick={() => handleDeleteEntry(index)}
                      className="text-[#E53935] p-2"
                      aria-label="Delete log"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Meal type */}
                  <select
                    value={entry.meal_type}
                    onChange={(e) => handleEditEntry(index, 'meal_type', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                  >
                    {MEAL_TYPES.map(type => (
                      <option key={type} value={type}>{MEAL_LABELS[type]}</option>
                    ))}
                  </select>

                  {/* Macros grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-[#757575] mb-1">Cal</label>
                      <input
                        type="number"
                        value={entry.calories}
                        onChange={(e) => handleEditEntry(index, 'calories', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#757575] mb-1">Protein (g)</label>
                      <input
                        type="number"
                        value={entry.protein_g}
                        onChange={(e) => handleEditEntry(index, 'protein_g', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#757575] mb-1">Carbs (g)</label>
                      <input
                        type="number"
                        value={entry.carbs_g}
                        onChange={(e) => handleEditEntry(index, 'carbs_g', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#757575] mb-1">Fat (g)</label>
                      <input
                        type="number"
                        value={entry.fat_g}
                        onChange={(e) => handleEditEntry(index, 'fat_g', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[#212121]">AI Conversation</h2>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`rounded-xl px-4 py-2 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-[#185ADB] text-white ml-auto'
                      : 'bg-white text-[#212121] mr-auto'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userMessage.trim()) {
                  handleSendMessage()
                }
              }}
              placeholder="Ask AI to update (e.g., 'add rice')"
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
            />
            <button
              onClick={handleSendMessage}
              disabled={!userMessage.trim()}
              className="w-10 h-10 bg-[#185ADB] text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Accept Button - sticky at bottom */}
      {step === 'review' && logEntries.length > 0 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-4 left-0 right-0 px-4 bg-[#f2f2f2] pt-3">
          <button
            onClick={handleAccept}
            className="w-full bg-[#185ADB] text-white font-medium py-3 rounded-xl hover:bg-[#1552B6] transition-colors text-sm shadow-lg"
          >
            Accept ({logEntries.length} log{logEntries.length !== 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  )
}
