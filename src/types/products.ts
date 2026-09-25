/**
 * Product lifecycle status matching backend ProductStatus enum.
 * Backend serializes enums as numbers, so we use numeric values here.
 */
export enum ProductStatus {
  Active = 'Active',
  Archived = 'Archived',
  DeletionPending = 'DeletionPending',
  Deleted = 'Deleted',
  DeletionFailed = 'DeletionFailed',
}

export interface ProductBarcode {
  id?: string
  value: string
  type?: string
  isDefault: boolean
}

export interface PackingUnit {
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg?: number
}

export interface ProductItem {
  id: string
  sku: string
  name: string
  description?: string
  status: ProductStatus
  createdAt: string
  updatedAt?: string
  archivedAt?: string
  deletionRequestedAt?: string
  deletedAt?: string
  creationSource: string
  barcodes?: ProductBarcode[]
  packingUnit?: PackingUnit
}

export interface GetProductsResponse {
  items: ProductItem[]
}

export interface GetProductResponse {
  found: boolean
  id: string
  sku: string
  name: string
  description?: string
  status: ProductStatus
  createdAt: string
  updatedAt?: string
  archivedAt?: string
  deletionRequestedAt?: string
  deletedAt?: string
  creationSource: string
  barcodes?: ProductBarcode[]
  packingUnit?: PackingUnit
}

export interface CreateProductRequest {
  sku: string
  name: string
  description?: string
  barcodes?: ProductBarcode[]
  packingUnit?: PackingUnit
}

export interface CreateProductResponse {
  id: string
}

export interface UpdateProductRequest {
  name: string
  description?: string
  barcodes?: ProductBarcode[]
  packingUnit?: PackingUnit
}

export interface ProductDeletionStatusResponse {
  found: boolean
  productId: string
  status: ProductStatus
  deletionRequestedAt?: string
  deletedAt?: string
  statusMessage: string
}
