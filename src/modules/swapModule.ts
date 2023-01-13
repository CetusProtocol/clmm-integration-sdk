import BN from 'bn.js'
import { TickData, ClmmpoolData } from '../types/clmmpool'
import {
  AptosResourceType,
} from '../types/aptos'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { BigNumber } from '../types'
import { SwapUtils } from '../math/swap'
import { computeSwap } from '../math/clmm'
import { TickMath } from '../math/tick'
import { Pool } from './resourcesModule'


export type createTestTransferTxPayloadParams = {
  account: string
  value: number
}

export type CalculateRatesParams = {
  decimalsA: number
  decimalsB: number
  a2b: boolean
  byAmountIn: boolean
  amount: BN
  swapTicks: Array<TickData>
  currentPool: Pool
}

export type CalculateRatesResult = {
  estimatedAmountIn: BN
  estimatedAmountOut: BN
  estimatedEndSqrtPrice: BN
  estimatedFeeAmount: BN
  isExceed: boolean
  extraComputeLimit: number
  aToB: boolean
  byAmountIn: boolean
  amount: BN
  priceImpactPct: number
}

export type CalculatePriceImpactParams = {
  fromToken: AptosResourceType
  toToken: AptosResourceType
  fromAmount: BigNumber
  toAmount: BigNumber
  interactiveToken: 'from' | 'to'
}

export type CreateTXPayloadParams = {
  pool_addr: string
  coinTypeA: AptosResourceType
  coinTypeB: AptosResourceType
  a_to_b: boolean
  by_amount_in: boolean
  amount: string
  amount_limit: string
  partner: string
}

export type PreSwapParams = {
  pool: any
  decimalsA: number
  decimalsB: number
  a2b: boolean
  by_amount_in: boolean
  amount: string
}

export class SwapModule implements IModule {
  protected _sdk: SDK

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /* eslint-disable class-methods-use-this */
  calculateRates(params: CalculateRatesParams): CalculateRatesResult {
    const { currentPool } = params
    const poolData: ClmmpoolData = {
      coinA: currentPool.coinTypeA, // string
      coinB: currentPool.coinTypeB, // string
      currentSqrtPrice: new BN(currentPool.current_sqrt_price), // BN
      currentTickIndex: currentPool.current_tick_index, // number
      feeGrowthGlobalA: new BN(currentPool.fee_growth_global_a), // BN
      feeGrowthGlobalB: new BN(currentPool.fee_growth_global_b), // BN
      feeProtocolCoinA: new BN(currentPool.fee_protocol_coin_a), // BN
      feeProtocolCoinB: new BN(currentPool.fee_protocol_coin_b), // BN
      feeRate: currentPool.fee_rate, // number
      liquidity: new BN(currentPool.liquidity), // BN
      tickIndexes: [], // number[]
      tickSpacing: Number(currentPool.tickSpacing), // number
      ticks: [], // Array<TickData>
      collection_name: currentPool.collectionName,
    }

    let ticks
    if (params.a2b) {
      ticks = params.swapTicks.sort((a, b) => {
        return b.index - a.index
      })
    } else {
      ticks = params.swapTicks.sort((a, b) => {
        return a.index - b.index
      })
    }

    const swapResult = computeSwap(params.a2b, params.byAmountIn, params.amount, poolData, ticks)

    let isExceed = false
    if (params.byAmountIn) {
      isExceed = swapResult.amountIn.lt(params.amount)
    } else {
      isExceed = swapResult.amountOut.lt(params.amount)
    }
    const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(params.a2b)
    if (params.a2b && swapResult.nextSqrtPrice.lt(sqrtPriceLimit)) {
      isExceed = true
    }

    if (!params.a2b && swapResult.nextSqrtPrice.gt(sqrtPriceLimit)) {
      isExceed = true
    }

    let extraComputeLimit = 0
    if (swapResult.crossTickNum > 6 && swapResult.crossTickNum < 40) {
      extraComputeLimit = 22000 * (swapResult.crossTickNum - 6)
    }

    if (swapResult.crossTickNum > 40) {
      isExceed = true
    }

    const prePrice = TickMath.sqrtPriceX64ToPrice(poolData.currentSqrtPrice, params.decimalsA, params.decimalsB).toNumber()
    const afterPrice = TickMath.sqrtPriceX64ToPrice(swapResult.nextSqrtPrice, params.decimalsA, params.decimalsB).toNumber()

    const priceImpactPct = (Math.abs(prePrice - afterPrice) / prePrice) * 100

    return {
      estimatedAmountIn: swapResult.amountIn,
      estimatedAmountOut: swapResult.amountOut,
      estimatedEndSqrtPrice: swapResult.nextSqrtPrice,
      estimatedFeeAmount: swapResult.feeAmount,
      isExceed,
      extraComputeLimit,
      amount: params.amount,
      aToB: params.a2b,
      byAmountIn: params.byAmountIn,
      priceImpactPct,
    }
  }
}
