import { BigInt } from "@graphprotocol/graph-ts";
import {
  AddAsset, AddMarketToken, CreateMarket, Init, UpdateLossConstant, UpdateMarketDurationParams, UpdateMarketFeesPercentage, UpdateMarketWindowParams, UpdateMinMarketLiquidity
} from "../generated/MarketFactory/MarketFactory";
import { Asset, Factory, Market, MarketToken, Pool, User } from '../generated/schema';
import { MARKET_FACTORY_ADDRESS, ONE_BI, ZERO_BI } from "./constant";
import { BigMin, createUser, formatAssetFeedType } from './utils';


function createAndSavePool(
  poolId: string,
  marketId: string,
  upper: BigInt,
  lower: BigInt
): Pool {
  let pool = new Pool(poolId);
  pool.market = marketId;
  pool.upper = upper;
  pool.lower = lower;
  pool.staked = ZERO_BI;
  pool.rewards = ZERO_BI;
  pool.winningPool = false;
  return pool;
}

function createPools(marketId: string, poolsRange: BigInt[] ): void {
  for (let i = 0; i < poolsRange.length; i++) {
    let pool = createAndSavePool(
      i.toString(),
      marketId,
      poolsRange[i],
      i === 0 ? ZERO_BI : poolsRange[i - 1]
    );
    pool.save();
  }

  let lastPoolId = poolsRange.length + 1;

  // Create last pool
  let pool = createAndSavePool(
    lastPoolId.toString(),
    marketId,
    BigInt.fromString(Number.MAX_SAFE_INTEGER.toString()),
    poolsRange[poolsRange.length]
  );
  pool.save();
}

export function handleInit(event: Init): void {
  let factory = new Factory(MARKET_FACTORY_ADDRESS);
  factory.owner = event.params.creator.toString();
  // Init stats
  factory.totalAssets = ZERO_BI;
  factory.totalTokens = ZERO_BI;
  factory.totalMarkets = ZERO_BI;
  factory.totalPredictions = ZERO_BI;
  factory.totalParticipants = ZERO_BI;
  factory.totalParticipation = ZERO_BI;
  factory.totalRewardsDistributed = ZERO_BI;
  factory.totalMarketsInTrading = ZERO_BI;
  factory.totalMarketsInDispute = ZERO_BI;
  factory.totalMarketsSettled = ZERO_BI;
  factory.save();
}

export function handleAddAsset(event: AddAsset): void {
  // Check if factory exists
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);

  let asset = new Asset(event.params.id.toString());
  let assetNames = event.params.asset.toString().split(":");
  asset.asset0 = assetNames[0];
  asset.asset1 = assetNames[1];
  asset.creator = event.params.creator;
  asset.decimals = event.params.decimals;
  asset.assetFeedType = formatAssetFeedType(BigInt.fromI32(event.params.assetFeedType));
  asset.assetFeed = event.params.assetFeed;
  asset.totalMarkets = ZERO_BI;
  asset.totalPredictions = ZERO_BI;
  asset.totalParticipants = ZERO_BI;
  asset.totalParticipation = ZERO_BI;
  asset.totalRewardsDistributed = ZERO_BI;

  factory.totalAssets = factory.totalAssets.plus(ONE_BI);
  asset.save();
  factory.save();
}

export function handleCreateMarket(event: CreateMarket): void {
  let userId = event.params.creator.toString();
  let assetId = event.params.assetId.toString();
  let marketId = event.params.id.toString();
  let createdAt = event.params.creationTime;
  let market = new Market(marketId);
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  factory.totalMarkets = factory.totalMarkets.plus(ONE_BI);
  factory.totalMarketsInTrading = factory.totalMarketsInTrading.plus(ONE_BI);

  // Check if user exists
  let user = User.load(userId);
  if (user === null) {
    user = createUser(userId);
  }
  user.totalMarketCreated = user.totalMarketCreated.plus(ONE_BI);

  market.phase = "Trading";
  market.asset = assetId;
  market.duration = event.params.duration;

  market.token = event.params.token.toString();
  // Market time
  market.createdAtTimestamp = createdAt;
  market.tradingEndTimestamp = createdAt.plus(market.duration);
  market.reportingEndTimestamp = market.tradingEndTimestamp.plus(BigMin(factory.rw, market.duration));
  market.waitingEndTimestamp = market.reportingEndTimestamp.plus(BigMin(factory.ww, market.duration));
  market.disputeEndTimestamp = market.reportingEndTimestamp.plus(factory.dw);

  market.createdAtBlockNumber = event.block.number;
  market.liquidity = event.params.liquidity;

  market.totalPredictions = ZERO_BI;
  market.totalParticipants = ZERO_BI;
  market.totalParticipation = ZERO_BI;
  market.totalRewardsDistributed = ZERO_BI;

  market.creationFee = event.params.creatorFee;
  market.settlerFee = event.params.settlerFee;
  market.platformFee = event.params.platformFee;

  market.creationRewardClaimed = false;
  market.settlementRewardClaimed = false;
  market.platformRewardClaimed = false;

  // Create market pools
  createPools(marketId, event.params.poolsRange);

  user.save();
  market.save();
  factory.save();
}

export function handleAddMarketToken(event: AddMarketToken): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  let marketToken = new MarketToken(event.params.marketToken.toString());
  marketToken.creator = event.block.author;
  factory.totalTokens = factory.totalTokens.plus(ONE_BI);
  marketToken.save();
  factory.save();
}

export function handleUpdateMinMarketLiquidity(
  event: UpdateMinMarketLiquidity
): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  factory.minMarketLiquidity = event.params.liquidity;
  factory.save();
}

export function handleUpdateLossConstant(event: UpdateLossConstant): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  factory.lossConstant = event.params.lossConstant;
  factory.save();
}

export function handleUpdateMarketWindowParams(event: UpdateMarketWindowParams): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  factory.ww = event.params.WW;
  factory.rw = event.params.RW;
  factory.dw = event.params.DW;
  factory.save();
}

export function handleUpdateMarketDurationParams(event: UpdateMarketDurationParams): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  factory.marketMinDuration = event.params.marketMinDuration;
  factory.marketMaxDuration = event.params.marketMaxDuration;
  factory.save();
}

export function handleUpdateMarketFeesPercentage(event: UpdateMarketFeesPercentage): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  factory.creatorFee = event.params.creatorFee;
  factory.settlerFee = event.params.settlerFee;
  factory.platformFee = event.params.platformFee;
  factory.save();
}