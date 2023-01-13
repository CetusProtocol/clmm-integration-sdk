import { AptosClient } from 'aptos'
import { FetcherModule, GlobalConfig, ResourcesModule, SwapModule } from './modules'
import { AptosResourceType } from './types/aptos'

export type SdkOptions = {
    rpcUrl: string
    networkOptions: {
      simulationAccount: {
        pubkey: string
        address: string
      }
      modules: {
        CetusClmm: AptosResourceType
        CetusIntegrate: AptosResourceType
      } & Record<string, AptosResourceType>
    }
  }

export class SDK {
    protected _client: AptosClient
    protected _resources: ResourcesModule
    protected _sdkOptions: SdkOptions
    protected _swap: SwapModule
    protected _fetcher: FetcherModule

    private globalConfig: GlobalConfig = {
        protocol_fee_rate: '',
        is_pause: false,
      }

    constructor(options: SdkOptions) {
        this._sdkOptions = options
        this._client = new AptosClient(options.rpcUrl)
        this._fetcher = new FetcherModule(this)
        this._swap = new SwapModule(this)
        this._resources = new ResourcesModule(this)

        this.globalConfig.protocol_fee_rate = ''
    }

    async getGlobalConfig(forceRefresh = false): Promise<GlobalConfig> {
        if (this.globalConfig.protocol_fee_rate.length === 0 || forceRefresh) {
          this.globalConfig = await this._resources.getGlobalConfig(this._sdkOptions.networkOptions.modules.CetusClmm)
        }
        return this.globalConfig
      }

    get client() {
        return this._client
    }

    get Resources() {
        return this._resources
    }

    get sdkOptions() {
        return this._sdkOptions
    }

    get Fetcher() {
      return this._fetcher
    }

    get Swap() {
      return this._swap
    }
}