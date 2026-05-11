import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { authApi } from '@/api/auth'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import CropModal from '@/components/common/CropModal'

function Profile() {
  const { setTitle } = usePageTitle()
  const { user, isLoading, checkAuth, logout } = useAuthStore()
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalValue, setGoalValue] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => { setTitle('More') }, [setTitle])

  const handleFileSelect = useCallback((_file: File) => {
    setCropModalOpen(true)
  }, [])

  const handleCropComplete = async (croppedFile: File) => {
    setCropModalOpen(false)
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.set('photo', croppedFile)
      await authApi.uploadProfilePhoto(formData)
      await checkAuth()
    } catch {
      alert('Failed to upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSaveGoal = async () => {
    const goal = parseFloat(goalValue)
    if (isNaN(goal) || goal <= 0) return
    setSaving(true)
    try {
      const updated = await authApi.updateProfile({ weight_goal_lbs: goal })
      if (updated) {
        await checkAuth()
        setGoalModalOpen(false)
        setGoalValue('')
      }
    } catch (err) {
      alert('Failed to save weight goal. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const openGoalModal = () => {
    setGoalValue(user?.weight_goal_lbs?.toString() || '')
    setGoalModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <div className="flex justify-center py-12">
          <Loading text="Loading..." />
        </div>
      </div>
    )
  }

  const emailInitial = user?.email?.charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Blue header bar */}
      <div className="bg-[#185ADB] px-4 pt-4 pb-3">
        <span className="text-white text-lg font-medium">More</span>
      </div>
      {/* White user info section */}
      <div className="bg-white px-4 py-4 mx-4 mt-4 rounded-lg">
        <div className="flex items-center justify-center gap-4">
          <div className="relative group">
            {user?.profile_photo_path ? (
              <img
                src={`/api/auth/uploads/${user.profile_photo_path}`}
                alt="Profile"
                className="rounded-full object-cover"
                style={{ width: '64px', height: '64px' }}
              />
            ) : (
              <div
                className="rounded-full bg-white flex items-center justify-center cursor-pointer"
                style={{ width: '64px', height: '64px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-2xl" style={{ color: '#185ADB' }}>
                  {emailInitial}
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
              className="hidden"
            />
            {user?.profile_photo_path && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="absolute bottom-0 right-0 p-1 bg-[#185ADB] rounded-full text-white hover:bg-[#1550C0] transition-colors"
                style={{ width: '24px', height: '24px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <span className="text-base font-medium">{user?.email || ''}</span>
        </div>
      </div>

      {/* Goals section */}
      <div className="bg-white rounded-lg mt-4 mx-4 overflow-hidden">
        <div className="bg-[#185ADB] px-4 py-3">
          <span className="text-white text-base font-medium">Goals</span>
        </div>
        <div>
          {/* Weight Goal row */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-4"
            style={{ color: '#212121' }}
            onClick={openGoalModal}
          >
            <span className="text-base">Weight Goal</span>
            <div className="flex items-center gap-2">
              <span className="text-base" style={{ color: '#757575' }}>
                {user?.weight_goal_lbs ? `${user.weight_goal_lbs} lbs` : 'Not set'}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
        <div className="h-px bg-[#e0e0e0] mx-4" />
      </div>

      {/* Settings section */}
      <div className="bg-white rounded-lg mt-4 mx-4 overflow-hidden">
        <div className="bg-[#185ADB] px-4 py-3">
          <span className="text-white text-base font-medium">Settings</span>
        </div>
        <div>
          {/* Account row */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-4"
            style={{ color: '#212121' }}
          >
            <span className="text-base">Account</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="h-px bg-[#e0e0e0] mx-4" />
          {/* Help row */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-4"
            style={{ color: '#212121' }}
          >
            <span className="text-base">Help</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="h-px bg-[#e0e0e0] mx-4" />
        {/* Sign Out button */}
        <div className="px-4 py-4">
          <button
            type="button"
            className="w-full text-center py-3 rounded-lg text-base font-medium"
            style={{ color: '#E53935', background: 'transparent' }}
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Weight Goal Modal */}
      <Modal
        isOpen={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false)
          setGoalValue('')
        }}
        title="Set Weight Goal"
        submitLabel="Save"
        onSubmit={handleSaveGoal}
        submitLoading={saving}
        submitDisabled={!goalValue || parseFloat(goalValue) <= 0}
      >
        <input
          type="number"
          className="w-full border rounded-lg px-4 py-3 text-base outline-none"
          style={{ borderColor: '#e0e0e0' }}
          placeholder="Enter your goal weight (lbs)"
          value={goalValue}
          onChange={(e) => setGoalValue(e.target.value)}
          step="0.1"
          min="0"
        />
      </Modal>

      {/* Profile Photo Crop Modal */}
      <CropModal
        isOpen={cropModalOpen}
        onCropComplete={handleCropComplete}
        onClose={() => setCropModalOpen(false)}
      />
    </div>
  )
}

export default Profile
