import BN from 'bn.js'
import { newBits, TickData } from '../types/clmmpool'
import { hexToString } from '../utils/hex'
import { CachedContent } from '../utils/cachedContent'
import { composeType } from '../utils/contracts'
import { isAxiosError } from '../utils/is'
import {
  AptosCacheResource,
  AptosCoinInfoResource,
  AptosCoinStoreResource,
  AptosResource,
  AptosResourceType,
  PoolLpModule,
  PoolLpStruct,
  PoolsModule,
  PoolsStruct,
} from '../types/aptos'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { MathUtil } from '../math/utils'

export type PoolImmutables = {
  coinTypeA: AptosResourceType
  coinTypeB: AptosResourceType
  poolType: string
  poolAddress: string
  tickSpacing: string
}

export type PoolState = {
  coinAmountA: number
  coinAmountB: number
  current_sqrt_price: number
  current_tick_index: number
  fee_growth_global_a: number
  fee_growth_global_b: number
  fee_protocol_coin_a: number
  fee_protocol_coin_b: number
  fee_rate: number
  liquidity: number
  index: number
  positionIndex: number
  tick_indexes_handle: string
  ticks_handle: string
  positions_handle: string
  collectionName: string
  uri: string
  is_pause: boolean
  rewarder_infos: Array<Rewarder>
  rewarder_last_updated_time: BN
}

export type Pool = PoolImmutables & PoolState

export type Rewarder = {
  coin_type: CoinType
  authority: string
  pending_authority: string
  emissions_per_second: number
  growth_global: number
}

export type CoinType = {
  account_address: string
  module_name: string
  struct_name: string
}

export type Position = {
  name: string
  pool: AptosResourceType
  liquidity: string
  tick_lower_index: string
  tick_upper_index: string
  fee_growth_inside_a: string
  fee_owed_a: string
  fee_growth_inside_b: string
  fee_owed_b: string
  reward_amount_owed_0: string
  reward_amount_owed_1: string
  reward_amount_owed_2: string
  reward_growth_inside_0: string
  reward_growth_inside_1: string
  reward_growth_inside_2: string
  index: number
}

export type CoinStore =
  | {
      coinAddress: AptosResourceType
    } & AptosCoinStoreResource

export type CoinInfo =
  | {
      coinAddress: AptosResourceType
    } & AptosCoinInfoResource

export type GlobalConfig = {
  protocol_fee_rate: string
  is_pause: boolean
}

export const cacheTime5min = 5 * 60 * 1000
export const cacheTime24h = 24 * 60 * 60 * 1000
function getFutureTime(interval: number) {
  return Date.parse(new Date().toString()) + interval
}

export class ResourcesModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  private async getPoolImmutablesResource(): Promise<any[]> {
    const contractAddress = this._sdk.sdkOptions.networkOptions.modules.LiquidswapDeployer
    const immutablesJsonKey = `${contractAddress}_getMmutablesPools`
    const immutablesData = this.getCacheData(immutablesJsonKey)
    let resourcesJson
    if (immutablesData != null) {
      resourcesJson = immutablesData as any
    } else {
      const liquidityPoolType = composeType(contractAddress, PoolsModule, PoolsStruct)
      const resources = await this.fetchAccountResource<AptosResource<string>>(contractAddress, liquidityPoolType)
      resourcesJson = JSON.parse(JSON.stringify(resources?.data.data))
      this.updateCache(immutablesJsonKey, resourcesJson, cacheTime24h)
    }
    const mapData = resourcesJson.data
    return mapData
  }

  async getPools(assignPools: string[] = [], offset = 0, limit = 100): Promise<Pool[]> {
    const contractAddress = this._sdk.sdkOptions.networkOptions.modules.LiquidswapDeployer

    const poolArray: Pool[] = []
    const mapData = await this.getPoolImmutablesResource()
    const isGlobalPause = (await this.sdk.getGlobalConfig()).is_pause
    const hasassignPools = assignPools.length > 0
    for (let index = 0; index < mapData.length; index += 1) {
      const item = mapData[index]
      const poolAddress = item.value
      if (hasassignPools && !assignPools.includes(poolAddress)) {
        continue
      }
      if (!hasassignPools) {
        const itemIndex = Number(index)
        if (itemIndex < offset || itemIndex >= offset + limit) {
          continue
        }
      }
      const keyObject = item.key
      const coinTypeA = composeType(
        keyObject.coin_type_a.account_address,
        hexToString(keyObject.coin_type_a.module_name),
        hexToString(keyObject.coin_type_a.struct_name)
      )
      const coinTypeB = composeType(
        keyObject.coin_type_b.account_address,
        hexToString(keyObject.coin_type_b.module_name),
        hexToString(keyObject.coin_type_b.struct_name)
      )
      const poolType = composeType(composeType(contractAddress, PoolLpModule, PoolLpStruct), [coinTypeA, coinTypeB])

      const poolImmutables: PoolImmutables = {
        coinTypeA,
        coinTypeB,
        poolType,
        poolAddress,
        tickSpacing: keyObject.tick_spacing,
      }
      // eslint-disable-next-line no-await-in-loop
      const poolState = await this.getPoolState(poolImmutables.poolAddress, poolImmutables.poolType, isGlobalPause)
      const pool = { ...poolImmutables, ...poolState }
      poolArray.push(pool)

      const cacheKey = `${poolAddress}_pool`
      this.updateCache(cacheKey, pool, cacheTime24h)
    }
    return poolArray
  }

  async getPool(poolAddress: string, forceRefresh = true): Promise<Pool> {
    const cacheKey = `${poolAddress}_pool`
    const cacheData = this.getCacheData(cacheKey)
    let poolImmutables

    if (cacheData !== null && !forceRefresh) {
      poolImmutables = cacheData as Pool
    }
    if (poolImmutables == null) {
      return (await this.getPools([poolAddress]))[0]
    }
    const isGlobalPause = (await this.sdk.getGlobalConfig(true)).is_pause
    const poolState = await this.getPoolState(poolAddress, poolImmutables.poolType, isGlobalPause)
    const pool = { ...poolImmutables, ...poolState }
    this.updateCache(cacheKey, pool, cacheTime24h)
    return pool
  }

  private async getPoolState(poolAddress: string, poolType: string, isGlobalPause: boolean, forceRefresh = true): Promise<PoolState> {
    const cacheKey = `${poolAddress}_${poolType}getPool`

    if (!forceRefresh) {
      const cacheData = this.getCacheData(cacheKey)
      if (cacheData !== null) {
        return cacheData as PoolState
      }
    }

    const resources = await this.fetchAccountResource<AptosResource<string>>(poolAddress, poolType)
    const resourcesJson = JSON.parse(JSON.stringify(resources?.data))
    const rewarderInfos = resourcesJson.rewarder_infos
    const newRinfos: any = []
    rewarderInfos.forEach((item: any) => {
      const coinAddress = composeType(
        item.coin_type.account_address,
        hexToString(item.coin_type.module_name),
        hexToString(item.coin_type.struct_name)
      )
      const emissionSeconds = MathUtil.fromX64(new BN(item.emissions_per_second))
      const emissionsEveryDay = Math.floor(emissionSeconds.toNumber() * 60 * 60 * 24)
      newRinfos.push({
        ...item,
        coinAddress,
        emissionsEveryDay,
      })
    })

    const poolState: PoolState = {
      coinAmountA: resourcesJson.coin_a.value,
      coinAmountB: resourcesJson.coin_b.value,
      current_sqrt_price: resourcesJson.current_sqrt_price,
      // current_tick_index: new BN(resourcesJson.current_tick_index.bits).toNumber(),
      current_tick_index: Number(BigInt.asIntN(64, BigInt(resourcesJson.current_tick_index.bits)).toString()),
      fee_growth_global_a: resourcesJson.fee_growth_global_a,
      fee_growth_global_b: resourcesJson.fee_growth_global_b,
      fee_protocol_coin_a: resourcesJson.fee_protocol_coin_a,
      fee_protocol_coin_b: resourcesJson.fee_protocol_coin_b,
      fee_rate: resourcesJson.fee_rate,
      liquidity: resourcesJson.liquidity,
      index: resourcesJson.index,
      positionIndex: resourcesJson.position_index,
      tick_indexes_handle: resourcesJson.tick_indexes.handle,
      ticks_handle: resourcesJson.ticks.handle,
      positions_handle: resourcesJson.positions.handle,
      collectionName: resourcesJson.collection_name,
      uri: resourcesJson.uri,
      is_pause: isGlobalPause || resourcesJson.is_pause,
      // rewarder_infos: resourcesJson.rewarder_infos,
      rewarder_infos: newRinfos,
      rewarder_last_updated_time: resourcesJson.rewarder_last_updated_time,
    }
    this.updateCache(cacheKey, poolState, cacheTime24h)
    return poolState
  }

  async getTickDataByIndex(tickHandle: string, tickIndex: number): Promise<TickData> {
    const resource = await this._sdk.client.getTableItem(tickHandle, {
      key_type: `${this.sdk.sdkOptions.networkOptions.modules.IntegerMate}::i64::I64`,
      value_type: `${this.sdk.sdkOptions.networkOptions.modules.LiquidswapDeployer}::pool::Tick`,
      key: newBits(tickIndex),
    })

    const itemJson = JSON.parse(JSON.stringify(resource))

    const tick: TickData = {
      index: itemJson.index,
      sqrtPrice: itemJson.sqrt_price,
      liquidityGross: itemJson.liquidity_gross,
      liquidityNet: itemJson.liquidity_net,
      feeGrowthOutsideA: itemJson.fee_growth_outside_a,
      feeGrowthOutsideB: itemJson.fee_growth_outside_b,
      rewardersGrowthOutside: itemJson.rewarders_growth_outside,
    }

    return tick
  }

  async getGlobalConfig(swapAddress: string, forceRefresh = true): Promise<GlobalConfig> {
    const cacheKey = `${swapAddress}_getGlobalConfig`

    if (!forceRefresh) {
      const cacheData = this.getCacheData(cacheKey)
      if (cacheData !== null) {
        return cacheData as GlobalConfig
      }
    }
    const resources = await this.fetchAccountResource<string>(swapAddress, composeType(swapAddress, 'config', 'GlobalConfig'))
    const jsonData = JSON.parse(JSON.stringify(resources)).data
    const globalConfig: GlobalConfig = {
      protocol_fee_rate: jsonData.protocol_fee_rate,
      is_pause: jsonData.is_pause,
    }
    this.updateCache(cacheKey, globalConfig, cacheTime24h)
    return globalConfig
  }

  async fetchAccountResource<T = unknown>(accountAddress: string, resourceType: AptosResourceType): Promise<AptosResource<T> | null> {
    try {
      // logCat('fetchAccountResource request:', {
      //   accountAddress,
      //   resourceType,
      // })
      const response = await this._sdk.client.getAccountResource(accountAddress, resourceType)

      // logCat('fetchAccountResource response:', response)

      return response as unknown as AptosResource<T>
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        if (e.response?.status === 404) {
          return null
        }
      }

      throw e
    }
  }

  async fetchAccountResources<T = unknown>(accountAddress: string): Promise<AptosResource<T>[] | null> {
    try {
      // logCat('fetchAccountResources request:', {
      //   accountAddress,
      // })

      const response = await this._sdk.client.getAccountResources(accountAddress)

      // logCat('fetchAccountResources response:', response)

      return response as unknown as AptosResource<T>[]
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        if (e.response?.status === 404) {
          return null
        }
      }

      throw e
    }
  }

  private updateCache(key: string, data: AptosCacheResource, time = cacheTime5min) {
    let cacheData = this._cache[key]
    if (cacheData) {
      cacheData.overdueTime = getFutureTime(time)
      cacheData.value = data
    } else {
      cacheData = new CachedContent(data, getFutureTime(time))
    }
    this._cache[key] = cacheData
  }

  private getCacheData(cacheKey: string): AptosCacheResource | null {
    const cacheData = this._cache[cacheKey]
    if (cacheData !== undefined && cacheData.getCacheData()) {
      return cacheData.value
    }
    return null
  }
}
