import { useState, useCallback } from 'react'

interface WailsCallState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export function useWailsCall<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): [WailsCallState<TResult>, (...args: TArgs) => Promise<TResult | null>] {
  const [state, setState] = useState<WailsCallState<TResult>>({
    data: null,
    error: null,
    loading: false,
  })

  const call = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const result = await fn(...args)
        setState({ data: result, error: null, loading: false })
        return result
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setState({ data: null, error: message, loading: false })
        return null
      }
    },
    [fn],
  )

  return [state, call]
}
