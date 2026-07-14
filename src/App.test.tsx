import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('app activation', () => {
  beforeEach(() => localStorage.clear())

  it('creates the first character and opens the command dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /build your character/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/your name/i), 'Kris')
    await user.type(screen.getByLabelText(/current role/i), 'Builder')
    await user.click(screen.getByRole('button', { name: /enter command center/i }))

    expect(screen.getByRole('heading', { name: /good to see you, kris/i })).toBeInTheDocument()
    expect(screen.getByText('YOUR NEXT MOVE')).toBeInTheDocument()
  })
})
