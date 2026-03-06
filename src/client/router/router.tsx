import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Component as AppLayout } from '@/layouts/app'
import RootLayout from '@/layouts/root'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RootLayout>
        <AppLayout />
      </RootLayout>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
