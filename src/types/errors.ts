/**
 * Машиночитаемые коды ошибок — зеркало бэкенд-реестров:
 * `ErrorCodes.Common` (общий), `CatalogErrorCodes`, `IdentityErrorCodes`,
 * `IntegrationsErrorCodes` (по модулям). Синхронизируй при добавлении новых кодов.
 */
export const ErrorCodes = {
  Common: {
    Unauthorized: 'common.unauthorized',
    Forbidden: 'common.forbidden',
    NotFound: 'common.not_found',
    RouteNotFound: 'common.route_not_found',
    Conflict: 'common.conflict',
    ValidationFailed: 'common.validation_failed',
    Unexpected: 'common.unexpected_error',
  },
  Catalog: {
    ProductNotFound: 'catalog.product.not_found',
    ProductNotRestorable: 'catalog.product.not_restorable',
    ProductDeletionAlreadyInProgress: 'catalog.product.deletion_already_in_progress',
    ProductAlreadyDeleted: 'catalog.product.already_deleted',
    ProductWorkRateNotFound: 'catalog.product_work_rate.not_found',
    ProductSkuConflict: 'catalog.product.sku_conflict',
    ProductBarcodeConflict: 'catalog.product_barcode.value_conflict',
    ProductCodeAllocationFailed: 'catalog.product.code_allocation_failed',
    WorkRateNotFound: 'catalog.work_rate.not_found',
    ProductWorkRateValidFromConflict: 'catalog.product_work_rate.valid_from_conflict',
    ProductWorkRateValidFromNotLatest: 'catalog.product_work_rate.valid_from_not_latest',
    BomLineNotFound: 'catalog.bom_line.not_found',
    BomLineInvalidQuantity: 'catalog.bom_line.invalid_quantity',
    BomComponentNotFound: 'catalog.bom_line.component_not_found',
    BomLineValidFromConflict: 'catalog.bom_line.valid_from_conflict',
    SupplierNotFound: 'catalog.supplier.not_found',
    ComponentNotFound: 'catalog.component.not_found',
    ChannelNotFound: 'catalog.channel.not_found',
    NumberingExhausted: 'catalog.numbering.exhausted',
  },
  Identity: {
    TenantNotFound: 'identity.tenant.not_found',
    UserNotFound: 'identity.user.not_found',
    InvitationNotFound: 'identity.invitation.not_found',
    MembershipNotFound: 'identity.membership.not_found',
    AccountDisabled: 'identity.user.disabled',
    EmailAlreadyExists: 'identity.user.email_conflict',
    PasswordNotSet: 'identity.user.password_not_set',
    CurrentPasswordIncorrect: 'identity.user.password_incorrect',
    InvitationAlreadyAccepted: 'identity.invitation.already_accepted',
    InvitationExpired: 'identity.invitation.expired',
    InvitationEmailMismatch: 'identity.invitation.email_mismatch',
    InvitationAlreadyExists: 'identity.invitation.already_exists',
    AlreadyMember: 'identity.membership.already_member',
    LastAdministratorProtected: 'identity.membership.last_administrator',
    TenantLimitReached: 'identity.tenant.limit_reached',
    CurrentTenantRequired: 'identity.tenant.current_required',
    TenantTaxProfileNotFound: 'identity.tenant_tax_profile.not_found',
    TenantTaxProfileConflict: 'identity.tenant_tax_profile.conflict',
    TenantTaxProfileNotLatest: 'identity.tenant_tax_profile.not_latest',
    TenantTaxProfileAlreadyEffective: 'identity.tenant_tax_profile.already_effective',
  },
  Integrations: {
    ConnectionNotFound: 'integrations.connection.not_found',
    ChannelTemplateNotFound: 'integrations.channel_template.not_found',
    JobNotFound: 'integrations.job.not_found',
    JobAlreadyRunning: 'integrations.job.already_running',
    ConnectionAlreadyActive: 'integrations.connection.already_active',
    ConnectionInactive: 'integrations.connection.inactive',
    ChannelJobTypeAmbiguous: 'integrations.channel.job_type_ambiguous',
    UnknownJobType: 'integrations.job.unknown_type',
    JobNotManuallyStartable: 'integrations.job.not_manually_startable',
    JobTypeNotSupported: 'integrations.job.type_not_supported',
    JobNotCancellable: 'integrations.job.not_cancellable',
    JobNotInCancellableState: 'integrations.job.not_cancellable_state',
    ProductsImportNotSupported: 'integrations.job.products_import_not_supported',
    ApiKeyValidationFailed: 'integrations.connection.api_key_invalid',
  },
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes][keyof typeof ErrorCodes[keyof typeof ErrorCodes]]

/**
 * Структура ответа об ошибке от API (зеркало бэкенд ErrorResponse)
 */
export interface ApiError {
  /** Машиночитаемый код формата {module}.{resource}.{reason} */
  code: string
  /** Человекочитаемое сообщение */
  message: string
  /** HTTP статус */
  status: number
  /**
   * Ошибки валидации полей (для 400/422). Массивы только для чтения: объект приходит
   * с сервера и нигде не мутируется, а `readonly()` в useApiCall делает их таковыми на уровне типов.
   */
  errors?: Record<string, readonly string[]>
}

/**
 * Проверка является ли значение ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  )
}
