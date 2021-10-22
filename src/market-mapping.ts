import {
  PlacePrediction,
  SettleMarket,
  DistributeMarketFee,
  ClaimReturns,
} from "../generated/templates/Market/Market";
import { MarketPrediction, User, Factory, Pool } from "../generated/schema";
import { createUser } from "./utils";
import { MARKET_FACTORY_ADDRESS, ONE_BI } from "./constant";
import { BigInt } from "@graphprotocol/graph-ts";

export function handlePlacePrediction(event: PlacePrediction): void {
  let amount = event.params.amount;
  let leverage = event.params.leverage;
  // Load factory
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  // Load market
  let marketId = event.params.market.toString();
  let market = Factory.load(marketId);
  if (!market) return;

  // Load pool
  let poolId = `${marketId}-${event.params.prediction}`;
  let pool = Pool.load(poolId);
  if (!pool) return;

  // Load or create new user
  let userId = event.params.user.toString();
  let user = User.load(userId);
  if (user === null) {
    factory.totalParticipants = factory.totalParticipants.plus(ONE_BI);
    user = createUser(userId);
  }

  // Create new prediction
  let predictionId =
    event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let marketPrediction = new MarketPrediction(predictionId);
  marketPrediction.market = marketId;
  marketPrediction.pool = poolId;
  marketPrediction.positions = event.params.positions;
  marketPrediction.rewardClaimed = false;
  marketPrediction.leverage = leverage;
  marketPrediction.user = userId;
  marketPrediction.amount = amount;
  marketPrediction.boostMode = false;
  marketPrediction.timestamp = event.block.timestamp;

  // Update factory stats
  factory.totalParticipation = factory.totalParticipation.plus(amount);
  factory.totalPredictions = factory.totalPredictions.plus(ONE_BI);

  // Update user stats
  user.totalPredictions = user.totalPredictions.plus(ONE_BI);

  // Update market stats
  market.totalParticipation = factory.totalParticipation.plus(amount);
  market.totalPredictions = factory.totalPredictions.plus(ONE_BI);

  // Update pool stats
  pool.staked = pool.staked.plus(amount);
  pool.rewards = pool.rewards.plus(
    amount
      .times(BigInt.fromI32(leverage))
      .times(BigInt.fromI32(factory.lossConstant))
      .div(BigInt.fromString('100'))
  );

  // Save changes
  marketPrediction.save();
  pool.save();
  market.save();
  user.save();
  factory.save();
}

export function handleSettleMarket(event: SettleMarket): void {}

export function handleDistributeMarketFee(event: DistributeMarketFee): void {}

export function handleClaimReturns(event: ClaimReturns): void {}
