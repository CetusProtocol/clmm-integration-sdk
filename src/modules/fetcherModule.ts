import { AptosClient, BCS, TxnBuilderTypes, Types, getAddressFromAccountOrAddress } from 'aptos'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { Tick } from '../types/clmmpool'

export type FetchTickParams = {
  pool: string
  coinTypeA: string
  coinTypeB: string
}

export type GetTickParams = {
  index: number
  offset: number
  limit: number
} & FetchTickParams

export class FetcherModule implements IModule {
  protected _sdk: SDK

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  private transformTickData(changes: Types.WriteSetChange_WriteResource[]) {
    const tickList: Tick[] = []
    const { modules } = this._sdk.sdkOptions.networkOptions
    const valueData = changes.filter((change) => {
      if (change.type !== 'write_resource') {
        return false
      }
      const wr = change as Types.WriteSetChange_WriteResource
      return wr.data.type === `${modules.ClmmIntegrate}::fetcher::FetchTicksResult`
    })
    if (valueData.length === 0) {
      return tickList
    }
    const wr = valueData[0] as Types.WriteSetChange_WriteResource
    const tickWarpInfo: any = wr.data.data

    return tickWarpInfo.ticks || []
  }

  // eslint-disable-next-line class-methods-use-this
  async getTicks(params: GetTickParams) {
    const { modules, simulationAccount } = this.sdk.sdkOptions.networkOptions
    const client = new AptosClient(this.sdk.sdkOptions.rpcUrl)
    const moduleName = `${modules.ClmmIntegrate}::scripts`
    const funcName = 'fetch_ticks'
    const typeArguments = [
      new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString(params.coinTypeA)),
      new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString(params.coinTypeB)),
    ]

    const args = [
      BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(params.pool)),
      BCS.bcsSerializeUint64(params.index),
      BCS.bcsSerializeUint64(params.offset),
      BCS.bcsSerializeUint64(params.limit),
    ]

    const payload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
      TxnBuilderTypes.EntryFunction.natural(moduleName, funcName, typeArguments, args)
    )

    const myAccount = getAddressFromAccountOrAddress(simulationAccount.address)
    const rawTxn = await client.generateRawTransaction(myAccount, payload)
    const pubkey = getAddressFromAccountOrAddress(simulationAccount.pubkey)
    const account2 = new TxnBuilderTypes.Ed25519PublicKey(pubkey.toUint8Array())
    const res: any = await client.simulateTransaction(account2, rawTxn)
    const ticks = this.transformTickData(res[0].changes)
    return ticks
  }

  async fetchTicks(params: FetchTickParams) {
    let ticks: Tick[] = []
    let index = 0
    let offset = 0
    const limit = 512
    while (true) {
      const data = await this.getTicks({
        pool: params.pool,
        coinTypeA: params.coinTypeA,
        coinTypeB: params.coinTypeB,
        index,
        offset,
        limit,
      })
      ticks = [...ticks, ...data]
      if (data.length < limit) {
        break
      }
      if (offset < 999) {
        offset += 1
      } else {
        index += 1
      }
    }
    return ticks
  }
}
