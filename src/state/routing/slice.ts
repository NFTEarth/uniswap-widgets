import { Protocol } from '@uniswap/router-sdk'
import { WidgetError, WidgetPromise } from 'errors'
import { RouterPreference } from 'hooks/routing/types'
import qs from 'qs'
import { useEffect } from 'react'
import { useQuery, UseQueryOptions } from 'react-query'
import { isExactInput } from 'utils/tradeType'

import { serializeGetQuoteArgs } from './args'
import { GetQuoteArgs, QuoteData, QuoteState, TradeResult } from './types'
import { transformQuoteToTradeResult } from './utils'

const protocols: Protocol[] = [Protocol.V2, Protocol.V3, Protocol.MIXED]

// routing API quote query params: https://github.com/Uniswap/routing-api/blob/main/lib/handlers/quote/schema/quote-schema.ts
const DEFAULT_QUERY_PARAMS = {
  protocols: protocols.map((p) => p.toLowerCase()).join(','),
}

const baseQuery = () => {
  return { error: { status: 'CUSTOM_ERROR', error: 'Unimplemented baseQuery' } }
}

export const useLazyGetTradeQuoteQuery = (args: GetQuoteArgs | null, options?: UseQueryOptions) => {
  async function onQueryStarted(args: GetQuoteArgs | null, { queryFulfilled }: { queryFulfilled: any }) {
    if (args === null) return

    args.onQuote?.(
      JSON.parse(serializeGetQuoteArgs(args)),
      WidgetPromise.from(
        queryFulfilled,
        ({ data }) => data,
        (error) => {
          const { error: queryError } = error
          if (queryError && typeof queryError === 'object' && 'status' in queryError) {
            const parsedError = queryError as any
            switch (parsedError.status) {
              case 'CUSTOM_ERROR':
              case 'FETCH_ERROR':
              case 'PARSING_ERROR':
                throw new WidgetError({ message: parsedError.error, error: parsedError })
              default:
                throw new WidgetError({ message: parsedError.status.toString(), error: parsedError })
            }
          }
          throw new WidgetError({ message: 'Unknown error', error })
        }
      )
    )
  }

  // Explicitly typing the return type enables typechecking of return values.
  async function queryFn(args: GetQuoteArgs | null) {
    if (args === null) return { error: { status: 'CUSTOM_ERROR', error: 'Skipped' } }

    if (
      // If enabled, try the routing API, falling back to client-side routing.
      args.routerPreference === RouterPreference.API &&
      Boolean(args.routerUrl) &&
      // A null amount may be passed to initialize the client-side routing.
      args.amount !== null
    ) {
      try {
        const { tokenInAddress, tokenInChainId, tokenOutAddress, tokenOutChainId, amount, tradeType } = args
        const type = isExactInput(tradeType) ? 'exactIn' : 'exactOut'
        const query = qs.stringify({
          ...DEFAULT_QUERY_PARAMS,
          tokenInAddress,
          tokenInChainId,
          tokenOutAddress,
          tokenOutChainId,
          amount,
          type,
        })
        const response = await global.fetch(`${args.routerUrl}quote?${query}`)
        if (!response.ok) {
          let data: string | Record<string, unknown> = await response.text()
          try {
            data = JSON.parse(data)
          } catch {}

          // NO_ROUTE should be treated as a valid response to prevent retries.
          if (typeof data === 'object' && data.errorCode === 'NO_ROUTE') {
            return { data: { state: QuoteState.NOT_FOUND } }
          }

          throw data
        }

        const quoteData: QuoteData = await response.json()
        const tradeResult = transformQuoteToTradeResult(args, quoteData)
        return { data: tradeResult }
      } catch (error: any) {
        console.warn(
          `GetQuote failed on routing API, falling back to client: ${error?.message ?? error?.detail ?? error}`
        )
      }
    }

    // Lazy-load the client-side router to improve initial pageload times.
    const clientSideSmartOrderRouter = await import('../../hooks/routing/clientSideSmartOrderRouter')
    try {
      const quoteResult = await clientSideSmartOrderRouter.getClientSideQuoteResult(args, { protocols })
      if (quoteResult.state === QuoteState.SUCCESS) {
        const tradeResult = transformQuoteToTradeResult(args, quoteResult.data)
        return { data: tradeResult }
      } else {
        return { data: quoteResult }
      }
    } catch (error: any) {
      console.warn(`GetQuote failed on client: ${error}`)
      return { error: { status: 'CUSTOM_ERROR', error: error?.message ?? error?.detail ?? error } }
    }
  }

  const { isLoading, data, error, isSuccess } = useQuery<{
    data?: TradeResult | any
    state?: QuoteState
    error?: {
      status: string
      error: any
    }
  }>([`trade-quote`, JSON.stringify(args)], () => queryFn(args), {
    staleTime: 10_000,
  })

  useEffect(() => {
    onQueryStarted(args, { queryFulfilled: new Promise((resolve) => resolve(isSuccess)) })
  }, [isLoading, isSuccess])

  return {
    data: data?.data,
    isError: !!data?.error || !!error,
  }
}
