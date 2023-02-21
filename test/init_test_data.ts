import { AptosAccount, AptosAccountObject, HexString } from 'aptos'
import { SDK, SdkOptions } from '../src/sdk'

const defaultNetworkOptions: SdkOptions = {
  rpcUrl: 'https://fullnode.mainnet.aptoslabs.com',
  networkOptions: {
    simulationAccount: {
      pubkey: '0x40b00ab4323dddef193e9fef41830a96456a8b875c4e5cb5a4e666d9a75fed51',
      address: '0x251dda55e5071be8c761c8a99d7af559ccb6ccc52ad3f945712d3ae8b87c35e0'
    },
    modules: {
      CetusClmm: '0xa7f01413d33ba919441888637ca1607ca0ddcbfa3c0a9ddea64743aaa560e498',
      CetusIntegrate: '0xd58630ae0012aa3c6fa61d2a9038bb79382e022ff159bfe4ad78d9d5c72cb08d',
    },
  },
}
// export const cetusUrl = 'https://api.devcetus.com'
export const cetusUrl = "https://fullnode.mainnet.aptoslabs.com/v1"

export const launchpadPoolAddress = ["0x8c0beb3aad6dc468f252c882fd22c8a3e91658242640f1364be953c9ef638885"]

export const poolAddress = '0x9d68e56fff677c57342a031ac3ab2999946c98db4ff29330e33273839bae46d5'
export const positionName = 'Cetus LP | Pool2-15'

export const faucetSwap = '0x3cfe7b9f6106808a8178ebd2d5ae6656cd0ccec15d33e63fd857c180bde8da75'
export const coinTypeUSDT = `${faucetSwap}::coin::CetusUSDT`
export const coinTypeUSDC = `${faucetSwap}::coin::CetusUSDC`

export async function buildPool(sdk: SDK, poolAddress: string) {
  const pool = await sdk.Resources.getPool(poolAddress)
  console.log('buildPool: ', pool)
  return pool
}

export const testAccountObject: AptosAccountObject = {
  address: '0xc5d45c706ab57e6e70523c6a19ec9d1ab235be95f3191361eaddff15415bf94f',
  publicKeyHex: '0xb5e259e28083136db0817268101f7fb22994fad47bd8a9381bacbdc856e7fba1',
  privateKeyHex: '0x1505081f584d4d81fea99f58743982beccc5b1e96c1e2013b0e7a19e30148cdd',
}

export const testAccountObject1: AptosAccountObject = {
  address: '0xf514d44b5d4db9775c18e8cf07872e6e552fea6606ce6279ee4b8a4721a26931',
  publicKeyHex: '0xcbafbcba97b39cdf2be5337a8b3af2f650d70aebefe16ac3ef2eed6f0b76689c',
  privateKeyHex: '0x13de02ac3c7a428713b7ebaeed5a681031a6f246dbdca405c3b84d670d532384',
}

export const testLaunchPadAdminAccount: AptosAccountObject = {
  address: '0x9043ed94101f478454e92632b86f28daab3c5842e8886284b6165d074a86bd1a',
  publicKeyHex: '0xd4733e87f88bc30c135c6eaf67b197513b21345d63819186548565996a1351d6',
  privateKeyHex: '0x76cdfec47b3bbd690fdefd47c5c5fc8f762211e9df729af470aa7eb986651afc',
}

export function buildSdk(): SDK {
  return new SDK(defaultNetworkOptions)
}

export const CoinInfo: any = {
  ETH: { decimals: 8 },
  BTC: { decimals: 8 },
  USDT: { decimals: 6 },
  USDC: { decimals: 6 },
  USDC_USDT_LP: { decimals: 6 },
  ETH_USDC_LP: { decimals: 6 },
  BTC_USDC_LP: { decimals: 6 },
}

export function buildTestAccount(): AptosAccount {
  return AptosAccount.fromAptosAccountObject(testAccountObject)
}

export function buildTokenAdminAccount(): AptosAccount {
  return new AptosAccount(new HexString('0x85be85ce0567b6691495e38b4f72ace0aede73d043bc8c7aa5eea4975b384f7b').toUint8Array())
}

export function buildTestAccount1(): AptosAccount {
  return AptosAccount.fromAptosAccountObject(testAccountObject1)
}

export function buildLaunchPadAdmin(): AptosAccount {
  return AptosAccount.fromAptosAccountObject(testLaunchPadAdminAccount)
}

export type RequestOwnerPositionConfig = {
  start: number
  limit: number
  pool: string
}

export async function getTicks(pool: string) {
  const sdk = buildSdk()
  const poolInfo = await sdk.Resources.getPool(pool)
  const res = await sdk.Fetcher.fetchTicks({
    pool,
    coinTypeA: poolInfo.coinTypeA,
    coinTypeB: poolInfo.coinTypeB,
  })
  return res
}
