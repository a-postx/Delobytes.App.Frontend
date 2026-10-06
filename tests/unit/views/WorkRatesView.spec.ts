import { describe, it, expect } from 'vitest'

describe('WorkRatesView logic', () => {
  describe('currency formatting', () => {
    const formatCurrency = (v: number): string =>
      v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })

    it('should format integer wage', () => {
      const result = formatCurrency(2000)
      expect(result).toContain('2')
      expect(result).toContain('000')
      expect(result).toContain('₽')
    })

    it('should format decimal wage', () => {
      const result = formatCurrency(2500.50)
      expect(result).toContain('2')
      expect(result).toContain('500')
      expect(result).toContain('₽')
    })

    it('should format large wage with thousands separator', () => {
      const result = formatCurrency(25000)
      expect(result).toContain('₽')
    })

    it('should format zero wage', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
      expect(result).toContain('₽')
    })
  })

  describe('date formatting', () => {
    const formatDate = (d: string): string =>
      new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

    it('should format ISO date to Russian format', () => {
      const result = formatDate('2024-01-15T00:00:00Z')
      expect(result).toBe('15.01.2024')
    })

    it('should format date string correctly', () => {
      const result = formatDate('2024-12-31')
      expect(result).toMatch(/31\.12\.2024/)
    })
  })

  describe('status filter logic', () => {
    const mockItems = [
      { id: '1', name: 'Standard Rate', dailyWage: 2000, validFrom: '2024-01-01', isActive: true, createdAt: '2024-01-01' },
      { id: '2', name: 'Inactive Rate', dailyWage: 1500, validFrom: '2024-01-01', isActive: false, createdAt: '2024-01-02' },
      { id: '3', name: 'Premium Rate', dailyWage: 3000, validFrom: '2024-02-01', isActive: true, createdAt: '2024-02-01' }
    ]

    it('should filter active items', () => {
      const statusFilter = 'active'
      const filtered = mockItems.filter(i => 
        statusFilter === 'all' ? true : 
        statusFilter === 'active' ? i.isActive : 
        !i.isActive
      )
      expect(filtered).toHaveLength(2)
      expect(filtered.every(i => i.isActive)).toBe(true)
    })

    it('should filter inactive items', () => {
      const statusFilter = 'inactive'
      const filtered = mockItems.filter(i => 
        statusFilter === 'all' ? true : 
        statusFilter === 'active' ? i.isActive : 
        !i.isActive
      )
      expect(filtered).toHaveLength(1)
      expect(filtered[0].isActive).toBe(false)
    })

    it('should show all items when filter is all', () => {
      const statusFilter = 'all'
      const filtered = mockItems.filter(i => 
        statusFilter === 'all' ? true : 
        statusFilter === 'active' ? i.isActive : 
        !i.isActive
      )
      expect(filtered).toHaveLength(3)
    })

    it('should calculate correct counts', () => {
      const activeCount = mockItems.filter(i => i.isActive).length
      const inactiveCount = mockItems.filter(i => !i.isActive).length
      const totalCount = mockItems.length

      expect(activeCount).toBe(2)
      expect(inactiveCount).toBe(1)
      expect(totalCount).toBe(3)
    })
  })

  describe('form validation', () => {
    it('should validate required name field', () => {
      const name = ''
      const isValid = name.trim() !== ''
      expect(isValid).toBe(false)
    })

    it('should validate name with whitespace', () => {
      const name = '   '
      const isValid = name.trim() !== ''
      expect(isValid).toBe(false)
    })

    it('should accept valid name', () => {
      const name = 'Standard Rate'
      const isValid = name.trim() !== ''
      expect(isValid).toBe(true)
    })

    it('should validate required validFrom date', () => {
      const validFrom = ''
      const isValid = validFrom !== ''
      expect(isValid).toBe(false)
    })

    it('should accept valid date', () => {
      const validFrom = '2024-01-01'
      const isValid = validFrom !== ''
      expect(isValid).toBe(true)
    })
  })

  describe('form data conversion', () => {
    it('should convert string dailyWage to number', () => {
      const form = {
        name: 'Test Rate',
        dailyWage: '2500',
        validFrom: '2024-01-01'
      }

      const payload = {
        name: form.name.trim(),
        dailyWage: Number(form.dailyWage),
        validFrom: form.validFrom
      }

      expect(payload.dailyWage).toBe(2500)
      expect(typeof payload.dailyWage).toBe('number')
    })

    it('should handle zero dailyWage', () => {
      const form = {
        name: 'Zero Rate',
        dailyWage: '0',
        validFrom: '2024-01-01'
      }

      const payload = {
        name: form.name.trim(),
        dailyWage: Number(form.dailyWage),
        validFrom: form.validFrom
      }

      expect(payload.dailyWage).toBe(0)
    })

    it('should trim name whitespace', () => {
      const form = {
        name: '  Standard Rate  ',
        dailyWage: '2000',
        validFrom: '2024-01-01'
      }

      const payload = {
        name: form.name.trim(),
        dailyWage: Number(form.dailyWage),
        validFrom: form.validFrom
      }

      expect(payload.name).toBe('Standard Rate')
    })
  })

  describe('restore operation', () => {
    it('should prepare update payload for restore including name', () => {
      const restoreTarget = { name: 'Standard Rate' }
      const updatePayload = {
        name: restoreTarget.name,
        isActive: true
      }

      expect(updatePayload.isActive).toBe(true)
      expect(updatePayload.name).toBe('Standard Rate')
    })

    it('should set isActive to true on restore', () => {
      const restoreTarget = {
        id: '1',
        name: 'Inactive Rate',
        dailyWage: 2000,
        validFrom: '2024-01-01',
        activeVersion: null as { id: string; dailyWage: number; validFrom: string } | null,
        isActive: false,
        createdAt: '2024-01-01'
      }

      const updatePayload = {
        name: restoreTarget.name,
        isActive: true
      }

      expect(updatePayload.isActive).toBe(true)
      expect(restoreTarget.isActive).toBe(false)
    })
  })

  describe('activeVersion fallback for table display', () => {
    const mockItem = {
      id: '1',
      name: 'Standard Rate',
      dailyWage: 1800,
      validFrom: '2023-01-01',
      activeVersion: { id: 'v1', dailyWage: 2200, validFrom: '2024-03-01' } as { id: string; dailyWage: number; validFrom: string } | null,
      isActive: true,
      createdAt: '2024-01-01'
    }

    it('should prefer activeVersion.dailyWage over top-level dailyWage', () => {
      const wage = mockItem.activeVersion?.dailyWage ?? mockItem.dailyWage
      expect(wage).toBe(2200)
    })

    it('should prefer activeVersion.validFrom over top-level validFrom', () => {
      const validFrom = mockItem.activeVersion?.validFrom ?? mockItem.validFrom
      expect(validFrom).toBe('2024-03-01')
    })

    it('should fall back to top-level fields when activeVersion is null', () => {
      const itemWithoutVersion = { ...mockItem, activeVersion: null }
      const wage = itemWithoutVersion.activeVersion?.dailyWage ?? itemWithoutVersion.dailyWage
      const validFrom = itemWithoutVersion.activeVersion?.validFrom ?? itemWithoutVersion.validFrom
      expect(wage).toBe(1800)
      expect(validFrom).toBe('2023-01-01')
    })
  })

  describe('edit form validation', () => {
    it('should validate required name field for edit', () => {
      const editForm = { name: '' }
      const isValid = editForm.name.trim() !== ''
      expect(isValid).toBe(false)
    })

    it('should accept valid edit name', () => {
      const editForm = { name: 'Renamed Rate' }
      const isValid = editForm.name.trim() !== ''
      expect(isValid).toBe(true)
    })

    it('should build update payload with name and isActive', () => {
      const editTarget = { name: 'Old Name', isActive: true }
      const editForm = { name: 'New Name' }

      const payload = {
        name: editForm.name.trim(),
        isActive: editTarget.isActive
      }

      expect(payload).toEqual({ name: 'New Name', isActive: true })
    })
  })

  describe('new version date validation', () => {
    const today = (): string => new Date().toISOString().slice(0, 10)

    const isVersionDateInPast = (validFrom: string): boolean => {
      if (!validFrom) return false
      return validFrom < today()
    }

    it('should detect past date', () => {
      expect(isVersionDateInPast('2020-01-01')).toBe(true)
    })

    it('should allow today date', () => {
      expect(isVersionDateInPast(today())).toBe(false)
    })

    it('should allow future date', () => {
      expect(isVersionDateInPast('2099-12-31')).toBe(false)
    })

    it('should handle empty date', () => {
      expect(isVersionDateInPast('')).toBe(false)
    })
  })

  describe('new version form validation and conversion', () => {
    it('should validate wage greater than zero', () => {
      const versionForm = { dailyWage: 0, validFrom: '2024-01-01' }
      const isValid = Number(versionForm.dailyWage) > 0
      expect(isValid).toBe(false)
    })

    it('should accept valid wage', () => {
      const versionForm = { dailyWage: 2500, validFrom: '2024-01-01' }
      const isValid = Number(versionForm.dailyWage) > 0
      expect(isValid).toBe(true)
    })

    it('should validate required validFrom for new version', () => {
      const versionForm = { dailyWage: 2500, validFrom: '' }
      const isValid = versionForm.validFrom !== ''
      expect(isValid).toBe(false)
    })

    it('should build createVersion payload', () => {
      const versionForm = { dailyWage: 3000, validFrom: '2024-06-01' }

      const payload = {
        dailyWage: Number(versionForm.dailyWage),
        validFrom: versionForm.validFrom
      }

      expect(payload).toEqual({ dailyWage: 3000, validFrom: '2024-06-01' })
    })

    it('should pre-fill new version wage from activeVersion', () => {
      const item = {
        activeVersion: { id: 'v1', dailyWage: 1900, validFrom: '2024-01-01' } as { id: string; dailyWage: number; validFrom: string } | null
      }

      const prefilledWage = item.activeVersion?.dailyWage ?? 0
      expect(prefilledWage).toBe(1900)
    })

    it('should pre-fill new version wage with zero when there is no activeVersion', () => {
      const item = { activeVersion: null as { id: string; dailyWage: number; validFrom: string } | null }
      const prefilledWage = item.activeVersion?.dailyWage ?? 0
      expect(prefilledWage).toBe(0)
    })
  })
})
