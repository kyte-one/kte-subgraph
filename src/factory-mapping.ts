import { AddAsset, CreateMarket, AddMarketToken, UpdateMinMarketLiquidity, UpdateLossConstant } from '../generated/MarketFactory/MarketFactory';

export function handleAssetAdded(event: AddAsset): void {
  // let gravatar = new Gravatar(event.params.id.toHex())
  // gravatar.owner = event.params.owner
  // gravatar.displayName = event.params.displayName
  // gravatar.imageUrl = event.params.imageUrl
  // gravatar.save()
}

export function handleMarketCreated(event: CreateMarket): void {
  // let id = event.params.id.toHex()
  // let gravatar = Gravatar.load(id)
  // if (gravatar == null) {
  //   gravatar = new Gravatar(id)
  // }
  // gravatar.owner = event.params.owner
  // gravatar.displayName = event.params.displayName
  // gravatar.imageUrl = event.params.imageUrl
  // gravatar.save()
}

export function handleAddMarketToken(event: AddMarketToken): void {}

export function handleUpdateMinMarketLiquidity(event: UpdateMinMarketLiquidity): void {}

export function handleUpdateLossConstant(event: UpdateLossConstant): void {}




