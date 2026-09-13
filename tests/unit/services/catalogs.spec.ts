import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  suppliersApi, 
  componentsApi, 
  tariffGridsApi, 
  workRatesApi,
  productWorkRatesApi,
  Unit,
  TariffType,
  type SupplierItem,
  type ComponentItem,
  type TariffGridItem,
  type TariffGridDetail,
  type WorkRateItem,
  type ProductWorkRateItem
} from '@/services/api'
import { axiosInstance } from '@/services/api/client'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

describe('Catalogs API - Stage 7 & 8', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('suppliersApi', () => {
    it('should get all suppliers', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            inn: '1234567890',
            name: 'Supplier 1',
            description: 'Test supplier',
            phone: '+79001234567',
            email: 'test@example.com',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: mockResponse })

      const result = await suppliersApi.getAll()

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/catalogs/suppliers')
      expect(result).toEqual(mockResponse)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].inn).toBe('1234567890')
    })

    it('should create a supplier', async () => {
      const newSupplier: SupplierItem = {
        id: '2',
        inn: '9876543210',
        name: 'New Supplier',
        description: 'Description',
        phone: '+79009876543',
        email: 'new@example.com',
        isActive: true,
        createdAt: '2024-01-02T00:00:00Z'
      }

      vi.mocked(axiosInstance.post).mockResolvedValue({ data: newSupplier })

      const payload = {
        inn: '9876543210',
        name: 'New Supplier',
        description: 'Description',
        phone: '+79009876543',
        email: 'new@example.com'
      }

      const result = await suppliersApi.create(payload)

      expect(axiosInstance.post).toHaveBeenCalledWith('/api/catalogs/suppliers', payload)
      expect(result).toEqual(newSupplier)
      expect(result.inn).toBe('9876543210')
    })

    it('should update a supplier', async () => {
      const supplierId = '1'
      const updatePayload = {
        inn: '1234567890',
        name: 'Updated Supplier',
        description: 'Updated description',
        phone: '+79001111111',
        email: 'updated@example.com',
        isActive: true
      }

      vi.mocked(axiosInstance.put).mockResolvedValue({ data: undefined })

      await suppliersApi.update(supplierId, updatePayload)

      expect(axiosInstance.put).toHaveBeenCalledWith(
        `/api/catalogs/suppliers/${supplierId}`,
        updatePayload
      )
    })

    it('should delete a supplier (soft delete)', async () => {
      const supplierId = '1'

      vi.mocked(axiosInstance.delete).mockResolvedValue({ data: undefined })

      await suppliersApi.delete(supplierId)

      expect(axiosInstance.delete).toHaveBeenCalledWith(`/api/catalogs/suppliers/${supplierId}`)
    })
  })

  describe('componentsApi', () => {
    it('should get all components', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            name: 'Component 1',
            description: 'Test component',
            unit: Unit.Piece,
            activePrice: {
              id: 'p1',
              pricePerUnit: 100,
              supplierId: 's1',
              supplierName: 'Supplier 1',
              validFrom: '2024-01-01'
            },
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: mockResponse })

      const result = await componentsApi.getAll()

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/catalogs/components')
      expect(result).toEqual(mockResponse)
      expect(result.items[0].activePrice?.pricePerUnit).toBe(100)
    })

    it('should create a component with initial price', async () => {
      const newComponent: ComponentItem = {
        id: '2',
        name: 'New Component',
        description: 'Description',
        unit: Unit.Kg,
        activePrice: {
          id: 'p2',
          pricePerUnit: 50,
          supplierId: undefined,
          supplierName: undefined,
          validFrom: '2024-01-01'
        },
        isActive: true,
        createdAt: '2024-01-02T00:00:00Z'
      }

      vi.mocked(axiosInstance.post).mockResolvedValue({ data: newComponent })

      const payload = {
        name: 'New Component',
        description: 'Description',
        unit: Unit.Kg,
        pricePerUnit: 50,
        supplierId: undefined,
        validFrom: '2024-01-01'
      }

      const result = await componentsApi.create(payload)

      expect(axiosInstance.post).toHaveBeenCalledWith('/api/catalogs/components', payload)
      expect(result).toEqual(newComponent)
      expect(result.unit).toBe(Unit.Kg)
    })

    it('should update a component', async () => {
      const componentId = '1'
      const updatePayload = {
        name: 'Updated Component',
        description: 'Updated description',
        unit: Unit.Meter
      }

      vi.mocked(axiosInstance.put).mockResolvedValue({ data: undefined })

      await componentsApi.update(componentId, updatePayload)

      expect(axiosInstance.put).toHaveBeenCalledWith(
        `/api/catalogs/components/${componentId}`,
        updatePayload
      )
    })

    it('should create a new price for component', async () => {
      const componentId = '1'
      const pricePayload = {
        pricePerUnit: 150,
        supplierId: 's2',
        validFrom: '2024-02-01'
      }

      vi.mocked(axiosInstance.post).mockResolvedValue({ data: undefined })

      await componentsApi.createPrice(componentId, pricePayload)

      expect(axiosInstance.post).toHaveBeenCalledWith(
        `/api/catalogs/components/${componentId}/prices`,
        pricePayload
      )
    })

    it('should restore a component', async () => {
      const componentId = '1'

      vi.mocked(axiosInstance.post).mockResolvedValue({ data: undefined })

      await componentsApi.restore(componentId)

      expect(axiosInstance.post).toHaveBeenCalledWith(
        `/api/catalogs/components/${componentId}/restore`
      )
    })

    it('should delete a component (soft delete)', async () => {
      const componentId = '1'

      vi.mocked(axiosInstance.delete).mockResolvedValue({ data: undefined })

      await componentsApi.delete(componentId)

      expect(axiosInstance.delete).toHaveBeenCalledWith(`/api/catalogs/components/${componentId}`)
    })
  })

  describe('tariffGridsApi', () => {
    it('should get all tariff grids', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            name: 'WB Tariffs 2024',
            tariffType: TariffType.WbLogistics,
            validFrom: '2024-01-01',
            channelId: undefined,
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: mockResponse })

      const result = await tariffGridsApi.getAll()

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/catalogs/tariff-grids', { params: {} })
      expect(result).toEqual(mockResponse)
      expect(result.items[0].tariffType).toBe(TariffType.WbLogistics)
    })

    it('should get tariff grids filtered by type', async () => {
      const mockResponse = {
        items: [
          {
            id: '2',
            name: 'FF Tariffs 2024',
            tariffType: TariffType.FulfillmentCenter,
            validFrom: '2024-01-01',
            channelId: undefined,
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: mockResponse })

      const result = await tariffGridsApi.getAll(TariffType.FulfillmentCenter)

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/catalogs/tariff-grids', {
        params: { tariffType: TariffType.FulfillmentCenter }
      })
      expect(result.items[0].tariffType).toBe(TariffType.FulfillmentCenter)
    })

    it('should get tariff grid by id with entries', async () => {
      const mockDetail: TariffGridDetail = {
        id: '1',
        name: 'WB Tariffs 2024',
        tariffType: TariffType.WbLogistics,
        validFrom: '2024-01-01',
        channelId: undefined,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        entries: [
          { regionOrCity: 'Москва', volumeThresholdLiters: 1, rate: 50 },
          { regionOrCity: 'Санкт-Петербург', volumeThresholdLiters: 1, rate: 45 }
        ]
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: mockDetail })

      const result = await tariffGridsApi.getById('1')

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/catalogs/tariff-grids/1')
      expect(result).toEqual(mockDetail)
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].rate).toBe(50)
    })

    it('should create a tariff grid with entries', async () => {
      const newGrid: TariffGridItem = {
        id: '3',
        name: 'New Tariffs',
        tariffType: TariffType.WbLogistics,
        validFrom: '2024-03-01',
        channelId: undefined,
        isActive: true,
        createdAt: '2024-03-01T00:00:00Z'
      }

      vi.mocked(axiosInstance.post).mockResolvedValue({ data: newGrid })

      const payload = {
        name: 'New Tariffs',
        tariffType: TariffType.WbLogistics,
        validFrom: '2024-03-01',
        channelId: undefined,
        entries: [
          { regionOrCity: 'Казань', volumeThresholdLiters: 1, rate: 40 }
        ]
      }

      const result = await tariffGridsApi.create(payload)

      expect(axiosInstance.post).toHaveBeenCalledWith('/api/catalogs/tariff-grids', payload)
      expect(result).toEqual(newGrid)
    })

    it('should update a tariff grid', async () => {
      const gridId = '1'
      const updatePayload = {
        name: 'Updated Tariffs',
        isActive: false
      }

      vi.mocked(axiosInstance.put).mockResolvedValue({ data: undefined })

      await tariffGridsApi.update(gridId, updatePayload)

      expect(axiosInstance.put).toHaveBeenCalledWith(
        `/api/catalogs/tariff-grids/${gridId}`,
        updatePayload
      )
    })

    it('should delete a tariff grid', async () => {
      const gridId = '1'

      vi.mocked(axiosInstance.delete).mockResolvedValue({ data: undefined })

      await tariffGridsApi.delete(gridId)

      expect(axiosInstance.delete).toHaveBeenCalledWith(`/api/catalogs/tariff-grids/${gridId}`)
    })
  })

  describe('workRatesApi', () => {
    it('should get all work rates', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            name: 'Standard Rate',
            dailyWage: 2000,
            validFrom: '2024-01-01',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: mockResponse })

      const result = await workRatesApi.getAll()

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/catalogs/work-rates')
      expect(result).toEqual(mockResponse)
      expect(result.items[0].dailyWage).toBe(2000)
    })

    it('should create a work rate', async () => {
      const newRate: WorkRateItem = {
        id: '2',
        name: 'Premium Rate',
        dailyWage: 3000,
        validFrom: '2024-02-01',
        isActive: true,
        createdAt: '2024-02-01T00:00:00Z'
      }

      vi.mocked(axiosInstance.post).mockResolvedValue({ data: newRate })

      const payload = {
        name: 'Premium Rate',
        dailyWage: 3000,
        validFrom: '2024-02-01'
      }

      const result = await workRatesApi.create(payload)

      expect(axiosInstance.post).toHaveBeenCalledWith('/api/catalogs/work-rates', payload)
      expect(result).toEqual(newRate)
      expect(result.dailyWage).toBe(3000)
    })

    it('should update a work rate', async () => {
      const rateId = '1'
      const updatePayload = {
        isActive: false
      }

      vi.mocked(axiosInstance.put).mockResolvedValue({ data: undefined })

      await workRatesApi.update(rateId, updatePayload)

      expect(axiosInstance.put).toHaveBeenCalledWith(
        `/api/catalogs/work-rates/${rateId}`,
        updatePayload
      )
    })

    it('should delete a work rate (soft delete)', async () => {
      const rateId = '1'

      vi.mocked(axiosInstance.delete).mockResolvedValue({ data: undefined })

      await workRatesApi.delete(rateId)

      expect(axiosInstance.delete).toHaveBeenCalledWith(`/api/catalogs/work-rates/${rateId}`)
    })
  })

  describe('productWorkRatesApi', () => {
    it('should get all product work rates', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            productId: 'prod1',
            assemblyRatePerDay: 100,
            validFrom: '2024-01-01',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: mockResponse })

      const result = await productWorkRatesApi.getAll()

      expect(axiosInstance.get).toHaveBeenCalledWith('/api/catalogs/product-work-rates')
      expect(result).toEqual(mockResponse)
      expect(result.items[0].assemblyRatePerDay).toBe(100)
    })

    it('should get product work rates by product id', async () => {
      const productId = 'prod1'
      const mockResponse = {
        items: [
          {
            id: '1',
            productId: 'prod1',
            assemblyRatePerDay: 100,
            validFrom: '2024-01-01',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      vi.mocked(axiosInstance.get).mockResolvedValue({ data: mockResponse })

      const result = await productWorkRatesApi.getByProduct(productId)

      expect(axiosInstance.get).toHaveBeenCalledWith(
        `/api/catalogs/product-work-rates/by-product/${productId}`
      )
      expect(result.items[0].productId).toBe('prod1')
    })

    it('should create a product work rate', async () => {
      const newRate: ProductWorkRateItem = {
        id: '2',
        productId: 'prod2',
        assemblyRatePerDay: 150,
        validFrom: '2024-02-01',
        isActive: true,
        createdAt: '2024-02-01T00:00:00Z'
      }

      vi.mocked(axiosInstance.post).mockResolvedValue({ data: newRate })

      const payload = {
        productId: 'prod2',
        assemblyRatePerDay: 150,
        validFrom: '2024-02-01'
      }

      const result = await productWorkRatesApi.create(payload)

      expect(axiosInstance.post).toHaveBeenCalledWith('/api/catalogs/product-work-rates', payload)
      expect(result).toEqual(newRate)
      expect(result.assemblyRatePerDay).toBe(150)
    })

    it('should delete a product work rate', async () => {
      const rateId = '1'

      vi.mocked(axiosInstance.delete).mockResolvedValue({ data: undefined })

      await productWorkRatesApi.delete(rateId)

      expect(axiosInstance.delete).toHaveBeenCalledWith(`/api/catalogs/product-work-rates/${rateId}`)
    })
  })
})
