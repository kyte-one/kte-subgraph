import { ethereum } from '@graphprotocol/graph-ts';
import { Factory, FactoryDayData, FactoryHourData } from '../../generated/schema';
import { MARKET_FACTORY_ADDRESS } from '../constant';

export function updateFactoryHourData(event: ethereum.Event): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  let timestamp = event.block.timestamp.toI32();
  let hourIndex = timestamp / 3600; // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600; // want the rounded effect
  let factoryHourId = MARKET_FACTORY_ADDRESS.concat('-').concat(hourIndex.toString());
  let factoryHourData = FactoryHourData.load(factoryHourId);
  if (!factoryHourData) {
    factoryHourData = new FactoryHourData(factoryHourId);
    factoryHourData.timestamp = hourStartUnix;
  }
  factoryHourData.participation = factory.totalParticipation;
  factoryHourData.predictions = factory.totalPredictions;
  factoryHourData.participants = factory.totalParticipants;

  factoryHourData.save();
}

export function updateFactoryDayData(event: ethereum.Event): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  let timestamp = event.block.timestamp.toI32();
  let dayId = timestamp / 86400; // rounded
  let dayStartTimestamp = dayId * 86400;

  let factoryDayData = FactoryDayData.load(dayId.toString());

  if (!factoryDayData) {
    factoryDayData = new FactoryDayData(dayId.toString());
    factoryDayData.timestamp = dayStartTimestamp;
  }

  factoryDayData.participation = factory.totalParticipation;
  factoryDayData.predictions = factory.totalPredictions;
  factoryDayData.participants = factory.totalParticipants;
  factoryDayData.save();
}
