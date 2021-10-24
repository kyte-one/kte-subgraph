import { ethereum } from '@graphprotocol/graph-ts';
import { User, UserDayData, UserMonthData } from '../../generated/schema';

export function updateUserDayData(event: ethereum.Event, userId: string): void {
  let user = User.load(userId);
  if (!user) return;

  let timestamp = event.block.timestamp.toI32();
  let dayId = timestamp / 86400; // rounded
  let dayStartTimestamp = dayId * 86400;

  let userDayData = UserDayData.load(dayId.toString());

  if (!userDayData) {
    userDayData = new UserDayData(dayId.toString());
    userDayData.timestamp = dayStartTimestamp;
    userDayData.user = user.id;
  }

  userDayData.pnl = user.totalPNL;
  userDayData.save();
}

export function updateUserMonthData(event: ethereum.Event, userId: string): void {
  let user = User.load(userId);
  if (!user) return;

  let timestamp = event.block.timestamp.toI32();
  let monthId = timestamp / 2592000; // rounded
  let monthStartTimestamp = monthId * 2592000;

  let userMonthData = UserMonthData.load(monthId.toString());

  if (!userMonthData) {
    userMonthData = new UserMonthData(monthId.toString());
    userMonthData.timestamp = monthStartTimestamp;
    userMonthData.user = user.id;
  }

  userMonthData.pnl = user.totalPNL;

  userMonthData.save();
}
