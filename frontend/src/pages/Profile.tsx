import { useAuthStore } from '@/store/authStore'
import Loading from '@/components/common/Loading'

function Profile() {
  const { user, isLoading, logout } = useAuthStore()

  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <div className="flex justify-center py-12">
          <Loading text="Loading profile..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {user ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-16">
                    <span className="text-xl">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="card-title text-lg">{user.email}</h2>
                  <p className="text-sm text-base-content/60">Member since {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-base-content/70">Email</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <button className="btn btn-error w-full" onClick={logout}>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <p className="text-base-content/70">Not logged in</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
