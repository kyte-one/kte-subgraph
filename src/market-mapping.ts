import { BigInt } from '@graphprotocol/graph-ts';
import { Asset, Factory, Market, MarketPrediction, MarketUser, Pool, User } from '../generated/schema';
import { ClaimReturns, DistributeMarketFee, PlacePrediction, SettleMarket } from '../generated/templates/Market/Market';
import { MARKET_FACTORY_ADDRESS, ONE_BI, TWO_BI, ZERO_BI } from './constant';
import { updateAssetDayData, updateAssetHourData } from './intervals/asset-interval';
import { updateFactoryDayData, updateFactoryHourData } from './intervals/factory-interval';
import { updateUserDayData, updateUserMonthData } from './intervals/user-interval';
import { createMarketUser, createUser } from './utils';

export function handlePlacePrediction(event: PlacePrediction): void {
  let amount = event.params.amount;
  let leverage = event.params.leverage;
  // Load factory
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  // Load market
  let marketId = event.params.market.toHexString();
  let market = Market.load(marketId);
  if (!market) return;

  //   Load asset
  let asset = Asset.load(market.asset);
  if (!asset) {
    return;
  }

  // Load or create new user
  let userId = event.params.user.toHexString();
  let user = User.load(userId);
  if (!user) {
    factory.totalParticipants = factory.totalParticipants + 1;
    user = createUser(userId);
  }

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId, asset.id);
    user.totalMarketParticipated = user.totalMarketParticipated + 1;

    let marketUsers = market.users;
    marketUsers.push(userId);
    market.users = marketUsers;
  }

  if (marketUser.totalPredictions === 0) {
    market.totalParticipants = market.totalParticipants + 1;
  }

  // Load pool
  let poolId = `${marketId}-${event.params.prediction}`;
  let pool = Pool.load(poolId);
  if (!pool) return;

  // Create new prediction
  let predictionId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let marketPrediction = new MarketPrediction(predictionId);
  marketPrediction.market = marketId;
  marketPrediction.marketUser = marketUserId;
  marketPrediction.pool = poolId;
  marketPrediction.positions = event.params.positions;
  marketPrediction.leverage = leverage;
  marketPrediction.user = userId;
  marketPrediction.amount = amount;
  marketPrediction.boostMode = false;
  marketPrediction.timestamp = event.block.timestamp.toI32();
  marketPrediction.asset = asset.id;

  // Update factory stats
  factory.totalParticipation = factory.totalParticipation.plus(amount);
  factory.totalPredictions = factory.totalPredictions + 1;

  // Update user stats
  user.totalPredictions = user.totalPredictions + 1;
  user.totalParticipationAmount = user.totalParticipationAmount.plus(amount);
  user.numReturnsPending = user.numReturnsPending + 1;

  // Update pool stats
  let leverageAdjustedReward = amount
    .times(BigInt.fromI32(leverage))
    .times(BigInt.fromI32(market.lossConstant))
    .div(BigInt.fromString('100'));
  pool.totalParticipation = pool.totalParticipation.plus(amount);
  pool.rewards = pool.rewards.plus(leverageAdjustedReward);
  pool.positions = pool.positions.plus(event.params.positions);
  pool.totalPredictions = pool.totalPredictions + 1;

  // Update market stats
  market.totalParticipation = market.totalParticipation.plus(amount);
  market.totalPredictions = market.totalPredictions + 1;
  market.potentialRewardPool = market.potentialRewardPool.plus(leverageAdjustedReward);

  // Update assets
  asset.totalParticipation = asset.totalParticipation.plus(amount);
  asset.totalPredictions = asset.totalPredictions + 1;

  // Update market user stats
  marketUser.totalParticipationAmount = marketUser.totalParticipationAmount.plus(amount);
  marketUser.totalPredictions = marketUser.totalPredictions + 1;
  marketUser.timestamp = event.block.timestamp.toI32();

  updateAssetDayData(event, market.asset);
  updateAssetHourData(event, market.asset);
  updateFactoryHourData(event);
  updateFactoryDayData(event);
  updateUserDayData(event, userId);
  updateUserMonthData(event, userId);

  // Save changes
  marketPrediction.save();
  pool.save();
  asset.save();
  marketUser.save();
  market.save();
  user.save();
  factory.save();
}

export function handleSettleMarket(event: SettleMarket): void {
  // Load factory
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  // Load market
  let marketId = event.params.market.toHexString();
  let market = Market.load(marketId);
  if (!market) return;

  // Load pool
  let poolId = `${marketId}-${event.params.winningPool}`;
  let pool = Pool.load(poolId);
  if (!pool) return;

  // Load or create new user
  let userId = event.params.settler.toHexString();
  let user = User.load(userId);
  if (!user) {
    user = createUser(userId);
    factory.totalParticipants = factory.totalParticipants + 1;
  }

  //   Load asset
  let asset = Asset.load(market.asset);
  if (!asset) {
    return;
  }

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId, asset.id);
    user.totalMarketParticipated = user.totalMarketParticipated + 1;

    let marketUsers = market.users;
    marketUsers.push(userId);
    market.users = marketUsers;
  }

  user.totalSettled = user.totalSettled + 1;

  pool.winningPool = true;

  market.winningPool = poolId;
  market.phase = 'Settled';
  market.settler = event.params.settler;
  market.creatorReward = event.params.creatorReward;
  market.platformReward = event.params.platformReward;
  market.settlerReward = event.params.settlerReward;
  market.usersRewardPool = event.params.usersRewardPool;
  market.rewardPool = event.params.rewardPool;
  market.settlementTimestamp = event.block.timestamp.toI32();

  marketUser.isMarketSettler = true;
  marketUser.timestamp = event.block.timestamp.toI32();

  factory.totalMarketsSettled = factory.totalMarketsSettled + 1;
  factory.totalRewards = factory.totalRewards.plus(event.params.rewardPool);
  if (factory.totalMarketsInTrading > 0) {
    factory.totalMarketsInTrading = factory.totalMarketsInTrading - 1;
  }

  asset.totalRewards = asset.totalRewards.plus(event.params.rewardPool);

  updateAssetDayData(event, market.asset);
  updateAssetHourData(event, market.asset);
  updateFactoryHourData(event);
  updateFactoryDayData(event);

  user.save();
  pool.save();
  asset.save();
  market.save();
  marketUser.save();
  factory.save();
}

export function handleDistributeMarketFee(event: DistributeMarketFee): void {
  // Load factory
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  // Load market
  let marketId = event.params.market.toHexString();
  let market = Market.load(marketId);
  if (!market) return;

  // Load or create new user
  let userId = event.params.user.toHexString();
  let user = User.load(userId);
  if (!user) {
    user = createUser(userId);
    factory.totalParticipants = factory.totalParticipants + 1;
  }

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId, market.asset);
    user.totalMarketParticipated = user.totalMarketParticipated + 1;

    let marketUsers = market.users;
    marketUsers.push(userId);
    market.users = marketUsers;
  }

  // 0: Creator, 1: Settler, 2: platform
  let awardType = BigInt.fromI32(event.params.awardType);
  let reward = event.params.amount;

  if (awardType.gt(TWO_BI)) {
    return;
  }

  if (awardType.equals(ZERO_BI)) {
    // update market user
    marketUser.creationRewardClaimed = true;
    marketUser.creationReward = reward;

    // update market
    market.creationRewardClaimed = true;

    // Update user
    user.totalMarketCreationRewardClaimed = user.totalMarketCreationRewardClaimed.plus(reward);
  } else if (awardType.equals(ONE_BI)) {
    // update market user
    marketUser.settlementRewardClaimed = true;
    marketUser.settlementReward = reward;

    // update market
    market.settlementRewardClaimed = true;

    // Update user
    user.totalSettlementRewardClaimed = user.totalSettlementRewardClaimed.plus(reward);
  } else {
    // update market
    market.platformRewardClaimed = true;
  }

  if (awardType.le(ONE_BI)) {
    user.totalRewardsClaimed = user.totalRewardsClaimed.plus(reward);
    user.totalPNL = user.totalPNL.plus(reward);
    marketUser.pnl = marketUser.pnl.plus(reward);
  }

  marketUser.timestamp = event.block.timestamp.toI32();

  updateUserDayData(event, userId);
  updateUserMonthData(event, userId);

  market.save();
  marketUser.save();
  user.save();
  factory.save();
}

export function handleClaimReturns(event: ClaimReturns): void {
  // Load factory
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  let marketId = event.params.market.toHexString();
  let market = Market.load(marketId);
  if (!market) return;

  // Load or create new user
  let userId = event.params.user.toHexString();
  let user = User.load(userId);
  if (!user) {
    user = createUser(userId);
    factory.totalParticipants = factory.totalParticipants + 1;
  }

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId, market.asset);
    user.totalMarketParticipated = user.totalMarketParticipated + 1;

    let marketUsers = market.users;
    marketUsers.push(userId);
    market.users = marketUsers;
  }

  let totalPredictionReturns = event.params.totalReturns;
  let predictionProfitLoss = totalPredictionReturns.minus(event.params.participationAmount);
  marketUser.totalReturns = marketUser.totalReturns.plus(totalPredictionReturns);
  marketUser.predictionReturns = totalPredictionReturns;
  marketUser.returnsClaimed = true;
  marketUser.pnl = marketUser.pnl.plus(predictionProfitLoss);
  marketUser.timestamp = event.block.timestamp.toI32();

  user.totalReturnsClaimed = user.totalReturnsClaimed.plus(totalPredictionReturns);
  if (predictionProfitLoss.ge(ZERO_BI)) {
    user.totalRewardsClaimed = user.totalRewardsClaimed.plus(predictionProfitLoss);
  }
  user.totalPNL = user.totalPNL.plus(predictionProfitLoss);
  if (user.numReturnsPending > 0) {
    user.numReturnsPending = user.numReturnsPending - 1;
  }

  updateUserDayData(event, userId);
  updateUserMonthData(event, userId);

  user.save();
  marketUser.save();
  factory.save();
}
