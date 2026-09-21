/**
 * Product lifecycle status matching backend ProductStatus enum.
 * Backend serializes enums as numbers, so we use numeric values here.
 */
export enum ProductStatus {
  Active = 1,
  Archived = 2,
  DeletionPending = 3,
  Deleted = 4,
  DeletionFailed = 5,
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
}

export interface CreateProductRequest {
  sku: string
  name: string
  description?: string
}

export interface CreateProductResponse {
  id: string
}

export interface UpdateProductRequest {
  name: string
  description?: string
}

export interface ProductDeletionStatusResponse {
  found: boolean
  productId: string
  status: ProductStatus
  deletionRequestedAt?: string
  deletedAt?: string
  statusMessage: string
}
