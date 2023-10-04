import {
  useMultipleContractSingleData as useMultipleContractSingleDataBase,
  useSingleCallResult as useSingleCallResultBase,
  useSingleContractMultipleData as useSingleContractMultipleDataBase,
  useSingleContractWithCallData as useSingleContractWithCallDataBase,
} from '@nftearth/uniswap-multicall'
import { useWeb3React } from '@web3-react/core'
import useBlockNumber from 'hooks/useBlockNumber'

export type { CallStateResult } from '@nftearth/uniswap-multicall' // re-export for convenience
export { NEVER_RELOAD } from '@nftearth/uniswap-multicall' // re-export for convenience

// Create wrappers for hooks so consumers don't need to get latest block themselves

type MulticallParams<T extends (chainId: number | undefined, latestBlock: number | undefined, ...args: any) => any> =
  Parameters<T> extends [any, any, ...infer P] ? P : never

export function useMultipleContractSingleData(...args: MulticallParams<typeof useMultipleContractSingleDataBase>) {
  const { chainId, latestBlock } = useCallContext()
  return useMultipleContractSingleDataBase(chainId, latestBlock, ...args)
}

export function useSingleCallResult(...args: MulticallParams<typeof useSingleCallResultBase>) {
  const { chainId, latestBlock } = useCallContext()
  return useSingleCallResultBase(chainId, latestBlock, ...args)
}

export function useSingleContractMultipleData(...args: MulticallParams<typeof useSingleContractMultipleDataBase>) {
  const { chainId, latestBlock } = useCallContext()
  return useSingleContractMultipleDataBase(chainId, latestBlock, ...args)
}

export function useSingleContractWithCallData(...args: MulticallParams<typeof useSingleContractWithCallDataBase>) {
  const { chainId, latestBlock } = useCallContext()
  return useSingleContractWithCallDataBase(chainId, latestBlock, ...args)
}

function useCallContext() {
  const { chainId } = useWeb3React()
  const latestBlock = useBlockNumber()
  return { chainId, latestBlock }
}
