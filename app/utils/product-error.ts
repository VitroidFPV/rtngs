import { ConvexError } from 'convex/values'

export function productError(cause: unknown) {
  if (cause instanceof ConvexError && typeof cause.data === 'object' && cause.data?.code === 'MEMBERS_ONLY') {
    return { denied: true, message: 'Ask the owner to add your Discord account ID to the member list.' }
  }
  if (cause instanceof ConvexError && typeof cause.data === 'string') {
    return { denied: false, message: cause.data }
  }
  // Support the previous backend until the structured error is deployed.
  if (cause instanceof Error && cause.message.includes('This library is private. Ask the owner to add your verified Discord email to the member list.')) {
    return { denied: true, message: 'Ask the owner to add your Discord account ID to the member list.' }
  }
  return { denied: false, message: 'Could not complete the request. Please try again.' }
}
