import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

export function Component() {
  const { initialized, authenticated, login } = useAuthStore()

  if (initialized && authenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">WARS</h1>
        <p className="mt-2 text-muted-foreground">
          Wildlife Activity Reporting System
        </p>
        <Button className="mt-6" size="lg" onClick={login}>
          Log in
        </Button>
      </div>
    </div>
  )
}
