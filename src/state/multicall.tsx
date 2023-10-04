import { MulticallProvider } from '@nftearth/uniswap-multicall'
import { useWeb3React } from '@web3-react/core'
import useBlockNumber from 'hooks/useBlockNumber'
import { useInterfaceMulticall } from 'hooks/useContract'

export function MulticallUpdater() {
  const { chainId } = useWeb3React()
  const latestBlockNumber = useBlockNumber()
  const contract = useInterfaceMulticall()
  return <MulticallProvider chainId={chainId} latestBlockNumber={latestBlockNumber} contract={contract} />
}
