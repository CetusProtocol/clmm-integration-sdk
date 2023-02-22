import { buildSdk, getTicks, poolAddress } from './init_test_data'
import { getTickDataFromUrlData } from '../src/math/tick'
import { BN } from 'bn.js'

describe('SDK Tests', () => {
  const sdk = buildSdk()

  test('getAllPools', async () => {
    const pools = await sdk.Resources.getPools([])
    console.log('getAllPools', pools)
  })

  test('getSinglePool', async () => {
    const pool = await sdk.Resources.getPool(poolAddress)
    console.log('getAllPools', pool)
  })


  test('calculateRates', async () => {

    const a2b = true
    const byAmountIn = true
    // const amount = new BN('10000000000000')
    const amount = new BN('20000000000')

    const ticks = await getTicks(poolAddress)
    const tickdatas = getTickDataFromUrlData(ticks)

    console.log('tickdatas###', tickdatas)
    const currentPool = await sdk.Resources.getPool(poolAddress)

    const res = await sdk.Swap.calculateRates({
      decimalsA: 6,
      decimalsB: 6,
      a2b,
      byAmountIn,
      amount,
      swapTicks: tickdatas,
      currentPool,
    })

    console.log('calculateRates', {
      estimatedAmountIn: res.estimatedAmountIn.toString(),
      estimatedAmountOut: res.estimatedAmountOut.toString(),
      estimatedEndSqrtprice: res.estimatedEndSqrtPrice.toString(),
      estimatedFeeAmount: res.estimatedFeeAmount.toString(),
      isExceed: res.isExceed,
      a2b,
      byAmountIn,
    })
  })
})
