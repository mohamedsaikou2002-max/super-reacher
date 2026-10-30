/* eslint-disable */
// @ts-nocheck
// Route tree generated format, including the two new server routes.
// Vite's TanStack plugin may regenerate this file on subsequent builds.

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as ApiUnsubscribeRouteImport } from './routes/api/unsubscribe'
import { Route as ApiResendWebhookRouteImport } from './routes/api/resend-webhook'

const IndexRoute = IndexRouteImport.update({
  id: '/', path: '/', getParentRoute: () => rootRouteImport,
} as any)
const ApiUnsubscribeRoute = ApiUnsubscribeRouteImport.update({
  id: '/api/unsubscribe', path: '/api/unsubscribe', getParentRoute: () => rootRouteImport,
} as any)
const ApiResendWebhookRoute = ApiResendWebhookRouteImport.update({
  id: '/api/resend-webhook', path: '/api/resend-webhook', getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/api/unsubscribe': typeof ApiUnsubscribeRoute
  '/api/resend-webhook': typeof ApiResendWebhookRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/api/unsubscribe': typeof ApiUnsubscribeRoute
  '/api/resend-webhook': typeof ApiResendWebhookRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/api/unsubscribe': typeof ApiUnsubscribeRoute
  '/api/resend-webhook': typeof ApiResendWebhookRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/api/unsubscribe' | '/api/resend-webhook'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/api/unsubscribe' | '/api/resend-webhook'
  id: '__root__' | '/' | '/api/unsubscribe' | '/api/resend-webhook'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  ApiUnsubscribeRoute: typeof ApiUnsubscribeRoute
  ApiResendWebhookRoute: typeof ApiResendWebhookRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/unsubscribe': {
      id: '/api/unsubscribe'
      path: '/api/unsubscribe'
      fullPath: '/api/unsubscribe'
      preLoaderRoute: typeof ApiUnsubscribeRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/resend-webhook': {
      id: '/api/resend-webhook'
      path: '/api/resend-webhook'
      fullPath: '/api/resend-webhook'
      preLoaderRoute: typeof ApiResendWebhookRouteImport
      parentRoute: typeof rootRouteImport
    }
  }
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute,
  ApiUnsubscribeRoute,
  ApiResendWebhookRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
