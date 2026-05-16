import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import { authApi } from '@/api/auth'
import Loading from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import CropModal from '@/components/common/CropModal'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise, desk job' },
  { value: 'light', label: 'Light', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderate', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'very active', label: 'Very Active', description: 'Very hard exercise, physical job, or training twice a day' },
]

const WEEKLY_GOALS = [
  { value: 'maintain', label: 'Maintain' },
  { value: 'lose_0_5', label: 'Lose 0.5 lb/wk' },
  { value: 'lose_1', label: 'Lose 1 lb/wk' },
  { value: 'lose_1_5', label: 'Lose 1.5 lb/wk' },
  { value: 'lose_2', label: 'Lose 2 lb/wk' },
]

// Convert cm to feet/inches
const cmToFtIn = (cm: number): { ft: number; in: number } => {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { ft, in: inches }
}

// Convert feet/inches to cm
const ftInToCm = (ft: number, inches: number): number => {
  return (ft * 12 + inches) * 2.54
}

// Convert lbs to kg
const lbsToKg = (lbs: number): number => {
  return lbs / 2.20462
}

function Profile() {
  const { setTitle } = usePageTitle()
  const { user, isLoading, checkAuth, logout } = useAuthStore()
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalValue, setGoalValue] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Profile edit state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [birthDateModalOpen, setBirthDateModalOpen] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [editForm, setEditForm] = useState({
    gender: '',
    heightFt: '',
    heightIn: '',
    weight: '',
    activityLevel: '',
    weeklyGoal: '',
  })

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

  const openEditModal = () => {
    const ftIn = cmToFtIn(user?.height || 0)
    setEditForm({
      gender: user?.gender || '',
      heightFt: ftIn.ft.toString(),
      heightIn: ftIn.in.toString(),
      weight: user?.weight ? (user.weight / 0.453592).toFixed(1).toString() : '',
      activityLevel: user?.activity_level || '',
      weeklyGoal: user?.weekly_goal || 'maintain',
    })
    setEditModalOpen(true)
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const heightCm = ftInToCm(
        parseInt(editForm.heightFt) || 0,
        parseInt(editForm.heightIn) || 0
      )
      const weightKg = lbsToKg(parseFloat(editForm.weight) || 0)

      const updated = await authApi.updateProfile({
        gender: editForm.gender || undefined,
        height: heightCm || undefined,
        weight: weightKg || undefined,
        activity_level: editForm.activityLevel || undefined,
        weekly_goal: editForm.weeklyGoal || 'maintain',
      })

      if (updated) {
        await checkAuth()
        setEditModalOpen(false)
      }
    } catch {
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const openBirthDateModal = () => {
    setBirthDateModalOpen(true)
  }

  const handleSaveBirthDate = async () => {
    if (!birthDate) return
    setSaving(true)
    try {
      const updated = await authApi.updateProfile({ birthdate: birthDate })
      if (updated) {
        await checkAuth()
        setBirthDateModalOpen(false)
        setBirthDate('')
      }
    } catch {
      alert('Failed to save birthdate. Please try again.')
    } finally {
      setSaving(false)
    }
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

      {/* Profile Info Section */}
      <div className="bg-white rounded-lg mt-4 mx-4 overflow-hidden">
        <div className="bg-[#185ADB] px-4 py-3 flex items-center justify-between">
          <span className="text-white text-base font-medium">Profile Info</span>
          <button
            type="button"
            onClick={openEditModal}
            className="text-white hover:opacity-80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>Age</span>
            <button
              type="button"
              onClick={openBirthDateModal}
              className="text-base font-medium"
              style={{ color: '#185ADB' }}
            >
              {user?.age != null ? `${user.age}` : 'Not set'}
            </button>
          </div>
          <div className="h-px bg-[#e0e0e0] my-2" />
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>Gender</span>
            <span className="text-base">{user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set'}</span>
          </div>
          <div className="h-px bg-[#e0e0e0] my-2" />
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>Height</span>
            <span className="text-base">{user?.height ? `${cmToFtIn(user.height).ft}' ${cmToFtIn(user.height).in}"` : 'Not set'}</span>
          </div>
          <div className="h-px bg-[#e0e0e0] my-2" />
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>Weight</span>
            <span className="text-base">{user?.weight ? `${(user.weight / 0.453592).toFixed(1)} lbs` : 'Not set'}</span>
          </div>
          <div className="h-px bg-[#e0e0e0] my-2" />
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>Activity Level</span>
            <span className="text-base">{user?.activity_level ? user.activity_level.charAt(0).toUpperCase() + user.activity_level.slice(1) : 'Not set'}</span>
          </div>
        </div>
      </div>

      {/* Nutrition Section */}
      <div className="bg-white rounded-lg mt-4 mx-4 overflow-hidden">
        <div className="bg-[#185ADB] px-4 py-3">
          <span className="text-white text-base font-medium">Nutrition</span>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>Weekly Goal</span>
            <span className="text-base">
              {WEEKLY_GOALS.find(g => g.value === user?.weekly_goal)?.label || 'Maintain'}
            </span>
          </div>
          <div className="h-px bg-[#e0e0e0] my-2" />
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>BMR</span>
            <span className="text-base">{user?.bmr ? `${user.bmr.toLocaleString()} kcal/day` : '—'}</span>
          </div>
          <div className="h-px bg-[#e0e0e0] my-2" />
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>TDEE</span>
            <span className="text-base">{user?.tdee ? `${user.tdee.toLocaleString()} kcal/day` : '—'}</span>
          </div>
          <div className="h-px bg-[#e0e0e0] my-2" />
          <div className="flex items-center justify-between py-2">
            <span className="text-base" style={{ color: '#757575' }}>Calorie Goal</span>
            <span className="text-base font-bold">{user?.daily_calorie_goal ? `${user.daily_calorie_goal.toLocaleString()} kcal/day` : '—'}</span>
          </div>
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

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Profile"
        submitLabel="Save"
        onSubmit={handleSaveProfile}
        submitLoading={saving}
        submitDisabled={!editForm.gender || !editForm.heightFt || !editForm.weight || !editForm.activityLevel}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm" style={{ color: '#757575' }}>Gender</label>
            <select
              className="w-full border rounded-lg px-4 py-3 text-base outline-none mt-1"
              style={{ borderColor: '#e0e0e0' }}
              value={editForm.gender}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="text-sm" style={{ color: '#757575' }}>Height</label>
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                className="w-1/3 border rounded-lg px-4 py-3 text-base outline-none"
                style={{ borderColor: '#e0e0e0' }}
                placeholder="Ft"
                value={editForm.heightFt}
                onChange={(e) => setEditForm({ ...editForm, heightFt: e.target.value })}
                min="1"
                max="9"
              />
              <input
                type="number"
                className="w-1/3 border rounded-lg px-4 py-3 text-base outline-none"
                style={{ borderColor: '#e0e0e0' }}
                placeholder="In"
                value={editForm.heightIn}
                onChange={(e) => setEditForm({ ...editForm, heightIn: e.target.value })}
                min="0"
                max="11"
              />
              <span className="text-base flex items-center" style={{ color: '#757575' }}>ft/in</span>
            </div>
          </div>
          <div>
            <label className="text-sm" style={{ color: '#757575' }}>Weight</label>
            <input
              type="number"
              className="w-full border rounded-lg px-4 py-3 text-base outline-none mt-1"
              style={{ borderColor: '#e0e0e0' }}
              placeholder="lbs"
              value={editForm.weight}
              onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
              step="0.1"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm" style={{ color: '#757575' }}>Activity Level</label>
            <select
              className="w-full border rounded-lg px-4 py-3 text-base outline-none mt-1"
              style={{ borderColor: '#e0e0e0' }}
              value={editForm.activityLevel}
              onChange={(e) => setEditForm({ ...editForm, activityLevel: e.target.value })}
            >
              <option value="">Select activity level</option>
              {ACTIVITY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>{level.label} - {level.description}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Birth Date Modal */}
      <Modal
        isOpen={birthDateModalOpen}
        onClose={() => setBirthDateModalOpen(false)}
        title="Set Birth Date"
        submitLabel="Save"
        onSubmit={handleSaveBirthDate}
        submitLoading={saving}
        submitDisabled={!birthDate}
      >
        <input
          type="date"
          className="w-full border rounded-lg px-4 py-3 text-base outline-none"
          style={{ borderColor: '#e0e0e0' }}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
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
