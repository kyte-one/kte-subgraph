import { AssetAdded, MarketCreated } from '../generated/MarketFactory/MarketFactory';

export function handleAssetAdded(event: AssetAdded): void {
  // let gravatar = new Gravatar(event.params.id.toHex())
  // gravatar.owner = event.params.owner
  // gravatar.displayName = event.params.displayName
  // gravatar.imageUrl = event.params.imageUrl
  // gravatar.save()
}

export function handleMarketCreated(event: MarketCreated): void {
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