import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('app activation', () => {
  beforeEach(() => localStorage.clear())

  it('creates the first character and opens the dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /see where you are/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /build your workspace/i }))
    expect(screen.getByRole('heading', { name: /build your character/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/your name/i), 'Kris')
    await user.type(screen.getByLabelText(/current role/i), 'Builder')
    await user.click(screen.getByRole('button', { name: /open dashboard/i }))

    expect(screen.getByRole('heading', { name: /good to see you, kris/i })).toBeInTheDocument()
    expect(screen.getByText('YOUR NEXT OUTCOME')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Profile' }))
    expect(screen.getByRole('button', { name: 'Wipe test data & restart' })).toBeInTheDocument()
  })

  it('lets a newcomer return from setup to the product overview', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /build your workspace/i }))
    await user.click(screen.getByRole('button', { name: /back to overview/i }))

    expect(screen.getByRole('heading', { name: /see where you are/i })).toBeInTheDocument()
  })
})
